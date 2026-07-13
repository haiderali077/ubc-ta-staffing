# Dummy Data for TA Management System

This directory contains dummy data for development and testing purposes.

## Overview

The dummy data includes:
- **14 Users Total:**
  - 7 Students (User IDs: 120, 230, 340, 450, 560, 670, 780)
  - 2 TA Coordinators (User IDs: 890, 100)
  - 5 Instructors (User IDs: 210, 320, 430, 540, 650)
- **20 Courses** across multiple terms
- **12 TA Applications** with various statuses
- **15 TA Need requests**
- **12 TA Allocations**
- Supporting data for all other tables

## User ID Convention

All user IDs are random numbers between 99-999 that end with 0 (e.g., 120, 340, 580). This makes them easy to identify as test data.

## Usage

### Automatic Loading (Recommended)

The dummy data will be automatically loaded when you start the application in development mode:

```bash
# Using docker-compose
docker-compose --profile development up -d

# Using make
make quick-start
```

### Manual Loading

If you need to manually load the dummy data:

```bash
# Load dummy data
make load-dummy-data

# Or directly with docker
docker-compose exec app bash /app/database/scripts/init-dummy-data.sh
```

### Reset Database

To completely reset the database and reload dummy data:

```bash
make reset-db
```

### View Data Summary

To see a summary of the loaded data:

```bash
make db-summary
```

## File Structure

```
database/
├── seed/
│   └── dummy_data.sql      # SQL file with all dummy data
├── scripts/
    └── init-dummy-data.sh  # Bash script to load dummy data
```

## Important Notes

1. **Development Only**: Dummy data is only loaded in development mode, never in test or production
2. **Idempotent**: The loader checks for existing data and won't duplicate records
3. **Password Hashes**: All users have placeholder password hashes - update these for actual testing
4. **Realistic Data**: The data includes realistic relationships and constraints

## Test User Credentials

For development purposes, you can update the password hashes to use a common password like "password123". Use bcrypt to generate proper hashes.

Example students:
- alice.johnson@university.edu (Student)
- bob.smith@university.edu (Student)

Example instructors:
- james.prof@university.edu (Instructor)
- karen.teacher@university.edu (Instructor)

Example TA coordinators:
- helen.coord@university.edu (TA Coordinator)
- ian.coord@university.edu (TA Coordinator)

## Customization

To modify the dummy data:
1. Edit `database/seed/dummy_data.sql`
2. Rebuild the Docker image or restart the container
3. The new data will be loaded automatically

## Troubleshooting

If dummy data isn't loading:
1. Check you're in development mode: `echo $ENVIRONMENT`
2. Verify the database is empty: `make db-summary`
3. Check logs: `docker-compose logs app`
4. Manually run the loader: `make load-dummy-data`