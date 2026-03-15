const fetch = require('node-fetch');

class ZeroResumeBuilder {

    // Step 1: AI Questions - Progressive conversation
    getQuestions() {
        return [
            {
                id: 1,
                question: "Aapka naam kya hai?",
                type: "text",
                field: "name"
            },
            {
                id: 2,
                question: "Aapki qualification kya hai? (10th, 12th, Graduate, etc.)",
                type: "text",
                field: "education.qualification"
            },
            {
                id: 3,
                question: "Aapne kya kaam kiya hai? Koi bhi experience - job, internship, ghar pe kaam, college projects, freelancing, ya kuch bhi. Detail mein batao.",
                type: "textarea",
                field: "experience"
            },
            {
                id: 4,
                question: "Aap kya skills jaante ho? Jaise - computer, mobile, language, driving, cooking, accounting, etc.",
                type: "textarea",
                field: "skills"
            },
            {
                id: 5,
                question: "Aapko kis tarah ka kaam karna pasand hai? Ya aap kya seekhna chahte ho?",
                type: "textarea",
                field: "interests"
            },
            {
                id: 6,
                question: "Aap kaha rehte ho? (City/District)",
                type: "text",
                field: "location"
            },
            {
                id: 7,
                question: "Aapki umr kya hai?",
                type: "number",
                field: "age"
            }
        ];
    }

    // Step 2: Extract skills from free-text using AI
    async extractSkills(experienceText) {
        try {
            const apiKey = process.env.GEMINI_API_KEY;
            
            if (!apiKey) {
                return this.extractSkillsBasic(experienceText);
            }

            const prompt = `You are a career counselor analyzing someone's experience to extract skills.

Text: "${experienceText}"

Extract skills from this text. Look for:
- Technical skills (software, tools, languages)
- Soft skills (communication, leadership, teamwork)
- Domain skills (accounting, marketing, teaching)
- Any work-related abilities

Return ONLY a JSON array of skills (no extra text):
["skill1", "skill2", "skill3"]

Examples:
- "I managed shop" → ["Retail Management", "Customer Service", "Inventory Management"]
- "I taught kids" → ["Teaching", "Communication", "Patience"]
- "I used Excel for accounts" → ["Microsoft Excel", "Accounting", "Data Entry"]`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                }
            );

            if (!response.ok) {
                return this.extractSkillsBasic(experienceText);
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            
            // Extract JSON array
            const jsonMatch = text.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
                const skills = JSON.parse(jsonMatch[0]);
                console.log('✅ AI extracted skills from experience');
                return skills;
            }
            
