#!/usr/bin/env python3
"""
UPI Rakshak - Synthetic UPI transaction dataset generator
=========================================================
Generates 100,000 fully synthetic UPI transactions (85% legitimate, 15% fraud
across 10 scam scenarios), a feature dictionary, stratified train/val/test
splits and a feature config. Only NumPy + Pandas are used.

Realism / overlap design
------------------------
Every row blends a *legitimate base profile* (its payment purpose) with a
*scam profile* using a mixing weight w in [0, 1]:

    p(feature) = (1 - w) * p_legit(purpose) + w * p_scam(scenario)

* Fraud rows:  w ~ 20% "stealth" (0.05-0.35), 35% "moderate" (0.35-0.70),
               45% "classic" (0.70-1.00)  -> many scams look fairly normal.
* Legit rows:  83% w = 0, 12% w in (0.05-0.30), 5% hard negatives (0.30-0.55)
               -> some genuine payments look risky (urgent bills, new
               landlords, real customer-care calls, etc.).
w is a hidden generation variable and is NOT saved (no target leakage).

Run:  python generate_upi_dataset.py
"""
import json
import os

import numpy as np
import pandas as pd

SEED = 42
N_TOTAL = 100_000
N_FRAUD = 15_000
N_LEGIT = N_TOTAL - N_FRAUD
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(OUT_DIR, "dataset")
SPLIT_DIR = os.path.join(OUT_DIR, "splits")
os.makedirs(DATASET_DIR, exist_ok=True)
os.makedirs(SPLIT_DIR, exist_ok=True)
rng = np.random.default_rng(SEED)

# ----------------------------------------------------------------------------
# Scenario definitions
# ----------------------------------------------------------------------------
FRAUD_COUNTS = {
    "Fake_Refund": 1650, "Fake_Customer_Care": 1800, "QR_Code_Scam": 1200,
    "Collect_Request_Scam": 1500, "Fake_Job_Offer": 1350, "Investment_Scam": 1650,
    "Lottery_Cashback_Scam": 1350, "Impersonation_Scam": 1500,
    "Digital_Arrest": 1200, "Screen_Sharing_Scam": 1800,
}
assert sum(FRAUD_COUNTS.values()) == N_FRAUD
CATS = list(FRAUD_COUNTS)

LEGIT_PURPOSES = ["grocery", "merchant_payment", "family_transfer", "shopping",
                  "bill_payment", "food_delivery", "p2p_friends", "rent",
                  "education_fees", "investment", "marketplace_sale", "other"]
LEGIT_W = np.array([.19, .17, .13, .11, .11, .06, .08, .04, .02, .02, .01, .06])
LEGIT_W = LEGIT_W / LEGIT_W.sum()
# 0 = merchant-type, 1 = person-type, 2 = bill/other
PURPOSE_GROUP = np.array([0, 0, 1, 0, 2, 0, 1, 1, 2, 2, 1, 2])

SCAM_PURPOSE = {
    "Fake_Refund": ["refund_claim"], "Fake_Customer_Care": ["service_fee"],
    "QR_Code_Scam": ["marketplace_sale"], "Collect_Request_Scam": ["other"],
    "Fake_Job_Offer": ["registration_fee"], "Investment_Scam": ["investment"],
    "Lottery_Cashback_Scam": ["prize_claim"],
    "Impersonation_Scam": ["family_transfer", "p2p_friends"],
    "Digital_Arrest": ["fine_or_penalty"],
    "Screen_Sharing_Scam": ["service_fee", "kyc_update"],
}

BIN = ["urgency_indicator", "refund_or_reward_claim", "impersonation_indicator",
       "pin_requested_to_receive", "suspicious_link_indicator",
       "screen_sharing_request", "caller_claims_authority", "unsolicited_contact",
       "secrecy_requested", "emotional_pressure", "call_in_progress"]
#                          urg  rfnd  imp   pin   link  scr   auth  unsol secr  emot  call
SCAM_BIN = {
    "Fake_Refund":           [.45, .92, .35, .50, .35, .15, .10, .75, .10, .25, .45],
    "Fake_Customer_Care":    [.60, .35, .80, .25, .30, .45, .35, .55, .20, .35, .85],
    "QR_Code_Scam":          [.30, .40, .20, .55, .10, .05, .05, .50, .05, .10, .30],
    "Collect_Request_Scam":  [.45, .35, .35, .60, .10, .05, .10, .85, .08, .20, .25],
    "Fake_Job_Offer":        [.35, .05, .45, .05, .55, .05, .05, .85, .10, .15, .25],
    "Investment_Scam":       [.50, .10, .30, .03, .65, .10, .05, .70, .20, .25, .30],
    "Lottery_Cashback_Scam": [.55, .85, .25, .35, .60, .08, .05, .85, .12, .30, .25],
    "Impersonation_Scam":    [.70, .05, .95, .03, .15, .05, .15, .70, .35, .60, .35],
    "Digital_Arrest":        [.90, .02, .95, .03, .15, .30, .95, .95, .92, .95, .95],
    "Screen_Sharing_Scam":   [.55, .25, .55, .20, .30, .95, .25, .60, .25, .30, .85],
}
SCAM_BIN_ARR = np.array([SCAM_BIN[c] for c in CATS])

