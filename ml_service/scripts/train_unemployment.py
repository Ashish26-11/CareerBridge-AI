import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib
import os

def train_unemployment():
    print("Training Unemployment Predictor...")
    # Load dataset
    data_path = r"D:\downloads\careerbridge-ml\data\unemployment\Unemployment in India.csv"
    if not os.path.exists(data_path):
        print(f"Error: Dataset not found at {data_path}")
        return

    df = pd.read_csv(data_path)
    
    # Cleaning columns (strip spaces)
    df.columns = [c.strip() for c in df.columns]
    
    # Drop rows with NaN in critical columns
    target_col = 'Estimated Unemployment Rate (%)'
    df = df.dropna(subset=['Region', target_col])
    
    # Feature Engineering
    le = LabelEncoder()
    df['Region_Encoded'] = le.fit_transform(df['Region'].astype(str))
    
    X = df[['Region_Encoded']]
    y = df[target_col]
    
    if len(df) < 5:
        print("Not enough data to train split. Training on all data.")
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)
    else:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)
    
    # Save model and encoder
    os.makedirs('ml_service/models', exist_ok=True)
    joblib.dump(model, 'ml_service/models/unemployment_model.pkl')
    joblib.dump(le, 'ml_service/models/region_encoder.pkl')
    
    print("Unemployment model trained and saved.")

if __name__ == "__main__":
    train_unemployment()
