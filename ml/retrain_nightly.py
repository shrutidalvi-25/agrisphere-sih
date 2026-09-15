"""
Nightly retrain step of the DAG (see .github/workflows/nightly-price-pipeline.yml).

Runs AFTER the fetch/validate/store step has already pulled tonight's real
Agmarknet prices into Supabase's `mandi_prices` table. This script:
  1. Pulls the full accumulated real-price history from `mandi_prices` for
     the 4 model-supported crops (Onion, Potato, Tomato, Wheat).
  2. Merges it with the original 2-year Kaggle historical archive that
     bootstrapped the model (see train.py's header comment for why that
     archive exists at all — data.gov.in's live API has no historical
     query, only "today's snapshot").
  3. Re-fits a fresh RandomForestRegressor per crop on the combined data,
     so the model actually incorporates every real day accumulated since
     launch instead of staying frozen at its original Kaggle-only fit.
  4. Exports each forest to the same native-JSON tree format
     predict-price/index.ts already knows how to read, and uploads it to
     the `ml-models` Storage bucket, overwriting the previous version.

The live rows are a tiny fraction of the dataset for a long time yet (a
handful of real days vs. ~2 years of Kaggle history) — early on this
mostly just re-derives the same Kaggle-only model. That's expected and
honest: it becomes a genuinely live-adapting model as real days pile up,
not on day one.

Env vars required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""
import json
import os
import sys
import warnings

import numpy as np
import pandas as pd
import requests
from sklearn.ensemble import RandomForestRegressor

warnings.filterwarnings("ignore")

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "Agriculture_price_dataset.csv")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

SUPPORTED_CROPS = ["Onion", "Potato", "Tomato", "Wheat"]
FEATURE_COLUMNS = [
    "lag_1", "lag_3", "lag_7", "rolling_mean_7", "rolling_mean_14",
    "day_of_week", "month", "is_maharashtra",
]
VALIDATION_FRACTION = 0.15
MIN_USABLE_ROWS = 200
MIN_VALIDATION_ROWS = 30


def fetch_live_rows():
    """Pulls every real row ever collected for the 4 supported crops from
    Supabase and reshapes it to match the Kaggle CSV's column names, so
    both sources can be concatenated and fed through the same feature
    engineering with no special-casing."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/mandi_prices",
        headers={"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"},
        params={
            "select": "crop,mandi_name,state,date,modal_price",
            "crop": f"in.({','.join(SUPPORTED_CROPS)})",
        },
        timeout=30,
    )
    resp.raise_for_status()
    rows = resp.json()
    if not rows:
        return pd.DataFrame(columns=["Commodity", "STATE", "Market Name", "Price Date", "Modal_Price"])

    df = pd.DataFrame(rows)
    return pd.DataFrame({
        "Commodity": df["crop"],
        "STATE": df["state"],
        "Market Name": df["mandi_name"],
        "Price Date": pd.to_datetime(df["date"]),
        "Modal_Price": pd.to_numeric(df["modal_price"]),
    })


def load_and_engineer(crop, live_df):
    kaggle_df = pd.read_csv(DATA_PATH)
    kaggle_df = kaggle_df[kaggle_df["Commodity"] == crop][["Commodity", "STATE", "Market Name", "Price Date", "Modal_Price"]].copy()
    kaggle_df["Price Date"] = pd.to_datetime(kaggle_df["Price Date"], format="mixed", errors="coerce")
    kaggle_df = kaggle_df.dropna(subset=["Price Date"])

    crop_live = live_df[live_df["Commodity"] == crop]
    df = pd.concat([kaggle_df, crop_live], ignore_index=True)

    # Collapse to one row per (market, date) — duplicates can come from
    # either source (Kaggle variety/grade rows, or a re-run of tonight's
    # pull upserting the same day again).
    df = (
        df.groupby(["STATE", "Market Name", "Price Date"], as_index=False)
        .agg({"Modal_Price": "mean"})
        .sort_values(["STATE", "Market Name", "Price Date"])
    )

    grouped = df.groupby(["STATE", "Market Name"])["Modal_Price"]
    df["lag_1"] = grouped.shift(1)
    df["lag_3"] = grouped.shift(3)
    df["lag_7"] = grouped.shift(7)
    df["rolling_mean_7"] = grouped.transform(lambda s: s.shift(1).rolling(7, min_periods=3).mean())
    df["rolling_mean_14"] = grouped.transform(lambda s: s.shift(1).rolling(14, min_periods=5).mean())
    df["day_of_week"] = df["Price Date"].dt.dayofweek
    df["month"] = df["Price Date"].dt.month
    df["is_maharashtra"] = (df["STATE"] == "Maharashtra").astype(int)
    df["target"] = grouped.shift(-1)

    df = df.dropna(subset=FEATURE_COLUMNS + ["target"])
    return df