BASE_DEFAULT = dict(zip(BIN, [.07, .015, .012, .003, .03, .008, .01, .05, .004, .03, .06]))
BASE_OVERRIDES = {
    "bill_payment": dict(urgency_indicator=.30, suspicious_link_indicator=.09, unsolicited_contact=.08,
                         call_in_progress=.03, caller_claims_authority=.02),
    "shopping": dict(refund_or_reward_claim=.05, suspicious_link_indicator=.10, urgency_indicator=.10),
    "family_transfer": dict(urgency_indicator=.14, emotional_pressure=.06, call_in_progress=.16,
                            unsolicited_contact=.08, impersonation_indicator=.02),
    "rent": dict(urgency_indicator=.12, call_in_progress=.08),
    "food_delivery": dict(urgency_indicator=.05, call_in_progress=.12, unsolicited_contact=.06),
    "education_fees": dict(urgency_indicator=.20, suspicious_link_indicator=.08),
    "investment": dict(suspicious_link_indicator=.12, urgency_indicator=.15, unsolicited_contact=.10,
                       call_in_progress=.10),
    "marketplace_sale": dict(suspicious_link_indicator=.10, unsolicited_contact=.20, call_in_progress=.12,
                             refund_or_reward_claim=.04, urgency_indicator=.10, pin_requested_to_receive=.02),
    "p2p_friends": dict(call_in_progress=.12, urgency_indicator=.10),
    "other": dict(urgency_indicator=.10, unsolicited_contact=.10),
}
BASE_BIN_ARR = np.array([[{**BASE_DEFAULT, **BASE_OVERRIDES.get(p, {})}[f] for f in BIN]
                         for p in LEGIT_PURPOSES])

CHANNELS = ["QR_Scan", "UPI_ID_Manual", "Collect_Request", "Contact_Pick", "Payment_Link", "Merchant_Intent"]
BASE_CH = np.array([[.50, .06, .02, .04, .08, .30],
                    [.08, .25, .04, .60, .01, .02],
                    [.08, .15, .08, .04, .15, .50]])
SCAM_CH = np.array([[.15, .40, .25, .05, .15, .00], [.10, .45, .15, .10, .20, .00],
                    [.88, .05, .00, .02, .05, .00], [.02, .05, .90, .00, .03, .00],
                    [.10, .55, .00, .10, .25, .00], [.10, .45, .00, .10, .35, .00],
                    [.10, .30, .20, .00, .40, .00], [.05, .55, .00, .35, .05, .00],
                    [.15, .60, .10, .10, .05, .00], [.10, .50, .20, .05, .15, .00]])

VERIF = ["Verified_Merchant", "Saved_Contact", "Bank_Name_Verified", "Name_Mismatch", "Unverified"]
BASE_VER = np.array([[.68, .04, .18, .02, .08], [.01, .55, .30, .03, .11], [.50, .06, .30, .03, .11]])
SCAM_VER = np.array([[.06, .04, .24, .20, .46], [.10, .04, .22, .22, .42], [.12, .03, .25, .22, .38],
                     [.06, .03, .25, .22, .44], [.10, .03, .20, .20, .47], [.15, .03, .22, .15, .45],
                     [.05, .03, .22, .22, .48], [.02, .10, .20, .28, .40], [.03, .04, .25, .25, .43],
                     [.07, .04, .24, .20, .45]])

SCAM_QRMM = np.array([.15, .12, .55, .10, .10, .10, .15, .10, .10, .10])
SCAM_COLL_UNSOL = np.array([.85, .70, .50, .95, .60, .60, .90, .80, .80, .75])
BASE_FT = np.array([.08, .30, .04, .45, .10, .12, .15, .10, .25, .30, .75, .45])   # P(first-time recipient)
SCAM_FT = np.array([.93, .92, .95, .90, .72, .60, .88, .82, .95, .90])
BASE_LAM = np.array([4, 2, 10, 1.5, 5, 3, 3, 6, 2, 3, 1, 1.5])                    # repeat-payment intensity

BASE_AMT = [(450, .8), (700, .9), (3000, 1.0), (1500, 1.0), (1200, .8), (380, .5),
            (600, .9), (12000, .6), (15000, .8), (3000, .8), (2500, 1.0), (1000, 1.1)]
