# Archive System Testing Guide 

## Prerequisites Setup

### 1. Login as Admin
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}' \
  -c admin_cookies.txt
```

### 2. Create Test Terms 
```bash
# Create Test Fall 2025 (for archiving)
curl -X POST http://localhost:8000/api/ta-coordinator/terms \
  -b admin_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Fall 2025",
    "start_date": "2025-09-01",
    "end_date": "2025-12-31"
  }'

# Create Test Spring 2026 (to keep active)
curl -X POST http://localhost:8000/api/ta-coordinator/terms \
  -b admin_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Spring 2026", 
    "start_date": "2026-01-01",
    "end_date": "2026-04-30"
  }'

# Verify terms created
curl -X GET http://localhost:8000/api/ta-coordinator/terms -b admin_cookies.txt
```

### 3. Create Sample Data for Archiving
```bash
# Create courses for Test Fall 2025
curl -X POST http://localhost:8000/api/ta-coordinator/courses \
  -b admin_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CPSC 110",
    "title": "Computation, Programs, and Programming",
    "term": "Test Fall 2025",
    "dept_id": 1
  }'

curl -X POST http://localhost:8000/api/ta-coordinator/courses \
  -b admin_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CPSC 210", 
    "title": "Software Construction",
    "term": "Test Fall 2025",
    "dept_id": 1
  }'
```

## Core Archive Testing

### 4. Get Archivable Terms
```bash
curl -X GET http://localhost:8000/api/admin/terms/archivable -b admin_cookies.txt
```
**Expected:** List of non-archived terms (should show both Test Fall 2025 and Test Spring 2026)

### 5. Archive a Term
```bash
# Archive Test Fall 2025 (use actual term_id from previous response - likely 1)
curl -X POST http://localhost:8000/api/admin/terms/1/archive \
  -b admin_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Test archiving - End of Test Fall 2025 semester"
  }'
```
**Expected:** Success message with archived term details and summary

### 6. View Archived Terms
```bash
# Get all archived terms
curl -X GET http://localhost:8000/api/archive/terms -b admin_cookies.txt

# Get archived terms with pagination
curl -X GET "http://localhost:8000/api/archive/terms?limit=5&offset=0" -b admin_cookies.txt
```
**Expected:** List of archived terms with metadata

### 7. Search Archived Terms
```bash
# Search by year (2025)
curl -X GET "http://localhost:8000/api/archive/terms/search?year=2025" -b admin_cookies.txt

# Search by term name
curl -X GET "http://localhost:8000/api/archive/terms/search?term_name=Test" -b admin_cookies.txt

# Search by date range (2025 dates)
curl -X GET "http://localhost:8000/api/archive/terms/search?start_date=2025-01-01&end_date=2025-12-31" -b admin_cookies.txt
```
**Expected:** Filtered results based on search criteria (should find Test Fall 2025)

### 8. Get Specific Archived Term
```bash
# Get archived term details (use actual term_id)
curl -X GET http://localhost:8000/api/archive/terms/1 -b admin_cookies.txt
```
**Expected:** Detailed term info with archive logs

### 9. Get Archived Term Data
```bash
# Get full archived data (courses, applications, allocations)
curl -X GET http://localhost:8000/api/archive/terms/1/data -b admin_cookies.txt
```
**Expected:** Complete read-only historical data with courses

### 10. Get Archive Statistics
```bash
curl -X GET http://localhost:8000/api/archive/stats -b admin_cookies.txt
```
**Expected:** Archive system statistics

## Permission Testing

### 11. Test Student Access (should be limited)
```bash
# Login as student
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "student@example.com", "password": "student123"}' \
  -c student_cookies.txt

# Try to archive (should fail)
curl -X POST http://localhost:8000/api/admin/terms/2/archive \
  -b student_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"notes": "Should fail"}'

# View archives (should work)
curl -X GET http://localhost:8000/api/archive/terms -b student_cookies.txt

# Try to get detailed data (should fail for students)
curl -X GET http://localhost:8000/api/archive/terms/1/data -b student_cookies.txt
```
**Expected:** Archive operations fail, read access limited

### 12. Test Instructor Access
```bash
# Login as instructor
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "instructor@example.com", "password": "instructor123"}' \
  -c instructor_cookies.txt

# Try archive operations (should fail)
curl -X POST http://localhost:8000/api/admin/terms/2/archive \
  -b instructor_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"notes": "Should fail"}'

# View archives (should work)
curl -X GET http://localhost:8000/api/archive/terms -b instructor_cookies.txt

# View detailed data (should work for instructors)
curl -X GET http://localhost:8000/api/archive/terms/1/data -b instructor_cookies.txt
```

## Unarchive Testing

### 13. Unarchive a Term (Admin)
```bash
curl -X POST http://localhost:8000/api/admin/terms/1/unarchive \
  -b admin_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Unarchiving for corrections"
  }'
```
**Expected:** Term restored to non-archived status

### 14. Re-archive for Continued Testing
```bash
curl -X POST http://localhost:8000/api/admin/terms/1/archive \
  -b admin_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Re-archiving after corrections"
  }'
```

## Error Case Testing

### 15. Test Invalid Operations
```bash
# Try to archive non-existent term
curl -X POST http://localhost:8000/api/admin/terms/999/archive \
  -b admin_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"notes": "Should fail"}'

# Try to archive already archived term
curl -X POST http://localhost:8000/api/admin/terms/1/archive \
  -b admin_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"notes": "Should fail - already archived"}'

# Try to get data for non-archived term
curl -X GET http://localhost:8000/api/archive/terms/2/data -b admin_cookies.txt
```

## Validation Checklist

After running all tests, verify:
