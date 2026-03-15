import pandas as pd
from sklearn.linear_model import LinearRegression
import joblib
import os
import numpy as np

# Set thread limits
os.environ['OPENBLAS_NUM_THREADS'] = '1'

def train_simulation():
    print("Training Career Simulation Model with India LPA data...")

    # India tech sector salary progression data (LPA - Lakhs Per Annum)
    # Based on actual NASSCOM/Naukri market data approximations
    data = {
        'experience': [
            0, 0, 0.5, 1, 1, 1, 1.5, 2, 2, 2, 2.5,
            3, 3, 3, 3.5, 4, 4, 4, 5, 5, 5, 5.5,
            6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9,
            10, 10, 10, 12, 12, 12, 15, 15, 18, 20
        ],
        'salary_lpa': [
            3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0,
            8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.0, 12.0, 12.5, 13.0,
            13.0, 14.0, 15.0, 15.0, 16.0, 17.0, 17.0, 18.0, 19.0, 19.0, 20.0,
            20.0, 22.0, 24.0, 24.0, 26.0, 28.0, 30.0, 35.0, 40.0, 45.0
        ]
    }

    df = pd.DataFrame(data)
    X = df[['experience']]
    y = df['salary_lpa']

    model = LinearRegression()
    model.fit(X, y)

    # Quick verification
    print("Verification (LPA predictions):")
    for exp in [0, 1, 3, 5, 10, 15, 20]:
        pred = model.predict([[exp]])[0]
        print(f"  {exp} years -> {pred:.1f} LPA")

    # Save relative to this script's location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(script_dir, '..', 'models')
    os.makedirs(models_dir, exist_ok=True)
    joblib.dump(model, os.path.join(models_dir, 'simulation_model.pkl'))
    print("✅ Career Simulation Model trained and saved.")

if __name__ == "__main__":
    train_simulation()