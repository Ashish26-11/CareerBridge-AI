const mongoose = require('mongoose');
const Career = require('./models/Career');
const Scheme = require('./models/Scheme');
const Job = require('./models/Job');
const User = require('./models/User');
require('dotenv').config();

const careers = [
    // ─── EXISTING CAREERS (unchanged) ───────────────────────────────────────
    {
        title: "Data Operations Executive",
        description: "Manage and verify data entries for local businesses and logistics companies.",
        salaryRange: { entry: "₹15,000", mid: "₹35,000" },
        locationDemand: ["Lucknow", "Delhi", "Pune"],
        skillsRequired: ["MS Excel", "Typing", "Data Entry"],
        stabilityScore: 85,
        automationRisk: 20,
        roadmap: [
            { phase: "Phase 1: Foundations", duration: "2 Weeks", skills: ["Keyboard Proficiency", "Data Structures"], resources: [{ title: "Typing Speed Course", link: "https://www.typingclub.com", isFree: true }, { title: "Excel for Beginners - NPTEL", link: "https://swayam.gov.in", isFree: true }] },
            { phase: "Phase 2: Advanced Tools", duration: "1 Month", skills: ["Advanced Excel", "Database Basics"], resources: [{ title: "VLOOKUP & Pivot Tables - YouTube", link: "https://youtube.com/results?search_query=excel+pivot+tables+hindi", isFree: true }] },
            { phase: "Phase 3: Certification", duration: "2 Weeks", skills: ["Quality Control", "Reporting"], resources: [{ title: "Professional Data Entry Cert", link: "https://coursera.org/learn/data-analysis-excel", isFree: false }] }
        ]
    },
    {
        title: "Digital Marketing Assistant",
        description: "Help local small businesses grow their online presence.",
        salaryRange: { entry: "₹18,000", mid: "₹45,000" },
        locationDemand: ["Remote", "Bangalore", "Mumbai"],
        skillsRequired: ["Social Media", "Basic Graphic Design", "Content Writing"],
        stabilityScore: 90,
        automationRisk: 15,
        roadmap: [
            { phase: "Phase 1: Content", duration: "1 Month", skills: ["Canva", "Caption Writing"], resources: [{ title: "Graphic Design for Social Media - YouTube", link: "https://youtube.com/results?search_query=canva+tutorial+hindi", isFree: true }] },
            { phase: "Phase 2: Ad Management", duration: "1 Month", skills: ["FB Ads", "Google Ads"], resources: [{ title: "Google Digital Garage (Free)", link: "https://learndigital.withgoogle.com/digitalgarage", isFree: true }] }
        ]
    },

    // ─── NEW CAREER 1: Web Developer ────────────────────────────────────────
    {
        title: "Web Developer",
        description: "Build and maintain websites and web applications for businesses across India. Covers frontend (HTML/CSS/JS/React) and backend (Node.js, PHP, Django). Huge demand in startups and service companies.",
        salaryRange: { entry: "₹3,00,000", mid: "₹8,00,000" },
        locationDemand: ["Bengaluru", "Hyderabad", "Pune", "Delhi NCR", "Mumbai", "Remote"],
        skillsRequired: ["HTML", "CSS", "JavaScript", "React", "Node.js", "Git", "REST APIs", "MongoDB"],
        stabilityScore: 92,
        automationRisk: 12,
        roadmap: [
            {
                phase: "Phase 1: Web Fundamentals",
                duration: "Month 1-2",
                skills: ["HTML5", "CSS3", "Flexbox", "Grid", "Basic JavaScript"],
                resources: [
                    { title: "The Odin Project (Free Full Course)", link: "https://www.theodinproject.com", isFree: true },
                    { title: "freeCodeCamp - Responsive Web Design", link: "https://www.freecodecamp.org/learn/2022/responsive-web-design/", isFree: true },
                    { title: "JavaScript Tutorial - GeeksForGeeks", link: "https://www.geeksforgeeks.org/javascript-tutorial/", isFree: true }
                ]
            },
            {
                phase: "Phase 2: JavaScript & React",
                duration: "Month 3-4",
                skills: ["ES6+", "DOM Manipulation", "React.js", "Hooks", "Component Design"],
                resources: [
                    { title: "React Official Docs (Free)", link: "https://react.dev/learn", isFree: true },
                    { title: "Namaste JavaScript - YouTube (Hindi)", link: "https://youtube.com/@akshaymarch7", isFree: true },
                    { title: "NPTEL - Programming in Modern C++ (Pattern)", link: "https://swayam.gov.in", isFree: true }
                ]
            },
            {
                phase: "Phase 3: Backend & Databases",
                duration: "Month 5",
                skills: ["Node.js", "Express.js", "MongoDB", "REST API Design", "Authentication"],
                resources: [
                    { title: "Node.js Full Course - Coding Ninjas Blog", link: "https://www.codingninjas.com/studio/library/introduction-to-nodejs", isFree: true },
                    { title: "MongoDB University (Free)", link: "https://learn.mongodb.com", isFree: true }
                ]
            },
            {
                phase: "Phase 4: Projects & Job Ready",
                duration: "Month 6",
                skills: ["Git/GitHub", "Deployment (Vercel/Netlify)", "Portfolio Building", "DSA Basics"],
                resources: [
                    { title: "GitHub Student Pack (Free tools)", link: "https://education.github.com/pack", isFree: true },
                    { title: "Striver DSA Sheet - Take U Forward", link: "https://takeuforward.org/strivers-a2z-dsa-course/", isFree: true }
                ]
            }
        ]
    },

    // ─── NEW CAREER 2: Data Analyst ─────────────────────────────────────────
    {
        title: "Data Analyst",
        description: "Analyse business data to extract insights, build dashboards, and support decisions. In demand at banks, e-commerce companies, consulting firms, and startups across India.",
        salaryRange: { entry: "₹3,50,000", mid: "₹9,00,000" },
        locationDemand: ["Bengaluru", "Mumbai", "Hyderabad", "Delhi NCR", "Pune", "Chennai"],
        skillsRequired: ["SQL", "Excel", "Python", "Power BI", "Tableau", "Statistics", "Data Cleaning"],
        stabilityScore: 89,
        automationRisk: 18,
        roadmap: [
            {
                phase: "Phase 1: Excel & SQL Mastery",
                duration: "Month 1",
                skills: ["Advanced Excel", "Pivot Tables", "SQL Queries", "Joins", "Aggregations"],
                resources: [
                    { title: "SQL for Beginners - Mode Analytics (Free)", link: "https://mode.com/sql-tutorial/", isFree: true },
                    { title: "Excel for Data Analysis - NPTEL SWAYAM", link: "https://swayam.gov.in/nd2_imb20_ma26/preview", isFree: true },
                    { title: "Khan Academy Statistics", link: "https://www.khanacademy.org/math/statistics-probability", isFree: true }
                ]
            },
            {
                phase: "Phase 2: Python for Data",
                duration: "Month 2-3",
                skills: ["Python Basics", "Pandas", "NumPy", "Matplotlib", "Seaborn", "Data Cleaning"],
                resources: [
                    { title: "Python for Data Analysis - freeCodeCamp", link: "https://www.freecodecamp.org/news/python-data-science-course-matplotlib-pandas-numpy/", isFree: true },
                    { title: "Kaggle Python + Pandas Courses (Free)", link: "https://www.kaggle.com/learn", isFree: true },
                    { title: "NPTEL - Programming Data Structures (Python)", link: "https://nptel.ac.in/courses/106106145", isFree: true }
                ]
            },
            {
                phase: "Phase 3: Visualization Tools",
                duration: "Month 4",
                skills: ["Power BI", "Tableau Public", "Dashboard Design", "Storytelling with Data"],
                resources: [
                    { title: "Microsoft Power BI Learning (Free)", link: "https://learn.microsoft.com/en-us/training/powerplatform/power-bi", isFree: true },
                    { title: "Tableau Public (Free version)", link: "https://public.tableau.com", isFree: true }
                ]
            },
            {
                phase: "Phase 4: Real Projects & Certification",
                duration: "Month 5-6",
                skills: ["End-to-End Projects", "Google Data Analytics Cert", "LinkedIn Profile"],
                resources: [
                    { title: "Google Data Analytics Certificate (Coursera Audit)", link: "https://www.coursera.org/professional-certificates/google-data-analytics", isFree: true },
                    { title: "Real Datasets - Kaggle Competitions", link: "https://www.kaggle.com/competitions", isFree: true },
                    { title: "Analytics Vidhya Free Courses", link: "https://courses.analyticsvidhya.com/pages/all-free-courses", isFree: true }
                ]
            }
        ]
    },

    // ─── NEW CAREER 3: Data Scientist ────────────────────────────────────────
    {
        title: "Data Scientist",
        description: "Build ML models, conduct statistical analysis, and solve complex business problems using data. High-paying role in demand at product companies, fintech, healthtech, and research labs in India.",
        salaryRange: { entry: "₹5,00,000", mid: "₹15,00,000" },
        locationDemand: ["Bengaluru", "Hyderabad", "Delhi NCR", "Pune", "Mumbai", "Chennai"],
        skillsRequired: ["Python", "Machine Learning", "Statistics", "TensorFlow/PyTorch", "SQL", "NLP", "Feature Engineering"],
        stabilityScore: 91,
        automationRisk: 10,
        roadmap: [
            {
                phase: "Phase 1: Math & Python Foundation",
                duration: "Month 1-2",
                skills: ["Linear Algebra", "Probability & Statistics", "Python", "NumPy", "Pandas"],
                resources: [
                    { title: "3Blue1Brown - Essence of Linear Algebra (YouTube)", link: "https://youtube.com/@3blue1brown", isFree: true },
                    { title: "NPTEL - Probability & Statistics", link: "https://nptel.ac.in/courses/111105041", isFree: true },
                    { title: "Python for Everybody - Coursera (Audit Free)", link: "https://www.coursera.org/specializations/python", isFree: true }
                ]
            },
            {
                phase: "Phase 2: Classical Machine Learning",
                duration: "Month 3",
                skills: ["Regression", "Classification", "Clustering", "Scikit-learn", "Model Evaluation", "Cross Validation"],
                resources: [
                    { title: "Andrew Ng ML Course - Coursera (Audit Free)", link: "https://www.coursera.org/specializations/machine-learning-introduction", isFree: true },
                    { title: "NPTEL - Introduction to Machine Learning (IIT KGP)", link: "https://nptel.ac.in/courses/106105152", isFree: true },
                    { title: "Kaggle ML Courses (Free)", link: "https://www.kaggle.com/learn/intro-to-machine-learning", isFree: true }
                ]
            },
            {
                phase: "Phase 3: Deep Learning & NLP",
                duration: "Month 4-5",
                skills: ["Neural Networks", "CNNs", "RNNs", "Transformers", "HuggingFace", "NLP Basics"],
                resources: [
                    { title: "fast.ai - Practical Deep Learning (Free)", link: "https://course.fast.ai", isFree: true },
                    { title: "HuggingFace NLP Course (Free)", link: "https://huggingface.co/learn/nlp-course", isFree: true },
                    { title: "NPTEL - Deep Learning (IIT Ropar)", link: "https://nptel.ac.in/courses/106105215", isFree: true }
                ]
            },
            {
                phase: "Phase 4: MLOps & Deployment",
                duration: "Month 6",
                skills: ["Model Deployment", "Flask/FastAPI", "Docker Basics", "MLflow", "Kaggle Competitions"],
                resources: [
                    { title: "MLOps Zoomcamp (Free)", link: "https://github.com/DataTalksClub/mlops-zoomcamp", isFree: true },
                    { title: "FastAPI Documentation", link: "https://fastapi.tiangolo.com", isFree: true },
                    { title: "Kaggle - Real Data Competitions", link: "https://www.kaggle.com/competitions", isFree: true }
                ]
            }
        ]
    }
];