SCAM_AMT = [(3500, .9), (5000, 1.0), (4000, .9), (6000, .9), (1500, .6),
            (25000, .9), (2500, .8), (8000, .9), (60000, .6), (15000, 1.0)]

AGE_GROUPS = np.array(["18-25", "26-35", "36-50", "51-60", "60+"])
TIERS = np.array(["Metro", "Tier-2", "Tier-3", "Rural"])
AGE_VULN = {
    "default": [.9, .8, 1.0, 1.4, 2.0], "Digital_Arrest": [.3, .5, 1.0, 2.5, 4.0],
    "Impersonation_Scam": [.6, .8, 1.0, 2.0, 3.5], "Fake_Job_Offer": [3.0, 2.0, .7, .3, .1],
    "Investment_Scam": [.5, 1.5, 2.0, 1.3, .8], "Screen_Sharing_Scam": [.6, .8, 1.0, 1.8, 2.8],
    "Fake_Refund": [1.2, 1.2, 1.0, 1.1, 1.2], "QR_Code_Scam": [1.2, 1.3, 1.0, .9, .8],
}

HOUR_DEFAULT = [.2, .1, .08, .06, .06, .15, .6, 1.4, 2.6, 3.6, 4.2, 4.5, 4.6, 4.2, 3.8, 3.8, 4.0, 4.6, 5.4, 5.8, 5.2, 3.8, 2.0, .8]
HOUR_FOOD = [.3, .2, .1, .05, .03, .05, .2, .6, 1.0, 1.5, 2.0, 3.5, 6.0, 6.0, 3.5, 2.0, 2.0, 2.5, 3.5, 6.0, 7.0, 6.5, 4.0, 1.5]
HOUR_SCAM = [.8, .6, .5, .4, .3, .4, .6, 1.0, 2.0, 3.0, 4.0, 5.0, 5.0, 4.5, 4.5, 4.5, 4.5, 4.5, 5.0, 5.5, 5.5, 5.0, 4.0, 2.0]
HOUR_PMF = {k: np.array(v) / np.sum(v) for k, v in
            {"default": HOUR_DEFAULT, "food": HOUR_FOOD, "scam": HOUR_SCAM}.items()}

DATES = pd.date_range("2025-01-01", "2025-12-31", freq="D")
_dom, _dow = DATES.day.values, DATES.dayofweek.values
DAY_PMF = {"flat": np.ones(len(DATES)), "rent": 1 + 5.0 * (_dom <= 7),
           "bill": 1 + 1.5 * ((_dom <= 10) | (_dom >= 25)), "scam": 1 + 0.15 * (_dow >= 5)}
DAY_PMF = {k: v / v.sum() for k, v in DAY_PMF.items()}


def sample_cat(P):
    P = P / P.sum(1, keepdims=True)
    cum = P.cumsum(1)
    return np.minimum((rng.random(len(P))[:, None] > cum).sum(1), P.shape[1] - 1)


def sample_by_key(keys, pmf, support):
    out = np.empty(len(keys), dtype=int)
    for k in np.unique(keys):
        m = keys == k
        out[m] = rng.choice(support, m.sum(), p=pmf[k])
    return out


# ----------------------------------------------------------------------------
# Row skeleton: labels, scenarios, hidden mixing weight
# ----------------------------------------------------------------------------
n = N_TOTAL
is_fraud = np.r_[np.ones(N_FRAUD, int), np.zeros(N_LEGIT, int)]
scam_idx = np.r_[np.repeat(np.arange(10), list(FRAUD_COUNTS.values())), rng.integers(0, 10, N_LEGIT)]
u = rng.random(N_FRAUD)
lam = np.where(u < .20, rng.uniform(.05, .35, N_FRAUD),
               np.where(u < .55, rng.uniform(.35, .70, N_FRAUD), rng.uniform(.70, 1.0, N_FRAUD)))
u = rng.random(N_LEGIT)
mu = np.where(u < .83, 0.0, np.where(u < .95, rng.uniform(.05, .30, N_LEGIT), rng.uniform(.30, .55, N_LEGIT)))
w = np.r_[lam, mu]                                   # hidden - never exported
base_idx = rng.choice(len(LEGIT_PURPOSES), n, p=LEGIT_W)
group = PURPOSE_GROUP[base_idx]
base_name = np.array(LEGIT_PURPOSES)[base_idx]
W = w[:, None]

# ----------------------------------------------------------------------------
# Payment purpose
# ----------------------------------------------------------------------------
scam_purpose_row = np.empty(n, dtype=object)
for i, c in enumerate(CATS):
    m = scam_idx == i
    scam_purpose_row[m] = rng.choice(SCAM_PURPOSE[c], m.sum())
payment_purpose = np.where(rng.random(n) < w, scam_purpose_row, base_name)

