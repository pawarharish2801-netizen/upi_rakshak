#!/usr/bin/env python3
"""
UPI Rakshak - dataset validation, visualizations and analysis report.
Run after generate_upi_dataset.py:  python analyze_and_validate.py
Outputs: plots/*.png, dataset_analysis_report.md, dataset/baseline_model_results.csv
"""
import json
import os
import warnings

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (average_precision_score, f1_score, precision_recall_curve,
                             precision_score, recall_score, roc_auc_score, roc_curve)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

warnings.filterwarnings("ignore")
SEED = 42
D = os.path.dirname(os.path.abspath(__file__))
PLOTS = os.path.join(D, "plots"); os.makedirs(PLOTS, exist_ok=True)
DATASET = os.path.join(D, "dataset"); os.makedirs(DATASET, exist_ok=True)
csv_path = os.path.join(DATASET, "upi_synthetic_transactions.csv") if os.path.exists(os.path.join(DATASET, "upi_synthetic_transactions.csv")) else os.path.join(D, "upi_synthetic_transactions.csv")
df = pd.read_csv(csv_path, parse_dates=["transaction_timestamp"])
cfg = json.load(open(os.path.join(D, "feature_config.json")))
tr, va, te = (pd.read_csv(os.path.join(D, "splits", f"{s}.csv")) for s in ("train", "val", "test"))
ttr, tva, tte = (pd.read_csv(os.path.join(D, "splits", f"temporal_{s}.csv")) for s in ("train", "val", "test"))
FEATS = cfg["numeric_features"] + cfg["categorical_features"]
FRAUD, LEGIT = df[df.is_fraud == 1], df[df.is_fraud == 0]
C_L, C_F = "#2a9d8f", "#e63946"
plt.rcParams.update({"figure.dpi": 130, "axes.spines.top": False, "axes.spines.right": False, "font.size": 9})
IND = ["urgency_indicator", "refund_or_reward_claim", "impersonation_indicator", "pin_requested_to_receive",
       "suspicious_link_indicator", "screen_sharing_request", "caller_claims_authority", "unsolicited_contact",
       "secrecy_requested", "emotional_pressure", "call_in_progress", "is_first_time_recipient",
       "qr_merchant_mismatch", "collect_request_unsolicited", "is_night_txn"]


def save(name):
    plt.tight_layout(); plt.savefig(os.path.join(PLOTS, name), bbox_inches="tight"); plt.close()


def md_table(frame, index=True, floatfmt="{:.3f}"):
    f = frame.reset_index() if index else frame
    head = "| " + " | ".join(map(str, f.columns)) + " |\n|" + "---|" * len(f.columns) + "\n"
    rows = ["| " + " | ".join(floatfmt.format(v) if isinstance(v, (float, np.floating)) else str(v) for v in r) + " |"
            for r in f.itertuples(index=False)]
    return head + "\n".join(rows) + "\n"


def auc_rank(x, y):
    r = pd.Series(x).rank().values
    n1, n0 = y.sum(), len(y) - y.sum()
    return (r[y == 1].sum() - n1 * (n1 + 1) / 2) / (n1 * n0)


# ----------------------------------------------------------------------------- plots
# 1. fraud distribution
fig, ax = plt.subplots(1, 3, figsize=(14, 4))
cnt = df.is_fraud.value_counts().sort_index()
ax[0].bar(["Legitimate", "Fraud"], cnt.values, color=[C_L, C_F])
for i, v in enumerate(cnt.values): ax[0].text(i, v, f"{v:,}\n({v/len(df):.1%})", ha="center", va="bottom")
ax[0].set_title("Class balance"); ax[0].set_ylim(0, cnt.max() * 1.18)
rl = pd.crosstab(df.is_fraud, df.risk_level, normalize="index")[["Low", "Medium", "High"]]
bottom = np.zeros(2)
for lvl, col in zip(rl.columns, ["#8ecae6", "#ffb703", "#d62828"]):
    ax[1].bar(["Legitimate", "Fraud"], rl[lvl].values, bottom=bottom, label=lvl, color=col); bottom += rl[lvl].values
ax[1].set_title("risk_level mix by class"); ax[1].legend(frameon=False)
m = df.assign(month=df.transaction_timestamp.dt.month).groupby("month").is_fraud.agg(["mean", "size"])
ax[2].plot(m.index, m["mean"] * 100, marker="o", color=C_F); ax[2].set_ylim(0, 25)
ax[2].set_title("Monthly fraud rate (%)"); ax[2].set_xlabel("month")
save("01_fraud_distribution.png")