def tree_to_dict(tree):
    return {
        "feature": tree.feature.tolist(),
        "threshold": tree.threshold.tolist(),
        "left": tree.children_left.tolist(),
        "right": tree.children_right.tolist(),
        "value": [v[0][0] for v in tree.value],
    }


def train_and_export_one_crop(crop, live_df, live_day_count):
    df = load_and_engineer(crop, live_df)
    if len(df) < MIN_USABLE_ROWS:
        print(f"  Skipping {crop}: only {len(df)} usable rows after feature engineering.")
        return None

    date_min, date_max = df["Price Date"].min(), df["Price Date"].max()
    span_days = (date_max - date_min).days
    validation_start = date_max - pd.Timedelta(days=int(span_days * VALIDATION_FRACTION))
    train_df = df[df["Price Date"] < validation_start]
    val_df = df[df["Price Date"] >= validation_start]
    if len(val_df) < MIN_VALIDATION_ROWS:
        print(f"  Skipping {crop}: only {len(val_df)} validation rows — too thin to trust.")
        return None

    model = RandomForestRegressor(
        n_estimators=60, max_depth=8, min_samples_leaf=8, random_state=42, n_jobs=-1,
    )
    model.fit(train_df[FEATURE_COLUMNS], train_df["target"])

    preds = model.predict(val_df[FEATURE_COLUMNS])
    mae = float(np.mean(np.abs(val_df["target"] - preds)))
    print(f"  {crop}: train={len(train_df)} rows (incl. {live_day_count} real live days), val={len(val_df)} rows | MAE=Rs{mae:.1f}")

    forest_json = {
        "crop": crop,
        "feature_columns": FEATURE_COLUMNS,
        "trained_through": str(date_max.date()),
        "live_days_included": live_day_count,
        "trees": [tree_to_dict(est.tree_) for est in model.estimators_],
    }
    out_path = os.path.join(MODELS_DIR, f"{crop.lower()}.json")
    with open(out_path, "w") as f:
        json.dump(forest_json, f)
    return out_path


def upload_to_storage(local_path, crop):
    with open(local_path, "rb") as f:
        body = f.read()
    resp = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/ml-models/{crop.lower()}.json",
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json",
            "x-upsert": "true",
        },
        data=body,
        timeout=60,
    )
    if not resp.ok:
        raise RuntimeError(f"Upload failed for {crop}: {resp.status_code} {resp.text}")
    print(f"  Uploaded {crop.lower()}.json ({len(body) / 1024:.0f} KB) to ml-models bucket")


def main():
    print("Pulling live real prices from Supabase...")
    live_df = fetch_live_rows()
    live_day_count = live_df["Price Date"].nunique() if len(live_df) else 0
    print(f"Found {len(live_df)} live rows across {live_day_count} real distinct date(s).\n")

    uploaded = []
    for crop in SUPPORTED_CROPS:
        print(f"{crop}:")
        out_path = train_and_export_one_crop(crop, live_df, live_day_count)
        if out_path:
            upload_to_storage(out_path, crop)
            uploaded.append(crop)

    if not uploaded:
        print("\nNo models were retrained/uploaded — failing so the pipeline surfaces this.")
        sys.exit(1)

    print(f"\nDone. Retrained and published: {uploaded}")


if __name__ == "__main__":
    main()
