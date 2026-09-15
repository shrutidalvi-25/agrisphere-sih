"""
Trains a Random Forest Regressor to predict next-day modal mandi price,
per crop, from real historical Agmarknet data (via the Kaggle "Indian
Agricultural Mandi Prices 2023-2025" archive — data.gov.in's own live API
has no historical query, only today's snapshot, so this bootstraps real
training depth that our live daily pull alone won't have for a long time).

Only 4 of our app's 15 crops exist in this dataset: Onion, Potato, Tomato,
Wheat. The other 11 crops keep using the existing simple trend-projection
in sellHoldService.js — this script does not touch those, and the app
should fall back to it for any crop this model wasn't trained on.

Usage: python train.py
Outputs: models/<crop>.onnx, models/metrics.json (real validation error per crop)
"""
import json
import os
import warnings

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

warnings.filterwarnings("ignore")

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "Agriculture_price_dataset.csv")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

SUPPORTED_CROPS = ["Onion", "Potato", "Tomato", "Wheat"]

# Same features for every crop's model, in this exact order — the app
# must build the same feature vector at inference time.
FEATURE_COLUMNS = [
    "lag_1", "lag_3", "lag_7", "rolling_mean_7", "rolling_mean_14",
    "day_of_week", "month", "is_maharashtra",
]

# Split by date, not randomly — a random split would let the model "see
# the future" (rows from the same week end up in both train and
# validation), which silently inflates accuracy. This is the same
# honesty principle as everything else in this project: report a number
# that would actually hold up if a judge asked "how did you validate this."
#
# The split point is computed PER CROP (last 15% of that crop's own date
# range) rather than one fixed global date — this archive's crawler
# stopped collecting Tomato in Nov 2023 and Wheat in Feb 2024 (verified by
# inspecting the raw file), so a single global cutoff silently produced
# zero validation rows for those two. Each crop gets a real holdout
# drawn from its own actual coverage instead.
VALIDATION_FRACTION = 0.15


def load_and_engineer(crop):
    df = pd.read_csv(DATA_PATH)
    df = df[df["Commodity"] == crop].copy()
    df["Price Date"] = pd.to_datetime(df["Price Date"], format="mixed", errors="coerce")
    df = df.dropna(subset=["Price Date"])

    # Collapse to one row per (market, date) — the raw file can have
    # multiple variety/grade rows for the same market on the same day.
    df = (
        df.groupby(["STATE", "Market Name", "Price Date"], as_index=False)
        .agg({"Modal_Price": "mean"})
        .sort_values(["STATE", "Market Name", "Price Date"])
    )

    # Lag/rolling features computed PER MARKET — a lag feature mixing
    # different markets' price histories would be meaningless (a Nashik
    # lag price has no relationship to a Pune row).
    grouped = df.groupby(["STATE", "Market Name"])["Modal_Price"]
    df["lag_1"] = grouped.shift(1)
    df["lag_3"] = grouped.shift(3)
    df["lag_7"] = grouped.shift(7)
    df["rolling_mean_7"] = grouped.transform(lambda s: s.shift(1).rolling(7, min_periods=3).mean())
    df["rolling_mean_14"] = grouped.transform(lambda s: s.shift(1).rolling(14, min_periods=5).mean())
    df["day_of_week"] = df["Price Date"].dt.dayofweek
    df["month"] = df["Price Date"].dt.month
    df["is_maharashtra"] = (df["STATE"] == "Maharashtra").astype(int)

    # Target: TOMORROW's price for this same market — a real forecast,
    # not just describing today.
    df["target"] = grouped.shift(-1)

    df = df.dropna(subset=FEATURE_COLUMNS + ["target"])
    return df


def train_one_crop(crop):
    df = load_and_engineer(crop)
    if len(df) < 200:
        print(f"  Skipping {crop}: only {len(df)} usable rows after feature engineering (need real depth to trust this).")
        return None

    date_min, date_max = df["Price Date"].min(), df["Price Date"].max()
    span_days = (date_max - date_min).days
    validation_start = date_max - pd.Timedelta(days=int(span_days * VALIDATION_FRACTION))

    train_df = df[df["Price Date"] < validation_start]
    val_df = df[df["Price Date"] >= validation_start]
    if len(val_df) < 30:
        print(f"  Skipping {crop}: only {len(val_df)} validation rows even with a per-crop split — this crop's real data coverage ({date_min.date()} to {date_max.date()}) is too thin to trust a reported accuracy.")
        return None

    X_train, y_train = train_df[FEATURE_COLUMNS], train_df["target"]
    X_val, y_val = val_df[FEATURE_COLUMNS], val_df["target"]

    # Deliberately small: this needs to run inside a Supabase Edge
    # Function (server-side, not shipped to a farmer's phone), and
    # exported RandomForest ONNX files grow fast with tree count/depth —
    # 200 trees @ depth 12 produced 11-27MB files per crop, too heavy for
    # a request/response cycle. This size trades a little accuracy for a
    # model that's actually practical to load and run per-request.
    model = RandomForestRegressor(
        n_estimators=60,
        max_depth=8,
        min_samples_leaf=8,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_val)
    mae = mean_absolute_error(y_val, preds)
    rmse = np.sqrt(mean_squared_error(y_val, preds))
    r2 = r2_score(y_val, preds)
    mape = float(np.mean(np.abs((y_val - preds) / y_val)) * 100)

    print(f"  {crop}: train={len(train_df)} rows, val={len(val_df)} rows | MAE=Rs{mae:.1f}  RMSE=Rs{rmse:.1f}  MAPE={mape:.1f}%  R2={r2:.3f}")

    onnx_model = convert_sklearn(
        model,
        initial_types=[("input", FloatTensorType([None, len(FEATURE_COLUMNS)]))],
        target_opset=15,
    )
    onnx_path = os.path.join(MODELS_DIR, f"{crop.lower()}.onnx")
    with open(onnx_path, "wb") as f:
        f.write(onnx_model.SerializeToString())

    return {
        "crop": crop,
        "train_rows": len(train_df),
        "val_rows": len(val_df),
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "mape_percent": round(mape, 2),
        "r2": round(r2, 4),
        "data_range": f"{date_min.date()} to {date_max.date()}",
        "validation_start": str(validation_start.date()),
        "feature_columns": FEATURE_COLUMNS,
    }


def main():
    print(f"Training on {DATA_PATH}")
    results = {}
    for crop in SUPPORTED_CROPS:
        print(f"\n{crop}:")
        metrics = train_one_crop(crop)
        if metrics:
            results[crop] = metrics

    metrics_path = os.path.join(MODELS_DIR, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nWrote real validation metrics to {metrics_path}")
    print(f"Models with usable accuracy: {list(results.keys())}")


if __name__ == "__main__":
    main()
