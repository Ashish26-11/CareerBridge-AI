import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier # Switched to DecisionTree for memory efficiency
from sklearn.preprocessing import LabelEncoder
import joblib
import os

# Set thread limits before any imports that might use them
os.environ['OPENBLAS_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'
os.environ['NUMEXPR_NUM_THREADS'] = '1'

def train_career():
    print("Training Career Recommender...")
    # Load dataset
    data_path = r"D:\downloads\careerbridge-ml\data\career\career_recommender.csv"
    if not os.path.exists(data_path):
        print(f"Error: Dataset not found at {data_path}")
        return

    try:
        # Use python engine and latin1 encoding for robustness
        df = pd.read_csv(data_path, engine='python', encoding='latin1', on_bad_lines='skip')
    except Exception as e:
        print(f"Error reading dataset: {e}")
        return
    
    # Map long headers to shorter names for easier handling
    column_mapping = {
        'What was your course in UG?': 'course',
        'What is your UG specialization? Major Subject (Eg; Mathematics)': 'specialization',
        'What are your interests?': 'interests',
        'What are your skills ? (Select multiple if necessary)': 'skills',
        'What was the average CGPA or Percentage obtained in under graduation?': 'cgpa',
        'Did you do any certification courses additionally?': 'certifications',
        'If yes, please specify your certificate course title.': 'cert_title',
        'Are you working?': 'working',
        'If yes, then what is/was your first Job title in your current field of work? If not applicable, write NA.               ': 'target_role'
    }
    
    # Filter columns that exist in the dataframe
    existing_cols = {k: v for k, v in column_mapping.items() if k in df.columns}
    df = df.rename(columns=existing_cols)
    
    target_col = 'target_role'
    if target_col not in df.columns:
        print(f"Error: Target column '{target_col}' not found.")
        # Try to find target column by common keywords
        roles = [c for c in df.columns if 'role' in c.lower() or 'job' in c.lower() or 'field' in c.lower()]
        if roles:
            target_col = roles[0]
            print(f"Using {target_col} as fallback target.")
        else:
            return

    # Basic cleaning
    df = df[df[target_col].notna()]
    
    # Feature selection
    available_features = ['course', 'specialization', 'interests', 'skills', 'cgpa']
    available_features = [f for f in available_features if f in df.columns]
    
    # Preprocessing
    encoders = {}
    for col in available_features + [target_col]:
        le = LabelEncoder()
        df[col] = df[col].fillna('None').astype(str)
        df[col] = le.fit_transform(df[col])
        encoders[col] = le
    
    X = df[available_features]
    y = df[target_col]
    
    model = DecisionTreeClassifier(random_state=42)
    model.fit(X, y)
    
    # Save model and encoders
    os.makedirs('ml_service/models', exist_ok=True)
    joblib.dump(model, 'ml_service/models/career_model.pkl')
    joblib.dump(encoders, 'ml_service/models/career_encoders.pkl')
    
    print("Career Recommender trained and saved.")

if __name__ == "__main__":
    train_career()
