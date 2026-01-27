import os
import joblib
import pandas as pd
import requests
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
# HELPER FUNCTION TO DOWNLOAD FILES
# =========================
def download_file(url, local_path):
    """Download a file from a URL to local path."""
    if not os.path.exists(local_path):
        response = requests.get(url)
        response.raise_for_status()
        with open(local_path, "wb") as f:
            f.write(response.content)

# =========================
# LOAD MODEL & SCALER
# =========================
MODEL_DIR = "/tmp/models"  # Serverless temporary directory
os.makedirs(MODEL_DIR, exist_ok=True)

# Replace these URLs with your actual GitHub raw file URLs
MODEL_URL = "https://raw.githubusercontent.com/beebi-k/CKD_Analytics/main/models/random_forest.pkl"
SCALER_URL = "https://raw.githubusercontent.com/beebi-k/CKD_Analytics/main/models/scaler.pkl"

MODEL_PATH = os.path.join(MODEL_DIR, "random_forest.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")

download_file(MODEL_URL, MODEL_PATH)
download_file(SCALER_URL, SCALER_PATH)

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)

print(f"Models loaded from temporary directory: {MODEL_DIR}")

# =========================
# HELPER FUNCTIONS
# =========================
def get_shap_values(df):
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

@app.post("/chat")
def chat(input: ChatInput):
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": input.message}]
    )
    return {"reply": response.choices[0].message.content}