const jobs = [
    { title: "E-commerce Data Entry", company: "Local Mart", location: "Lucknow", salary: "₹15,000/mo", type: "Local", description: "Entry level data entry job for high school graduates.", verified: true },
    { title: "Social Media Intern", company: "Growth Agency", location: "Remote", salary: "₹8,000/mo", type: "Entry-level", description: "Learn while you earn.", verified: true },
    { title: "Delivery Partner", company: "SwiftLogistics", location: "Lucknow", salary: "₹20,000/mo", type: "Local", description: "Local delivery opportunities.", verified: true },
    { title: "Customer Support (Hindi)", company: "TechCall", location: "Remote", salary: "₹18,000/mo", type: "Remote", description: "Voice support for domestic clients.", verified: true },
    { title: "Junior IT Assistant", company: "State Govt", location: "Lucknow", salary: "₹25,000/mo", type: "Govt", description: "Government contractual role.", verified: true },
    // New jobs for new careers
    { title: "Junior Web Developer", company: "TechStartup India", location: "Remote", salary: "₹25,000/mo", type: "Remote", description: "Build React-based web apps for early-stage startup.", verified: true },
    { title: "Frontend Developer Intern", company: "Wipro", location: "Bengaluru", salary: "₹20,000/mo", type: "Internship", description: "6-month paid internship for freshers.", verified: true },
    { title: "Data Analyst - Fresher", company: "Accenture India", location: "Pune", salary: "₹4,00,000 PA", type: "Full-time", description: "Entry-level analyst role, SQL and Excel required.", verified: true },
    { title: "Business Analyst Intern", company: "Deloitte India", location: "Hyderabad", salary: "₹30,000/mo", type: "Internship", description: "Assist senior analysts with BI dashboards.", verified: true },
    { title: "Junior Data Scientist", company: "Flipkart", location: "Bengaluru", salary: "₹8,00,000 PA", type: "Full-time", description: "Build recommendation models for product listings.", verified: true },
    { title: "ML Engineer Intern", company: "PhonePe", location: "Bengaluru", salary: "₹40,000/mo", type: "Internship", description: "Work on fraud detection ML pipeline.", verified: true }
];

