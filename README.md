# AllocAid: TA Allocation System

[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=19560092&assignment_repo_type=AssignmentRepo)

A comprehensive web application for managing Teaching Assistant (TA) applications, course allocations, and workload management for the UBCO Computer Science department.

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Team Members](#team-members)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Installation & Setup](#installation-setup)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Documentation Structure](#project-documentation-structure)

## Overview

AllocAid streamlines the TA application and allocation process by providing:
- **Students**: A centralized platform to apply for TA positions, manage profiles, and track applications
- **Instructors**: Tools to specify course TA requirements and review candidate qualifications
- **TA Coordinators**: Efficient matching of qualified candidates to courses based on preferences and requirements
- **Administrators**: Complete system oversight with user management and reporting capabilities
- **Graduate Students (GTAs)**: Special features for exam period availability management

## Features

### Core Functionality
- **User Authentication & Authorization**: JWT-based authentication with role-based access control
- **Student Profile Management**: Comprehensive profiles with academic information, experience, and preferences
- **TA Application System**: Multi-term application support with course preferences and availability
- **Course Management**: Course creation, TA needs specification, and requirement tracking
- **Document Management**: Transcript upload and verification system

### Advanced Features
- **Bulk Operations**: Import/export functionality for courses, users, and allocations
- **Archive System**: Historical data preservation for audit and reference
- **Conflict Resolution**: Handle scheduling conflicts and preference clashes
- **Real-time Updates**: Live application status tracking and notifications

## Team Members

| Name               | Student Number | Role(s)                                             |
|--------------------|----------------|-----------------------------------------------------|
| Khizar Aamir       | 13688437       | Frontend Developer, Documentation Lead              |
| Haider Ali         | 15983398       | Frontend Developer, UI/UX                           |
| Anirudh Anil       | 25396847       | Backend Developer, APIs, Database                   |
| Charles Bassey     | 68373562       | Backend Developer, Database, Testing                |
| Abdullah Munir     | 52415676       | Frontend Logic & UI Polish, Debugging               |
| Zaki Pugh-Fradot   | 65107765       | Backend Developer, Problem-Solving & Coordination   |
| Raad Sarker        | 68230374       | Frontend UI Design, Planning & Debugging            |

## Tech Stack

### Backend
- **Runtime**: Deno 1.45+
- **Framework**: Oak (middleware framework)
- **Database**: PostgreSQL 15
- **Authentication**: JWT (access & refresh tokens)

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: React Context API
- **UI Components**: Custom components with modern CSS
- **HTTP Client**: Fetch API with custom wrappers

### DevOps & Tools
- **Containerization**: Docker & Docker Compose
- **Testing**: Deno test framework
- **Version Control**: Git with GitHub
- **Documentation**: Markdown
- **Development**: Hot reload, TypeScript

## Project Structure

```
allocaid/
├── app/
│   ├── src/
│   │   ├── backend/           # Backend API implementation
│   │   │   ├── routes/        # API route handlers
│   │   │   ├── services/      # Business logic services
│   │   │   └── middleware/    # Authentication & validation
│   │   ├── database/          # Database layer
│   │   │   ├── models/        # Data models
│   │   │   ├── create_tables/ # Table creation scripts
│   │   │   └── script/        # Database utilities
│   │   └── frontend/          # React application
│   │       ├── src/
│   │       │   ├── api/       # API client functions
│   │       │   ├── components/# React components
│   │       │   ├── pages/     # Page components
│   │       │   └── context/   # React context providers
│   │       └── public/        # Static assets
│   └── server.ts              # Main server entry point
├── database/                  # Database configuration
│   └── init/                  # Initialization scripts
├── scripts/                   # Utility scripts
├── docs/                      # Documentation
├── test/                      # Test files
├── docker-compose.yml         # Docker services
├── Dockerfile                 # Container definition
├── Makefile                   # Common commands
└── README.md                  # This file
```

## Database Schema

### Core Tables

#### users
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | SERIAL | PRIMARY KEY | Unique user identifier |
| name | VARCHAR(255) | NOT NULL | User's full name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| password_hash | VARCHAR(255) | NOT NULL | Hashed password |
| role | VARCHAR(50) | NOT NULL | User role (student/instructor/admin/ta_coordinator) |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

#### student_profiles
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| profile_id | SERIAL | PRIMARY KEY | Profile identifier |
| user_id | INTEGER | FOREIGN KEY → users | Associated user |
| student_number | VARCHAR(20) | UNIQUE | Student ID number |
| year_of_study | INTEGER | CHECK (1-8) | Current year of study |
| cgpa | DECIMAL(3,2) | CHECK (0.00-4.33) | Cumulative GPA |
| program | VARCHAR(100) | | Academic program |
| department | VARCHAR(100) | | Academic department |
| phone_number | VARCHAR(20) | | Contact number |
| resume_url | TEXT | | Resume file URL |
| transcript_url | TEXT | | Transcript file URL |

#### courses
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| course_id | SERIAL | PRIMARY KEY | Course identifier |
| course_code | VARCHAR(20) | NOT NULL | Course code (e.g., COSC 111) |
| course_name | VARCHAR(255) | NOT NULL | Full course name |
| department_id | INTEGER | FOREIGN KEY → departments | Department offering course |
| instructor_id | INTEGER | FOREIGN KEY → users | Primary instructor |
| term_id | INTEGER | FOREIGN KEY → terms | Academic term |
| credits | INTEGER | DEFAULT 3 | Course credit hours |
| level | VARCHAR(20) | | Course level (undergraduate/graduate) |
| description | TEXT | | Course description |

#### ta_applications
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| application_id | SERIAL | PRIMARY KEY | Application identifier |
| user_id | INTEGER | FOREIGN KEY → users | Applicant user ID |
| term_id | INTEGER | FOREIGN KEY → terms | Term applying for |
| status | VARCHAR(50) | DEFAULT 'pending' | Application status |
| submitted_at | TIMESTAMP | DEFAULT NOW() | Submission timestamp |
| reviewed_at | TIMESTAMP | | Review timestamp |
| reviewer_id | INTEGER | FOREIGN KEY → users | Reviewer user ID |
| notes | TEXT | | Application notes |
| is_eligible | BOOLEAN | DEFAULT TRUE | Eligibility status |
| course_preferences | JSONB | | Ranked course preferences |
| availability | JSONB | | Weekly availability schedule |

#### ta_allocations
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| allocation_id | SERIAL | PRIMARY KEY | Allocation identifier |
| lab_section_id | INTEGER | FOREIGN KEY → lab_sections | Assigned lab section |
| user_id | INTEGER | FOREIGN KEY → users | Assigned TA |
| allocated_at | TIMESTAMP | DEFAULT NOW() | Allocation timestamp |
| allocated_by | INTEGER | FOREIGN KEY → users | Allocator user ID |
| status | VARCHAR(50) | DEFAULT 'active' | Allocation status |
| notes | TEXT | | Allocation notes |
| is_marker | BOOLEAN | DEFAULT FALSE | Marker-only assignment |

### Supporting Tables

- **terms**: Academic terms (Fall/Spring/Summer)
- **departments**: Academic departments
- **course_templates**: Reusable course templates
- **ta_needs**: TA requirements per course
- **lab_sections**: Lab/tutorial sections
- **system_settings**: Application configuration
- **notifications**: User notifications
- **gta_exam_availability**: Graduate TA exam availability

## API Endpoints

### Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/login` | User login | Public |
| POST | `/auth/register` | User registration | Public |
| POST | `/auth/logout` | User logout | Authenticated |
| POST | `/auth/refresh` | Refresh access token | Authenticated |
| GET | `/auth/me` | Get current user | Authenticated |
| POST | `/auth/forgot-password` | Request password reset | Public |
| POST | `/auth/reset-password` | Reset password | Public |

### Student Profile
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/profile/:userId` | Get student profile | Authenticated |
| PUT | `/api/profile/:userId` | Update profile | Student (own) |
| PATCH | `/api/users/:id/profile` | Partial update | Student (own) |
| POST | `/api/profile/:userId/transcript/upload` | Upload transcript | Student |
| PUT | `/api/profile/:userId/course-preferences` | Update preferences | Student |
| POST | `/api/users/:id/profile/submit` | Submit for review | Student |
| GET | `/api/users/:id/profile/status` | Get profile status | Student |

### TA Applications
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/applications` | Submit application | Student |
| GET | `/api/applications` | List applications | Authenticated |
| GET | `/api/applications/:id` | Get application details | Authenticated |
| PUT | `/api/applications/:id` | Update application | Student (own) |
| DELETE | `/api/applications/:id` | Withdraw application | Student (own) |
| POST | `/api/applications/:id/review` | Review application | TA Coordinator |

### Course Management
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/courses` | List all courses | Authenticated |
| POST | `/api/courses` | Create course | Instructor/Admin |
| GET | `/api/courses/:id` | Get course details | Authenticated |
| PUT | `/api/courses/:id` | Update course | Instructor (own) |
| POST | `/api/courses/:id/ta-needs` | Specify TA needs | Instructor |
| GET | `/api/courses/:id/applicants` | View applicants | Instructor |

### TA Allocation
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/allocations` | Create allocation | TA Coordinator |
| GET | `/api/allocations` | List allocations | Authenticated |
| PUT | `/api/allocations/:id` | Update allocation | TA Coordinator |
| DELETE | `/api/allocations/:id` | Remove allocation | TA Coordinator |
| POST | `/api/allocations/recommend` | Get AI recommendations | TA Coordinator |

### GTA Features (Graduate Students Only)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/gta/eligibility` | Check GTA eligibility | Student (Year 5+) |
| GET | `/api/gta/exam-availability/terms` | Get available terms | GTA |
| POST | `/api/gta/exam-availability` | Set exam availability | GTA |
| GET | `/api/gta/exam-availability` | Get availability | GTA |
| DELETE | `/api/gta/exam-availability/:id` | Remove availability | GTA |

## Installation & Setup

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for frontend development)
- Deno 1.45+ (for backend development without Docker)
- PostgreSQL 15+ (for local development without Docker)
- Git

