# CareerBridge AI - System Design Document

## 1. High-Level Architecture

CareerBridge AI is built on a modern, scalable, cloud-native architecture designed to serve thousands of concurrent users while maintaining low latency and high reliability.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LAYER                               │
│  Web App (Next.js) | Mobile App (Progressive Web App)           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│              Node.js/Express Backend APIs                        │
│         (Authentication, Business Logic, Orchestration)          │
└────────────┬────────────────────────────┬───────────────────────┘
             │                            │
             ▼                            ▼
┌────────────────────────┐    ┌──────────────────────────────────┐
│   AI/ML ENGINE LAYER   │    │    EXTERNAL INTEGRATIONS         │
│   FastAPI ML Service   │    │  - Job Portals APIs              │
│  - Career Prediction   │    │  - Course Platforms              │
│  - Skill Analysis      │    │  - Government Scheme DBs         │
│  - Job Matching        │    │  - Industry Trend Data           │
└────────────┬───────────┘    └──────────────┬───────────────────┘
             │                               │
             └───────────┬───────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  PostgreSQL (User Data, Profiles, Progress)                     │
│  MongoDB (Job Listings, Courses, Schemes - Cached)              │
│  AWS S3 (ML Models, Static Assets, User Documents)              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

- **Separation of Concerns**: Frontend, backend, and ML services are decoupled for independent scaling
- **Microservices Approach**: ML engine runs as a separate service for resource isolation
- **API-First Design**: All interactions happen through well-defined REST APIs
- **Cloud-Native**: Designed for AWS deployment with auto-scaling and high availability
- **Cost-Optimized**: Serverless components for variable workloads, reserved instances for baseline traffic

---

## 2. Major Components

### 2.1 Frontend Layer (Web/Mobile UI)

**Technology Stack**: Next.js 14 (React), TypeScript, Tailwind CSS

**Responsibilities**:
- User interface rendering and interaction
- Client-side state management (Zustand)
- Form validation and user input handling
- Real-time progress tracking and visualization
- Responsive design for mobile and desktop

**Key Pages**:
- Landing page and authentication
- Career assessment questionnaire
- Dashboard (progress, recommendations, jobs)
- Learning roadmap viewer
- Job/scheme browser

**Design Principles**:
- Mobile-first responsive design
- Progressive Web App (PWA) for offline capability
- Lightweight assets for low-bandwidth users
- Accessibility compliance (WCAG 2.1)

---

### 2.2 Backend API Layer

**Technology Stack**: Node.js, Express.js, PostgreSQL, MongoDB

**Responsibilities**:
- User authentication and authorization (JWT-based)
- Business logic orchestration
- Request routing to ML service
- Data validation and sanitization
- Session management
- API rate limiting and security

**Core API Endpoints**:
- `/auth/*` - User registration, login, session management
- `/profile/*` - User profile CRUD operations
- `/career/*` - Career recommendations and exploration
- `/skills/*` - Skill gap analysis and tracking
- `/roadmap/*` - Learning path generation and progress
- `/jobs/*` - Job search and recommendations
- `/schemes/*` - Government scheme discovery
- `/analytics/*` - User progress and insights

**Database Schema**:
- **PostgreSQL**: Users, profiles, progress tracking, skill assessments, application history
- **MongoDB**: Cached job listings, course catalogs, government schemes (frequently updated external data)

---

### 2.3 AI/ML Engine

**Technology Stack**: Python, FastAPI, scikit-learn, pandas, NumPy

**Responsibilities**:
- Career path recommendation using ML models
- Skill gap analysis and prioritization
- Job-skill matching algorithms
- Unemployment risk prediction
- Learning resource recommendation
- Government scheme eligibility matching

**ML Models**:

1. **Career Recommendation Model**
   - Input: User education, skills, interests, constraints
   - Output: Top 5 career paths with confidence scores
   - Algorithm: Multi-label classification + collaborative filtering

2. **Skill Gap Analyzer**
   - Input: Current skills, target career
   - Output: Prioritized skill gaps with learning difficulty scores
   - Algorithm: Skill graph analysis + NLP for skill extraction

3. **Job Matching Engine**
   - Input: User profile, job descriptions
   - Output: Ranked job recommendations
   - Algorithm: TF-IDF + cosine similarity + skill matching

4. **Unemployment Risk Predictor**
   - Input: User skills, industry trends, economic indicators
   - Output: Risk score (0-100) with mitigation suggestions
   - Algorithm: Gradient boosting classifier

5. **Learning Path Generator**
   - Input: Skill gaps, budget, time constraints
   - Output: Optimized learning sequence
   - Algorithm: Graph-based path optimization

