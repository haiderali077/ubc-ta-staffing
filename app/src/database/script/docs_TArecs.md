# TA Recommendation System - Complete Testing Guide

## 🎯 What This Feature Does

The TA Recommendation System is a comprehensive solution that helps instructors and TA coordinators find the best Teaching Assistant candidates for their courses. Here's what it provides:

### Core Features:
1. **Smart Candidate Matching** - Automatically finds students who meet course requirements
2. **Skills-Based Filtering** - Matches candidates based on technical skills and proficiency
3. **Academic Performance Analysis** - Considers GPA, completed courses, and grades
4. **Experience Level Assessment** - Evaluates TA experience and teaching background
5. **Multi-Criteria Scoring** - Weighted recommendation scores based on multiple factors
6. **Advanced Filtering** - Comprehensive filters for finding ideal candidates
7. **Performance Tracking** - Tracks TA performance history and ratings
8. **Transcript Integration** - Imports and analyzes student course completions

### Key Benefits:
- **For Instructors**: Find qualified TAs quickly with data-driven recommendations
- **For TA Coordinators**: Streamline the TA allocation process with smart matching
- **For Students**: Fair, transparent evaluation based on qualifications and experience
- **For Administrators**: Comprehensive system for managing TA recommendations and performance

---

## 🚀 Complete Testing Workflow

### Prerequisites Setup

First, ensure your system is running:
```bash
# Start the system
docker-compose up -d

# Wait for startup
sleep 30

# Create cookie files for testing
touch admin_cookies.txt instructor_cookies.txt student_cookies.txt coordinator_cookies.txt
```

---

## Step 1: Authentication Setup

### 1.1 Admin Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}' \
  -c admin_cookies.txt
```
**Expected**: `"message":"Login successful"` with admin user details

### 1.2 Instructor Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "instructor@example.com", "password": "instructor123"}' \
  -c instructor_cookies.txt
```
**Expected**: `"message":"Login successful"` with instructor user details

### 1.3 Student Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "student@example.com", "password": "student123"}' \
  -c student_cookies.txt
```
**Expected**: `"message":"Login successful"` with student user details

### 1.4 TA Coordinator Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "tacoord@example.com", "password": "tacoord123"}' \
  -c coordinator_cookies.txt
```
**Expected**: `"message":"Login successful"` with coordinator user details

---

## Step 2: Data Setup (Prerequisites)

### 2.1 Create Student Profile
```bash
# First, create a student profile with GPA and year of study
curl -X PUT http://localhost:8000/api/profile/3 \
  -b student_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "overall_gpa": 3.75,
    "year_of_study": 4,
    "personal_statement": "Experienced student with strong programming background",
    "technical_skills": "Python,JavaScript,Java,Git,React,Node.js,PostgreSQL,Algorithms,Data Structures",
    "teaching_experience": "TA for CPSC 110 (2 semesters), CPSC 210 (1 semester). Led tutorials and graded assignments.",
    "relevant_coursework": "CPSC 110, 210, 221, 310, 313, 320, 340, 404, 410, 415, 420, 425, 430"
  }'
```
**Expected**: Profile updated successfully

### 2.2 Add Student Course Completions
```bash
# Add completed courses for the student
curl -X POST http://localhost:8000/api/students/3/completed-courses/bulk \
  -b student_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "courses": [
      {
        "course_code": "CPSC 110",
        "course_title": "Computation, Programs, and Programming", 
        "grade_percentage": 88,
        "credits": 4,
        "term": "Fall 2022",
        "year": 2022,
        "grade_letter": "A"
      },
      {
        "course_code": "CPSC 210", 
        "course_title": "Software Construction",
        "grade_percentage": 92,
        "credits": 4,
        "term": "Winter 2023",
        "year": 2023,
        "grade_letter": "A+"
      },
      {
        "course_code": "CPSC 221",
        "course_title": "Basic Algorithms and Data Structures", 
        "grade_percentage": 85,
        "credits": 4,
        "term": "Fall 2023",
        "year": 2023,
        "grade_letter": "A"
      },
      {
        "course_code": "CPSC 310",
        "course_title": "Introduction to Software Engineering",
        "grade_percentage": 90,
        "credits": 4, 
        "term": "Winter 2024",
        "year": 2024,
        "grade_letter": "A+"
      }
    ]
  }'
```
**Expected**: `"message":"Imported X courses successfully"`

### 2.3 Add Student Skills
```bash
# Add technical skills for the student
curl -X POST http://localhost:8000/api/students/3/skills/bulk \
  -b student_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "skills": [
      {
        "skill_name": "Python"
      },
      {
        "skill_name": "JavaScript"
      },
      {
        "skill_name": "Java"
      },
      {
        "skill_name": "Git"
      },
      {
        "skill_name": "Algorithms"
      },
      {
        "skill_name": "Data Structures"
      },
      {
        "skill_name": "Teaching"
      }
    ]
  }'
```
**Expected**: `"message":"Updated X skills successfully"`