# ----------------------------------------------------------------------------
# Amount
# ----------------------------------------------------------------------------
b_med = np.array([BASE_AMT[i][0] for i in base_idx]); b_sig = np.array([BASE_AMT[i][1] for i in base_idx])
s_med = np.array([SCAM_AMT[i][0] for i in scam_idx]); s_sig = np.array([SCAM_AMT[i][1] for i in scam_idx])
use_s = rng.random(n) < w
amt = np.exp(np.log(np.where(use_s, s_med, b_med)) + np.where(use_s, s_sig, b_sig) * rng.standard_normal(n))
over = amt > 100_000
amt[over] = rng.uniform(30_000, 100_000, over.sum())     # UPI per-txn cap (~Rs 1 lakh)
p_r100 = np.where(base_name == "rent", .50, (1 - w) * .12 + w * .35)
ru = rng.random(n)
amt = np.where(ru < p_r100, np.where(amt >= 300, np.round(amt, -2), np.round(amt, -1)),
               np.where(ru < p_r100 + .30, np.round(amt), np.round(amt, 2)))
amount = np.clip(amt, 1, 100_000)

# ----------------------------------------------------------------------------
# Date / time
# ----------------------------------------------------------------------------
base_day = np.where(base_name == "rent", "rent", np.where(base_name == "bill_payment", "bill", "flat"))
day_key = np.where(rng.random(n) < w, "scam", base_day)
day_i = sample_by_key(day_key, DAY_PMF, len(DATES))
hour_key = np.where(rng.random(n) < w, "scam", np.where(base_name == "food_delivery", "food", "default"))
hour = sample_by_key(hour_key, HOUR_PMF, 24)
ts = DATES[day_i] + pd.to_timedelta(hour * 3600 + rng.integers(0, 3600, n), unit="s")

# ----------------------------------------------------------------------------
# Sender pool and per-transaction sender features
# ----------------------------------------------------------------------------
NS = 30_000
s_age = rng.choice(5, NS, p=[.22, .30, .25, .13, .10])
s_tier = rng.choice(4, NS, p=[.28, .30, .25, .17])
s_acct = np.clip(rng.lognormal(np.log(1000), .9, NS), 20, 3800).astype(int)
s_avg = np.clip(rng.lognormal(np.log(900), .7, NS) * np.array([1.3, 1.0, .8, .6])[s_tier], 50, 20_000)
s_rate = np.clip(rng.lognormal(np.log(.8), .7, NS), .05, 8)
s_ids = np.array([f"snd_{x:08d}@synupi" for x in rng.permutation(NS) + 20_000_000])

sender = np.empty(n, dtype=int)
m = is_fraud == 0
sender[m] = rng.choice(NS, m.sum(), p=s_rate / s_rate.sum())
for i, c in enumerate(CATS):
    m = (is_fraud == 1) & (scam_idx == i)
    p = np.array(AGE_VULN.get(c, AGE_VULN["default"]))[s_age] * (1 + .4 * (s_acct < 180))
    sender[m] = rng.choice(NS, m.sum(), p=p / p.sum())

rate = s_rate[sender]
c24 = rng.poisson(rate)
c7 = c24 + rng.poisson(6 * rate)
extra = (is_fraud == 1) & (rng.random(n) < .30)          # in-scam repeated attempts (weak signal)
bump = rng.poisson(.8, n) * extra
c24 += bump; c7 += bump
avg30 = s_avg[sender] * np.exp(.1 * rng.standard_normal(n))

# ----------------------------------------------------------------------------
# Recipient pools (merchants / individuals / money-mule accounts)
# ----------------------------------------------------------------------------
NM, NI, NU = 4_000, 45_000, 3_000
r_age = np.empty(NM + NI + NU); r_rep = np.empty_like(r_age); r_cmp = np.empty(NM + NI + NU, int)
r_rate = np.empty_like(r_age); r_type = np.empty(NM + NI + NU, dtype=object)
# merchants
r_age[:NM] = np.clip(rng.lognormal(np.log(1100), .8, NM), 30, 5000)
r_rep[:NM] = rng.beta(9, 2, NM) * 100
r_cmp[:NM] = rng.poisson(.08, NM); r_rate[:NM] = rng.lognormal(np.log(35), .7, NM); r_type[:NM] = "Merchant"
# individuals (8% newly opened accounts)
sl = slice(NM, NM + NI)
new = rng.random(NI) < .08
age_i = np.where(new, rng.uniform(3, 90, NI), np.clip(rng.lognormal(np.log(1400), .9, NI), 30, 6000))
r_age[sl] = age_i
r_rep[sl] = np.clip(rng.beta(6, 2.2, NI) * 100 - new * rng.uniform(5, 25, NI), 0, 100)
r_cmp[sl] = rng.poisson(.05, NI); r_rate[sl] = rng.lognormal(np.log(1.0), .7, NI); r_type[sl] = "Individual"
# mules: 72% fresh accounts, 28% aged / good-looking
sl = slice(NM + NI, NM + NI + NU)
fresh = rng.random(NU) < .72
r_age[sl] = np.where(fresh, np.clip(rng.lognormal(np.log(35), 1.0, NU), 1, 400),
                     np.clip(rng.lognormal(np.log(500), .9, NU), 20, 3000))
