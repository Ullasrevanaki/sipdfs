from pathlib import Path
from datetime import date
from typing import List

import json
import numpy as np
import pandas as pd
import xgboost as xgb

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


# ============================================================
# PATHS
# ============================================================

SERVICE_DIR = Path(__file__).resolve().parent
ML_DIR = SERVICE_DIR.parent
MODEL_DIR = ML_DIR / "model"

MODEL_PATH = MODEL_DIR / "xgboost_demand_model.json"
FEATURE_PATH = MODEL_DIR / "feature_names.json"
METADATA_PATH = MODEL_DIR / "model_metadata.json"


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="Smart Inventory Demand Forecasting API",
    description="XGBoost-based demand forecasting service",
    version="1.0.0",
)


# ============================================================
# LOAD MODEL
# ============================================================

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Model not found: {MODEL_PATH}"
    )

if not FEATURE_PATH.exists():
    raise FileNotFoundError(
        f"Feature list not found: {FEATURE_PATH}"
    )


model = xgb.XGBRegressor()
model.load_model(str(MODEL_PATH))


with open(FEATURE_PATH, "r", encoding="utf-8") as file:
    FEATURE_NAMES = json.load(file)


MODEL_METADATA = {}

if METADATA_PATH.exists():
    with open(METADATA_PATH, "r", encoding="utf-8") as file:
        MODEL_METADATA = json.load(file)


# ============================================================
# PRODUCT FAMILIES
# ============================================================

FAMILIES = [
    "AUTOMOTIVE",
    "BABY CARE",
    "BEAUTY",
    "BEVERAGES",
    "BOOKS",
    "BREAD/BAKERY",
    "CELEBRATION",
    "CLEANING",
    "DAIRY",
    "DELI",
    "EGGS",
    "FROZEN FOODS",
    "GROCERY I",
    "GROCERY II",
    "HARDWARE",
    "HOME AND KITCHEN I",
    "HOME AND KITCHEN II",
    "HOME APPLIANCES",
    "HOME CARE",
    "LADIESWEAR",
    "LAWN AND GARDEN",
    "LINGERIE",
    "LIQUOR,WINE,BEER",
    "MAGAZINES",
    "MEATS",
    "PERSONAL CARE",
    "PET SUPPLIES",
    "PLAYERS AND ELECTRONICS",
    "POULTRY",
    "PREPARED FOODS",
    "PRODUCE",
    "SCHOOL AND OFFICE SUPPLIES",
    "SEAFOOD",
]


# ============================================================
# REQUEST MODELS
# ============================================================

class PredictionRequest(BaseModel):
    store_nbr: int = Field(..., ge=1)
    family: str

    onpromotion: int = Field(default=0, ge=0)

    date: date

    lag_1: float = Field(..., ge=0)
    lag_7: float = Field(..., ge=0)
    lag_14: float = Field(..., ge=0)
    lag_28: float = Field(..., ge=0)

    rolling_mean_7: float = Field(..., ge=0)
    rolling_mean_14: float = Field(..., ge=0)
    rolling_mean_28: float = Field(..., ge=0)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/")
def root():
    return {
        "success": True,
        "service": "Smart Inventory Demand Forecasting API",
        "model": "XGBoost",
        "features": len(FEATURE_NAMES),
    }


@app.get("/health")
def health():
    return {
        "success": True,
        "status": "healthy",
        "model_loaded": True,
        "feature_count": len(FEATURE_NAMES),
    }


# ============================================================
# FEATURE CREATION
# ============================================================

def create_features(request: PredictionRequest) -> pd.DataFrame:

    if request.family not in FAMILIES:
        raise ValueError(
            f"Unknown family '{request.family}'. "
            f"Expected one of: {FAMILIES}"
        )

    dt = pd.Timestamp(request.date)

    row = {
        "store_nbr": request.store_nbr,
        "onpromotion": request.onpromotion,

        "year": dt.year,
        "month": dt.month,
        "day": dt.day,
        "day_of_week": dt.dayofweek,
        "week_of_year": int(dt.isocalendar().week),
        "is_weekend": int(dt.dayofweek >= 5),

        "lag_1": request.lag_1,
        "lag_7": request.lag_7,
        "lag_14": request.lag_14,
        "lag_28": request.lag_28,

        "rolling_mean_7": request.rolling_mean_7,
        "rolling_mean_14": request.rolling_mean_14,
        "rolling_mean_28": request.rolling_mean_28,
    }

    # One-hot encode family exactly as during training.
    for family in FAMILIES:
        column = f"family_{family}"
        row[column] = int(request.family == family)

    # Ensure exact model feature order.
    features = pd.DataFrame([row])

    missing = [
        feature
        for feature in FEATURE_NAMES
        if feature not in features.columns
    ]

    if missing:
        raise ValueError(
            f"Missing model features: {missing}"
        )

    features = features[FEATURE_NAMES]

    return features


# ============================================================
# PREDICTION
# ============================================================

@app.post("/predict")
def predict(request: PredictionRequest):

    try:
        features = create_features(request)

        prediction = model.predict(features)

        predicted_demand = float(prediction[0])

        # Demand cannot be negative.
        predicted_demand = max(0.0, predicted_demand)

        return {
            "success": True,
            "prediction": {
                "date": request.date.isoformat(),
                "store_nbr": request.store_nbr,
                "family": request.family,
                "predicted_demand": round(predicted_demand, 4),
            },
        }

    except Exception as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# ============================================================
# MODEL INFORMATION
# ============================================================

@app.get("/model-info")
def model_info():

    return {
        "success": True,
        "model": "XGBoost",
        "feature_count": len(FEATURE_NAMES),
        "features": FEATURE_NAMES,
        "metadata": MODEL_METADATA,
    }