import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib
import os

# Set thread limits
os.environ['OPENBLAS_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'

def train_career():
    print("Training Career Recommender...")
    data_path = r"D:\downloads\dataset\Career Recommendation Model\perfectly_realistic_career_guidance_dataset_1500.csv"
    
    if not os.path.exists(data_path):
        print(f"Error: Dataset not found at {data_path}")
        return

    try:
        df = pd.read_csv(data_path, engine='python', encoding='latin1', on_bad_lines='skip')
    except Exception as e:
        print(f"Error reading dataset: {e}")
        return
    
    # Selecting relevant columns based on user profile requirements
    # Looking at the head from previous step: Education_Level, Specialization, Interests, Skills, Target_Career
    
    target_col = 'Recommended_Career'
    feature_cols = ['Education_Level', 'Specialization', 'Interests', 'Skills']
    
    # Ensure columns exist
    for col in feature_cols + [target_col]:
        if col not in df.columns:
            print(f"Column {col} missing from dataset.")
            return

    # Preprocessing
    encoders = {}
    for col in feature_cols + [target_col]:
        le = LabelEncoder()
        df[col] = df[col].fillna('None').astype(str)
        df[col] = le.fit_transform(df[col])
        encoders[col] = le
    
    X = df[feature_cols]
    y = df[target_col]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Save model and encoders
    os.makedirs('d:/downloads/hackathon/ml_service/models', exist_ok=True)
    joblib.dump(model, 'd:/downloads/hackathon/ml_service/models/career_model.pkl')
    joblib.dump(encoders, 'd:/downloads/hackathon/ml_service/models/career_encoders.pkl')
    
    print("Accuracy:", model.score(X_test, y_test))
    print("Career Recommender trained and saved.")

if __name__ == "__main__":
    train_career()
