const fetch = require('node-fetch');

class CareerSimulator {

    // Step 1: Salary data for different skills/roles (India-specific)
    getSalaryData() {
        return {
            // Programming Languages
            'Python': { entry: '3.5-6 LPA', mid: '8-15 LPA', demand: 95 },
            'JavaScript': { entry: '3-5.5 LPA', mid: '7-12 LPA', demand: 92 },
            'Java': { entry: '4-7 LPA', mid: '9-16 LPA', demand: 88 },
            'React': { entry: '4-7 LPA', mid: '8-14 LPA', demand: 90 },
            'Node.js': { entry: '3.5-6.5 LPA', mid: '8-14 LPA', demand: 87 },
            'Angular': { entry: '4-7 LPA', mid: '8-13 LPA', demand: 82 },
            'Data Science': { entry: '5-9 LPA', mid: '10-20 LPA', demand: 93 },
            'Machine Learning': { entry: '6-10 LPA', mid: '12-25 LPA', demand: 94 },
            'DevOps': { entry: '5-8 LPA', mid: '10-18 LPA', demand: 89 },
            'Cloud Computing': { entry: '5-9 LPA', mid: '11-20 LPA', demand: 91 },
            'Cybersecurity': { entry: '4-7 LPA', mid: '9-17 LPA', demand: 86 },
            
            // Design & Creative
            'UI/UX Design': { entry: '3-6 LPA', mid: '7-13 LPA', demand: 84 },
            'Graphic Design': { entry: '2.5-4.5 LPA', mid: '5-10 LPA', demand: 75 },
            
            // Marketing & Business
            'Digital Marketing': { entry: '2.5-5 LPA', mid: '6-12 LPA', demand: 83 },
            'Content Writing': { entry: '2-4 LPA', mid: '5-9 LPA', demand: 78 },
            'SEO': { entry: '2.5-4.5 LPA', mid: '6-11 LPA', demand: 80 },
            
            // Others
            'Excel': { entry: '2-3.5 LPA', mid: '4-7 LPA', demand: 70 },
            'SQL': { entry: '3-5 LPA', mid: '6-11 LPA', demand: 85 },
            'Data Analysis': { entry: '3.5-6 LPA', mid: '7-14 LPA', demand: 88 }
        };
    }

    // Step 2: Learning time estimates (in weeks)
    getLearningTime() {
        return {
            'Python': { beginner: 12, intermediate: 20 },
            'JavaScript': { beginner: 10, intermediate: 18 },
            'Java': { beginner: 14, intermediate: 24 },
            'React': { beginner: 8, intermediate: 14 },
            'Node.js': { beginner: 10, intermediate: 16 },
            'Data Science': { beginner: 16, intermediate: 28 },
            'Machine Learning': { beginner: 20, intermediate: 32 },
            'UI/UX Design': { beginner: 8, intermediate: 14 },
            'Digital Marketing': { beginner: 6, intermediate: 12 },
            'DevOps': { beginner: 12, intermediate: 20 },
            'SQL': { beginner: 6, intermediate: 10 },
            'Data Analysis': { beginner: 10, intermediate: 16 }
        };
    }

    // Step 3: Calculate timeline based on hours/week
    calculateTimeline(skillName, hoursPerWeek, currentLevel = 'beginner') {
        const learningTime = this.getLearningTime();
        const skillData = learningTime[skillName];
        
        if (!skillData) {
            return { weeks: 12, months: 3, hours: 120 }; // Default
        }

        // Recommended hours needed
        const totalHoursNeeded = currentLevel === 'beginner' 
            ? skillData.beginner * 10  // 10 hours per week baseline
            : skillData.intermediate * 10;

        const weeksNeeded = Math.ceil(totalHoursNeeded / hoursPerWeek);
        const monthsNeeded = Math.ceil(weeksNeeded / 4);

        return {
            weeks: weeksNeeded,
            months: monthsNeeded,
            totalHours: totalHoursNeeded
        };
    }

    // Step 4: Get job roles for a skill
    getJobRoles(skillName) {
        const roleMapping = {
            'Python': ['Backend Developer', 'Data Analyst', 'Python Developer', 'Automation Engineer'],
            'JavaScript': ['Frontend Developer', 'Full Stack Developer', 'Web Developer'],
            'React': ['React Developer', 'Frontend Developer', 'UI Developer'],
            'Node.js': ['Backend Developer', 'Full Stack Developer', 'API Developer'],
            'Data Science': ['Data Scientist', 'ML Engineer', 'Data Analyst'],
            'Machine Learning': ['ML Engineer', 'AI Developer', 'Data Scientist'],
            'UI/UX Design': ['UI Designer', 'UX Designer', 'Product Designer'],
            'Digital Marketing': ['Digital Marketing Executive', 'SEO Specialist', 'Social Media Manager'],
            'DevOps': ['DevOps Engineer', 'Site Reliability Engineer', 'Cloud Engineer'],
            'Data Analysis': ['Data Analyst', 'Business Analyst', 'Analytics Consultant']
        };

        return roleMapping[skillName] || ['Junior Developer', 'Entry Level Professional'];
    }

