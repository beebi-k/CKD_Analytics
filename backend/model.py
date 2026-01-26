import os
import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, recall_score, roc_auc_score

# =========================
# PATHS
# =========================
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_PATH = os.path.join(BASE_DIR, "kidney_disease.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
DATA_PATH = os.path.join(BASE_DIR, "kidney_disease.csv")


os.makedirs(MODEL_DIR, exist_ok=True)

# =========================
# LOAD DATA
# =========================
df = pd.read_csv(DATA_PATH)

# Drop ID column
if "id" in df.columns:
    df.drop(columns=["id"], inplace=True)

# =========================
# TARGET ENCODING (CRITICAL)
# =========================
df["classification"] = df["classification"].map({
    "ckd": 1,
    "notckd": 0
})

# =========================
# HANDLE MISSING VALUES
# =========================
for col in df.columns:
    if df[col].dtype == "object":
        df[col].fillna(df[col].mode()[0], inplace=True)
    else:
        df[col].fillna(df[col].median(), inplace=True)

# =========================
# ENCODE CATEGORICAL FEATURES
# =========================
le = LabelEncoder()
for col in df.select_dtypes(include="object").columns:
    df[col] = le.fit_transform(df[col])

# =========================
# FEATURES / TARGET
# =========================
X = df.drop("classification", axis=1)
y = df["classification"]

# =========================
# SCALING
# =========================
scaler = StandardScaler()
X_scaled = pd.DataFrame(scaler.fit_transform(X), columns=X.columns)

# =========================
# TRAIN / TEST SPLIT
# =========================
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, stratify=y, random_state=42
)

# =========================
# HIGH-PERFORMANCE MODEL
# =========================
model = RandomForestClassifier(
    n_estimators=600,
    max_depth=20,
    min_samples_leaf=1,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

# =========================
# EVALUATION
# =========================
y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)[:, 1]

print("\nMODEL PERFORMANCE")
print("----------------")
print("Accuracy :", accuracy_score(y_test, y_pred))
print("Recall   :", recall_score(y_test, y_pred))
print("ROC-AUC  :", roc_auc_score(y_test, y_prob))

# =========================
# SAVE MODEL
# =========================
joblib.dump(model, os.path.join(MODEL_DIR, "random_forest.pkl"))
joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.pkl"))

print("\n✅ Model & scaler saved successfully")