            return this.extractSkillsBasic(experienceText);

        } catch (error) {
            console.error('Skill extraction error:', error.message);
            return this.extractSkillsBasic(experienceText);
        }
    }

    // Fallback basic skill extraction (keyword matching)
    extractSkillsBasic(text) {
        const skillKeywords = {
            'shop': ['Retail', 'Customer Service', 'Sales'],
            'computer': ['Computer Literacy', 'MS Office'],
            'excel': ['Microsoft Excel', 'Data Entry'],
            'teach': ['Teaching', 'Communication', 'Training'],
            'manage': ['Management', 'Leadership', 'Organization'],
            'cook': ['Cooking', 'Food Preparation', 'Time Management'],
            'drive': ['Driving', 'Vehicle Operation'],
            'account': ['Accounting', 'Financial Management', 'Bookkeeping'],
            'design': ['Design', 'Creativity', 'Visual Communication'],
            'write': ['Writing', 'Content Creation', 'Communication'],
            'speak': ['Communication', 'Public Speaking', 'Presentation'],
            'english': ['English Communication', 'Language Skills'],
            'hindi': ['Hindi Communication', 'Language Skills']
        };

        const lowerText = text.toLowerCase();
        const extractedSkills = [];

        for (const [keyword, skills] of Object.entries(skillKeywords)) {
            if (lowerText.includes(keyword)) {
                extractedSkills.push(...skills);
            }
        }

        return extractedSkills.length > 0 
            ? [...new Set(extractedSkills)] // Remove duplicates
            : ['Communication', 'Teamwork', 'Problem Solving'];
    }

    // Step 3: Parse skills from user's skill text
    async parseSkills(skillsText) {
        if (!skillsText || skillsText.trim() === '') {
            return [];
        }

        try {
            const apiKey = process.env.GEMINI_API_KEY;
            
            if (!apiKey) {
                return this.parseSkillsBasic(skillsText);
            }

            const prompt = `Extract individual skills from this text as a JSON array:

Text: "${skillsText}"

Return ONLY a JSON array (no extra text):
["skill1", "skill2", "skill3"]

Example: "I know HTML, CSS, and little bit JavaScript" → ["HTML", "CSS", "JavaScript"]`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                }
            );

            if (!response.ok) {
                return this.parseSkillsBasic(skillsText);
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            
            const jsonMatch = text.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            return this.parseSkillsBasic(skillsText);

        } catch (error) {
            console.error('Skill parsing error:', error.message);
            return this.parseSkillsBasic(skillsText);
        }
    }

    // Basic skill parsing (comma/newline split)
    parseSkillsBasic(skillsText) {
        return skillsText
            .split(/[,\n]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }

    // Step 4: Parse interests
    async parseInterests(interestsText) {
        if (!interestsText || interestsText.trim() === '') {
            return [];
        }

        try {
            const apiKey = process.env.GEMINI_API_KEY;
            
            if (!apiKey) {
                return this.parseInterestsBasic(interestsText);
            }

            const prompt = `Extract career interests/goals from this text as a JSON array:

Text: "${interestsText}"

Return ONLY a JSON array (no extra text):
["interest1", "interest2", "interest3"]

Example: "I want to learn coding and work in IT" → ["Programming", "Software Development", "IT Career"]`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                }
            );

            if (!response.ok) {
                return this.parseInterestsBasic(interestsText);
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            
            const jsonMatch = text.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            return this.parseInterestsBasic(interestsText);

        } catch (error) {
            console.error('Interest parsing error:', error.message);
            return this.parseInterestsBasic(interestsText);
        }
    }

    // Basic interest parsing
    parseInterestsBasic(interestsText) {
        const commonInterests = {
            'code': 'Programming',
            'computer': 'IT/Technology',
            'design': 'Design',
            'teach': 'Teaching/Education',
            'business': 'Business/Entrepreneurship',
            'market': 'Marketing',
            'account': 'Accounting/Finance',
            'health': 'Healthcare',
            'cook': 'Culinary Arts'
        };

        const lowerText = interestsText.toLowerCase();
        const interests = [];

        for (const [keyword, interest] of Object.entries(commonInterests)) {
            if (lowerText.includes(keyword)) {
                interests.push(interest);
            }
        }

        return interests.length > 0 ? interests : ['Career Development'];
    }

    // Step 5: Build complete profile from answers
    async buildProfile(answers) {
        try {
            console.log('🔨 Building profile from answers...');

            // Extract skills from experience text
            const experienceSkills = await this.extractSkills(answers.experience || '');
            
            // Parse explicitly mentioned skills
            const mentionedSkills = await this.parseSkills(answers.skills || '');
            
            // Combine and deduplicate
            const allSkills = [...new Set([...experienceSkills, ...mentionedSkills])];

            // Parse interests
            const interests = await this.parseInterests(answers.interests || '');

            // Build structured profile
            const profile = {
                name: answers.name || 'User',
                email: answers.email || '',
                location: answers.location || '',
                age: parseInt(answers.age) || null,
                education: {
                    qualification: answers.education || 'Not specified',
                    stream: '',
                    year: null
                },
                skills: allSkills,
                interests: interests,
                experience: answers.experience || 'Fresher',
                careerReadiness: this.calculateReadiness(allSkills, answers.experience),
                isZeroResumeProfile: true
            };

            console.log('✅ Profile built successfully');
            console.log(`   Skills extracted: ${allSkills.length}`);
            console.log(`   Interests identified: ${interests.length}`);

            return profile;

        } catch (error) {
            console.error('Profile building error:', error);
            throw error;
        }
    }

    // Calculate basic career readiness score
    calculateReadiness(skills, experience) {
        let score = 30; // Base

        // Skills factor
        score += Math.min(skills.length * 5, 30);

        // Experience factor
        if (experience && experience.toLowerCase() !== 'fresher' && experience.length > 20) {
            score += 20;
        }

        return Math.min(score, 100);
    }
}

module.exports = new ZeroResumeBuilder();