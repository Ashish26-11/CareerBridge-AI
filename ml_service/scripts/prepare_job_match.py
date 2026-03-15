import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import joblib
import os

# Set thread limits
os.environ['OPENBLAS_NUM_THREADS'] = '1'

def prepare_match_model():
    print("Preparing Job-Skill Matching Engine...")
    data_path = r"D:\downloads\dataset\Job-Skill Matching Model\job_dataset.csv"
    
    if not os.path.exists(data_path):
        print(f"Error: Dataset not found at {data_path}")
        return

    try:
        df = pd.read_csv(data_path, engine='python')
    except Exception as e:
        print(f"Error reading dataset: {e}")
        return
    
    # We use TF-IDF on Job Titles and Skills to create a searchable index
    # Column mapping: Title, KeySkills
    
    df['combined_features'] = df['Title'].fillna('') + " " + df['Keywords'].fillna('')
    
    vectorizer = TfidfVectorizer(stop_words='english')
    tfidf_matrix = vectorizer.fit_transform(df['combined_features'])
    
    # Save the vectorizer and matrix for real-time matching
    os.makedirs('d:/downloads/hackathon/ml_service/models', exist_ok=True)
    joblib.dump(vectorizer, 'd:/downloads/hackathon/ml_service/models/match_vectorizer.pkl')
    joblib.dump(tfidf_matrix, 'd:/downloads/hackathon/ml_service/models/match_matrix.pkl')
    joblib.dump(df[['JobID', 'Title', 'Keywords']], 'd:/downloads/hackathon/ml_service/models/job_data.pkl')
    
    print("Job-Skill Matching Engine prepared and saved.")

if __name__ == "__main__":
    prepare_match_model()