# 2. fraud categories
fc = FRAUD.fraud_category.value_counts().sort_values()
fig, ax = plt.subplots(1, 2, figsize=(13, 4.5))
ax[0].barh(fc.index, fc.values, color=C_F); ax[0].set_title("Fraud transactions by category")
for i, v in enumerate(fc.values): ax[0].text(v, i, f" {v:,}", va="center")
order = FRAUD.groupby("fraud_category").amount_inr.median().sort_values().index
ax[1].boxplot([FRAUD[FRAUD.fraud_category == c].amount_inr for c in order], vert=False, tick_labels=order,
              showfliers=False, patch_artist=True, boxprops=dict(facecolor="#f4a6ad"))
ax[1].set_xscale("log"); ax[1].set_title("Amount (INR, log) by fraud category")
save("02_fraud_categories.png")

# 3. amounts
fig, ax = plt.subplots(1, 3, figsize=(15, 4))
bins = np.logspace(0, 5, 50)
ax[0].hist(LEGIT.amount_inr, bins, alpha=.7, color=C_L, label="Legitimate", density=True)
ax[0].hist(FRAUD.amount_inr, bins, alpha=.7, color=C_F, label="Fraud", density=True)
ax[0].set_xscale("log"); ax[0].set_title("Amount distribution (INR, log)"); ax[0].legend(frameon=False)
lp = LEGIT.groupby("payment_purpose").amount_inr.median().sort_values()
ax[1].barh(lp.index, lp.values, color=C_L); ax[1].set_xscale("log"); ax[1].set_title("Median amount by legit purpose")
ax[2].hist(np.log10(LEGIT.amount_to_avg_ratio.clip(.01, 1000)), 50, alpha=.7, color=C_L, density=True, label="Legitimate")
ax[2].hist(np.log10(FRAUD.amount_to_avg_ratio.clip(.01, 1000)), 50, alpha=.7, color=C_F, density=True, label="Fraud")
ax[2].set_title("log10(amount / sender 30-day avg)"); ax[2].legend(frameon=False)
save("03_transaction_amounts.png")

# 4. suspicious indicators
rates = pd.DataFrame({"Legitimate": LEGIT[IND].mean(), "Fraud": FRAUD[IND].mean()}).sort_values("Fraud")
fig, ax = plt.subplots(figsize=(9, 6)); y = np.arange(len(rates))
ax.barh(y - .2, rates.Legitimate, .4, color=C_L, label="Legitimate"); ax.barh(y + .2, rates.Fraud, .4, color=C_F, label="Fraud")
ax.set_yticks(y, rates.index); ax.set_xlabel("share of transactions with indicator = 1"); ax.legend(frameon=False)
ax.set_title("Suspicious indicator prevalence: fraud vs legitimate")
save("04_suspicious_indicators.png")

# 5. indicators by category heatmap
hm = df.groupby("fraud_category")[IND[:11]].mean()
fig, ax = plt.subplots(figsize=(11, 5.5)); im = ax.imshow(hm.values, cmap="YlOrRd", aspect="auto", vmin=0, vmax=1)
ax.set_xticks(range(hm.shape[1]), hm.columns, rotation=40, ha="right"); ax.set_yticks(range(hm.shape[0]), hm.index)
for i in range(hm.shape[0]):
    for j in range(hm.shape[1]): ax.text(j, i, f"{hm.values[i, j]:.2f}", ha="center", va="center", fontsize=7)
plt.colorbar(im, ax=ax, label="rate"); ax.set_title("Indicator rate by fraud category")
save("05_indicators_by_category.png")

# 6. temporal + recipient profile
fig, ax = plt.subplots(1, 3, figsize=(15, 4))
for d, c, l in ((LEGIT, C_L, "Legitimate"), (FRAUD, C_F, "Fraud")):
    ax[0].plot(range(24), d.hour_of_day.value_counts(normalize=True).sort_index(), color=c, label=l, marker=".")
    ax[1].hist(d.recipient_account_age_days.clip(upper=1500), 40, alpha=.7, color=c, density=True, label=l)
    ax[2].hist(d.recipient_reputation_score, 40, alpha=.7, color=c, density=True, label=l)
ax[0].set_title("Hour-of-day share"); ax[0].set_xlabel("hour"); ax[0].legend(frameon=False)
ax[1].set_title("Recipient account age (days, clipped at 1500)"); ax[2].set_title("Recipient reputation score")
save("06_time_and_recipient_profile.png")