### 2.4 Create Course (TA Coordinator)
```bash
# Create a course that needs TAs
curl -X POST http://localhost:8000/api/ta-coordinator/courses \
  -b coordinator_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CPSC 210",
    "title": "Software Construction", 
    "term": "Fall 2024",
    "instructor_id": 2,
    "dept_id": 1,
    "max_tas": 5
  }'
```
**Expected**: Course created successfully

### 2.5 Set Course Requirements (Admin/Instructor)
```bash
# Set TA requirements for the course
curl -X POST http://localhost:8000/api/courses/1/requirements \
  -b admin_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": 1,
    "prerequisite_courses": ["CPSC 110"],
    "minimum_grade_percentage": 80,
    "recommended_courses": ["CPSC 210", "CPSC 221"],
    "recommended_grade_percentage": 75,
    "required_skills": ["Python", "Java"],
    "preferred_skills": ["Git", "Algorithms", "Data Structures"],
    "minimum_year_of_study": 3,
    "prefer_previous_ta_experience": true,
    "minimum_overall_gpa": 3.3,
    "notes": "Looking for TAs with strong programming fundamentals and some teaching experience"
  }'
```
**Expected**: `"message":"Course requirements updated successfully"`

### 2.6 Add TA Performance Record
```bash
# Add a performance evaluation for the student
curl -X POST http://localhost:8000/api/ta-performance \
  -b instructor_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 3,
    "term": "Winter 2024",
    "instructor_rating": 4.5,
    "student_feedback_score": 4.3,
    "attendance_rate": 0.95,
    "tasks_completed": 20,
    "tasks_assigned": 22,
    "strengths": "Excellent communication skills, patient with students, strong technical knowledge",
    "areas_for_improvement": "Could improve time management during busy periods",
    "would_rehire": true,
    "notes": "Outstanding TA who consistently goes above and beyond to help students"
  }'
```
**Expected**: `"message":"Performance evaluation added successfully"`

---

## Step 3: Core TA Recommendation Testing

### 3.1 Get Basic Recommendations
```bash
# Test the main recommendation endpoint
curl -X GET http://localhost:8000/api/courses/1/recommendations \
  -b instructor_cookies.txt
```

**Expected Response Structure**:
```json
{
  "course": {
    "course_id": 1,
    "code": "CPSC 210",
    "title": "Software Construction"
  },
  "course_requirements": {
    "prerequisite_courses": ["CPSC 110"],
    "required_skills": ["Python", "Java"],
    "minimum_overall_gpa": 3.3
  },
  "candidates": [
    {
      "user_id": 3,
      "name": "John Doe",
      "email": "student@example.com", 
      "overall_gpa": 3.75,
      "year_of_study": 4,
      "skills_match_percentage": 100,
      "coursework_match_percentage": 100,
      "experience_level": "advanced",
      "recommendation_score": 87
    }
  ],
  "total_candidates": 1
}
```

### 3.2 Get Course Requirements
```bash
# Test getting course requirements
curl -X GET http://localhost:8000/api/courses/1/requirements \
  -b instructor_cookies.txt
```
**Expected**: Course requirements object with all set values

### 3.3 Get Available Filter Options
```bash
# Test getting filter options for the UI
curl -X GET http://localhost:8000/api/recommendations/filters \
  -b instructor_cookies.txt
```
**Expected**: Available skills, majors, experience levels, etc.

---

## Step 4: Advanced Filtering Tests

### 4.1 Filter by GPA
```bash
# Test GPA filtering
curl -X GET "http://localhost:8000/api/courses/1/recommendations?min_gpa=3.5&max_gpa=4.0" \
  -b instructor_cookies.txt
```
**Expected**: Only candidates with GPA between 3.5 and 4.0

### 4.2 Filter by Skills
```bash
# Test skills filtering
curl -X GET "http://localhost:8000/api/courses/1/recommendations?required_skills=Python,Git" \
  -b instructor_cookies.txt
```
**Expected**: Only candidates who have both Python and Git skills

### 4.3 Filter by Courses
```bash
# Test course completion filtering
curl -X GET "http://localhost:8000/api/courses/1/recommendations?required_courses=CPSC%20110,CPSC%20210&minimum_grade_in_courses=85" \
  -b instructor_cookies.txt
```
**Expected**: Only candidates who completed both courses with 85%+ grades

### 4.4 Filter by Year of Study
```bash
# Test year filtering
curl -X GET "http://localhost:8000/api/courses/1/recommendations?year_of_study=3,4" \
  -b instructor_cookies.txt
```
**Expected**: Only 3rd and 4th year students

