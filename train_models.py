#!/usr/bin/env python3
"""
UPI Rakshak - Machine Learning Training & Evaluation Pipeline
Trains and compares:
1. Logistic Regression
2. Random Forest
3. HistGradientBoosting
4. XGBoost
"""

import json
import os
import time
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    precision_recall_curve,
)
import xgboost as xgb
import shap

SEED = 42
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SPLITS_DIR = os.path.join(BASE_DIR, "splits")
ML_DIR = os.path.join(BASE_DIR, "backend", "app", "ml")
os.makedirs(ML_DIR, exist_ok=True)

# 1. Load config
with open(os.path.join(BASE_DIR, "feature_config.json"), "r") as f:
    cfg = json.load(f)

num_cols = cfg["numeric_features"]
cat_cols = cfg["categorical_features"]
all_features = num_cols + cat_cols
target_col = cfg["target_binary"]

print(f"Loaded feature config: {len(num_cols)} numeric, {len(cat_cols)} categorical.")

# 2. Load Splits
train_df = pd.read_csv(os.path.join(SPLITS_DIR, "train.csv"))
val_df = pd.read_csv(os.path.join(SPLITS_DIR, "val.csv"))
test_df = pd.read_csv(os.path.join(SPLITS_DIR, "test.csv"))
temp_test_df = pd.read_csv(os.path.join(SPLITS_DIR, "temporal_test.csv"))

print(f"Train rows: {len(train_df)}, Val rows: {len(val_df)}, Test rows: {len(test_df)}, Temp Test rows: {len(temp_test_df)}")

# Compute feature defaults for imputing missing values during backend inference
feature_defaults = {}
for col in num_cols:
    feature_defaults[col] = float(train_df[col].median())
for col in cat_cols:
    feature_defaults[col] = str(train_df[col].mode()[0])

X_train_raw = train_df[all_features]
y_train = train_df[target_col].values

X_val_raw = val_df[all_features]
y_val = val_df[target_col].values

X_test_raw = test_df[all_features]
y_test = test_df[target_col].values

X_temp_test_raw = temp_test_df[all_features]
y_temp_test = temp_test_df[target_col].values

# 3. Fit Preprocessing Pipeline ONLY on Train
preprocessor = ColumnTransformer(
    transformers=[
        ("num", StandardScaler(), num_cols),
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
    ],
    verbose_feature_names_out=False,
)

print("Fitting preprocessor on training split...")
X_train_trans = preprocessor.fit_transform(X_train_raw)
X_val_trans = preprocessor.transform(X_val_raw)
feature_names_out = list(preprocessor.get_feature_names_out())
print(f"Transformed feature dimension: {X_train_trans.shape[1]}")

# 4. Define candidate models
pos_weight = (len(y_train) - y_train.sum()) / y_train.sum()

models = {
    "Logistic Regression": LogisticRegression(
        max_iter=1000,
        random_state=SEED,
        class_weight="balanced",
        solver="lbfgs",
    ),
    "Random Forest": RandomForestClassifier(
        n_estimators=150,
        max_depth=14,
        min_samples_split=10,
        min_samples_leaf=4,
        random_state=SEED,
        class_weight="balanced",
        n_jobs=-1,
    ),
    "HistGradientBoosting": HistGradientBoostingClassifier(
        max_iter=120,
        max_depth=8,
        learning_rate=0.1,
        random_state=SEED,
        class_weight="balanced",
    ),
    "XGBoost": xgb.XGBClassifier(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.1,
        scale_pos_weight=pos_weight,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=SEED,
        eval_metric="logloss",
        n_jobs=-1,
    ),
}

# 5. Train & Evaluate on Validation Set
results = []
trained_models = {}
optimal_thresholds = {}

