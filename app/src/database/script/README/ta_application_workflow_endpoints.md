# TA Application System - Endpoints Testing Guide

## **Overview**

This guide covers **ALL endpoints** for the complete TA Application System implementing UR4.2-UR4.5 requirements. Every endpoint has been tested and verified working.

---

## **Authentication Endpoints**

### **Login**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "student@example.com", "password": "student123"}' \
  -c fresh_cookies.txt
```

### **Check Authentication Status**
```bash
curl -X GET http://localhost:8000/auth/me -b fresh_cookies.txt
```

### **Logout**
```bash
curl -X POST http://localhost:8000/auth/logout -b fresh_cookies.txt
```

### **Refresh Token**
```bash
curl -X POST http://localhost:8000/auth/refresh -b fresh_cookies.txt
```

---

##  **UR4.2: Profile Building Endpoints**

### **1. TA Experience Management**
```bash
# Update TA Experience and Skills
curl -X PUT http://localhost:8000/api/ta/users/3/experience \
  -b fresh_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "teaching_experience": "TA for CPSC 110 (4 semesters), CPSC 210 (3 semesters). Led tutorials, graded assignments, held office hours.",
    "technical_skills": "Python, Java, JavaScript, TypeScript, React, Node.js, PostgreSQL, Git, Docker, debugging, code review, mentoring",
    "relevant_coursework": "CPSC 110, 210, 221, 304, 310, 313, 320, 340, 404, 410, 415, 420, 425, 430, 440, 445, 449"
  }'

# Get TA Experience
curl -X GET http://localhost:8000/api/ta/users/3/experience -b fresh_cookies.txt
```

### **2. Course Preferences Management**
```bash
# Set Course Preferences
curl -X PUT http://localhost:8000/api/profile/3/course-preferences \
  -b fresh_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "preferred": ["CPSC 110", "CPSC 210", "CPSC 221", "CPSC 304", "CPSC 310", "CPSC 313"],
    "avoid": ["MATH 200", "MATH 300", "PHYS 101", "PHYS 200", "STAT 230", "STAT 300"]
  }'
```

### **3. Complete Profile Management**
```bash
# View Complete Profile
curl -X GET http://localhost:8000/api/profile/3 -b fresh_cookies.txt

# Update Profile (General)
curl -X PUT http://localhost:8000/api/profile/3 \
  -b fresh_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "personal_statement": "Passionate about teaching and helping students succeed",
    "overall_gpa": 3.8,
    "expected_graduation": "2025-05-01"
  }'

# Update Profile (Partial)
curl -X PATCH http://localhost:8000/api/users/3/profile \
  -b fresh_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "personal_statement": "Updated statement about my teaching philosophy"
  }'
```

### **4. Profile Status and Submission**
```bash
# Get Profile Status
curl -X GET http://localhost:8000/api/users/3/profile/status -b fresh_cookies.txt

# Submit Profile
curl -X POST http://localhost:8000/api/users/3/profile/submit -b fresh_cookies.txt

# Save Profile Draft
curl -X POST http://localhost:8000/api/users/3/profile/draft \
  -b fresh_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "personal_statement": "Draft of my teaching philosophy",
    "technical_skills": "Python, Java, JavaScript"
  }'

# Get Profile Preview
curl -X GET http://localhost:8000/api/users/3/profile/preview -b fresh_cookies.txt

# Validate Profile
curl -X POST http://localhost:8000/api/users/3/profile/validate \
  -b fresh_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "personal_statement": "My teaching philosophy",
    "technical_skills": "Python, Java"
  }'
```

### **5. References Management**
```bash
# Add Reference
curl -X POST http://localhost:8000/api/profile/3/references \
  -b fresh_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "reference_name": "Dr. Jane Smith",
    "reference_email": "jane.smith@ubc.ca"
  }'

# Get Single Reference
curl -X GET http://localhost:8000/api/profile/references/1 -b fresh_cookies.txt

# Get All References
curl -X GET http://localhost:8000/api/profile/3/references -b fresh_cookies.txt

# Upload Reference Letter (File Upload)
curl -X POST http://localhost:8000/api/profile/3/references/1/upload \
  -b fresh_cookies.txt \
  -F "file=@reference_letter.pdf"

# Delete Reference File
curl -X DELETE http://localhost:8000/api/profile/3/references/1/file -b fresh_cookies.txt

# Delete Reference
curl -X DELETE http://localhost:8000/api/profile/references/1 -b fresh_cookies.txt
```

### **6. User Management**
```bash
# Get User Basic Info
curl -X GET http://localhost:8000/api/users/3 -b fresh_cookies.txt

# Update User Basic Info
curl -X PATCH http://localhost:8000/api/users/3 \
  -b fresh_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Updated Doe",
    "major": "Computer Science"
  }'