const schemes = [
    { title: "PMKVY Training", description: "Skill development scheme with job placement.", eligibility: "Unemployed youth", benefits: "Free certified training", category: "Skill Learning" },
    { title: "Digital India Internship", description: "Work with government portals.", eligibility: "Graduates", benefits: "Stipend + Certificate", category: "Internship" },
    { title: "UP Skill Development", description: "State government skill mission.", eligibility: "UP Residents", benefits: "Skill kits + Placement", category: "Skill Learning" },
    { title: "National Career Service", description: "Central job portal support.", eligibility: "All", benefits: "Job alerts + Counseling", category: "Current Jobs" },
    { title: "Skill India Digital - IT Courses", description: "Free IT and coding courses from Skill India portal.", eligibility: "All Indian citizens", benefits: "Free certified courses in Web Dev, Data, AI", category: "Skill Learning" },
    { title: "NPTEL Online Certification", description: "IIT/IISc professor-taught courses with free audit.", eligibility: "All", benefits: "Free learning, affordable certificate exams", category: "Skill Learning" }
];

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected for seeding...');

        await Career.deleteMany();
        await Career.insertMany(careers);
        console.log(`✅ ${careers.length} Careers seeded! (includes Web Developer, Data Analyst, Data Scientist)`);

        await Job.deleteMany();
        await Job.insertMany(jobs);
        console.log(`✅ ${jobs.length} Jobs seeded!`);

        await Scheme.deleteMany();
        await Scheme.insertMany(schemes);
        console.log(`✅ ${schemes.length} Schemes seeded!`);

        const adminExists = await User.findOne({ email: 'admin@careerbridge.ai' });
        if (!adminExists) {
            const admin = new User({
                name: 'System Admin',
                email: 'admin@careerbridge.ai',
                password: 'adminpassword123',
                role: 'admin'
            });
            await admin.save();
            console.log('✅ Admin user created (admin@careerbridge.ai / adminpassword123)');
        }

        mongoose.connection.close();
        console.log('🎉 Seeding complete!');
    } catch (err) {
        console.error(err);
    }
};

seedData();