for name, model in models.items():
    print(f"\nTraining {name}...")
    t0 = time.time()
    model.fit(X_train_trans, y_train)
    fit_time = time.time() - t0
    trained_models[name] = model

    val_probs = model.predict_proba(X_val_trans)[:, 1]
    roc_auc = roc_auc_score(y_val, val_probs)
    pr_auc = average_precision_score(y_val, val_probs)

    # Find optimal threshold to maximize F1 on validation set
    precisions, recalls, thresholds = precision_recall_curve(y_val, val_probs)
    f1_scores = (2 * precisions * recalls) / np.maximum(precisions + recalls, 1e-8)
    best_idx = np.argmax(f1_scores[:-1])
    best_threshold = float(thresholds[best_idx])
    optimal_thresholds[name] = best_threshold

    val_preds = (val_probs >= best_threshold).astype(int)
    prec = precision_score(y_val, val_preds)
    rec = recall_score(y_val, val_preds)
    f1 = f1_score(y_val, val_preds)
    cm = confusion_matrix(y_val, val_preds)
    tn, fp, fn, tp = cm.ravel()
    fnr = fn / (fn + tp)  # False Negative Rate (missed frauds)

    res = {
        "model": name,
        "fit_time_sec": round(fit_time, 2),
        "val_roc_auc": round(roc_auc, 4),
        "val_pr_auc": round(pr_auc, 4),
        "optimal_threshold": round(best_threshold, 4),
        "val_precision": round(prec, 4),
        "val_recall": round(rec, 4),
        "val_f1": round(f1, 4),
        "val_fnr": round(fnr, 4),
        "val_cm": {
            "TN": int(tn),
            "FP": int(fp),
            "FN": int(fn),
            "TP": int(tp),
        },
    }
    results.append(res)
    print(f"{name} Results on Validation:")
    print(f"  ROC-AUC: {roc_auc:.4f} | PR-AUC: {pr_auc:.4f} | F1: {f1:.4f} (Thresh: {best_threshold:.4f})")
    print(f"  Recall: {rec:.4f} | Precision: {prec:.4f} | FNR: {fnr:.4f}")
    print(f"  Confusion Matrix: TN={tn}, FP={fp}, FN={fn}, TP={tp}")

# 6. Select Best Model based on validation F1 and PR-AUC
best_model_name = max(results, key=lambda x: (x["val_f1"], x["val_pr_auc"]))["model"]
print(f"\n=======================================================")
print(f"SELECTED BEST MODEL: {best_model_name}")
print(f"=======================================================")

selected_model = trained_models[best_model_name]
selected_threshold = optimal_thresholds[best_model_name]

# 7. Evaluate Selected Model on Untouched Test Splits (Once, no tuning)
X_test_trans = preprocessor.transform(X_test_raw)
test_probs = selected_model.predict_proba(X_test_trans)[:, 1]
test_preds = (test_probs >= selected_threshold).astype(int)

test_roc_auc = roc_auc_score(y_test, test_probs)
test_pr_auc = average_precision_score(y_test, test_probs)
test_prec = precision_score(y_test, test_preds)
test_rec = recall_score(y_test, test_preds)
test_f1 = f1_score(y_test, test_preds)
test_cm = confusion_matrix(y_test, test_preds)
test_tn, test_fp, test_fn, test_tp = test_cm.ravel()
test_fnr = test_fn / (test_fn + test_tp)

print(f"\nUntouched Random Stratified Test Evaluation:")
print(f"  ROC-AUC: {test_roc_auc:.4f} | PR-AUC: {test_pr_auc:.4f} | F1: {test_f1:.4f}")
print(f"  Recall: {test_rec:.4f} | Precision: {test_prec:.4f} | FNR: {test_fnr:.4f}")
print(f"  Confusion Matrix: TN={test_tn}, FP={test_fp}, FN={test_fn}, TP={test_tp}")

# Untouched Temporal Test Evaluation
X_temp_test_trans = preprocessor.transform(X_temp_test_raw)
temp_probs = selected_model.predict_proba(X_temp_test_trans)[:, 1]
temp_preds = (temp_probs >= selected_threshold).astype(int)

