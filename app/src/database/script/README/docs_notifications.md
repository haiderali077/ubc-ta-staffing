# Notification System Manual Test Report

This document summarizes the manual testing of the **Notification System API** endpoints, conducted via `curl` commands against the local backend running at `http://localhost:8000/api`.

---

## Endpoints Tested

### ✅ 1. Login (Student)

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "student@example.com", "password": "student123"}' \
  -c cookies.txt
```

➡️ **Result:** Login successful, user session saved in `cookies.txt`

---

### ✅ 2. Get Notifications

```bash
curl -X GET http://localhost:8000/api/notifications -b cookies.txt
```

➡️ **Result:** Returns list of notifications and `unread_count`

---

### ✅ 3. Get Unread Count

```bash
curl -X GET http://localhost:8000/api/notifications/unread-count -b cookies.txt
```

➡️ **Result:** Returns current `unread_count`

---

### ✅ 4. Get Notification Preferences

```bash
curl -X GET http://localhost:8000/api/notifications/preferences -b cookies.txt
```

➡️ **Result:** Returns user preferences (email, in-app, deadlines)

---

### ✅ 5. Update Notification Preferences

```bash
curl -X PUT http://localhost:8000/api/notifications/preferences \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email_notifications": false, "reminder_days_before": 5}'
```

➡️ **Result:** Preferences updated successfully

---

### ✅ 6. Send Test Notification (Student)

```bash
curl -X POST http://localhost:8000/api/notifications/test \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"type": "application_accepted"}'
```

➡️ **Result:** Test notification sent and visible in `/notifications`

---

### ✅ 7. Mark Notification as Read (Individual)

```bash
curl -X PATCH http://localhost:8000/api/notifications/1/read -b cookies.txt
```

➡️ **Result:** `Notification not found or already read` (if already read)

---

### ✅ 8. Mark All Notifications as Read

```bash
curl -X PATCH http://localhost:8000/api/notifications/read-all -b cookies.txt
```

➡️ **Result:** Marks all unread notifications as read

---

### ✅ 9. Pagination (Limit + Offset)

```bash
curl -X GET "http://localhost:8000/api/notifications?limit=2&offset=0" -b cookies.txt
```

➡️ **Result:** Returns paginated notification list (2 items)

---

### ✅ 10. Submit TA Application (Automatic Notification Trigger)

```bash
curl -X POST http://localhost:8000/api/applications \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "coursePreferences": [{"course_id": 1, "rank": 1}],
    "domainAreas": ["Software Engineering"],
    "applicationType": "UTA",
    "termAvailability": "Available weekdays",
    "notes": "Testing automatic notification"
  }'
```

➡️ **Result:** Returns `Application deadline passed` (application window closed)

---

### ✅ 11. Login (Admin)

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}' \
  -c admin_cookies.txt
```

➡️ **Result:** Admin login successful

---

### ✅ 12. Bulk Notification (Admin)

```bash
curl -X POST http://localhost:8000/api/notifications/bulk \
  -b admin_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "user_ids": [3, 5],
    "type": "deadline_reminder",
    "title": "Important Reminder",
    "message": "This is a bulk notification test.",
    "action_url": "/dashboard",
    "action_text": "View"
  }'
```

➡️ **Result:** Bulk notification sent successfully to selected users

---

## Notes:

* All `/notifications` endpoints require authentication.
* The `/api` prefix was necessary for all routes.
* Automatic notifications on application submission could not be tested due to the "Application deadline passed" response.
* Pagination and preference updates worked as expected.

---