# ----------------------------------------------------------------------------- validation
single_auc = {c: max(auc_rank(df[c].values, df.is_fraud.values), 1 - auc_rank(df[c].values, df.is_fraud.values))
              for c in cfg["numeric_features"]}
single_auc = pd.Series(single_auc).sort_values(ascending=False)
corr = df[cfg["numeric_features"]].corrwith(df.is_fraud).sort_values(key=abs, ascending=False)
overlap = {
    "fraud rows with <=1 of 11 core flags": float((FRAUD[IND[:11]].sum(1) <= 1).mean()),
    "fraud rows with no flag at all": float((FRAUD[IND[:11]].sum(1) == 0).mean()),
    "legit rows with >=1 core flag": float((LEGIT[IND[:11]].sum(1) >= 1).mean()),
    "legit rows with >=2 core flags": float((LEGIT[IND[:11]].sum(1) >= 2).mean()),
    "legit first-time recipients": float(LEGIT.is_first_time_recipient.mean()),
    "legit recipients < 90 days old": float((LEGIT.recipient_account_age_days < 90).mean()),
    "fraud recipients with reputation >= 60": float((FRAUD.recipient_reputation_score >= 60).mean()),
    "fraud recipients with account age >= 365 d": float((FRAUD.recipient_account_age_days >= 365).mean()),
}
checks = {
    "100,000 rows": len(df) == 100_000, "fraud rate exactly 15%": abs(df.is_fraud.mean() - .15) < 1e-9,
    "no missing values": int(df.isna().sum().sum()) == 0, "unique transaction_id": bool(df.transaction_id.is_unique),
    "first-time flag consistent with prior count": bool(((df.is_first_time_recipient == 1) == (df.prior_txns_with_recipient == 0)).all()),
    "QR flag consistent with channel": bool(((df.is_qr_payment == 1) == (df.payment_channel == "QR_Scan")).all()),
    "collect flag consistent with channel": bool(((df.is_collect_request == 1) == (df.payment_channel == "Collect_Request")).all()),
    "7d count >= 24h count": bool((df.sender_txn_count_7d >= df.sender_txn_count_24h).all()),
    "amount in [1, 100000]": bool(df.amount_inr.between(1, 100000).all()),
    "legit rows labelled 'Legitimate'": bool((df[df.is_fraud == 0].fraud_category == "Legitimate").all()),
    "no feature with |corr| > 0.9 to target": bool(corr.abs().max() < .9),
    "no single feature with AUC > 0.9": bool(single_auc.max() < .9),
    "no ID shared across train/test rows (transaction_id)": not set(tr.transaction_id) & set(te.transaction_id),
    "stratified splits keep 15% fraud": all(abs(s.is_fraud.mean() - .15) < .002 for s in (tr, va, te)),
}
assert all(checks.values()), [k for k, v in checks.items() if not v]

# ----------------------------------------------------------------------------- baseline models (sanity check only)
cat, num = cfg["categorical_features"], cfg["numeric_features"]
try:
    from xgboost import XGBClassifier
    BOOST = ("XGBoost", XGBClassifier(n_estimators=400, learning_rate=.05, max_depth=5, subsample=.8, colsample_bytree=.8,
                                      scale_pos_weight=85 / 15, eval_metric="aucpr", random_state=SEED, n_jobs=-1))
    boost_note = "XGBoost"
except Exception:
    BOOST = ("GradientBoosting (XGBoost stand-in)", HistGradientBoostingClassifier(
        max_iter=300, learning_rate=.06, max_depth=6, class_weight="balanced", random_state=SEED))
    boost_note = "sklearn HistGradientBoosting used as a stand-in because xgboost was not installable in this sandbox"
pre_lr = ColumnTransformer([("n", StandardScaler(), num), ("c", OneHotEncoder(handle_unknown="ignore"), cat)])
pre_tree = ColumnTransformer([("n", "passthrough", num), ("c", OneHotEncoder(handle_unknown="ignore"), cat)])
MODELS = {
    "Logistic Regression": Pipeline([("p", pre_lr), ("m", LogisticRegression(max_iter=2000, class_weight="balanced", C=1.0))]),
    "Random Forest": Pipeline([("p", pre_tree), ("m", RandomForestClassifier(
        n_estimators=250, min_samples_leaf=3, class_weight="balanced_subsample", n_jobs=-1, random_state=SEED))]),
    BOOST[0]: Pipeline([("p", pre_tree), ("m", BOOST[1])]),
}


