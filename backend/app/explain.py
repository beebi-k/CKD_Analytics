import os
import shap
import joblib
import pandas as pd

# =========================
# MODEL PATH
# =========================
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODEL_DIR = os.path.join(BASE_DIR, "models")

model = joblib.load(os.path.join(MODEL_DIR, "random_forest.pkl"))
explainer = shap.TreeExplainer(model)

# =========================
# FUNCTION TO GET SHAP VALUES
# =========================
def get_shap_values(df_input):
    """
    Returns top 5 most important features contributing to CKD prediction
    """
    shap_values = explainer.shap_values(df_input)

    # Class 1 = CKD
    values = shap_values[1][0]

    importance = pd.DataFrame({
        "feature": df_input.columns,
        "impact": values
    }).sort_values(by="impact", key=abs, ascending=False)

    return importance.head(5).to_dict(orient="records")
