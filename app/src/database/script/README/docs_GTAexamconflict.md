# GTA Exam Availability - Complete Backend API Testing Guide

## Overview
This guide covers comprehensive testing of the backend API endpoints for GTA exam period availability functionality. GTAs can specify date ranges when they're available during exam periods. **Important**: Only graduate students (Year 5+) can access GTA features.

## Prerequisites & Setup

### Step 1: Admin Setup - Create Academic Terms
First, login as admin and create academic terms (required for GTA functionality):

```bash
# Login as admin
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}' \
  -c admin_cookies.txt

# Create Fall 2024 term
curl -X POST http://localhost:8000/api/ta-coordinator/terms \
  -b admin_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fall 2024",
    "start_date": "2024-09-01",
    "end_date": "2024-12-31",
    "status": "active"
  }'

# Create Spring 2025 term
curl -X POST http://localhost:8000/api/ta-coordinator/terms \
  -b admin_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Spring 2025",
    "start_date": "2025-01-01",
    "end_date": "2025-04-30",
    "status": "upcoming"
  }'

# Verify terms were created
curl -X GET http://localhost:8000/api/ta-coordinator/terms \
  -b admin_cookies.txt
```

### Step 2: Student Authentication Setup
Login as student for GTA testing:

```bash
# Login as student
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "student@example.com", "password": "student123"}' \
  -c gta_cookies.txt
```

## Graduate Student Validation Testing

### Step 3: Test Graduate Student Access (Year 5+)
Test that only graduate students can access GTA features:

```bash
# Check current profile 
curl -X GET http://localhost:8000/api/profile/3 \
  -b gta_cookies.txt

# Update profile to Year 5 (graduate student)
curl -X PUT http://localhost:8000/api/profile/3 \
  -b gta_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "year_of_study": 5
  }'

# Check GTA eligibility (should be eligible now)
curl -X GET http://localhost:8000/api/gta/eligibility \
  -b gta_cookies.txt
```

**Expected Response (Year 5):**
```json
{
  "is_eligible": true,
  "is_graduate_student": true,
  "year_of_study": 5,
  "required_year": 5,
  "role": "student",
  "message": "Graduate student (Year 5) - GTA features available"
}
```

### Step 4: Test Undergraduate Blocking (Year <5)
Test that undergraduate students are blocked from GTA features:

```bash
# Update profile to Year 3 (undergraduate)
curl -X PUT http://localhost:8000/api/profile/3 \
  -b gta_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "year_of_study": 3
  }'

# Check eligibility (should be blocked)
curl -X GET http://localhost:8000/api/gta/eligibility \
  -b gta_cookies.txt

# Try to access GTA features (should get 403 Forbidden)
curl -X GET http://localhost:8000/api/gta/exam-availability/terms \
  -b gta_cookies.txt
```

**Expected Response (Year 3):**
```json
{
  "is_eligible": false,
  "is_graduate_student": false,
  "year_of_study": 3,
  "required_year": 5,
  "role": "student",
  "message": "Undergraduate student (Year 3). GTA features require graduate student status (Year 5+)."
}
```

**Expected Access Denied Response:**
```json
{
  "error": "Undergraduate student (Year 3). GTA features require graduate student status (Year 5+).",
  "is_graduate_student": false,
  "year_of_study": 3,
  "required_year": 5
}
```

### Step 5: Restore Graduate Student Access
Set student back to Year 5 for remaining tests:

```bash
# Update profile back to Year 5 (graduate student)
curl -X PUT http://localhost:8000/api/profile/3 \
  -b gta_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "year_of_study": 5
  }'

# Verify access is restored
curl -X GET http://localhost:8000/api/gta/eligibility \
  -b gta_cookies.txt
```

## GTA Exam Availability Endpoints Testing

### Step 6: Get Available Terms
```bash
curl -X GET http://localhost:8000/api/gta/exam-availability/terms \
  -b gta_cookies.txt
```

**Expected Response:**
```json
{
  "terms": [
    {
      "term_id": 1,
      "name": "Fall 2024",
      "start_date": "2024-09-01T00:00:00.000Z",
      "end_date": "2024-12-31T00:00:00.000Z",
      "status": "active"
    },
    {
      "term_id": 2,
      "name": "Spring 2025",
      "start_date": "2025-01-01T00:00:00.000Z",
      "end_date": "2025-04-30T00:00:00.000Z",
      "status": "upcoming"
    }
  ]
}
```

### Step 7: Create Single Availability Period
```bash
# Example: Available December 12-15, 2024
curl -X POST http://localhost:8000/api/gta/exam-availability \
  -b gta_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "term_id": 1,
    "start_date": "2024-12-12",
    "end_date": "2024-12-15",
    "notes": "Available for morning and afternoon exam proctoring"
  }'
```

### Step 8: Create Single Day Availability
```bash
# Example: Available only on December 19th
curl -X POST http://localhost:8000/api/gta/exam-availability \
  -b gta_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "term_id": 1,
    "start_date": "2024-12-19",
    "end_date": "2024-12-19",
    "notes": "Available for final exam proctoring, morning slot preferred"
  }'
```

### Step 9: Create Another Availability Period
```bash
# Example: Available December 18-22
curl -X POST http://localhost:8000/api/gta/exam-availability \
  -b gta_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "term_id": 1,
    "start_date": "2024-12-18",
    "end_date": "2024-12-22",
    "notes": "Available for final exam week, flexible schedule"
  }'
```

