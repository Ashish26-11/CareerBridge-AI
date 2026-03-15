import pandas as pd
from sklearn.tree import DecisionTreeRegressor # Switched for memory efficiency
from sklearn.preprocessing import LabelEncoder
import joblib
import os
import re

# Set thread limits
os.environ['OPENBLAS_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'
os.environ['NUMEXPR_NUM_THREADS'] = '1'

def train_salary():
    print("Training Salary Estimator...")
    # Load dataset
    data_path = r"D:\downloads\careerbridge-ml\data\salary\Salary Dataset.csv"
    if not os.path.exists(data_path):
        print(f"Error: Dataset not found at {data_path}")
        return

    try:
        df = pd.read_csv(data_path, engine='python', encoding='latin1')
    except Exception as e:
        print(f"Error reading dataset: {e}")
        return
    
    def clean_salary(val):
        try:
            clean_val = re.sub(r'[^\d.]', '', str(val))
            if not clean_val:
                return 0
            return float(clean_val)
        except:
            return 0
            
    df['Salary_Clean'] = df['Salary'].apply(clean_salary)
    df = df[df['Salary_Clean'] > 1000]
    
    le_title = LabelEncoder()
    le_location = LabelEncoder()
    
    df['Job_Title_Encoded'] = le_title.fit_transform(df['Job Title'].fillna('Unknown'))
    df['Location_Encoded'] = le_location.fit_transform(df['Location'].fillna('Unknown'))
    
    X = df[['Job_Title_Encoded', 'Location_Encoded']]
    y = df['Salary_Clean']
    
    model = DecisionTreeRegressor(random_state=42)
    model.fit(X, y)
    
    # Save model and encoders
    os.makedirs('ml_service/models', exist_ok=True)
    joblib.dump(model, 'ml_service/models/salary_model.pkl')
    joblib.dump({
        'title': le_title,
        'location': le_location
    }, 'ml_service/models/salary_encoders.pkl')
    
    print("Salary Estimator trained and saved.")

if __name__ == "__main__":
    train_salary()