### Quick Start with Docker (Recommended)

1. **Clone the repository:**
```bash
git clone https://github.com/your-org/allocaid.git
cd allocaid
```

2. **Set up environment variables:**
```bash
# Copy the template
cp .env.docker .env

# Edit .env and update these required values:
JWT_SECRET=your-very-long-random-secret-here
REFRESH_SECRET=another-very-long-random-secret-here
```

3. **Start the application:**
```bash
# Using Make (recommended)
make start-dev

# OR using Docker Compose directly
docker-compose --profile development up -d --build
```

4. **Access the application:**
- Main Application: http://localhost:8000
- Frontend Dev Server: http://localhost:3000
- pgAdmin: http://localhost:5050
  - Email: `admin@allocaid.com`
  - Password: `admin123`

### Database Setup

The database is automatically initialized with the required schema when using Docker. For manual setup:

```bash
# Access database shell
make db-shell

# Or connect directly
psql -h localhost -p 5433 -U allocaid_user -d allocaid_db
```

### Loading Sample Data

```bash
# Load dummy data for development
make db-load-dummy

# Or run the script directly
docker-compose exec app deno run --allow-all src/database/script/load_dummy_data.ts
```

## 💻 Development

### Development Workflow

1. **Start development environment:**
```bash
make start-dev
```

