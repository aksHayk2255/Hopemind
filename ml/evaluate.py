import os
import pandas as pd
from pathlib import Path
import joblib
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "synthetic_ppd_clinical_data.csv"
MODEL_PATH = BASE_DIR / "models" / "ppd_risk_model.joblib"

def run_evaluation():
    if not MODEL_PATH.exists():
        print("Model file not found. Please run train.py first.")
        return

    if not DATA_PATH.exists():
        print("Dataset not found. Please run train.py first.")
        return

    artifact = joblib.load(MODEL_PATH)
    model = artifact["model"]
    feature_names = artifact["feature_names"]

    df = pd.read_csv(DATA_PATH)
    X = df[feature_names]
    y = df["risk_target"]

    preds = model.predict(X)
    probs = model.predict_proba(X)[:, 1]

    print("==================================================")
    print("HOPE-MIND ML RISK MODEL EVALUATION REPORT")
    print(f"Model: {artifact['model_name']} (v{artifact['version']})")
    print("==================================================")
    print("\nClassification Report:")
    print(classification_report(y, preds, target_names=["Low Risk (0)", "Elevated Risk (1)"]))

    print("Confusion Matrix:")
    print(confusion_matrix(y, preds))

    auc = roc_auc_score(y, probs)
    print(f"\nOverall ROC-AUC Score: {auc:.4f}")

    print("\nFeature Importances:")
    for feat, imp in artifact["feature_importances"].items():
        print(f"  {feat:<25}: {imp:.4f}")

    print("\nDisclaimer:")
    print(artifact["disclaimer"])
    print("==================================================")

if __name__ == "__main__":
    run_evaluation()