**ML Service Endpoints**:
- `/predict/career` - Career recommendations
- `/analyze/skills` - Skill gap analysis
- `/match/jobs` - Job matching
- `/predict/unemployment-risk` - Risk assessment
- `/generate/roadmap` - Learning path generation
- `/recommend/schemes` - Government scheme matching

---

### 2.4 Database Layer

**PostgreSQL (Primary Database)**:
- User accounts and authentication
- User profiles and preferences
- Skill assessments and progress
- Job application history
- Learning progress tracking
- Analytics and metrics

**MongoDB (Cache & External Data)**:
- Job listings (scraped/API-fetched)
- Course catalogs
- Government schemes database
- Industry trend data
- Frequently updated external content

**AWS S3 (Object Storage)**:
- Trained ML model files (.pkl, .joblib)
- User-uploaded documents (optional resumes, certificates)
- Static assets (images, PDFs)
- Backup and archival data

---

### 2.5 External API Integrations

**Job Portals**:
- Integration with job APIs (Naukri, Indeed, LinkedIn Jobs)
- Web scraping for government job portals
- Real-time job feed updates

**Course Platforms**:
- NPTEL, Coursera, Udemy, YouTube APIs
- Government skill portal integration (NSDC, PMKVY)
- Free resource aggregation

**Government Databases**:
- PMKVY scheme database
- DDU-GKY training centers
- State-level skill development programs
- Scholarship and subsidy schemes

**Industry Data**:
- Labor market statistics (CMIE, NSSO)
- Skill demand trends
- Salary benchmarks

---

## 3. System & User Flows

### End-to-End User Journey

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: User Registration & Onboarding                           │
└──────────────────────────────────────────────────────────────────┘
User signs up → Creates profile (zero-resume mode) → Completes 
initial career assessment questionnaire → System captures education, 
skills, interests, budget, location, constraints

                            ▼

┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: AI Analysis & Career Recommendation                      │
└──────────────────────────────────────────────────────────────────┘
Frontend sends user data to Backend API → Backend calls ML Service 
→ ML model analyzes profile → Generates top 5 career recommendations 
with fit scores → Returns detailed career insights → Frontend displays 
interactive career cards

                            ▼

┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: Skill Gap Identification                                 │
└──────────────────────────────────────────────────────────────────┘
User selects target career → Backend requests skill gap analysis from 
ML Service → ML compares current skills vs. required skills → 
Identifies and prioritizes gaps → Returns skill gap report with 
difficulty ratings → Frontend visualizes gaps in radar chart

                            ▼

┌──────────────────────────────────────────────────────────────────┐
│ STEP 4: Personalized Learning Roadmap Generation                 │
└──────────────────────────────────────────────────────────────────┘
ML Service generates learning path based on skill gaps + user budget 
+ time availability → Curates courses from external APIs (NPTEL, 
Coursera, YouTube) → Optimizes learning sequence → Backend stores 
roadmap → Frontend displays step-by-step learning plan with resources

                            ▼

┌──────────────────────────────────────────────────────────────────┐
│ STEP 5: Job & Government Scheme Matching                         │
└──────────────────────────────────────────────────────────────────┘
Backend fetches jobs from external APIs + cached MongoDB → ML Service 
matches jobs to user profile → Filters by location, salary, eligibility 
→ Simultaneously matches government schemes → Returns ranked 
opportunities → Frontend displays job cards + scheme recommendations

                            ▼

┌──────────────────────────────────────────────────────────────────┐
│ STEP 6: Progress Tracking & Continuous Improvement               │
└──────────────────────────────────────────────────────────────────┘
User marks courses complete → Backend updates progress in PostgreSQL 
→ ML Service recalculates skill levels → Updates career readiness 
score → Triggers new job recommendations if threshold reached → 
Frontend dashboard reflects real-time progress → Sends motivational 
alerts and next-step suggestions
```

### Data Flow Diagram

```
User Input (Frontend)
    │
    ├──> Authentication Request ──> Backend API ──> PostgreSQL
    │                                    │
    │                                    ├──> JWT Token ──> Frontend
    │
    ├──> Career Assessment ──> Backend API ──> ML Service
    │                              │              │
    │                              │              ├──> Career Model
    │                              │              └──> Recommendations
    │                              │
    │                              └──> PostgreSQL (Save Profile)
    │
    ├──> Skill Gap Request ──> Backend API ──> ML Service
    │                              │              │
    │                              │              └──> Skill Analyzer
    │                              │
    │                              └──> Response ──> Frontend
    │
    ├──> Roadmap Request ──> Backend API ──> ML Service
    │                            │              │
    │                            │              ├──> Path Generator
    │                            │              └──> External Course APIs
    │                            │
    │                            └──> PostgreSQL (Save Roadmap)
    │
    └──> Job Search ──> Backend API ──> MongoDB (Cached Jobs)
                            │              │
                            │              └──> ML Service (Matching)
                            │
                            └──> External Job APIs (Real-time)