2. **Watch logs:**
```bash
# All services
make logs

# Specific service
make logs-app
make logs-db
```

3. **Run tests:**
```bash
make test
```

4. **Check code quality:**
```bash
make lint
make format
```

### Making Changes

- **Backend**: Changes in `/app/src/backend/` auto-reload via Deno watch
- **Frontend**: Changes in `/app/src/frontend/` trigger hot module replacement
- **Database**: Schema changes require migration scripts in `/database/init/`

### Common Commands

```bash
# Health check
make health

# Database operations
make db-reset          # Reset database with fresh schema
make db-backup         # Create database backup
make db-list-tables    # List all tables

# Development
make shell             # Access app container shell
make db-shell          # Access database shell

# Cleanup
make stop              # Stop all services
make clean             # Remove containers and volumes
```

## Testing

### Running Tests

```bash
# Run all tests
make test

# Run specific test file
docker-compose exec app deno test app/src/backend/_tests_/auth.test.ts

# Run with coverage
docker-compose exec app deno test --coverage
```

### Test Structure

```
app/src/
├── backend/_tests_/
│   ├── auth.test.ts           # Authentication tests
│   ├── services.test.ts       # Service layer tests
│   ├── routes.test.ts         # API endpoint tests
│   ├── application.test.ts    # Application workflow tests
│   └── integration.test.ts    # End-to-end tests
└── database/_tests_/
    ├── models.test.ts          # Model CRUD tests
    ├── schema.test.ts          # Schema validation tests
    └── connection.test.ts      # Database connection tests
```

### Test Coverage Areas
- Authentication & Authorization
- User Management
- Profile Operations
- Application Workflow
- Course Management
- TA Allocation
- GTA Features (Graduate only)
- Email Notifications
- Data Validation

## 🚢 Deployment

### Production Deployment

1. **Update environment variables:**
```bash
# Set production values in .env
ENVIRONMENT=production
JWT_SECRET=<production-secret>
REFRESH_SECRET=<production-secret>
DB_PASSWORD=<strong-password>
```

2. **Build and start:**
```bash
make start-prod
```

3. **Set up SSL/TLS:**
- Configure reverse proxy (Nginx/Apache)
- Set up SSL certificates (Let's Encrypt)
- Update FRONTEND_URL in environment

### Environment Variables

#### Required
- `DB_HOST`: Database host (default: localhost)
- `DB_PORT`: Database port (default: 5432)
- `DB_NAME`: Database name (default: allocaid_db)
- `DB_USER`: Database user (default: allocaid_user)
- `DB_PASSWORD`: Database password
- `JWT_SECRET`: JWT signing secret
- `REFRESH_SECRET`: Refresh token secret

#### Optional
- `PORT`: Application port (default: 8000)
- `ENVIRONMENT`: Environment mode (development/production/test)
- `FRONTEND_URL`: Frontend URL for CORS
- `SMTP_HOST`: Email server host
- `SMTP_PORT`: Email server port
- `SMTP_USERNAME`: Email username
- `SMTP_PASSWORD`: Email password
- `SMTP_FROM`: From email address

### Project Documentation Structure
```
docs/
├── api/           # API documentation
├── database/      # Database design docs
├── design/        # System design documents
├── plan/          # Project planning
├── charter/       # Project charter
└── weekly logs/   # Development logs
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :8000

# Stop the service
make stop
```

#### Database Connection Failed
```bash
# Check database status
make db-health

# Restart database
docker-compose restart database
```

#### Permission Denied
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

#### Docker Issues
```bash
# Clean up everything
make clean-all

# Rebuild from scratch
make full-reset
```

## Support

For issues or questions:
- Check the [documentation](docs/)
- Review [test examples](app/src/backend/_tests_/)
- Contact the development team

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

---

**Version**: 1.0.0  

**Status**: Closed Development






