import os
import numpy as np
import pandas as pd
from pathlib import Path
import joblib
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
DATA_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

def generate_synthetic_dataset(n_samples=1500, random_state=42):
    """
    Generates a reproducible, biologically and clinically plausible synthetic dataset
    for postpartum depression risk modeling.
    CLEARLY LABELED: Demonstration academic research dataset only.
    """
    np.random.seed(random_state)
    
    # Feature generation based on known clinical risk correlations
    epds_scores = np.clip(np.random.normal(9, 5, n_samples).round(), 0, 30).astype(int)
    sleep_hours = np.clip(np.random.normal(5.8, 1.6, n_samples), 2.5, 10.0).round(1)
    history_depression = np.random.binomial(1, 0.22, n_samples)
    social_support = np.random.choice([1, 2, 3, 4, 5], size=n_samples, p=[0.10, 0.20, 0.35, 0.25, 0.10])
    parity = np.random.choice([1, 2, 3, 4], size=n_samples, p=[0.55, 0.30, 0.10, 0.05])
    delivery_complications = np.random.binomial(1, 0.18, n_samples)
    infant_colic = np.random.choice([1, 2, 3, 4, 5], size=n_samples, p=[0.25, 0.30, 0.25, 0.15, 0.05])
    gestational_age = np.clip(np.random.normal(38.5, 1.8, n_samples).round(), 34, 42).astype(int)
    
    # Risk score calculation formula
    # Higher EPDS, lower sleep, prior history, lower social support, infant colic increase risk
    logit = (
        0.18 * (epds_scores - 9)
        - 0.45 * (sleep_hours - 6)
        + 1.25 * history_depression
        - 0.55 * (social_support - 3)
        + 0.40 * delivery_complications
        + 0.35 * (infant_colic - 2.5)
        - 0.08 * (gestational_age - 38)
        - 0.85 # baseline intercept
    )
    
    # Sigmoid function for probability
    prob = 1.0 / (1.0 + np.exp(-logit))
    # Add minor real-world observational noise
    noise = np.random.normal(0, 0.05, n_samples)
    prob_noisy = np.clip(prob + noise, 0.01, 0.99)
    y = (prob_noisy >= 0.5).astype(int)
    
    df = pd.DataFrame({
        "epds_score": epds_scores,
        "sleep_hours_avg": sleep_hours,
        "history_of_depression": history_depression,
        "social_support_score": social_support,
        "parity": parity,
        "delivery_complication": delivery_complications,
        "infant_colic_score": infant_colic,
        "gestational_age_weeks": gestational_age,
        "risk_target": y
    })
    
    csv_path = DATA_DIR / "synthetic_ppd_clinical_data.csv"
    df.to_csv(csv_path, index=False)
    print(f"[Dataset] Generated {n_samples} synthetic records saved to: {csv_path}")
    print(f"[Dataset] Target class distribution: Positive = {y.sum()} ({y.mean()*100:.1f}%), Negative = {len(y) - y.sum()}")
    return df

def train_and_export_models():
    """Trains Logistic Regression and Random Forest models and evaluates both."""
    csv_path = DATA_DIR / "synthetic_ppd_clinical_data.csv"
    if not csv_path.exists():
        df = generate_synthetic_dataset()
    else:
        df = pd.read_csv(csv_path)

    feature_cols = [
        "epds_score", "sleep_hours_avg", "history_of_depression",
        "social_support_score", "parity", "delivery_complication",
        "infant_colic_score", "gestational_age_weeks"
    ]
    X = df[feature_cols]
    y = df["risk_target"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

    print("\n--- Training Model 1: Logistic Regression ---")
    lr = LogisticRegression(max_iter=1000, random_state=42)
    lr.fit(X_train, y_train)
    y_pred_lr = lr.predict(X_test)
    y_prob_lr = lr.predict_proba(X_test)[:, 1]
    
    acc_lr = accuracy_score(y_test, y_pred_lr)
    prec_lr = precision_score(y_test, y_pred_lr)
    rec_lr = recall_score(y_test, y_pred_lr)
    f1_lr = f1_score(y_test, y_pred_lr)
    auc_lr = roc_auc_score(y_test, y_prob_lr)
    print(f"Logistic Regression: Accuracy={acc_lr:.3f}, Precision={prec_lr:.3f}, Recall={rec_lr:.3f}, F1={f1_lr:.3f}, ROC-AUC={auc_lr:.3f}")

    print("\n--- Training Model 2: Random Forest Classifier ---")
    rf = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
    rf.fit(X_train, y_train)
    y_pred_rf = rf.predict(X_test)
    y_prob_rf = rf.predict_proba(X_test)[:, 1]

    acc_rf = accuracy_score(y_test, y_pred_rf)
    prec_rf = precision_score(y_test, y_pred_rf)
    rec_rf = recall_score(y_test, y_pred_rf)
    f1_rf = f1_score(y_test, y_pred_rf)
    auc_rf = roc_auc_score(y_test, y_prob_rf)
    cm_rf = confusion_matrix(y_test, y_pred_rf)
    print(f"Random Forest: Accuracy={acc_rf:.3f}, Precision={prec_rf:.3f}, Recall={rec_rf:.3f}, F1={f1_rf:.3f}, ROC-AUC={auc_rf:.3f}")
    print(f"Confusion Matrix:\n{cm_rf}")

    # Feature importances
    importances = sorted(zip(feature_cols, rf.feature_importances_), key=lambda x: x[1], reverse=True)
    print("\nRandom Forest Feature Importances:")
    for feat, imp in importances:
        print(f"  - {feat}: {imp:.4f}")

    # Serialize Random Forest model artifact
    model_artifact = {
        "model": rf,
        "model_name": "RandomForestClassifier",
        "version": "1.0.0-academic",
        "feature_names": feature_cols,
        "feature_importances": dict(importances),
        "metrics": {
            "accuracy": float(acc_rf),
            "precision": float(prec_rf),
            "recall": float(rec_rf),
            "f1_score": float(f1_rf),
            "roc_auc": float(auc_rf)
        },
        "disclaimer": "Trained on synthetic research data. For educational demonstration only; not for clinical diagnosis."
    }
    
    target_path = MODELS_DIR / "ppd_risk_model.joblib"
    joblib.dump(model_artifact, target_path)
    print(f"\n[Artifact] Model artifact saved to: {target_path}")

if __name__ == "__main__":
    train_and_export_models()