```

---

## 4. AWS Integration

CareerBridge AI leverages AWS services for scalability, reliability, and cost-efficiency.

### AWS Services Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AWS CLOUD INFRASTRUCTURE                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
│   CloudFront     │────▶│   EC2 Instances  │────▶│  RDS (PostgreSQL)
│   (CDN)          │     │  - Next.js App   │     │  (User Data)  │
│  Static Assets   │     │  - Node.js API   │     └──────────────┘
└──────────────────┘     │  - FastAPI ML    │
                         └──────────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  Lambda Functions│
                         │  - Job Scraping  │
                         │  - Data Sync     │
                         │  - Notifications │
                         └──────────────────┘
                                  │
                                  ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
│   S3 Buckets     │     │  ElastiCache     │     │  CloudWatch  │
│  - ML Models     │     │  (Redis)         │     │  Monitoring  │
│  - User Docs     │     │  Session Cache   │     │  & Logging   │
│  - Static Files  │     │  API Cache       │     └──────────────┘
└──────────────────┘     └──────────────────┘
```

### AWS Service Usage

#### **1. EC2 (Elastic Compute Cloud)**
- **Purpose**: Host Next.js frontend, Node.js backend, and FastAPI ML service
- **Instance Types**: 
  - t3.medium for frontend/backend (baseline traffic)
  - c5.large for ML service (compute-optimized)
- **Auto Scaling**: Configured to scale based on CPU utilization (target: 70%)
- **Load Balancing**: Application Load Balancer distributes traffic across instances

#### **2. AWS Lambda (Serverless Functions)**
- **Purpose**: Handle variable, event-driven workloads
- **Use Cases**:
  - Scheduled job scraping from external APIs (runs every 6 hours)
  - Government scheme database sync (daily)
  - Email/SMS notifications to users
  - Data preprocessing for ML model retraining
- **Benefits**: Pay-per-execution, no idle server costs

#### **3. RDS (Relational Database Service) - PostgreSQL**
- **Purpose**: Managed PostgreSQL database for user data
- **Configuration**: 
  - db.t3.medium instance (scalable to larger instances)
  - Multi-AZ deployment for high availability
  - Automated backups with 7-day retention
- **Security**: Encrypted at rest and in transit, VPC isolation

#### **4. S3 (Simple Storage Service)**
- **Purpose**: Object storage for ML models, user documents, and static assets
- **Buckets**:
  - `careerbridge-ml-models`: Trained model files (.pkl, .joblib)
  - `careerbridge-user-uploads`: User-uploaded certificates, resumes
  - `careerbridge-static`: Frontend static assets (images, CSS, JS)
- **Lifecycle Policies**: Archive old user documents to S3 Glacier after 1 year

#### **5. CloudFront (CDN)**
- **Purpose**: Content delivery network for fast global access
- **Cached Content**: Static frontend assets, images, frequently accessed API responses
- **Benefits**: Reduced latency for users across India, lower bandwidth costs

#### **6. ElastiCache (Redis)**
- **Purpose**: In-memory caching for session management and API responses
- **Use Cases**:
  - User session storage (JWT token validation)
  - Cache frequently requested job listings
  - Cache ML model predictions for common profiles
- **Benefits**: Sub-millisecond response times, reduced database load

#### **7. CloudWatch**
- **Purpose**: Monitoring, logging, and alerting
- **Metrics Tracked**:
  - API response times and error rates
  - ML model inference latency
  - Database query performance
  - Auto-scaling triggers
- **Alerts**: Configured for high error rates, slow responses, and resource exhaustion

#### **8. SageMaker (Optional - Future Enhancement)**
- **Purpose**: Advanced ML model training and deployment
- **Use Cases**:
  - Retrain models on growing user data
  - A/B testing of model versions
  - Managed model endpoints for production inference
- **Benefits**: Simplified MLOps, built-in monitoring, automatic scaling

---

## 5. Technical Logic & Component Interaction

### How Components Work Together

#### **Scenario 1: User Requests Career Recommendations**

1. **Frontend** → User completes career assessment form
2. **Frontend** → Sends POST request to `/career/recommend` with user data
3. **Backend API** → Validates request, checks authentication
4. **Backend API** → Calls ML Service endpoint `/predict/career`
5. **ML Service** → Loads career recommendation model from memory
6. **ML Service** → Preprocesses user data (encoding, normalization)
7. **ML Service** → Runs inference, generates top 5 career predictions
8. **ML Service** → Returns JSON response with careers + confidence scores
9. **Backend API** → Enriches response with career details from database
10. **Backend API** → Saves recommendation history to PostgreSQL
11. **Backend API** → Returns final response to frontend
12. **Frontend** → Renders interactive career cards with visualizations