r_rep[sl] = np.where(fresh, rng.beta(3, 5, NU), rng.beta(5, 3.5, NU)) * 100
r_cmp[sl] = rng.poisson(np.where(fresh, 1.4, .7)); r_rate[sl] = rng.lognormal(np.log(5), .7, NU)
r_type[sl] = np.where(rng.random(NU) < .22, "Merchant", "Individual")
r_ids = np.array([f"rcp_{x:08d}@synupi" for x in rng.permutation(NM + NI + NU) + 30_000_000])

p_mule = np.where(is_fraud == 1, .55 + .35 * w, 0.0)
to_mule = rng.random(n) < p_mule
to_merch = (~to_mule) & (rng.random(n) < np.array([.90, .0, .80])[group])
pool = np.where(to_mule, 2, np.where(to_merch, 1, 0))      # 2 = mule, 1 = merchant, 0 = individual
rec = np.empty(n, dtype=int)
pw = {1: rng.lognormal(0, 1, NM), 0: np.ones(NI), 2: rng.lognormal(0, 1, NU)}
off = {1: 0, 0: NM, 2: NM + NI}
size = {1: NM, 0: NI, 2: NU}
for k in (0, 1, 2):
    mk = pool == k
    rec[mk] = off[k] + rng.choice(size[k], mk.sum(), p=pw[k] / pw[k].sum())

rec_age = r_age[rec].astype(int)
rec_rep = np.round(r_rep[rec], 1)
rec_cmp = r_cmp[rec]
rec_senders24 = 1 + rng.poisson(r_rate[rec])

# first-time recipient / prior payments
p_ft = (1 - w) * BASE_FT[base_idx] + w * SCAM_FT[scam_idx]
first = rng.random(n) < p_ft
prior = np.where(first, 0, 1 + rng.poisson((1 - w) * BASE_LAM[base_idx] + w * 1.2))

# ----------------------------------------------------------------------------
# Channel, verification, binary indicators
# ----------------------------------------------------------------------------
ch = sample_cat((1 - W) * BASE_CH[group] + W * SCAM_CH[scam_idx])
channel = np.array(CHANNELS)[ch]
is_qr = (channel == "QR_Scan").astype(int)
is_coll = (channel == "Collect_Request").astype(int)
qrmm = (is_qr == 1) & (rng.random(n) < (1 - w) * .03 + w * SCAM_QRMM[scam_idx])
coll_unsol = (is_coll == 1) & (rng.random(n) < (1 - w) * .10 + w * SCAM_COLL_UNSOL[scam_idx])
verification = np.array(VERIF)[sample_cat((1 - W) * BASE_VER[group] + W * SCAM_VER[scam_idx])]

P = (1 - W) * BASE_BIN_ARR[base_idx] + W * SCAM_BIN_ARR[scam_idx]
X = (rng.random(P.shape) < P).astype(int)
ix = {f: i for i, f in enumerate(BIN)}
# natural co-occurrence between indicators (applies to both classes)
X[(X[:, ix["screen_sharing_request"]] == 1) & (rng.random(n) < .7), ix["call_in_progress"]] = 1
X[(X[:, ix["caller_claims_authority"]] == 1) & (rng.random(n) < .8), ix["impersonation_indicator"]] = 1
X[(X[:, ix["secrecy_requested"]] == 1) & (rng.random(n) < .6), ix["emotional_pressure"]] = 1
F = {f: X[:, i] for f, i in ix.items()}

se_score = np.clip(.18 * F["caller_claims_authority"] + .16 * F["secrecy_requested"] + .16 * F["emotional_pressure"]
                   + .14 * F["unsolicited_contact"] + .12 * F["call_in_progress"] + .12 * F["urgency_indicator"]
                   + .12 * F["impersonation_indicator"] + .04 * rng.standard_normal(n), 0, 1).round(3)

# ----------------------------------------------------------------------------
# Time-derived + ratio features
# ----------------------------------------------------------------------------
dow = ts.dayofweek.values
is_night = ((hour >= 23) | (hour <= 5)).astype(int)
ratio = np.round(amount / avg30, 3)

