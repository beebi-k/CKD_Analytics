import os
import joblib
import pandas as pd
from fastapi import FastAPI, Response
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from backend.app.explain import get_shap_values



import openai

# =========================
# CONFIG
# =========================
openai.api_key = "YOUR_OPENAI_API_KEY"  # Replace with your real OpenAI key

# =========================
# FASTAPI APP INIT
# =========================
app = FastAPI(title="CKD Prediction + AI Chat API")

# -------------------------
# CORS
# -------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # replace "*" with your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# LOAD MODEL & SCALER
# =========================
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODEL_DIR = os.path.join(BASE_DIR, "models")

model = joblib.load(os.path.join(MODEL_DIR, "random_forest.pkl"))
scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))

FEATURE_COLUMNS = [
    "age", "bp", "sg", "al", "su", "rbc", "pc", "pcc", "ba",
    "bgr", "bu", "sc", "sod", "pot", "hemo", "pcv", "wc", "rc",
    "htn", "dm", "cad", "appet", "pe", "ane"
]

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
    reply = response.choices[0].message.content
    return {"reply": reply}

# =========================
# RUN SERVER
# =========================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
