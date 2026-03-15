import spacy
import re
import json

# Try loading spacy model, fallback if not found
try:
    nlp = spacy.load("en_core_web_sm")
except:
    nlp = None

def extract_skills(text):
    # Common skill keywords (Can be expanded)
    skill_keywords = [
        "Python", "Java", "JavaScript", "C++", "C#", "SQL", "NoSQL", 
        "React", "Angular", "Vue", "Node.js", "Express", "Django", "Flask",
        "Pandas", "NumPy", "Scikit-Learn", "TensorFlow", "PyTorch", "AWS", "Azure", "GCP",
        "HTML", "CSS", "Tailwind", "Bootstrap", "Docker", "Kubernetes", "Git",
        "Machine Learning", "Data Analysis", "Project Management", "Agile", "Scrum"
    ]
    
    found_skills = []
    for skill in skill_keywords:
        if re.search(r'\b' + re.escape(skill) + r'\b', text, re.I):
            found_skills.append(skill)
    return found_skills

def extract_education(text):
    # Regex for common degrees
    education_patterns = [
        r'\bB\.E\b', r'\bB\.Tech\b', r'\bM\.Tech\b', r'\bBCA\b', r'\bMCA\b',
        r'\bBachelor of [A-Za-z\s]+\b', r'\bMaster of [A-Za-z\s]+\b', r'\bPhD\b'
    ]
    
    found_edu = []
    for pattern in education_patterns:
        match = re.search(pattern, text, re.I)
        if match:
            found_edu.append(match.group())
    return found_edu

def parse_resume(text):
    skills = extract_skills(text)
    education = extract_education(text)
    
    return {
        "skills": list(set(skills)),
        "education": list(set(education)),
        "raw_text_length": len(text)
    }

if __name__ == "__main__":
    # Test sample
    test_text = "Experienced Python developer with a B.Tech degree. Skilled in React, SQL and AWS."
    print(json.dumps(parse_resume(test_text), indent=2))