# ----------------------------------------------------------------------------
# risk_level - analyst-style triage label (post-hoc target, NOT a feature)
# rule-engine score from observable signals + confirmed-fraud outcome + noise
# ----------------------------------------------------------------------------
rule = (.06 * first + .10 * (1 - rec_rep / 100) + .08 * (rec_age < 30) + .04 * ((rec_age >= 30) & (rec_age < 90))
        + .15 * F["pin_requested_to_receive"] + .08 * F["suspicious_link_indicator"] + .12 * F["screen_sharing_request"]
        + .10 * F["impersonation_indicator"] + .06 * F["urgency_indicator"] + .06 * F["refund_or_reward_claim"]
        + .10 * F["secrecy_requested"] + .08 * F["caller_claims_authority"] + .05 * F["unsolicited_contact"]
        + .04 * F["emotional_pressure"] + .06 * (verification == "Name_Mismatch") + .03 * (verification == "Unverified")
        + .06 * (ratio > 5) + .02 * is_night + .05 * (rec_senders24 >= 5) + .05 * qrmm + .05 * coll_unsol)
risk_score = .55 * np.clip(rule / .55, 0, 1) + .22 * is_fraud + .09 * rng.standard_normal(n)
risk_level = np.where(risk_score >= .58, "High", np.where(risk_score >= .32, "Medium", "Low"))

# ----------------------------------------------------------------------------
# Assemble + sort chronologically
# ----------------------------------------------------------------------------
df = pd.DataFrame({
    "transaction_timestamp": ts, "sender_id": s_ids[sender], "recipient_id": r_ids[rec],
    "amount_inr": amount, "hour_of_day": hour, "day_of_week": dow,
    "is_weekend": (dow >= 5).astype(int), "is_night_txn": is_night,
    "sender_age_group": AGE_GROUPS[s_age[sender]], "sender_city_tier": TIERS[s_tier[sender]],
    "sender_account_age_days": s_acct[sender], "sender_avg_amount_30d": avg30.round(2),
    "amount_to_avg_ratio": ratio, "sender_txn_count_24h": c24, "sender_txn_count_7d": c7,
    "recipient_account_type": r_type[rec], "recipient_account_age_days": rec_age,
    "recipient_reputation_score": rec_rep, "recipient_prior_complaints": rec_cmp,
    "recipient_unique_senders_24h": rec_senders24, "prior_txns_with_recipient": prior,
    "is_first_time_recipient": (prior == 0).astype(int),
    "payment_purpose": payment_purpose, "payment_channel": channel,
    "is_qr_payment": is_qr, "is_collect_request": is_coll,
    "qr_merchant_mismatch": qrmm.astype(int), "collect_request_unsolicited": coll_unsol.astype(int),
    "urgency_indicator": F["urgency_indicator"], "refund_or_reward_claim": F["refund_or_reward_claim"],
    "impersonation_indicator": F["impersonation_indicator"], "pin_requested_to_receive": F["pin_requested_to_receive"],
    "suspicious_link_indicator": F["suspicious_link_indicator"], "screen_sharing_request": F["screen_sharing_request"],
    "recipient_verification_status": verification,
    "caller_claims_authority": F["caller_claims_authority"], "unsolicited_contact": F["unsolicited_contact"],
    "secrecy_requested": F["secrecy_requested"], "emotional_pressure": F["emotional_pressure"],
    "call_in_progress": F["call_in_progress"], "social_engineering_risk_score": se_score,
    "is_fraud": is_fraud,
    "fraud_category": np.where(is_fraud == 1, np.array(CATS)[scam_idx], "Legitimate"),
    "risk_level": risk_level,
})
df = df.sort_values("transaction_timestamp", kind="stable").reset_index(drop=True)
df.insert(0, "transaction_id", [f"UPIRK{i:07d}" for i in range(1, n + 1)])
df["transaction_timestamp"] = df["transaction_timestamp"].dt.strftime("%Y-%m-%d %H:%M:%S")

