import os
import re
import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

# Set thread limits BEFORE any other imports
os.environ['OPENBLAS_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'

app = FastAPI(title="CareerBridge-AI ML Ecosystem")

# CORS — allow backend and frontend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Load Models ---
models_path = os.path.join(os.path.dirname(__file__), "models")

def safe_load(filename):
    path = os.path.join(models_path, filename)
    if os.path.exists(path):
        return joblib.load(path)
    return None

# Job-Skill Matching
match_vectorizer = safe_load("match_vectorizer.pkl")
match_matrix = safe_load("match_matrix.pkl")
job_data = safe_load("job_data.pkl")

# Career Recommendation
career_model = safe_load("career_model.pkl")
career_encoders = safe_load("career_encoders.pkl")

# Unemployment Risk Prediction
risk_model = safe_load("risk_model.pkl")
state_encoder = safe_load("state_encoder.pkl")
education_encoder = safe_load("education_encoder.pkl")

# Career Simulation
simulation_model = safe_load("simulation_model.pkl")

# --- Schemas ---

class CareerRecommendRequest(BaseModel):
    education: str
    specialization: str
    interests: str
    skills: List[str]

class MatchRequest(BaseModel):
    user_skills: List[str]
    description: Optional[str] = None

class RiskRequest(BaseModel):
    state: str
    education_level: str
    skill_gap_score: Optional[float] = 0

class ParseRequest(BaseModel):
    text: str

class SimulateRequest(BaseModel):
    experience: float
    career: Optional[str] = None
    skill: Optional[str] = None

class InterviewEvaluationRequest(BaseModel):
    role: str
    question: str
    answer: str

# --- Endpoints ---

@app.get("/")
def health_check():
    return {
        "status": "ready",
        "models_loaded": {
            "matching": match_vectorizer is not None,
            "recommendation": career_model is not None,
            "risk": risk_model is not None,
            "simulation": simulation_model is not None
        }
    }

@app.post("/match")
def job_skill_match(req: MatchRequest):
    if not match_vectorizer or not match_matrix:
        raise HTTPException(status_code=503, detail="Matching model not loaded")
    
    user_text = " ".join(req.user_skills)
    if req.description:
        user_text += " " + req.description
        
    user_vec = match_vectorizer.transform([user_text])
    from sklearn.metrics.pairwise import cosine_similarity
    similarities = cosine_similarity(user_vec, match_matrix).flatten()
    
    # Get top 10 matches
    top_indices = similarities.argsort()[-10:][::-1]
    results = []
    for idx in top_indices:
        score = float(similarities[idx])
        if score > 0:
            job = job_data.iloc[idx]
            results.append({
                "jobId": str(job['JobID']),
                "title": str(job['Title']),
                "matchScore": round(score * 100, 2)
            })
            
    return {"matches": results}

@app.post("/recommend")
def recommend_career(req: CareerRecommendRequest):
    if not career_model:
        raise HTTPException(status_code=503, detail="Career model not loaded")
    
    # Education normalization — map common generic inputs to encoder's exact classes
    edu_normalize = {
        "graduate": "B.Tech", "graduation": "B.Tech", "ug": "B.Tech",
        "bachelor": "BA", "bachelors": "BA",
        "b.tech": "B.Tech", "btech": "B.Tech", "be": "B.Tech",
        "bca": "BCA", "bsc": "B.Sc", "b.sc": "B.Sc",
        "ba": "BA", "bba": "BBA", "bcom": "B.Com", "b.com": "B.Com",
        "post-graduate": "M.Tech", "postgraduate": "M.Tech", "pg": "M.Tech",
        "mtech": "M.Tech", "m.tech": "M.Tech", "me": "M.Tech",
        "mca": "MCA", "msc": "M.Sc", "m.sc": "M.Sc",
        "ma": "MA", "mba": "MBA", "mcom": "M.Com", "m.com": "M.Com",
        "mbbs": "MBBS",
        "phd": "PhD", "doctorate": "PhD",
        "diploma": "Diploma",
        "12th": "12th", "12": "12th", "hsc": "12th", "intermediate": "12th",
        "10th": "10th", "10": "10th", "matric": "10th",
        "m.ed": "M.Ed", "b.ed": "B.Ed", "bed": "B.Ed", "med": "M.Ed",
    }
    
    # Interests normalization
    interest_normalize = {
        "tech": "Technology", "technology": "Technology", "it": "Technology",
        "computers": "Technology", "coding": "Technology", "programming": "Technology",
        "software": "Technology", "engineering": "Technology",
        "business": "Business", "management": "Management",
        "design": "Design", "art": "Design", "creative": "Creativity", "creativity": "Creativity",
        "health": "Healthcare", "medical": "Healthcare", "healthcare": "Healthcare",
        "research": "Research", "science": "Research",
        "teaching": "Teaching", "education": "Teaching",
        "social": "Social Work", "ngo": "Social Work", "helping": "Helping People",
    }
    
    def smart_encode(val, col, normalize_map=None):
        le = career_encoders.get(col)
        if not le:
            return 0
        # Direct match first
        if val in le.classes_:
            return int(le.transform([val])[0])
        # Try normalized value
        if normalize_map:
            normalized = normalize_map.get(val.lower().strip())
            if normalized and normalized in le.classes_:
                return int(le.transform([normalized])[0])
        # Try case-insensitive partial match
        val_lower = val.lower()
        for cls in le.classes_:
            if val_lower == cls.lower():
                return int(le.transform([cls])[0])
        return 0  # fallback — index 0

    # Skills: find best matching class
    def encode_skills(skills_list):
        le = career_encoders.get('Skills')
        if not le:
            return 0
        user_skills_lower = set(s.lower() for s in skills_list)
        best_match = None
        best_score = 0
        for cls in le.classes_:
            cls_words = set(w.lower().strip() for w in cls.replace(',', ';').split(';'))
            overlap = len(user_skills_lower & cls_words)
            if overlap > best_score:
                best_score = overlap
                best_match = cls
        if best_match and best_score > 0:
            return int(le.transform([best_match])[0])
        return 0

    features = [
        smart_encode(req.education, 'Education_Level', edu_normalize),
        smart_encode(req.specialization, 'Specialization'),
        smart_encode(req.interests, 'Interests', interest_normalize),
        encode_skills(req.skills)
    ]
    
    # Get probabilities for top N
    probs = career_model.predict_proba([features])[0]
    le = career_encoders.get('Recommended_Career')
    top_indices = probs.argsort()[-5:][::-1]  # get top 5, filter low confidence
    
    recommendations = []
    for idx in top_indices:
        confidence = round(float(probs[idx]) * 100, 2)
        if confidence > 1.0:  # skip very low confidence
            recommendations.append({
                "career": le.inverse_transform([idx])[0],
                "confidence": confidence
            })
    
    # Always return at least 3
    recommendations = recommendations[:3] if len(recommendations) >= 3 else recommendations
        
    return {"recommendations": recommendations}

@app.post("/risk")
def predict_risk(req: RiskRequest):
    if not risk_model:
        raise HTTPException(status_code=503, detail="Risk model not loaded")
    
    # Education level normalization — map common inputs to encoder classes
    edu_mapping = {
        "10th": "10th", "10": "10th", "matric": "10th",
        "12th": "12th", "12": "12th", "intermediate": "12th", "hsc": "12th",
        "diploma": "Diploma",
        "graduate": "Graduate", "graduation": "Graduate", "ug": "Graduate",
        "bachelor": "Graduate", "b.tech": "Graduate", "bca": "Graduate", "bsc": "Graduate",
        "post-graduate": "Post-Graduate", "postgraduate": "Post-Graduate", "pg": "Post-Graduate",
        "master": "Post-Graduate", "mba": "Post-Graduate", "mca": "Post-Graduate", "mtech": "Post-Graduate",
        "phd": "PhD", "doctorate": "PhD"
    }
    edu_input = edu_mapping.get(req.education_level.lower().strip(), "Graduate")
    
    # State encoding — fallback to 'Maharashtra' (medium risk state) if unknown
    state_idx = 0
    if state_encoder and req.state in state_encoder.classes_:
        state_idx = int(state_encoder.transform([req.state])[0])
    elif state_encoder:
        # Try partial match
        for cls in state_encoder.classes_:
            if req.state.lower() in cls.lower() or cls.lower() in req.state.lower():
                state_idx = int(state_encoder.transform([cls])[0])
                break
    
    # Education encoding
    edu_idx = 2  # default = Graduate
    if education_encoder and edu_input in education_encoder.classes_:
        edu_idx = int(education_encoder.transform([edu_input])[0])
    
    skill_gap = float(req.skill_gap_score or 0)
    features = [[state_idx, edu_idx, skill_gap]]
    
    prediction = int(risk_model.predict(features)[0])
    risk_level = "Low" if prediction == 0 else ("Medium" if prediction == 1 else "High")
    
    # Meaningful risk percentage range per level
    if prediction == 0:
        risk_percentage = round(15 + (skill_gap * 0.15), 1)   # 15–30%
    elif prediction == 1:
        risk_percentage = round(40 + (skill_gap * 0.15), 1)   # 40–55%
    else:
        risk_percentage = round(65 + (skill_gap * 0.15), 1)   # 65–80%
    risk_percentage = min(risk_percentage, 95)

    # Dynamic factors
    factors = []
    if skill_gap > 50:
        factors.append("High skill gap detected")
    if edu_input in ["10th", "12th"]:
        factors.append("Lower education qualification increases risk")
    if edu_input in ["Post-Graduate", "PhD"]:
        factors.append("Higher education reduces unemployment risk")
    factors.append(f"Regional employment rate in {req.state}")
    if not factors:
        factors = ["Skill alignment", "Regional employment rate", "Education qualification"]
    
    return {
        "risk_level": risk_level,
        "risk_score": risk_percentage,
        "state_analyzed": req.state,
        "education_analyzed": edu_input,
        "factors": factors
    }

@app.post("/parse")
def parse_resume(req: ParseRequest):
    # LinkedIn URL Simulation
    if "linkedin.com/in/" in req.text.lower():
        name_match = re.search(r'in/([^/?]+)', req.text, re.I)
        name = name_match.group(1).replace('-', ' ').title() if name_match else "User"
        return {
            "name": name,
            "skills": ["Python", "Machine Learning", "FastAPI", "Project Management"],
            "education": ["B.Tech Computer Science"],
            "experience": "3+ years in AI Development",
            "parsed": True,
            "source": "LinkedIn"
        }

    # Regex based parsing (Robust fallback)
    skill_keywords = ["Python", "Java", "React", "Node.js", "SQL", "AWS", "Docker", "Machine Learning"]
    found_skills = [s for s in skill_keywords if re.search(r'\b' + re.escape(s) + r'\b', req.text, re.I)]
    
    edu_patterns = [r'\bB\.?Tech\b', r'\bBCA\b', r'\bMCA\b', r'\bM\.?Tech\b', r'\bBachelor\b', r'\bMaster\b']
    found_edu = [re.search(p, req.text, re.I).group() for p in edu_patterns if re.search(p, req.text, re.I)]
    
    return {
        "skills": list(set(found_skills)),
        "education": list(set(found_edu)),
        "parsed": True
    }

class GapRequest(BaseModel):
    user_skills: List[str]
    required_skills: List[str]

@app.post("/gap-analysis")
def skill_gap_analysis(req: GapRequest):
    user_set = set([s.lower() for s in req.user_skills])
    required_set = set([s.lower() for s in req.required_skills])
    
    missing = list(required_set - user_set)
    match_percentage = (len(required_set & user_set) / len(required_set)) * 100 if required_set else 100
    
    return {
        "missing_skills": missing,
        "match_percentage": round(match_percentage, 2),
        "recommendation": f"Focus on learning: {', '.join(missing[:3])}" if missing else "You are a perfect match!"
    }

@app.post("/simulate")
def simulate_career(req: SimulateRequest):
    if not simulation_model:
        raise HTTPException(status_code=503, detail="Simulation model not loaded")
    
    # Skill-based salary multipliers (India market specific)
    # High-demand skills command premium over base prediction
    skill_multipliers = {
        "Machine Learning": 1.35, "AI": 1.35, "Data Science": 1.30,
        "Cloud Computing": 1.25, "DevOps": 1.22, "Cybersecurity": 1.20,
        "Python": 1.18, "React": 1.15, "Node.js": 1.12, "Java": 1.10,
        "JavaScript": 1.08, "Angular": 1.08, "Data Analysis": 1.10,
        "SQL": 1.05, "UI/UX Design": 1.08, "Digital Marketing": 0.95,
        "Content Writing": 0.85, "Excel": 0.90, "Graphic Design": 0.88,
        "SEO": 0.90
    }
    
    skill = req.skill or req.career or ""
    multiplier = skill_multipliers.get(skill, 1.0)
    
    # Current Salary Prediction (base LPA from model, then apply skill premium)
    base_salary = float(simulation_model.predict([[req.experience]])[0])
    current_salary_lpa = max(base_salary * multiplier, 2.5)  # minimum 2.5 LPA
    
    # Career trajectory label
    if multiplier >= 1.25:
        trajectory = "High Growth — Premium Skill"
    elif multiplier >= 1.10:
        trajectory = "Strong Growth"
    elif multiplier >= 1.0:
        trajectory = "Stable Growth"
    else:
        trajectory = "Moderate Growth"
    
    # Simulate 10 years
    projections = []
    for i in range(11):
        year_exp = req.experience + i
        base_proj = float(simulation_model.predict([[year_exp]])[0])
        projected_lpa = max(base_proj * multiplier, 2.5)
        projections.append({
            "year": 2026 + i,
            "estimated_salary_lpa": round(projected_lpa, 1),
            "estimated_salary": round(projected_lpa, 1),  # keep old key for compatibility
            "stability_index": round(min(95, 60 + (year_exp * 2.5)), 1)
        })
        
    return {
        "current_base_salary": round(current_salary_lpa, 1),
        "current_base_salary_lpa": round(current_salary_lpa, 1),
        "skill_applied": skill if skill else "General",
        "skill_multiplier": multiplier,
        "ten_year_projection": projections,
        "career_trajectory": trajectory
    }

class SchemeRecommendRequest(BaseModel):
    skills: List[str]
    education: str
    category: Optional[str] = None

# Mock Dataset of Indian Govt Schemes
GOVT_SCHEME_DATA = [
    {
        "title": "PMKVY 4.0",
        "benefits": "Short-term training, certification, and placement assistance for technical skills.",
        "eligibility": ["Python", "Java", "Coding", "Electronics"],
        "category": "Skill Development",
        "link": "https://www.pmkvyofficial.org/"
    },
    {
        "title": "NAPS (Apprenticeship)",
        "benefits": "Stipend based on-the-job training with top companies.",
        "eligibility": ["B.Tech", "Graduate", "Diploma"],
        "category": "Internship",
        "link": "https://www.apprenticeshipindia.gov.in/"
    },
    {
        "title": "Digital India Internship Scheme",
        "benefits": "Internship at MeitY with monthly stipend and certificate.",
        "eligibility": ["B.Tech", "MCA", "Computer Science"],
        "category": "Internship",
        "link": "https://www.meity.gov.in/internship-scheme"
    },
    {
        "title": "Startup India Learning Program",
        "benefits": "Free certification course on entrepreneurship and business.",
        "eligibility": ["Graduate", "Interests: Business"],
        "category": "Free Learning",
        "link": "https://www.startupindia.gov.in/"
    }
]

# Mock Dataset for Skill India Digital
SKILL_INDIA_DATA = [
    {
        "title": "IT-ITeS Skill Upgradation",
        "description": "Advance your career in IT with certified courses from Skill India Digital.",
        "link": "https://www.skillindiadigital.gov.in/courses/course-mode?sector=24",
        "type": "Course",
        "sector": "IT",
        "skills": ["Python", "Java", "Coding", "Cloud", "Data Science"]
    },
    {
        "title": "Digital Technology Internship",
        "description": "Hands-on internship opportunities at top digital firms.",
        "link": "https://www.skillindiadigital.gov.in/internship",
        "type": "Internship",
        "sector": "Digital",
        "skills": ["Marketing", "Design", "Management", "Content"]
    },
    {
        "title": "Skill India Job Opportunities",
        "description": "Explore diverse job roles matched to your certifications and skills.",
        "link": "https://www.skillindiadigital.gov.in/opportunities",
        "type": "Job",
        "sector": "General",
        "skills": ["Retail", "Logistics", "Construction", "Service"]
    },
    {
        "title": "AI & ML Certification",
        "description": "Specialized certification for AI and Machine Learning enthusiasts.",
        "link": "https://www.skillindiadigital.gov.in/courses/course-mode?sector=24",
        "type": "Course",
        "sector": "AI",
        "skills": ["Machine Learning", "AI", "FastAPI", "TensorFlow"]
    }
]

@app.post("/opportunities/external")
def recommend_opportunities(req: SchemeRecommendRequest):
    recommended = []
    user_skills = [s.lower() for s in req.skills]
    
    for opp in SKILL_INDIA_DATA:
        # Match based on skills overlap
        match = any(s.lower() in user_skills for s in opp['skills'])
        if match:
            recommended.append(opp)
            
    # Fallback to general opportunities if no skill match
    if not recommended:
        recommended = [SKILL_INDIA_DATA[0], SKILL_INDIA_DATA[2]]
        
    return {"opportunities": recommended}

@app.post("/schemes/recommend")
def recommend_schemes(req: SchemeRecommendRequest):
    recommended = []
    user_text = (req.education + " " + " ".join(req.skills)).lower()
    
    # Combined data for schemes
    all_schemes = GOVT_SCHEME_DATA + [
        {
            "title": "Skill India Digital Hub",
            "benefits": "One-stop platform for all skill development schemes and apprenticeship.",
            "eligibility": ["Any", "Student", "Graduate"],
            "category": "Portal",
            "link": "https://www.skillindiadigital.gov.in/"
        }
    ]
    
    for s in all_schemes:
        match = any(keyword.lower() in user_text for keyword in s['eligibility'])
        if match or "any" in [e.lower() for e in s['eligibility']]:
            recommended.append(s)
            
    if not recommended:
        recommended = all_schemes[:2]
        
    return {"schemes": recommended}

class ConsultantRecommendRequest(BaseModel):
    unemployment_risk: float
    career_uncertainty_score: float
    user_skills: List[str]
    selected_career: Optional[str] = None

@app.post("/consultant/recommend")
def recommend_consultants(req: ConsultantRecommendRequest):
    # ML Logic: Recommend consultant if user is at high risk or highly confused
    needs_consultant = req.unemployment_risk > 60 or req.career_uncertainty_score > 70
    
    reasons = []
    if req.unemployment_risk > 60:
        reasons.append("High unemployment risk detected based on current skill alignment.")
    if req.career_uncertainty_score > 70:
        reasons.append("High career path uncertainty detected.")
        
    recommended_expertise = []
    if "Python" in req.user_skills or "Java" in req.user_skills:
        recommended_expertise.append("IT & Software")
    if not req.selected_career:
        recommended_expertise.append("Career Counseling")
    else:
        recommended_expertise.append(f"{req.selected_career} Expert")

    return {
        "needs_consultant": needs_consultant,
        "recommendation_reason": " ".join(reasons) if reasons else "Proactive career growth scaling.",
        "suggested_expertise": recommended_expertise,
        "priority": "High" if needs_consultant else "Normal"
    }

@app.post("/analyze-emotion")
def analyze_emotion(req: dict):
    from textblob import TextBlob
    text = req.get("text", "")
    blob = TextBlob(text)
    polarity = blob.sentiment.polarity
    
    if polarity < -0.3:
        emotion = "stressed"
        priority = "high"
    elif polarity < 0:
        emotion = "confused"
        priority = "normal"
    elif polarity > 0.3:
        emotion = "happy"
        priority = "normal"
    else:
        emotion = "neutral"
        priority = "normal"
    
    return {
        "emotion": emotion,
        "confidence": abs(polarity),
        "priority": priority
    }

@app.post("/generate-session-summary")
def generate_session_summary(req: dict):
    messages = req.get("messages", [])
    if not messages:
        return {"summary": "No messages recorded.", "key_topics": []}
    
    full_text = " ".join([m.get("content", "") for m in messages if m.get("content")])
    words = full_text.split()
    
    # Heuristic-based summary (extractive-like)
    summary = " ".join(words[:30]) + "..." if len(words) > 30 else full_text
    
    # Mock key topics extraction
    common_stops = {"the", "and", "you", "that", "this", "help", "with", "have"}
    key_topics = list(set([w.lower().strip(".,") for w in words if len(w) > 5 and w.lower() not in common_stops]))[:5]
    
    return {
        "summary": summary,
        "key_topics": key_topics
    }

@app.post("/evaluate-interview-answer")
def evaluate_interview_answer(req: InterviewEvaluationRequest):
    # Mocking semantic analysis
    # In production, this would use a transformer model (BERT/RoBERTa) to calculate similarity
    # or an LLM (GPT) to give specific feedback.
    
    answer_words = set(req.answer.lower().split())
    # Keyword-based relevance
    technical_keywords = {
        "Software Engineer": ["code", "development", "testing", "architecture", "scalability", "bug", "git", "api", "deployment", "backend", "frontend", "database", "microservice", "agile"],
        "Web Developer": ["html", "css", "javascript", "react", "vue", "angular", "responsive", "frontend", "api", "rest", "dom", "webpack", "node", "typescript", "browser", "performance", "responsive", "bootstrap", "tailwind", "component"],
        "Data Analyst": ["data", "sql", "excel", "dashboard", "visualization", "insight", "metric", "kpi", "tableau", "powerbi", "report", "trend", "analysis", "query", "pivot", "chart", "stakeholder", "python", "cleaning"],
        "Data Scientist": ["data", "model", "analysis", "statistics", "python", "insight", "machine learning", "feature", "accuracy", "overfitting", "cross-validation", "sklearn", "tensorflow", "pytorch", "nlp", "classification", "regression", "clustering", "shap", "deployment"],
        "Marketing Manager": ["brand", "customer", "campaign", "social media", "growth", "strategy", "roi", "audience", "conversion", "funnel", "content", "seo", "engagement", "analytics", "target", "persona"],
        "Product Designer": ["ux", "ui", "design", "user", "research", "prototype", "wireframe", "figma", "accessibility", "usability", "feedback", "iteration", "journey", "persona", "testing", "heuristic"]
    }
    
    relevant_keywords = technical_keywords.get(req.role, ["experience", "team", "growth", "challenge", "solution"])
    matches = [w for w in answer_words if any(k in w for k in relevant_keywords)]
    
    # Heuristic Scoring
    complexity_score = min(len(answer_words) / 5, 40) # length matters
    relevance_score = min(len(matches) * 10, 50) # keyword match matters
    
    total_score = complexity_score + relevance_score + 10 # base score
    
    feedback = "Good attempt. "
    if len(answer_words) < 20:
        feedback += "Try to provide more detailed examples from your past experience. "
    if len(matches) < 2:
        feedback += "Focus more on role-specific technical terminology. "
    else:
        feedback += "Clear and relevant answer. "
        
    improvement_areas = []
    if len(answer_words) < 30: improvement_areas.append("Detail and Depth")
    if len(matches) < 3: improvement_areas.append("Technical Vocabulary")
    if "i " not in req.answer.lower(): improvement_areas.append("Personal Ownership (use 'I')")

    return {
        "score": min(round(total_score, 1), 100),
        "feedback": feedback,
        "improvement_areas": improvement_areas if improvement_areas else ["Keep practicing with diverse questions"]
    }

if __name__ == "__main__":

    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)