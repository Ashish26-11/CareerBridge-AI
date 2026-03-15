const { GoogleGenerativeAI } = require('@google/generative-ai');

// Add fetch for Node.js
const fetch = require('node-fetch');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class UnemploymentRiskPredictor {
    
    // Step 1: Calculate base risk score (0-100)
    calculateBaseRisk(userData) {
        let riskScore = 0;
        const factors = [];

        // Factor 1: Skills Count & Relevance
        const skillsCount = userData.skills?.length || 0;
        if (skillsCount === 0) {
            riskScore += 25;
            factors.push({ factor: 'No skills listed', impact: 25 });
        } else if (skillsCount < 3) {
            riskScore += 15;
            factors.push({ factor: 'Limited skills', impact: 15 });
        } else if (skillsCount < 5) {
            riskScore += 5;
            factors.push({ factor: 'Below average skills', impact: 5 });
        }

        // Factor 2: Education Level
        const education = userData.education?.qualification?.toLowerCase() || '';
        if (!education || education.includes('10th') || education.includes('below')) {
            riskScore += 20;
            factors.push({ factor: 'Low education qualification', impact: 20 });
        } else if (education.includes('12th')) {
            riskScore += 15;
            factors.push({ factor: 'High school only', impact: 15 });
        } else if (education.includes('diploma')) {
            riskScore += 10;
            factors.push({ factor: 'Diploma level', impact: 10 });
        } else if (education.includes('graduate') && !education.includes('post')) {
            riskScore += 5;
            factors.push({ factor: 'Graduate level', impact: 5 });
        }

        // Factor 3: Experience
        const experience = userData.experience?.toLowerCase() || 'fresher';
        if (experience === 'fresher' || experience.includes('0') || experience.includes('no experience')) {
            riskScore += 20;
            factors.push({ factor: 'No work experience', impact: 20 });
        } else if (experience.includes('1') || experience.includes('one')) {
            riskScore += 10;
            factors.push({ factor: 'Minimal experience', impact: 10 });
        }

        // Factor 4: Location (Tier classification)
        const location = userData.location?.toLowerCase() || '';
        const tier1Cities = ['delhi', 'mumbai', 'bangalore', 'hyderabad', 'pune', 'chennai', 'kolkata'];
        const tier2Cities = ['jaipur', 'lucknow', 'chandigarh', 'indore', 'bhopal', 'nagpur', 'kochi'];
        
        const isTier1 = tier1Cities.some(city => location.includes(city));
        const isTier2 = tier2Cities.some(city => location.includes(city));
        
        if (!isTier1 && !isTier2) {
            riskScore += 15;
            factors.push({ factor: 'Rural/Tier-3 location with low opportunities', impact: 15 });
        } else if (isTier2) {
            riskScore += 5;
            factors.push({ factor: 'Tier-2 city', impact: 5 });
        }

        // Factor 5: Age
        const age = userData.age || 0;
        if (age > 35) {
            riskScore += 15;
            factors.push({ factor: 'Age above 35', impact: 15 });
        } else if (age < 18) {
            riskScore += 10;
            factors.push({ factor: 'Under 18 - limited job access', impact: 10 });
        }

        // Factor 6: Career Readiness Score (if exists)
        const readiness = userData.careerReadiness || 0;
        if (readiness < 30) {
            riskScore += 15;
            factors.push({ factor: 'Low career readiness', impact: 15 });
        } else if (readiness < 50) {
            riskScore += 5;
            factors.push({ factor: 'Below average readiness', impact: 5 });
        }

        // Cap at 100
        riskScore = Math.min(riskScore, 100);

        return {
            score: riskScore,
            factors: factors
        };
    }

    // Step 2: Get risk level
    getRiskLevel(score) {
        if (score >= 70) return { level: 'Critical', color: 'red' };
        if (score >= 50) return { level: 'High', color: 'orange' };
        if (score >= 30) return { level: 'Moderate', color: 'yellow' };
        return { level: 'Low', color: 'green' };
    }
   // Step 3: Use Gemini AI for personalized recommendations
async getAIRecommendations(userData, riskScore, factors) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            console.log('⚠️ Gemini API key not found, using fallback recommendations');
            return this.getFallbackRecommendations();
        }

        const prompt = `You are a career counselor analyzing unemployment risk for an Indian youth.

User Profile:
- Name: ${userData.name}
- Skills: ${userData.skills?.join(', ') || 'None listed'}
- Education: ${userData.education?.qualification || 'Not specified'}
- Experience: ${userData.experience || 'Fresher'}
- Location: ${userData.location || 'Not specified'}
- Age: ${userData.age || 'Not specified'}
- Interests: ${userData.interests?.join(', ') || 'None'}

Risk Score: ${riskScore}/100
Risk Factors:
${factors.map(f => `- ${f.factor} (+${f.impact} points)`).join('\n')}

Based on this analysis, provide exactly in this JSON format (no extra text, no markdown):
{
  "immediate_actions": ["action1", "action2", "action3"],
  "skill_recommendations": ["skill1", "skill2"],
  "career_path": "one line career suggestion",
  "motivation": "2-3 lines motivational message"
}`;

        // Use direct REST API call
       // Use direct REST API call