temp_roc_auc = roc_auc_score(y_temp_test, temp_probs)
temp_pr_auc = average_precision_score(y_temp_test, temp_probs)
temp_prec = precision_score(y_temp_test, temp_preds)
temp_rec = recall_score(y_temp_test, temp_preds)
temp_f1 = f1_score(y_temp_test, temp_preds)
temp_cm = confusion_matrix(y_temp_test, temp_preds)
temp_tn, temp_fp, temp_fn, temp_tp = temp_cm.ravel()
temp_fnr = temp_fn / (temp_fn + temp_tp)

print(f"\nUntouched Temporal Test Evaluation:")
print(f"  ROC-AUC: {temp_roc_auc:.4f} | PR-AUC: {temp_pr_auc:.4f} | F1: {temp_f1:.4f}")
print(f"  Recall: {temp_rec:.4f} | Precision: {temp_prec:.4f} | FNR: {temp_fnr:.4f}")
print(f"  Confusion Matrix: TN={temp_tn}, FP={temp_fp}, FN={temp_fn}, TP={temp_tp}")

# 8. SHAP Explainability Integration
print("\nComputing SHAP Explainability with TreeExplainer...")
# Sample background for fast SHAP computations
sample_bg = X_train_trans[:500]
explainer = shap.TreeExplainer(selected_model)

# Global feature importance from SHAP values on validation sample
val_sample = X_val_trans[:1000]
shap_values_sample = explainer.shap_values(val_sample)
mean_abs_shap = np.mean(np.abs(shap_values_sample), axis=0)

top_feature_indices = np.argsort(mean_abs_shap)[::-1]
global_importance = []
for idx in top_feature_indices[:20]:
    global_importance.append({
        "feature": feature_names_out[idx],
        "mean_abs_shap": round(float(mean_abs_shap[idx]), 5)
    })

print("Top 10 Influential Features via SHAP:")
for item in global_importance[:10]:
    print(f"  {item['feature']}: {item['mean_abs_shap']}")

# 9. Save Artifacts for Backend
print("\nSaving model artifacts to backend/app/ml/...")
joblib.dump(selected_model, os.path.join(ML_DIR, "fraud_detector_model.joblib"))
joblib.dump(preprocessor, os.path.join(ML_DIR, "preprocessor.joblib"))
joblib.dump(explainer, os.path.join(ML_DIR, "shap_explainer.joblib"))

metadata = {
    "model_name": best_model_name,
    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    "optimal_threshold": round(selected_threshold, 4),
    "feature_names_in": all_features,
    "feature_names_out": feature_names_out,
    "numeric_features": num_cols,
    "categorical_features": cat_cols,
    "feature_defaults": feature_defaults,
    "validation_results": results,
    "test_evaluation": {
        "roc_auc": round(test_roc_auc, 4),
        "pr_auc": round(test_pr_auc, 4),
        "precision": round(test_prec, 4),
        "recall": round(test_rec, 4),
        "f1": round(test_f1, 4),
        "fnr": round(test_fnr, 4),
        "confusion_matrix": {"TN": int(test_tn), "FP": int(test_fp), "FN": int(test_fn), "TP": int(test_tp)},
    },
    "temporal_test_evaluation": {
        "roc_auc": round(temp_roc_auc, 4),
        "pr_auc": round(temp_pr_auc, 4),
        "precision": round(temp_prec, 4),
        "recall": round(temp_rec, 4),
        "f1": round(temp_f1, 4),
        "fnr": round(temp_fnr, 4),
        "confusion_matrix": {"TN": int(temp_tn), "FP": int(temp_fp), "FN": int(temp_fn), "TP": int(temp_tp)},
    },
    "top_global_features": global_importance,
}

with open(os.path.join(ML_DIR, "model_metadata.json"), "w") as f:
    json.dump(metadata, f, indent=2)

print("\nModel training and artifact generation successfully completed!")