def evaluate(train, val, test, tag):
    rows, curves = [], {}
    for name, pipe in MODELS.items():
        pipe.fit(train[FEATS], train.is_fraud)
        pv, pt = pipe.predict_proba(val[FEATS])[:, 1], pipe.predict_proba(test[FEATS])[:, 1]
        ths = np.linspace(.05, .95, 91)
        th = ths[int(np.argmax([f1_score(val.is_fraud, pv >= t) for t in ths]))]   # threshold picked on validation only
        yp = (pt >= th).astype(int)
        rows.append(dict(split=tag, model=name, val_roc_auc=roc_auc_score(val.is_fraud, pv),
                         test_roc_auc=roc_auc_score(test.is_fraud, pt), test_pr_auc=average_precision_score(test.is_fraud, pt),
                         threshold=th, test_precision=precision_score(test.is_fraud, yp), test_recall=recall_score(test.is_fraud, yp),
                         test_f1=f1_score(test.is_fraud, yp)))
        curves[name] = pt
    return pd.DataFrame(rows), curves


res_r, curves = evaluate(tr, va, te, "random_stratified")
res_t, _ = evaluate(ttr, tva, tte, "temporal")
results = pd.concat([res_r, res_t]); results.to_csv(os.path.join(DATASET, "baseline_model_results.csv"), index=False)

fig, ax = plt.subplots(1, 2, figsize=(11, 4.5))
for (name, p), c in zip(curves.items(), ["#457b9d", "#2a9d8f", "#e76f51"]):
    fpr, tpr, _ = roc_curve(te.is_fraud, p); pr, rc, _ = precision_recall_curve(te.is_fraud, p)
    ax[0].plot(fpr, tpr, color=c, label=name); ax[1].plot(rc, pr, color=c, label=name)
ax[0].plot([0, 1], [0, 1], "k:", lw=.8); ax[0].set_title("ROC (test, random split)"); ax[0].legend(frameon=False)
ax[1].set_title("Precision-recall (test)"); ax[1].set_xlabel("recall"); ax[1].set_ylabel("precision")
save("07_baseline_model_curves.png")

# ----------------------------------------------------------------------------- report
cat_tab = (df[df.is_fraud == 1].groupby("fraud_category").agg(
    n=("is_fraud", "size"), median_amount=("amount_inr", "median"), mean_amount=("amount_inr", "mean"),
    pct_first_time=("is_first_time_recipient", "mean"), mean_se_score=("social_engineering_risk_score", "mean"),
    pct_high_risk=("risk_level", lambda s: (s == "High").mean())).sort_values("n", ascending=False))
class_tab = df.groupby("is_fraud").agg(
    median_amount=("amount_inr", "median"), mean_amount=("amount_inr", "mean"), p95_amount=("amount_inr", lambda s: s.quantile(.95)),
    recipient_age_median=("recipient_account_age_days", "median"), reputation_mean=("recipient_reputation_score", "mean"),
    first_time=("is_first_time_recipient", "mean"), night=("is_night_txn", "mean"), se_score=("social_engineering_risk_score", "mean"))
class_tab.index = ["Legitimate", "Fraud"]
split_tab = pd.DataFrame({n: {"rows": len(s), "fraud": int(s.is_fraud.sum()), "fraud_rate": s.is_fraud.mean()}
                          for n, s in (("train", tr), ("val", va), ("test", te), ("temporal_train", ttr), ("temporal_val", tva), ("temporal_test", tte))}).T
split_tab["rows"] = split_tab["rows"].astype(int); split_tab["fraud"] = split_tab["fraud"].astype(int)
ind_tab = pd.DataFrame({"legit": LEGIT[IND].mean(), "fraud": FRAUD[IND].mean()}); ind_tab["lift"] = ind_tab.fraud / ind_tab.legit.clip(lower=1e-4)
ind_tab = ind_tab.sort_values("fraud", ascending=False)
risk_tab = pd.crosstab(df.is_fraud.map({0: "Legitimate", 1: "Fraud"}), df.risk_level, normalize="index")[["Low", "Medium", "High"]]
res_show = results.drop(columns=["val_roc_auc"]).round(3)