# ----------------------------------------------------------------------------
# Feature dictionary
# ----------------------------------------------------------------------------
D = [
 ("transaction_id", "string", "identifier", "Unique synthetic transaction ID (chronological order).", "UPIRK0000001 ..."),
 ("transaction_timestamp", "datetime", "identifier", "Synthetic transaction date and time (2025-01-01 to 2025-12-31).", "YYYY-MM-DD HH:MM:SS"),
 ("sender_id", "string", "identifier", "Fully synthetic sender VPA. Not a real UPI ID. Exclude from model features.", "snd_XXXXXXXX@synupi"),
 ("recipient_id", "string", "identifier", "Fully synthetic recipient VPA (opaque; prefix does not reveal type). Exclude from model features: mule IDs repeat.", "rcp_XXXXXXXX@synupi"),
 ("amount_inr", "float", "numeric", "Transaction amount in INR; capped at Rs 1,00,000 (typical UPI per-transaction limit).", "1 - 100000"),
 ("hour_of_day", "int", "numeric", "Hour of transaction (0-23).", "0-23"),
 ("day_of_week", "int", "numeric", "Day of week, Monday = 0.", "0-6"),
 ("is_weekend", "int", "binary", "1 if Saturday/Sunday.", "0/1"),
 ("is_night_txn", "int", "binary", "1 if transaction between 23:00 and 05:59.", "0/1"),
 ("sender_age_group", "category", "categorical", "Sender age band (scams target different groups with different probability).", "18-25, 26-35, 36-50, 51-60, 60+"),
 ("sender_city_tier", "category", "categorical", "Sender city tier.", "Metro, Tier-2, Tier-3, Rural"),
 ("sender_account_age_days", "int", "numeric", "Age of the sender's UPI registration in days.", "20 - 3800"),
 ("sender_avg_amount_30d", "float", "numeric", "Sender's average transaction amount over the previous 30 days (INR).", "50 - ~30000"),
 ("amount_to_avg_ratio", "float", "numeric", "amount_inr / sender_avg_amount_30d; spikes indicate out-of-pattern payments.", ">0"),
 ("sender_txn_count_24h", "int", "numeric", "Sender's transactions in the 24 h before this one (simulated).", ">=0"),
 ("sender_txn_count_7d", "int", "numeric", "Sender's transactions in the 7 days before this one (>= 24 h count).", ">=0"),
 ("recipient_account_type", "category", "categorical", "Recipient account type as registered (some fake 'merchants' exist).", "Merchant, Individual"),
 ("recipient_account_age_days", "int", "numeric", "Age of recipient account in days; very new accounts are riskier but not always fraudulent.", "1 - 6000"),
 ("recipient_reputation_score", "float", "numeric", "Recipient reputation (0 = worst, 100 = best) from simulated network/complaint history.", "0 - 100"),
 ("recipient_prior_complaints", "int", "numeric", "Number of prior complaints against the recipient (many mule accounts have 0).", ">=0"),
 ("recipient_unique_senders_24h", "int", "numeric", "Distinct senders paying this recipient in last 24 h incl. this one (fan-in).", ">=1"),
 ("prior_txns_with_recipient", "int", "numeric", "Earlier payments from this sender to this recipient.", ">=0"),
 ("is_first_time_recipient", "int", "binary", "1 if prior_txns_with_recipient == 0.", "0/1"),
 ("payment_purpose", "category", "categorical", "Declared/inferred payment purpose. Includes legit and scam-style purposes; legit rows can carry scam-style purposes.", "grocery, rent, refund_claim, prize_claim, ..."),
 ("payment_channel", "category", "categorical", "How the payment was initiated.", "QR_Scan, UPI_ID_Manual, Collect_Request, Contact_Pick, Payment_Link, Merchant_Intent"),
 ("is_qr_payment", "int", "binary", "QR code scanned to pay (payment_channel == QR_Scan).", "0/1"),
 ("is_collect_request", "int", "binary", "Payment initiated by approving a collect request.", "0/1"),
 ("qr_merchant_mismatch", "int", "binary", "QR payee name/type does not match the claimed merchant or purpose (only possible when is_qr_payment = 1).", "0/1"),
 ("collect_request_unsolicited", "int", "binary", "Collect request the sender did not expect (only possible when is_collect_request = 1).", "0/1"),
 ("urgency_indicator", "int", "binary", "Sender was pressured to pay immediately or within a deadline (legit bills can be urgent too).", "0/1"),
 ("refund_or_reward_claim", "int", "binary", "Payment framed as a refund, cashback, prize or reward claim.", "0/1"),
 ("impersonation_indicator", "int", "binary", "Recipient/contact claims to be a bank, company, official, relative or boss (system flag; has false positives).", "0/1"),
 ("pin_requested_to_receive", "int", "binary", "Sender was asked to enter UPI PIN to 'receive' money (PIN is only ever needed to send).", "0/1"),
 ("suspicious_link_indicator", "int", "binary", "Payment arrived through a link flagged suspicious (shortened, unknown domain, phishing-like).", "0/1"),
 ("screen_sharing_request", "int", "binary", "Sender was asked to install/use a screen-sharing or remote-access app.", "0/1"),
 ("recipient_verification_status", "category", "categorical", "Recipient name verification result.", "Verified_Merchant, Saved_Contact, Bank_Name_Verified, Name_Mismatch, Unverified"),
 ("caller_claims_authority", "int", "binary", "Social engineering: contact claims to be police, CBI, RBI, TRAI, bank or customs.", "0/1"),
 ("unsolicited_contact", "int", "binary", "Social engineering: interaction initiated by the other party (call/SMS/message).", "0/1"),
 ("secrecy_requested", "int", "binary", "Social engineering: sender told not to tell family/bank/anyone.", "0/1"),
 ("emotional_pressure", "int", "binary", "Social engineering: fear, threat, greed or emotional manipulation present.", "0/1"),
 ("call_in_progress", "int", "binary", "Sender was on a phone/video call while making the payment.", "0/1"),
 ("social_engineering_risk_score", "float", "numeric", "Composite 0-1 social-engineering score from the five indicators above + urgency + impersonation, with noise. Derived from features only.", "0 - 1"),
 ("is_fraud", "int", "target", "TARGET (binary): 1 = fraudulent transaction.", "0/1"),
 ("fraud_category", "category", "target", "TARGET (multiclass): scam type, or 'Legitimate'. Never use as a feature for is_fraud.", "10 scams + Legitimate"),
 ("risk_level", "category", "target", "TARGET (ordinal): analyst-style triage level. Derived from a rule score + outcome; never use as a feature for is_fraud.", "Low, Medium, High"),
]
fd = pd.DataFrame(D, columns=["column", "dtype", "role", "description", "values_or_range"])
assert list(fd["column"]) == list(df.columns), "feature dictionary out of sync with dataset columns"
fd.to_csv(os.path.join(DATASET_DIR, "feature_dictionary.csv"), index=False)
with open(os.path.join(OUT_DIR, "feature_dictionary.md"), "w") as f:
    f.write("# UPI Rakshak - Feature Dictionary\n\nAll data is fully synthetic. "
            f"{len(fd)} columns, {N_TOTAL:,} rows.\n\n| # | Column | Type | Role | Description | Values / range |\n|---|---|---|---|---|---|\n")
    for i, r in enumerate(fd.itertuples(index=False), 1):
        f.write(f"| {i} | `{r.column}` | {r.dtype} | {r.role} | {r.description} | {r.values_or_range} |\n")