### Step 10: Bulk Update Availability for a Term
```bash
# Replace all availability for a term with multiple periods
curl -X POST http://localhost:8000/api/gta/exam-availability/bulk \
  -b gta_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "term_id": 1,
    "availabilities": [
      {
        "start_date": "2024-12-12",
        "end_date": "2024-12-15",
        "notes": "Available December 12-15, mornings preferred"
      },
      {
        "start_date": "2024-12-18",
        "end_date": "2024-12-22",
        "notes": "Available December 18-22, any time"
      },
      {
        "start_date": "2024-12-27",
        "end_date": "2024-12-27",
        "notes": "Available December 27th only, makeup exam day"
      }
    ]
  }'
```

### Step 11: Get My Availability (All Terms)
```bash
curl -X GET http://localhost:8000/api/gta/exam-availability \
  -b gta_cookies.txt
```

### Step 12: Get My Availability for Specific Term
```bash
curl -X GET "http://localhost:8000/api/gta/exam-availability?term_id=1" \
  -b gta_cookies.txt
```

### Step 13: Update Specific Availability Period
```bash
# Update an existing availability period (use availability_id from previous responses)
curl -X PUT http://localhost:8000/api/gta/exam-availability/3 \
  -b gta_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2024-12-13",
    "end_date": "2024-12-16",
    "notes": "Updated: Available December 13-16, afternoon preferred"
  }'
```

### Step 14: Delete Availability Period
```bash
# Delete a specific availability period
curl -X DELETE http://localhost:8000/api/gta/exam-availability/3 \
  -b gta_cookies.txt
```

## Validation and Error Case Testing

### Step 15: Test Invalid Date Format
```bash
# Should return validation error
curl -X POST http://localhost:8000/api/gta/exam-availability \
  -b gta_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "term_id": 1,
    "start_date": "12/12/2024",
    "end_date": "12/15/2024",
    "notes": "Invalid date format test"
  }'
```

### Step 16: Test End Date Before Start Date
```bash
# Should return validation error
curl -X POST http://localhost:8000/api/gta/exam-availability \
  -b gta_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "term_id": 1,
    "start_date": "2024-12-20",
    "end_date": "2024-12-15",
    "notes": "End date before start date test"
  }'
```

### Step 17: Test Conflicting Periods
```bash
# First create an availability period
curl -X POST http://localhost:8000/api/gta/exam-availability \
  -b gta_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "term_id": 1,
    "start_date": "2024-12-10",
    "end_date": "2024-12-14",
    "notes": "First period"
  }'

# Then try to create an overlapping period (should get conflict error)
curl -X POST http://localhost:8000/api/gta/exam-availability \
  -b gta_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "term_id": 1,
    "start_date": "2024-12-12",
    "end_date": "2024-12-16",
    "notes": "Overlapping period - should fail"
  }'
```

### Step 18: Test Bulk Update with Internal Conflicts
```bash
# Should return error for overlapping periods within the same request
curl -X POST http://localhost:8000/api/gta/exam-availability/bulk \
  -b gta_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "term_id": 1,
    "availabilities": [
      {
        "start_date": "2024-12-10",
        "end_date": "2024-12-15",
        "notes": "First period"
      },
      {
        "start_date": "2024-12-12",
        "end_date": "2024-12-18",
        "notes": "Overlapping period - should cause error"
      }
    ]
  }'
```

### Step 19: Test Access Without Authentication
```bash
# Should return 401 Unauthorized
curl -X GET http://localhost:8000/api/gta/exam-availability
```

### Step 20: Test Access as Non-Student
```bash
# Login as instructor first
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "instructor@example.com", "password": "instructor123"}' \
  -c instructor_cookies.txt

# Try to access GTA endpoints (should return 403 Forbidden)
curl -X GET http://localhost:8000/api/gta/exam-availability \
  -b instructor_cookies.txt
```

## Expected Response Examples

### Successful Creation Response:
```json
{
  "message": "Exam availability created successfully",
  "availability": {
    "availability_id": 1,
    "user_id": 3,
    "term_id": 1,
    "start_date": "2024-12-12T00:00:00.000Z",
    "end_date": "2024-12-15T00:00:00.000Z",
    "notes": "Available for morning and afternoon exam proctoring",
    "is_single_day": false,
    "created_at": "2025-07-18T10:50:45.390Z",
    "updated_at": "2025-07-18T10:50:45.390Z"
  }
}
```

### Get Availability Response:
```json
{
  "availabilities": [
    {
      "availability_id": 1,
      "user_id": 3,
      "term_id": 1,
      "start_date": "2024-12-12T00:00:00.000Z",
      "end_date": "2024-12-15T00:00:00.000Z",
      "notes": "Available for morning and afternoon exam proctoring",
      "is_single_day": false,
      "term_name": "Fall 2024",
      "created_at": "2025-07-18T10:50:45.390Z",
      "updated_at": "2025-07-18T10:50:45.390Z"
    }
  ],
  "total": 1
}
```

### Conflict Error Response:
```json
{
  "error": "Availability period conflicts with existing availability",
  "conflicts": [
    {
      "existing_period": "2024-12-10 to 2024-12-14",
      "notes": "First period"
    }
  ]
}
```

## Usage Tips

1. **Graduate Student Requirement**: Only students with Year 5+ can access GTA features
2. **Date Format**: Always use YYYY-MM-DD format for dates
3. **Single Days**: Use same date for start_date and end_date
4. **Bulk Updates**: Use bulk endpoint to replace all availability for a term at once
5. **Conflict Detection**: System automatically prevents overlapping periods
6. **Term Filtering**: Use term_id parameter to filter by specific academic terms
7. **Profile Setup**: Students must have year_of_study set in their profile to access GTA features