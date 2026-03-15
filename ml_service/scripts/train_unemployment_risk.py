import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib
import os
import numpy as np

# Set thread limits
os.environ['OPENBLAS_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'

def train_risk():
    print("Training Unemployment Risk Predictor with India state + education + skill_gap features...")

    # Real India state unemployment risk levels (based on NSSO/CMIE data)
    state_risk_base = {
        'Bihar': 2, 'Uttar Pradesh': 2, 'Jharkhand': 2, 'Odisha': 2,
        'Rajasthan': 1, 'Madhya Pradesh': 1, 'Chattisgarh': 1, 'West Bengal': 1,
        'Assam': 2, 'Manipur': 2, 'Nagaland': 2, 'Tripura': 2, 'Meghalaya': 1,
        'Maharashtra': 0, 'Karnataka': 0, 'Tamil Nadu': 0, 'Gujarat': 0,
        'Telangana': 0, 'Andhra Pradesh': 1, 'Kerala': 1, 'Haryana': 1,
        'Delhi': 0, 'Punjab': 1, 'Himachal Pradesh': 0, 'Uttarakhand': 1,
        'Goa': 0, 'Chandigarh': 0, 'Jammu and Kashmir': 2, 'Ladakh': 2,
        'Mizoram': 1, 'Sikkim': 0, 'Arunachal Pradesh': 1,
        'Andaman and Nicobar Islands': 0, 'Lakshadweep Islands': 1,
        'Pondicherry': 0, 'Dadra & Nagar Haveli and Daman & Diu': 0
    }
    edu_risk = {
        '10th': 25, '12th': 20, 'Diploma': 15,
        'Graduate': 10, 'Post-Graduate': 5, 'PhD': 2
    }

    rows = []
    np.random.seed(42)
    for state, base_risk in state_risk_base.items():
        for edu, edu_penalty in edu_risk.items():
            for skill_gap in [0, 20, 40, 60, 80, 100]:
                total_risk = (base_risk * 25) + (edu_penalty * 0.6) + (skill_gap * 0.3)
                total_risk += np.random.uniform(-5, 5)
                total_risk = np.clip(total_risk, 0, 100)
                if total_risk >= 60:
                    risk_label = 2   # High
                elif total_risk >= 35:
                    risk_label = 1   # Medium
                else:
                    risk_label = 0   # Low
                rows.append({
                    'state': state, 'education': edu,
                    'skill_gap_score': skill_gap, 'risk_level': risk_label
                })

    df = pd.DataFrame(rows)
    print(f"Training samples: {len(df)}")
    print("Risk distribution:", df['risk_level'].value_counts().to_dict())

    state_le = LabelEncoder()
    edu_le = LabelEncoder()
    df['state_enc'] = state_le.fit_transform(df['state'])
    df['edu_enc'] = edu_le.fit_transform(df['education'])

    X = df[['state_enc', 'edu_enc', 'skill_gap_score']]
    y = df['risk_level']

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    print("Train accuracy:", model.score(X, y))

    # Save with relative paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(script_dir, '..', 'models')
    os.makedirs(models_dir, exist_ok=True)
    joblib.dump(model, os.path.join(models_dir, 'risk_model.pkl'))
    joblib.dump(state_le, os.path.join(models_dir, 'state_encoder.pkl'))
    joblib.dump(edu_le, os.path.join(models_dir, 'education_encoder.pkl'))
    print("✅ Unemployment Risk Predictor trained and saved.")

if __name__ == "__main__":
    train_risk()