### 4.5 Filter by Experience Level
```bash
# Test experience filtering
curl -X GET "http://localhost:8000/api/courses/1/recommendations?experience_level=intermediate&has_ta_experience=true" \
  -b instructor_cookies.txt
```
**Expected**: Only candidates with intermediate+ experience and previous TA experience

### 4.6 Multiple Filters Combined
```bash
# Test complex filtering
curl -X GET "http://localhost:8000/api/courses/1/recommendations?min_gpa=3.0&required_skills=Python&year_of_study=4&has_ta_experience=true&min_overall_score=80" \
  -b instructor_cookies.txt
```
**Expected**: Candidates matching ALL criteria

---

## Step 5: Enhanced Recommendations Testing

### 5.1 Enhanced Recommendations with Performance Filtering
```bash
# Test enhanced recommendations with performance criteria
curl -X GET "http://localhost:8000/api/courses/1/recommendations/enhanced?min_gpa=3.0&required_skills=Python,Git&min_performance_rating=4.0&max_current_hours=15" \
  -b instructor_cookies.txt
```
**Expected**: Enhanced candidate data with performance metrics

---

## Step 6: Student Data Management Testing

### 6.1 View Student Completed Courses
```bash
# Test getting student's completed courses
curl -X GET http://localhost:8000/api/students/3/completed-courses \
  -b student_cookies.txt
```
**Expected**: List of all completed courses with grades and details

### 6.2 View Student Skills
```bash
# Test getting student's skills
curl -X GET http://localhost:8000/api/students/3/skills \
  -b student_cookies.txt
```
**Expected**: List of skills with proficiency levels and experience

### 6.3 View TA Performance History
```bash
# Test getting TA performance history
curl -X GET http://localhost:8000/api/students/3/ta-performance \
  -b instructor_cookies.txt
```
**Expected**: Performance history with ratings and evaluations

---

## Step 7: Data Modification Tests

### 7.1 Add Individual Course
```bash
# Test adding a single course completion
curl -X POST http://localhost:8000/api/students/3/completed-courses \
  -b student_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "course_code": "CPSC 313",
    "course_title": "Computer Hardware and Operating Systems",
    "grade_percentage": 87,
    "credits": 4,
    "term_taken": "Fall 2024",
    "year_taken": 2024,
    "grade_letter": "A"
  }'
```
**Expected**: Course added successfully

### 7.2 Add Individual Skill
```bash
# Test adding a single skill
curl -X POST http://localhost:8000/api/students/3/skills \
  -b student_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "skill_name": "React",
    "proficiency_level": 1,
    "years_experience": 1.0
  }'
```
**Expected**: Skill added successfully

### 7.3 Update Course Requirements
```bash
# Test updating course requirements
curl -X POST http://localhost:8000/api/courses/1/requirements \
  -b admin_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": 1,
    "prerequisite_courses": ["CPSC 110", "CPSC 210"],
    "minimum_grade_percentage": 85,
    "required_skills": ["Python", "Java", "Git"],
    "minimum_overall_gpa": 3.5,
    "notes": "Updated requirements for Fall 2024"
  }'
```
**Expected**: Requirements updated successfully

---

## Step 8: Error Handling Tests

### 8.1 Test Invalid Course ID
```bash
# Test with non-existent course
curl -X GET http://localhost:8000/api/courses/999/recommendations \
  -b instructor_cookies.txt
```
**Expected**: `"error":"Course not found"`

### 8.2 Test Unauthorized Access
```bash
# Test student trying to access admin endpoint
curl -X POST http://localhost:8000/api/courses/1/requirements \
  -b student_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"course_id": 1, "minimum_gpa": 3.0}'
```
**Expected**: `"error":"Insufficient permissions"`

---

##  System Features Summary

### What the TA Recommendation System Provides:

1. **Intelligent Matching**: Automatically finds students who meet specific course requirements
2. **Multi-Factor Scoring**: Considers GPA, skills, course completion, experience, and academic maturity
3. **Flexible Filtering**: 15+ filter options for finding the perfect TA candidates
4. **Performance Tracking**: Historical TA performance data and metrics
5. **Data Management**: Complete system for managing student academic records and skills
6. **Role-Based Access**: Different access levels for students, instructors, coordinators, and admins
7. **Comprehensive API**: Full REST API for integration with frontend applications

### Scoring Algorithm:
- **40% Coursework Match**: Based on prerequisite and recommended course completion with required grades
- **30% Skills Match**: Based on required and preferred technical skills
- **20% Experience Level**: Based on year of study, GPA, and previous TA experience
- **10% Academic Maturity**: Based on advanced course completion and grade quality