**Optimization**: Career predictions for common profiles are cached in Redis for 24 hours

---

#### **Scenario 2: Generating Personalized Learning Roadmap**

1. **Frontend** → User selects target career, requests roadmap
2. **Backend API** → Fetches user's current skills from PostgreSQL
3. **Backend API** → Calls ML Service `/analyze/skills` for skill gap analysis
4. **ML Service** → Compares current vs. required skills, identifies gaps
5. **Backend API** → Calls ML Service `/generate/roadmap` with gaps + budget
6. **ML Service** → Runs path optimization algorithm
7. **ML Service** → Queries external course APIs (NPTEL, Coursera) via Lambda
8. **Lambda Function** → Fetches courses, filters by budget and language
9. **ML Service** → Sequences courses in optimal learning order
10. **Backend API** → Stores roadmap in PostgreSQL
11. **Backend API** → Returns structured roadmap to frontend
12. **Frontend** → Displays timeline-based learning plan with resource links

**Scalability**: Lambda functions handle external API calls to avoid blocking main services

---

#### **Scenario 3: Real-Time Job Matching**

1. **Frontend** → User searches for jobs with filters (location, salary)
2. **Backend API** → Queries MongoDB for cached job listings
3. **Backend API** → Simultaneously triggers Lambda to fetch fresh jobs from external APIs
4. **Backend API** → Sends user profile + job listings to ML Service `/match/jobs`
5. **ML Service** → Computes skill-job similarity scores using TF-IDF + cosine similarity
6. **ML Service** → Ranks jobs by match score, filters by user constraints
7. **Backend API** → Merges cached + fresh results, removes duplicates
8. **Backend API** → Returns top 20 job recommendations
9. **Frontend** → Displays job cards with match percentage and "Why this job?" insights

**Performance**: ElastiCache stores job match results for 1 hour to serve repeat queries instantly

---

### AI Logic Overview (High-Level)

**Career Recommendation**:
- Uses multi-label classification trained on historical career success data
- Features: Education level, skills, interests, location, budget
- Output: Probability distribution across 50+ career categories
- Post-processing: Filters careers by accessibility and growth potential

**Skill Gap Analysis**:
- Maintains a skill graph database (skills → careers mapping)
- Uses NLP to extract skills from job descriptions
- Computes set difference between user skills and required skills
- Prioritizes gaps using weighted scoring (market demand × learning difficulty)

**Job Matching**:
- Converts job descriptions and user profiles to TF-IDF vectors
- Computes cosine similarity for semantic matching
- Applies hard filters (location, salary, experience)
- Boosts scores for exact skill matches

**Unemployment Risk Prediction**:
- Features: User skills, industry trends, economic indicators, skill obsolescence rate
- Model: Gradient boosting classifier trained on labor market data
- Output: Risk score (0-100) + top 3 mitigation strategies

---

### Scalability & Reliability Design

**Horizontal Scaling**:
- Frontend and backend run on auto-scaling EC2 groups
- ML service can spawn additional instances during peak load
- Database read replicas for query distribution

**Fault Tolerance**:
- Multi-AZ RDS deployment ensures database availability
- Load balancer health checks automatically remove unhealthy instances
- S3 provides 99.999999999% durability for ML models

**Cost Efficiency**:
- Reserved EC2 instances for baseline traffic (40% cost savings)
- Lambda for variable workloads (pay only for execution time)
- CloudFront caching reduces origin server load by 60%
- ElastiCache reduces database queries by 70%

**Performance Optimization**:
- ML models loaded into memory at service startup (no disk I/O per request)
- Database query optimization with indexing on frequently accessed fields
- API response compression (gzip) reduces bandwidth by 80%
- Lazy loading of frontend components for faster initial page load

---

## Conclusion

CareerBridge AI's architecture is designed for:

✅ **Scalability**: Auto-scaling infrastructure handles traffic spikes during campaigns  
✅ **Reliability**: Multi-AZ deployment and fault-tolerant design ensure 99.9% uptime  
✅ **Performance**: Caching and optimized ML inference deliver sub-second response times  
✅ **Cost-Efficiency**: Serverless components and reserved instances minimize operational costs  
✅ **Maintainability**: Decoupled microservices allow independent updates and debugging  

This architecture positions CareerBridge AI as a production-ready, enterprise-grade solution capable of serving millions of users while maintaining the agility needed for rapid iteration during the hackathon.

---

*CareerBridge AI: Built on AWS, powered by AI, designed for impact.*
