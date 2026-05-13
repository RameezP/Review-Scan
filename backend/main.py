"""
ReviewScan — FastAPI Backend  (port 8000)
Works with your Google Colab trained model.pkl

Run: uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import pickle, pandas as pd, numpy as np

app = FastAPI(title="ReviewScan API", version="2.0.0")
app.add_middleware(CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Load YOUR Colab model ──────────────────────────────────────────────────────
# Put model.pkl in the same folder as this file.
# It must be a dict with these keys (matching what you saved in Colab):
#   rf_model, lr_model, label_encoder, features, categories,
#   rf_accuracy, lr_accuracy
with open("model.pkl", "rb") as f:
    MODEL = pickle.load(f)

rf_model      = MODEL["rf_model"]
lr_model      = MODEL["lr_model"]
label_encoder = MODEL["label_encoder"]
imputer       = MODEL.get("imputer")        
FEATURES      = MODEL["features"]    # list of column names used during training
CATEGORIES    = MODEL["categories"]  # list of category strings
# ──────────────────────────────────────────────────────────────────────────────


class ReviewInput(BaseModel):
    review_text:       Optional[str] = ""
    star_rating:       int  = Field(..., ge=1, le=5)
    helpful_votes:     int  = Field(..., ge=0)
    total_votes:       int  = Field(..., ge=0)
    verified_purchase: int  = Field(..., ge=0, le=1)
    product_category:  str
    model_type:        Optional[str] = "rf"   # "rf" | "lr"


class PredictionOutput(BaseModel):
    prediction:             str
    fake_probability:       float
    genuine_probability:    float
    confidence:             float
    reason:                 str
    flags:                  List[dict]
    model_used:             str
    helpful_ratio:          float
    feature_importances:    dict   # bar-chart data sent to frontend


def analyze_signals(inp, helpful_ratio):
    flags, reasons = [], []
    if helpful_ratio < 0.10 and inp.total_votes > 5:
        flags.append({"type":"high","label":"Low helpful ratio",
                      "detail":f"Only {helpful_ratio*100:.0f}% found this helpful"})
        reasons.append("low helpful ratio")
    if inp.verified_purchase == 0:
        flags.append({"type":"high","label":"Unverified purchase",
                      "detail":"Reviewer did not buy via the platform"})
        reasons.append("unverified purchase")
    if inp.star_rating == 5 and helpful_ratio < 0.15:
        flags.append({"type":"medium","label":"Suspicious 5-star",
                      "detail":"Perfect rating with low community trust"})
        reasons.append("suspicious 5-star")
    if inp.star_rating == 1 and helpful_ratio < 0.15:
        flags.append({"type":"medium","label":"Suspicious 1-star",
                      "detail":"Extreme negative, few found it helpful"})
    if inp.helpful_votes == 0 and inp.total_votes > 15:
        flags.append({"type":"high","label":"Zero helpful votes",
                      "detail":f"{inp.total_votes} voters, none found it helpful"})
        reasons.append("zero helpful votes")
    if inp.total_votes < 3:
        flags.append({"type":"low","label":"Very few votes",
                      "detail":"Not enough community feedback"})
    if helpful_ratio > 0.7 and inp.verified_purchase == 1:
        flags.append({"type":"positive","label":"High credibility",
                      "detail":"Strong helpful ratio + verified purchase"})
    reason = ("Flagged: " + ", ".join(reasons) + ".") if reasons \
             else "Review metrics appear within normal range."
    return flags, reason


@app.get("/health")
def health():
    return {"status":"ok",
            "rf_accuracy": MODEL.get("rf_accuracy"),
            "lr_accuracy": MODEL.get("lr_accuracy"),
            "categories": CATEGORIES,
            "features": FEATURES}


@app.post("/predict", response_model=PredictionOutput)
def predict(inp: ReviewInput):
    category      = inp.product_category if inp.product_category in CATEGORIES else CATEGORIES[0]
    helpful_ratio = inp.helpful_votes / max(inp.total_votes, 1)
    cat_encoded   = label_encoder.transform([category])[0]

    X = pd.DataFrame([[
        inp.star_rating, inp.helpful_votes, inp.total_votes,
        inp.verified_purchase, helpful_ratio, cat_encoded
    ]], columns=FEATURES)

    mdl      = rf_model if inp.model_type == "rf" else lr_model
    mdl_name = "Random Forest" if inp.model_type == "rf" else "Logistic Regression"

    # Apply imputer before prediction
    X_input = imputer.transform(X) if imputer is not None else X
    probs        = mdl.predict_proba(X_input)[0]
    fake_prob    = float(probs[1])
    genuine_prob = float(probs[0])
    prediction   = "Fake" if fake_prob > 0.5 else "Genuine"
    confidence   = abs(fake_prob - 0.5) * 2

    flags, reason = analyze_signals(inp, helpful_ratio)

    # Feature importances — RF has .feature_importances_, LR uses |coef_|
    if hasattr(mdl, "feature_importances_"):
        fi_raw = mdl.feature_importances_
    elif hasattr(mdl, "coef_"):
        fi_raw = np.abs(mdl.coef_[0])
        fi_raw = fi_raw / fi_raw.sum()   # normalise to sum=1
    else:
        fi_raw = np.ones(len(FEATURES)) / len(FEATURES)

    feature_importances = {
        feat: round(float(val), 4)
        for feat, val in zip(FEATURES, fi_raw)
    }

    return PredictionOutput(
        prediction=prediction,
        fake_probability=round(fake_prob, 4),
        genuine_probability=round(genuine_prob, 4),
        confidence=round(confidence, 4),
        reason=reason, flags=flags,
        model_used=mdl_name,
        helpful_ratio=round(helpful_ratio, 4),
        feature_importances=feature_importances,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
