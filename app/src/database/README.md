Keep in mind that:

If your SQL is:

```
SELECT user_id, name FROM users WHERE role = $1;
```

And you call:

```
const result = await this.client.queryObject(query, ["student"]);
```

Then result will look like:

```
{
  rows: [
    { user_id: 1, name: "Alice" },
    { user_id: 2, name: "Bob" }
  ],
  rowCount: 2,
  columns: [
    { name: "user_id" },
    { name: "name" }
  ]
}
```

### Why this happens

Deno’s queryObject<T>() returns a QueryObjectResult<T>, which is typed like this:

```
interface QueryObjectResult<T> {
  rows: T[];
  rowCount?: number; // <- optional!
  columns: Array<{ name: string }>;
}
```

---

## `updateUser` in `user.ts`

This method updates a user in the PostgreSQL database using only the fields provided. It ensures safety and flexibility using parameterized SQL and dynamic field selection.


### 🔍 What It Does

- Takes a user ID (`userId`) and an object (`updates`) containing any fields you want to change.
- Builds a dynamic SQL `UPDATE` query using only the fields you provided.
- Prevents SQL injection by using `$1`, `$2`, etc., as placeholders.
- Automatically updates the `updated_at` timestamp.
- Returns the updated user record, or `null` if nothing was updated.


## 🧪 Example

```ts
await updateUser(5, { name: "Alice", role: "admin" });
```

Generates a query like:

```sql
UPDATE users 
SET name = $2, role = $3, updated_at = CURRENT_TIMESTAMP 
WHERE user_id = $1
RETURNING *
```

With values: `[5, "Alice", "admin"]`

#### For your understanding...

```
const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
```
The above uses parameterized placeholders (`$1`, `$2`, ...) to prevent SQL injection. `$1` is reserved for userId, so update values start at `$2` hence why we increment the index by 2 (0 + 2).

---

## `getCoursesWithTANeeds` from `courses.ts`

```
SELECT 
  c.*, 
  tn.num_required, 
  tn.notes AS ta_notes, 
  tn.status AS need_status
FROM courses c
LEFT JOIN ta_needs tn ON c.course_id = tn.course_id
ORDER BY c.term DESC, c.code
```

✅ What This Query Retrieves:
- All columns from courses (using c.*)

- From ta_needs, it adds:

  - num_required (how many TAs are needed)
  - notes as ta_notes (any special comments from instructor/admin)
  - status as need_status (e.g. pending, fulfilled)

✅ Why LEFT JOIN?
- Ensures every course is listed — even if it doesn’t currently have a TA need.
- TA-related fields will be null for courses with no entry in ta_needs.

---


# 📄 Explanation & Suggestions for Application Query Methods

This document explains the purpose of the two methods `getApplicationsByUser` and `getApplicationsForCourse`, and provides improvement suggestions for type safety and maintainability.

---

## 🧠 `getApplicationsByUser(userId: number)`

### 🔍 What It Does
Fetches all TA applications submitted by a specific user. Each row includes:
- TA application fields
- User name & email
- A JSON array of the applicant's ranked course preferences

### 🧪 SQL Mechanics
```sql
json_agg(json_build_object(...)) AS course_preferences
```
- Aggregates each user's course preferences into a JSON array, ordered by `ar.rank`.

### ✅ Strengths
- Efficient data structure for frontend rendering
- Uses grouping and JSON functions properly

### 🛠️ Suggestions
1. **Type the result**:
```ts
interface ApplicationWithPreferences {
  application_id: number;
  submitted_at: Date;
  status: string;
  applicant_name: string;
  applicant_email: string;
  course_preferences: Array<{
    course_id: number;
    rank: number;
    course_code: string;
    course_title: string;
    term: string;
  };
}
```

Update method signature:
```ts
async getApplicationsByUser(userId: number): Promise<ApplicationWithPreferences[]>
```

2. **Sort course preferences consistently**:
Ensure proper ordering in `json_agg(...)`:
```sql
ORDER BY ar.rank NULLS LAST
```

---

### 🧠 `getApplicationsForCourse` from `applications.ts`

#### 🔍 What It Does
Fetches all applications that ranked a given course. Each row includes:
- TA application fields
- User's basic info (name, email, major)
- User's profile info (bio, resume)
- Applicant's rank for that course

---
---
---

## Initialize DB - `init.ts`

```ts
import { initializeDatabase } from "./database/init.ts";

const db = await initializeDatabase();
```

Using the models:
```ts
import { UserModel, CourseModel, ApplicationModel } from "./database/init.ts";

const userModel = new UserModel(db);
const courseModel = new CourseModel(db);
const applicationModel = new ApplicationModel(db);

// Create a new user
const user = await userModel.createUser({
  name: "John Doe",
  email: "john@student.ubc.ca",
  password_hash: "$2b$10$hashedpassword",
  role: "student",
  major: "Computer Science"
});
```