const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            }
        );

        if (!response.ok) {
            console.error('Gemini API HTTP Error:', response.status, response.statusText);
            return this.getFallbackRecommendations();
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('Unexpected Gemini response structure');
            return this.getFallbackRecommendations();
        }

        const text = data.candidates[0].content.parts[0].text;
        
        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('✅ Gemini AI recommendations generated successfully');
            return parsed;
        }
        
        return this.getFallbackRecommendations();

    } catch (error) {
        console.error('Gemini API Error:', error.message);
        return this.getFallbackRecommendations();
    }
}

// Helper function for fallback recommendations
getFallbackRecommendations() {
    return {
        immediate_actions: [
            "Complete your profile with accurate information",
            "Identify 2-3 skills to learn based on job market demand",
            "Connect with a career consultant for personalized guidance"
        ],
        skill_recommendations: ["Communication", "Problem Solving"],
        career_path: "Focus on skill development and networking",
        motivation: "Your current situation doesn't define your future. Take one step today."
    };
}

    // Step 4: Main prediction function
    async predictRisk(userData) {
        // Calculate base risk using rule-based system (always runs)
        const { score: ruleScore, factors } = this.calculateBaseRisk(userData);
        
        // Try to enhance score with ML service for state-based accuracy
        let mlScore = null;
        let mlRiskLevel = null;
        try {
            const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
            const education = userData.education?.qualification || 'Graduate';
            const state = userData.location || 'Maharashtra';
            // skill_gap_score: inverse of skills count (more skills = less gap)
            const skillGapScore = Math.max(0, 100 - ((userData.skills?.length || 0) * 15));
            
            const mlResponse = await fetch(`${mlServiceUrl}/risk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    state: state,
                    education_level: education,
                    skill_gap_score: skillGapScore
                }),
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            
            if (mlResponse.ok) {
                const mlData = await mlResponse.json();
                mlScore = mlData.risk_score;
                mlRiskLevel = mlData.risk_level;
                // Add ML factors to our list
                if (mlData.factors && Array.isArray(mlData.factors)) {
                    mlData.factors.forEach(f => {
                        if (!factors.find(existing => existing.factor === f)) {
                            factors.push({ factor: f, impact: 0, source: 'ml' });
                        }
                    });
                }
                console.log('✅ ML Risk service responded:', mlRiskLevel);
            }
        } catch (mlError) {
            console.log('⚠️ ML service unavailable, using rule-based risk only:', mlError.message);
        }
        
        // Blend rule-based and ML scores (60% rule-based, 40% ML if available)
        const finalScore = mlScore !== null
            ? Math.round(ruleScore * 0.6 + mlScore * 0.4)
            : ruleScore;
        
        // Get risk level from final score
        const riskLevel = this.getRiskLevel(finalScore);
        
        // Get AI recommendations
        const aiRecommendations = await this.getAIRecommendations(userData, finalScore, factors);

        return {
            riskScore: finalScore,
            riskLevel: riskLevel.level,
            riskColor: riskLevel.color,
            mlEnhanced: mlScore !== null,
            factors: factors,
            recommendations: aiRecommendations,
            analysisDate: new Date().toISOString()
        };
    }
}

module.exports = new UnemploymentRiskPredictor();