# ----------------------------------------------------------------------------
# Save dataset, splits and feature config
# ----------------------------------------------------------------------------
df.to_csv(os.path.join(DATASET_DIR, "upi_synthetic_transactions.csv"), index=False)

strata = df["is_fraud"].astype(str) + "|" + df["fraud_category"]
split = np.empty(n, dtype=object)
for s in strata.unique():
    idx = rng.permutation(np.where(strata.values == s)[0])
    a, b = int(round(.70 * len(idx))), int(round(.85 * len(idx)))
    split[idx[:a]], split[idx[a:b]], split[idx[b:]] = "train", "val", "test"
for name in ("train", "val", "test"):
    df[split == name].to_csv(os.path.join(SPLIT_DIR, f"{name}.csv"), index=False)
# Alternative: time-ordered split (train on past, test on future)
a, b = int(.70 * n), int(.85 * n)
for name, part in (("train", df.iloc[:a]), ("val", df.iloc[a:b]), ("test", df.iloc[b:])):
    part.to_csv(os.path.join(SPLIT_DIR, f"temporal_{name}.csv"), index=False)

ID_COLS = ["transaction_id", "transaction_timestamp", "sender_id", "recipient_id"]
TARGETS = ["is_fraud", "fraud_category", "risk_level"]
CAT_FEATS = ["sender_age_group", "sender_city_tier", "recipient_account_type", "payment_purpose",
             "payment_channel", "recipient_verification_status"]
feats = [c for c in df.columns if c not in ID_COLS + TARGETS]
cfg = {
    "seed": SEED, "target_binary": "is_fraud", "target_multiclass": "fraud_category", "target_ordinal": "risk_level",
    "exclude_from_features": ID_COLS + ["fraud_category", "risk_level"],
    "categorical_features": CAT_FEATS,
    "numeric_features": [c for c in feats if c not in CAT_FEATS],
    "note": "Random stratified 70/15/15 split in splits/{train,val,test}.csv; time-ordered alternative in splits/temporal_*.csv",
}
json.dump(cfg, open(os.path.join(OUT_DIR, "feature_config.json"), "w"), indent=2)

# ----------------------------------------------------------------------------
# Quick built-in validation
# ----------------------------------------------------------------------------
assert len(df) == N_TOTAL and df["is_fraud"].sum() == N_FRAUD
assert df.isna().sum().sum() == 0 and df["transaction_id"].is_unique
assert ((df["is_first_time_recipient"] == 1) == (df["prior_txns_with_recipient"] == 0)).all()
assert (df.loc[df["is_qr_payment"] == 1, "payment_channel"] == "QR_Scan").all()
assert (df["sender_txn_count_7d"] >= df["sender_txn_count_24h"]).all()
assert df["amount_inr"].between(1, 100_000).all()
print(f"OK: {len(df):,} rows x {df.shape[1]} cols | fraud rate {df['is_fraud'].mean():.2%}")
print(df["fraud_category"].value_counts().to_string())
print(pd.crosstab(df["is_fraud"], df["risk_level"], normalize="index").round(3).to_string())
print({k: int((split == k).sum()) for k in ("train", "val", "test")})
