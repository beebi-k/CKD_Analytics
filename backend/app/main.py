import os
import joblib
import pandas as pd
from fastapi import FastAPI, Response
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
import openai

# =========================
# CONFIG
# =========================
openai.api_key = os.getenv("OPENAI_API_KEY")

# =========================
# FASTAPI APP INIT
# =========================
app = FastAPI(title="CKD Prediction + AI Chat API")

# -------------------------
# CORS
# -------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# FEATURE COLUMNS
# =========================
FEATURE_COLUMNS = [
    "age", "bp", "sg", "al", "su", "rbc", "pc", "pcc", "ba",
    "bgr", "bu", "sc", "sod", "pot", "hemo", "pcv", "wc", "rc",
    "htn", "dm", "cad", "appet", "pe", "ane"
]

# =========================
# LOAD MODEL & SCALER
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Try app/models first, then backend/models
MODEL_DIRS = [
    os.path.join(BASE_DIR, "models"),            # backend/app/models
    os.path.abspath(os.path.join(BASE_DIR, "..", "models")),  # backend/models
]

model = scaler = None
for dir_path in MODEL_DIRS:
    try:
        model = joblib.load(os.path.join(dir_path, "random_forest.pkl"))
        scaler = joblib.load(os.path.join(dir_path, "scaler.pkl"))
        print(f"Models loaded from: {dir_path}")
        break
    except FileNotFoundError:
        continue

if model is None or scaler is None:
    raise FileNotFoundError(
        f"Could not find 'random_forest.pkl' and/or 'scaler.pkl' in any of: {MODEL_DIRS}"
    )

# =========================
# HELPER FUNCTIONS
# =========================
def get_shap_values(df):
    """
    Return top 3 most important features for the prediction.
    Placeholder: uses model.feature_importances_.
    """
    feature_importance = model.feature_importances_
    top_indices = sorted(range(len(feature_importance)), key=lambda i: feature_importance[i], reverse=True)[:3]
    return [FEATURE_COLUMNS[i] for i in top_indices]

# =========================
# INPUT SCHEMAS
# =========================
class CKDInput(BaseModel):
    age: float = Field(..., ge=0, le=120)
    bp: float = Field(..., ge=50, le=200)
    sg: float
    al: float
    su: float
    rbc: float
    pc: float
    pcc: float
    ba: float
    bgr: float
    bu: float
    sc: float
    sod: float
    pot: float
    hemo: float
    pcv: float
    wc: float
    rc: float
    htn: float
    dm: float
    cad: float
    appet: float
    pe: float
    ane: float

class ChatInput(BaseModel):
    message: str

# =========================
# ROUTES
# =========================
@app.get("/")
def home():
    return {"message": "CKD Prediction + AI Chat API is running"}

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204)

# -------------------------
# CKD PREDICTION
# -------------------------
@app.post("/predict")
def predict(data: CKDInput):
    df = pd.DataFrame([data.dict()])[FEATURE_COLUMNS]
    df_scaled = scaler.transform(df)

    pred = model.predict(df_scaled)[0]
    prob = model.predict_proba(df_scaled)[0][1]

    shap_info = get_shap_values(df)

    return {
        "prediction": "CKD Detected" if pred == 1 else "No CKD",
        "probability": round(float(prob), 3),
        "risk_level": "High" if prob > 0.7 else "Medium" if prob > 0.4 else "Low",
        "top_features": shap_info
    }

# -------------------------
# AI CHAT
# -------------------------
@app.post("/chat")
def chat(input: ChatInput):
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": input.message}]
    )
    return {"reply": response.choices[0].message.content}
