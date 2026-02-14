import os
import joblib
import pandas as pd
from fastapi import FastAPI, Response
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI

# =========================
# OPENAI CONFIG
# =========================
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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
# LOAD MODEL & SCALER (LOCAL)
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")

MODEL_PATH = os.path.join(MODEL_DIR, "random_forest.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError("❌ random_forest.pkl not found in app/models")

if not os.path.exists(SCALER_PATH):
    raise FileNotFoundError("❌ scaler.pkl not found in app/models")

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)

print("✅ Model and scaler loaded successfully")

# =========================
# HELPER FUNCTION
# =========================
def get_top_features():
    importances = model.feature_importances_
    top_indices = sorted(
        range(len(importances)),
        key=lambda i: importances[i],
        reverse=True
    )[:3]
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

    prediction = model.predict(df_scaled)[0]
    probability = model.predict_proba(df_scaled)[0][1]

    return {
        "prediction": "CKD Detected" if prediction == 1 else "No CKD",
        "probability": round(float(probability), 3),
        "risk_level": (
            "High" if probability > 0.7
            else "Medium" if probability > 0.4
            else "Low"
        ),
        "top_features": get_top_features()
    }

@app.post("/chat")
def chat(input: ChatInput):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful medical assistant. Do not provide diagnosis. Provide general information only."
            },
            {
                "role": "user",
                "content": input.message
            }
        ]
    )
    return {"reply": response.choices[0].message.content}

# =========================
# ENTRY POINT (OPTIONAL)
# =========================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
