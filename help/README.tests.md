# 🧪 Comprehensive Test Suite Documentation

## Overview
This comprehensive test suite provides complete coverage of the AllocAid TA Management System, ensuring reliability, maintainability, and confidence in code changes. The suite includes database validation, API testing, authentication verification, and end-to-end workflow testing.

## 📂 Test Structure

### Database Tests (`/app/src/database/_tests_/`)
| File | Purpose | Coverage |
|------|---------|----------|
| **`models.test.ts`** | CRUD operations for all data models | User, Course, Term, Application, Profile, Allocation models |
| **`schema.test.ts`** | Database schema operations | Table creation, seeding, cleanup, constraints |
| **`connection.test.ts`** | Database connectivity | Connection pooling, query execution, error handling |
| **`validation.test.ts`** | Data integrity validation | Email formats, duplicates, required fields, constraints |

### Backend API Tests (`/app/src/backend/_tests_/`)
| File | Purpose | Coverage |
|------|---------|----------|
| **`auth.test.ts`** | Authentication workflows | Login, logout, registration, token management |
| **`services.test.ts`** | Business logic services | AuthService, password security, role-based access |
| **`middleware.test.ts`** | Authentication middleware | Token validation, role authorization, context state |
| **`routes.test.ts`** | Core API endpoints | User routes, authentication routes, error handling |
| **`profile.test.ts`** | Student profile management | Profile CRUD, references, submission workflow |
| **`taExperience.test.ts`** | TA experience tracking | Experience data, availability, profile updates |
| **`taCoordinator.test.ts`** | TA coordinator operations | Term management, course oversight, TA assignments |
| **`application.test.ts`** | TA application workflow | Application submission, review process, status updates |
| **`admin.test.ts`** | Administrative functions | User management, system settings, permissions |
| **`integration.test.ts`** | End-to-end workflows | Complete user journeys, multi-step processes |

## 🔧 Test Infrastructure

### Test Utilities (`test_utils.ts`)
- **Database Setup**: `setupTestDatabase()` - Creates isolated test database instances
- **Application Factory**: `createTestApp()` - Generates test applications with proper routing
- **Authentication**: `getAuthToken()` - Handles user authentication for protected endpoints
- **Mock Data**: `TestMockFactory` - Generates realistic test data
- **Request Helpers**: `makeTestRequest()` - Simplified API request handling

### Fixtures (`fixtures.ts`)
- **Realistic Test Data**: Pre-defined users, courses, terms, applications
- **Relationship Mapping**: Proper foreign key relationships
- **Role Coverage**: Students, instructors, TA coordinators, administrators
- **Edge Cases**: Boundary conditions and special scenarios

## 🚀 Running Tests

### Prerequisites
```bash
# Make all shell scripts executable
find . -type f -name "*.sh" -exec chmod +x {} \;

# Ensure Docker is running for database tests
docker --version
```

### Individual Test Files
```bash
# Database tests
./scripts/tests/models.sh           # Model CRUD operations
./scripts/tests/schema.sh           # Database schema validation
./scripts/tests/connection.sh       # Connection testing
./scripts/tests/validation.sh       # Data validation

# Backend tests
./scripts/tests/auth.sh             # Authentication workflows
./scripts/tests/services.sh         # Business logic services
./scripts/tests/middleware.sh       # Authentication middleware
./scripts/tests/routes.sh           # API endpoint testing
./scripts/tests/profile.sh          # Profile management
./scripts/tests/taExperience.sh     # TA experience tracking
./scripts/tests/taCoordinator.sh    # TA coordinator operations
./scripts/tests/application.sh      # Application workflows
./scripts/tests/admin.sh            # Administrative functions
./scripts/tests/integration.sh      # End-to-end testing
```

### Test Suites
```bash
# Run all database tests
./scripts/tests/all-database.sh

# Run all backend tests
./scripts/tests/all-backend.sh

# Run complete test suite
./scripts/run-tests.sh
```

### Development Workflow
```bash
# Quick test during development
deno test app/src/backend/_tests_/profile.test.ts

# With verbose output
deno test --allow-all app/src/backend/_tests_/profile.test.ts

# Run specific test steps
deno test --filter "should create student profile" app/src/backend/_tests_/profile.test.ts
```

## 📊 Test Coverage

### Authentication & Authorization
- ✅ User registration and login
- ✅ JWT token generation and validation
- ✅ Role-based access control (Student, Instructor, TA Coordinator, Admin)
- ✅ Session management and logout
- ✅ Password security and hashing
- ✅ Permission validation

### Data Models
- ✅ User management (CRUD operations)
- ✅ Course creation and management
- ✅ Term scheduling and validation
- ✅ Student profile management
- ✅ TA application processing
- ✅ Allocation assignments
- ✅ Reference management

### API Endpoints
- ✅ RESTful API compliance
- ✅ Input validation and sanitization
- ✅ Error handling (400, 401, 403, 404, 500)
- ✅ Response format consistency
- ✅ Rate limiting and security
- ✅ Content-Type handling

### Business Workflows
- ✅ Student registration → Profile creation → Application submission
- ✅ Instructor course management → TA need posting
- ✅ TA Coordinator application review → Assignment allocation
- ✅ Admin user management → System configuration

### Pre-commit Hooks
```bash
# Run quick tests before commit
./scripts/tests/quick-check.sh

# Lint and format
deno fmt && deno lint
```

### Documentation
- [Deno Testing Guide](https://deno.land/manual/testing)
- [Oak Framework Testing](https://oakserver.github.io/oak/)
- [PostgreSQL Testing Best Practices](https://www.postgresql.org/docs/current/regress.html)

### Tools
- **Test Runner**: Deno built-in test runner
- **Database**: PostgreSQL with Docker
- **HTTP Client**: Oak framework
- **Assertions**: Deno standard library

### Contributing
1. Follow existing test patterns
2. Add documentation for new test cases
3. Ensure tests are isolated and deterministic
4. Include both positive and negative test scenarios
5. Update this documentation for new test files