    // Step 5: Calculate success probability
    calculateSuccessProbability(userData, skillName, hoursPerWeek) {
        let probability = 50; // Base

        // Factor 1: Time commitment
        if (hoursPerWeek >= 15) probability += 20;
        else if (hoursPerWeek >= 10) probability += 10;
        else if (hoursPerWeek >= 5) probability += 5;

        // Factor 2: Related skills
        const relatedSkills = {
            'Python': ['JavaScript', 'Java', 'SQL'],
            'React': ['JavaScript', 'HTML', 'CSS'],
            'Node.js': ['JavaScript', 'Python'],
            'Data Science': ['Python', 'SQL', 'Excel']
        };

        const userSkills = userData.skills || [];
        const related = relatedSkills[skillName] || [];
        const hasRelated = related.some(s => userSkills.includes(s));
        if (hasRelated) probability += 15;

        // Factor 3: Education level
        const education = userData.education?.qualification?.toLowerCase() || '';
        if (education.includes('graduate') || education.includes('degree')) probability += 10;

        // Factor 4: Age factor
        const age = userData.age || 25;
        if (age < 30) probability += 5;

        // Cap at 95
        return Math.min(probability, 95);
    }

    // Step 6: Use Gemini AI for personalized learning path
    async generateLearningPath(userData, skillName, timeline, budget) {
        try {
            const apiKey = process.env.GEMINI_API_KEY;
            
            if (!apiKey) {
                return this.getFallbackLearningPath(skillName, timeline);
            }

            const prompt = `You are a career mentor creating a learning roadmap for an Indian student.

User Profile:
- Current Skills: ${userData.skills?.join(', ') || 'Beginner'}
- Education: ${userData.education?.qualification || 'Not specified'}
- Available Time: ${timeline.hoursPerWeek || 10} hours/week
- Budget: ${budget === 0 ? 'Free resources only' : `₹${budget}`}

Goal: Learn ${skillName} and become job-ready in ${timeline.months} months

Create a week-by-week learning plan in JSON format:
{
  "phases": [
    {
      "phase": "Phase name",
      "duration": "X weeks",
      "topics": ["topic1", "topic2"],
      "resources": [
        {"title": "Resource name", "platform": "Platform", "link": "URL", "isFree": true}
      ],
      "milestone": "What you'll achieve"
    }
  ],
  "projects": ["Project 1", "Project 2", "Project 3"],
  "certifications": ["Cert 1", "Cert 2"]
}

Keep resources FREE if budget is 0. Focus on practical projects.`;

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
                return this.getFallbackLearningPath(skillName, timeline);
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                console.log('✅ AI learning path generated');
                return JSON.parse(jsonMatch[0]);
            }
            
            return this.getFallbackLearningPath(skillName, timeline);

        } catch (error) {
            console.error('Learning path generation error:', error.message);
            return this.getFallbackLearningPath(skillName, timeline);
        }
    }

    // Fallback learning path
    getFallbackLearningPath(skillName, timeline) {
        return {
            phases: [
                {
                    phase: "Foundation",
                    duration: "4 weeks",
                    topics: [`${skillName} Basics`, "Core Concepts", "Syntax"],
                    resources: [
                        { title: "freeCodeCamp", platform: "Online", link: "https://freecodecamp.org", isFree: true }
                    ],
                    milestone: "Understanding fundamentals"
                },
                {
                    phase: "Intermediate",
                    duration: `${Math.ceil(timeline.weeks / 2)} weeks`,
                    topics: ["Advanced Concepts", "Best Practices", "Real Projects"],
                    resources: [
                        { title: "YouTube Tutorials", platform: "YouTube", link: "https://youtube.com", isFree: true }
                    ],
                    milestone: "Building projects"
                }
            ],
            projects: ["Project 1: Basic App", "Project 2: Portfolio Website", "Project 3: Full Application"],
            certifications: ["Online certification from Coursera/Udemy"]
        };
    }

    // Main simulation function
    async simulateCareer(userData, simulationInput) {
        const { skillToLearn, hoursPerWeek = 10, budget = 0 } = simulationInput;

        // Get salary data
        const salaryData = this.getSalaryData();
        const skillSalary = salaryData[skillToLearn] || { entry: '3-5 LPA', mid: '6-10 LPA', demand: 75 };

        // Calculate timeline
        const timeline = this.calculateTimeline(skillToLearn, hoursPerWeek);
        timeline.hoursPerWeek = hoursPerWeek;

        // Get job roles
        const jobRoles = this.getJobRoles(skillToLearn);

        // Calculate success probability
        const successProbability = this.calculateSuccessProbability(userData, skillToLearn, hoursPerWeek);

        // Generate learning path
        const learningPath = await this.generateLearningPath(userData, skillToLearn, timeline, budget);

        return {
            skill: skillToLearn,
            timeline: {
                months: timeline.months,
                weeks: timeline.weeks,
                totalHours: timeline.totalHours,
                hoursPerWeek: hoursPerWeek
            },
            salaryRange: {
                entry: skillSalary.entry,
                mid: skillSalary.mid
            },
            jobRoles: jobRoles,
            successProbability: successProbability,
            marketDemand: skillSalary.demand,
            learningPath: learningPath,
            estimatedJobReadyDate: new Date(Date.now() + timeline.months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };
    }
}

module.exports = new CareerSimulator();