# Get Complete User Profile (User + Profile + References)
curl -X GET http://localhost:8000/api/users/3/complete-profile -b fresh_cookies.txt
```

---

## **UR4.4: Weekly Availability Endpoints**

### **1. Set/Update Availability**
```bash
# Set Complex Weekly Schedule
curl -X PUT http://localhost:8000/api/ta/users/3/availability \
  -b fresh_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "weekly_availability": {
      "monday": ["8:00-10:00", "12:00-14:00", "16:00-18:00"],
      "tuesday": ["9:00-11:00", "13:00-17:00"],
      "wednesday": ["8:00-12:00", "14:00-16:00"],
      "thursday": ["10:00-12:00", "15:00-19:00"],
      "friday": ["8:00-14:00"],
      "saturday": ["10:00-16:00"],
      "sunday": ["12:00-18:00"]
    },
    "max_hours_per_week": 25,
    "preferred_term": "Fall 2024"
  }'

# Update to Simpler Schedule
curl -X PUT http://localhost:8000/api/ta/users/3/availability \
  -b fresh_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "weekly_availability": {
      "monday": ["9:00-17:00"],
      "wednesday": ["9:00-17:00"],
      "friday": ["9:00-17:00"]
    },
    "max_hours_per_week": 20,
    "preferred_term": "Spring 2025"
  }'
```

### **2. Get Current Availability**
```bash
curl -X GET http://localhost:8000/api/ta/users/3/availability -b fresh_cookies.txt
```

---

## **UR4.3: Enhanced Application System Endpoints**

### **1. Domain Areas**
```bash
# Get Available Domain Areas
curl -X GET http://localhost:8000/domain-areas -b fresh_cookies.txt
```

### **2. Course Information**
```bash
# Get Available Courses (Fixed endpoint)
curl -X GET http://localhost:8000/courses-available -b fresh_cookies.txt

# Get Specific Course
curl -X GET http://localhost:8000/courses/1 -b fresh_cookies.txt
```

### **3. Application Submission**
```bash
# Submit UTA Application
curl -X POST http://localhost:8000/applications \
  -b fresh_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "coursePreferences": [
      {"course_id": 1, "rank": 1},
      {"course_id": 2, "rank": 2},
      {"course_id": 3, "rank": 3}
    ],
    "domainAreas": [
      "Web Development",
      "Database Systems",
      "Software Engineering"
    ],
    "applicationType": "UTA",
    "termAvailability": "Available Monday-Friday 9AM-6PM, weekends 10AM-4PM. Can work evenings during exam periods.",
    "notes": "Senior undergraduate with extensive TA experience across multiple CPSC courses."
  }'

# Submit GTA Application
curl -X POST http://localhost:8000/applications \
  -b fresh_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "coursePreferences": [
      {"course_id": 2, "rank": 1},
      {"course_id": 3, "rank": 2},
      {"course_id": 1, "rank": 3}
    ],
    "domainAreas": [
      "Machine Learning",
      "Algorithms & Data Structures",
      "Theory of Computation"
    ],
    "applicationType": "GTA",
    "termAvailability": "Research schedule allows for 20 hours/week TA duties. Available for evening office hours.",
    "notes": "PhD candidate specializing in machine learning and algorithmic complexity."
  }'
```

### **4. Validation Testing (Should Fail)**
Test 1: Wrong number of domain areas; only 2 domains provided requires minimum 3
```bash
# Test 1: Wrong number of domain areas
curl -X POST http://localhost:8000/applications \
  -b fresh_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "coursePreferences": [{"course_id": 1, "rank": 1}],
    "domainAreas": ["Web Development", "Database Systems"],
    "applicationType": "UTA",
    "termAvailability": "Available",
    "notes": "Should fail - only 2 domain areas"
  }'
```
Test 2: Application type must be either "UTA" or "GTA" 
```bash
# Test 2: Invalid application type 
curl -X POST http://localhost:8000/applications \
  -b fresh_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "coursePreferences": [{"course_id": 1, "rank": 1}],
    "domainAreas": ["Web Development", "Database Systems", "Software Engineering"],
    "applicationType": "INVALID_TYPE",
    "termAvailability": "Available",
    "notes": "Should fail - invalid application type"
  }'
```
Test 3: Term availability is a mandatory fielf
```bash
# Test 3: Missing required field 
curl -X POST http://localhost:8000/applications \
  -b fresh_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "coursePreferences": [{"course_id": 1, "rank": 1}],
    "domainAreas": ["Web Development", "Database Systems", "Software Engineering"],
    "applicationType": "UTA",
    "notes": "Should fail - missing termAvailability"
  }'
```

---

##  **UR4.5: View Applications Endpoints**

### **1. View Applications**
```bash
# Get My Applications
curl -X GET http://localhost:8000/applications/my -b fresh_cookies.txt
```

### **2. Application Status Management (Admin)**
```bash
# Update Application Status
curl -X PATCH http://localhost:8000/applications/10/status \
  -b fresh_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved"
  }'
```

---