R = f"""# UPI Rakshak - Synthetic Dataset Analysis Report

**All data in this dataset is fully synthetic** (generated with NumPy/Pandas, seed 42). No real UPI IDs, people, banks or transactions were used.

## 1. Overview
| Item | Value |
|---|---|
| Rows / columns | {len(df):,} / {df.shape[1]} |
| Legitimate / fraud | {len(LEGIT):,} (85.0%) / {len(FRAUD):,} (15.0%) |
| Period | {df.transaction_timestamp.min():%Y-%m-%d} to {df.transaction_timestamp.max():%Y-%m-%d} |
| Unique senders / recipients | {df.sender_id.nunique():,} / {df.recipient_id.nunique():,} |
| Targets | `is_fraud` (binary), `fraud_category` (11 classes), `risk_level` (Low/Medium/High) |
| Model features | {len(FEATS)} ({len(num)} numeric/binary, {len(cat)} categorical) |

Legitimate purposes: grocery, merchant payment, family transfer, shopping, bill payment, food delivery, friends, rent, education fees, investment, marketplace sale, other.
Fraud scenarios (10): fake refund, fake customer care, QR code, collect request, fake job offer, investment, lottery/cashback, impersonation, digital arrest, screen sharing.

## 2. Fraud distribution
![](plots/01_fraud_distribution.png)

{md_table(cat_tab.rename(columns={"n": "fraud_rows"}), floatfmt="{:,.2f}")}
![](plots/02_fraud_categories.png)

## 3. Transaction amounts
{md_table(class_tab, floatfmt="{:,.2f}")}
Amounts are lognormal per scenario, capped at Rs 1,00,000 (typical UPI limit). Digital arrest and investment scams skew large, but fake refund, lottery and QR scams overlap strongly with everyday amounts.

![](plots/03_transaction_amounts.png)

## 4. Suspicious indicators
{md_table(ind_tab, floatfmt="{:.3f}")}
![](plots/04_suspicious_indicators.png)
![](plots/05_indicators_by_category.png)
![](plots/06_time_and_recipient_profile.png)

## 5. Realism: class overlap (by design)
Each row mixes a legitimate profile with a scam profile through a hidden weight (not saved). About 20% of fraud rows are "stealth" (look mostly normal) and about 17% of legitimate rows borrow some scam-like traits (urgent bills, new landlords, genuine support calls).

{md_table(pd.DataFrame({"share": overlap}), floatfmt="{:.1%}")}
`risk_level` vs class (row-normalised):

{md_table(risk_tab)}
## 6. Leakage checks
{chr(10).join(f"- {'PASS' if v else 'FAIL'}: {k}" for k, v in checks.items())}

Top single-feature AUCs (no single feature solves the task):

{md_table(single_auc.head(8).rename("single_feature_auc").to_frame(), floatfmt="{:.3f}")}
Rules to avoid leakage when modelling:
- Exclude `transaction_id`, `transaction_timestamp`, `sender_id`, `recipient_id` (mule recipient IDs repeat across rows).
- Exclude `fraud_category` and `risk_level` from `is_fraud` models; both are derived from the outcome. `risk_level` is an analyst-style triage label, not a pre-transaction input.
- The hidden mixing weights used for generation are not stored.
- Fit scalers/encoders on `train` only. Pick thresholds on `val`; report once on `test`.

## 7. Splits
{md_table(split_tab, floatfmt="{:.4f}")}
`splits/train|val|test.csv`: stratified random 70/15/15 on is_fraud x fraud_category. `splits/temporal_*.csv`: first 70% / next 15% / last 15% by time, a harder and more deployment-like check.

## 8. Baseline sanity check (not tuned)
Quick default-ish models to show the dataset is learnable but not trivial. Threshold chosen on validation to maximise F1. {boost_note}.

{md_table(res_show, index=False)}
![](plots/07_baseline_model_curves.png)

## 9. Limitations
- Synthetic: relationships come from the generator's assumptions, so absolute scores will not transfer to real UPI data. Use it for pipeline, model-comparison and methodology work.
- Sender/recipient velocity features are simulated per row, not computed from a full transaction graph.
- Fraud prevalence of 15% is far above real-world rates (well below 1%); for realism, evaluate with precision-recall metrics and consider down-sampling fraud for a low-prevalence test.
- Random splits share sender/recipient entities across sets (IDs are excluded from features).
"""
open(os.path.join(D, "dataset_analysis_report.md"), "w").write(R)
print(res_show.to_string(index=False))
print(single_auc.head(5).round(3).to_string())
print({k: round(v, 3) for k, v in overlap.items()})
print("all checks passed:", all(checks.values()))
