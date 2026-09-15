"""
Exports each trained RandomForestRegressor's tree structure to plain JSON
instead of ONNX — a Deno Edge Function has no reliable native ML runtime,
and pulling in a WASM ONNX runtime is unproven territory for a live
serverless environment (risky to discover it doesn't work during a demo).
A Random Forest is just nested threshold comparisons, so a small native
TypeScript function can replay the exact same math with zero runtime
dependency — see supabase/functions/predict-price/index.ts.

Must be run AFTER train.py (reuses the same trained models in-process by
re-running load_and_engineer + fit, since train.py didn't keep sklearn
objects around — this keeps train.py focused on training/validation only).
"""
import json
import os
import warnings

from train import SUPPORTED_CROPS, FEATURE_COLUMNS, load_and_engineer, VALIDATION_FRACTION
from sklearn.ensemble import RandomForestRegressor
import pandas as pd

warnings.filterwarnings("ignore")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")


def tree_to_dict(tree):
    # sklearn's tree_.feature/threshold/children_* are parallel arrays
    # indexed by node id; -2 (TREE_LEAF) marks a leaf node in
    # children_left/children_right.
    return {
        "feature": tree.feature.tolist(),
        "threshold": tree.threshold.tolist(),
        "left": tree.children_left.tolist(),
        "right": tree.children_right.tolist(),
        "value": [v[0][0] for v in tree.value],
    }


def main():
    for crop in SUPPORTED_CROPS:
        df = load_and_engineer(crop)
        if len(df) < 200:
            continue

        date_min, date_max = df["Price Date"].min(), df["Price Date"].max()
        span_days = (date_max - date_min).days
        validation_start = date_max - pd.Timedelta(days=int(span_days * VALIDATION_FRACTION))
        train_df = df[df["Price Date"] < validation_start]
        if len(df[df["Price Date"] >= validation_start]) < 30:
            continue

        model = RandomForestRegressor(
            n_estimators=60, max_depth=8, min_samples_leaf=8, random_state=42, n_jobs=-1,
        )
        model.fit(train_df[FEATURE_COLUMNS], train_df["target"])

        forest_json = {
            "crop": crop,
            "feature_columns": FEATURE_COLUMNS,
            "trees": [tree_to_dict(est.tree_) for est in model.estimators_],
        }
        out_path = os.path.join(MODELS_DIR, f"{crop.lower()}.json")
        with open(out_path, "w") as f:
            json.dump(forest_json, f)
        size_kb = os.path.getsize(out_path) / 1024
        print(f"{crop}: {len(model.estimators_)} trees -> {out_path} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
