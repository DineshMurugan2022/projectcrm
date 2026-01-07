# 🔐 API Documentation

Complete API reference for the Enterprise CRM System.

**Base URL:** `http://localhost:5000/api`

**Authentication:** All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📑 Table of Contents

- [Authentication](#authentication)
- [Users](#users)
- [Leads](#leads)
- [Attendance](#attendance)
- [Tasks](#tasks)
- [Appointments (BDM)](#appointments-bdm)
- [Messages](#messages)
- [Calls](#calls)
- [Reports](#reports)
- [Queries](#queries)

---

## 🔑 Authentication

### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "userGroup": "admin",
    "name": "Admin User"
  }
}
```

### Get Current User
```http
GET /api/users/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "username": "admin",
  "userGroup": "admin",
  "name": "Admin User",
  "email": "admin@example.com"
}
```

---

## 👥 Users

### Get All Users
```http
GET /api/users
Authorization: Bearer <token>
```

**Query Parameters:**
- `userGroup` (optional) - Filter by role: admin, teamleader, bdm, etc.

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "name": "John Doe",
    "userGroup": "bdm",
    "email": "john@example.com",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
]
```

### Create User
```http
POST /api/users
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "username": "new_user",
  "password": "secure_password",
  "name": "New User",
  "userGroup": "bdm",
  "email": "user@example.com"
}
```

### Update User
```http
PUT /api/users/:id
Authorization: Bearer <token>
```

### Delete User
```http
DELETE /api/users/:id
Authorization: Bearer <token>
```

---

## 📊 Leads

### Get All Leads
```http
GET /api/leads
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 25)
- `status` (optional) - Filter by status
- `search` (optional) - Search in company name

**Response:**
```json
{
  "leads": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "companyName": "ABC Corp",
      "contactPerson": "John Smith",
      "email": "john@abccorp.com",
      "phone": "+1234567890",
      "amount": 50000,
      "status": "new",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "pages": 6
}
```

### Create Lead
```http
POST /api/leads
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "companyName": "ABC Corp",
  "contactPerson": "John Smith",
  "email": "john@abccorp.com",
  "phone": "+1234567890",
  "amount": 50000,
  "status": "new",
  "source": "website"
}
```

### Update Lead
```http
PUT /api/leads/:id
Authorization: Bearer <token>
```

### Delete Lead
```http
DELETE /api/leads/:id
Authorization: Bearer <token>
```

### Import Leads (Excel)
```http
POST /api/leads/import
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file` - Excel file (.xlsx)

### Export Leads
```http
GET /api/leads/export
Authorization: Bearer <token>
```

**Response:** Excel file download

---

## ⏰ Attendance

### Check In
```http
POST /api/attendance/checkin
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090
}
```

### Check Out
```http
POST /api/attendance/checkout
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090
}
```

### Get Attendance Records
```http
GET /api/attendance/range
Authorization: Bearer <token>
```

**Query Parameters:**
- `start` - Start date (ISO format)
- `end` - End date (ISO format)
- `userId` (optional) - Filter by user

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "date": "2026-01-07",
    "loginTime": "2026-01-07T09:00:00.000Z",
    "logoutTime": "2026-01-07T18:00:00.000Z",
    "totalHours": 9,
    "status": "present"
  }
]
```

### Manual Attendance Entry (Admin)
```http
POST /api/attendance/manual
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "userId": "507f1f77bcf86cd799439012",
  "date": "2026-01-07",
  "status": "present"
}
```

### Download Attendance Report
```http
GET /api/attendance/:year/:month/download
Authorization: Bearer <token>
```

**Response:** Excel file download

---

## ✅ Tasks

### Get All Tasks
```http
GET /api/tasks
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Follow up with client",
    "description": "Call ABC Corp regarding proposal",
    "priority": "high",
    "status": "pending",
    "assignee": {
      "_id": "507f1f77bcf86cd799439012",
      "username": "john_doe"
    },
    "dueDate": "2026-01-10T00:00:00.000Z",
    "createdAt": "2026-01-07T00:00:00.000Z"
  }
]
```

### Create Task
```http
POST /api/tasks
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Follow up with client",
  "description": "Call ABC Corp",
  "priority": "high",
  "assignee": "507f1f77bcf86cd799439012",
  "dueDate": "2026-01-10T00:00:00.000Z",
  "relatedTo": "lead"
}
```

### Update Task
```http
PATCH /api/tasks/:id
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "completed"
}
```

### Add Note to Task
```http
POST /api/tasks/:id/notes
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "content": "Client requested callback tomorrow"
}
```

### Delete Task
```http
DELETE /api/tasks/:id
Authorization: Bearer <token>
```

---

## 📅 Appointments (BDM)

### Get All Appointments
```http
GET /api/appointments
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` - Filter by status (met, signed, pending)
- `userId` - Filter by BDM user
- `startDate` - Filter from date
- `endDate` - Filter to date

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "companyName": "ABC Corp",
    "client": "John Smith",
    "date": "2026-01-10T10:00:00.000Z",
    "contractValue": 100000,
    "met": true,
    "signed": false,
    "clearancePending": true,
    "clearanceAmount": 50000,
    "assignedBDM": {
      "_id": "507f1f77bcf86cd799439012",
      "username": "bdm_user"
    }
  }
]
```

### Create Appointment
```http
POST /api/appointments
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "companyName": "ABC Corp",
  "client": "John Smith",
  "date": "2026-01-10T10:00:00.000Z",
  "contractValue": 100000,
  "renewal": "fresh",
  "assignedBDM": "507f1f77bcf86cd799439012"
}
```

### Update Appointment
```http
PUT /api/appointments/:id
Authorization: Bearer <token>
```

### Delete Appointment
```http
DELETE /api/appointments/:id
Authorization: Bearer <token>
```

---

## 💬 Messages

### Get Conversation
```http
GET /api/messages/:userId
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "from": "507f1f77bcf86cd799439012",
    "to": "507f1f77bcf86cd799439013",
    "message": "Hello, how are you?",
    "timestamp": "2026-01-07T10:00:00.000Z"
  }
]
```

### Send Message
```http
POST /api/messages
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "to": "507f1f77bcf86cd799439013",
  "message": "Hello, how are you?"
}
```

### Mark Messages as Read
```http
PUT /api/messages/read/:userId
Authorization: Bearer <token>
```

### Get Unread Count
```http
GET /api/messages/unread-count
Authorization: Bearer <token>
```

**Response:**
```json
{
  "unreadCount": 5
}
```

---

## 📞 Calls

### Get Call History
```http
GET /api/calls
Authorization: Bearer <token>
```

### Initiate Call
```http
POST /api/calls
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "leadId": "507f1f77bcf86cd799439011"
}
```

---

## 📋 Reports

### Get Daily Reports
```http
GET /api/reports
Authorization: Bearer <token>
```

**Query Parameters:**
- `userId` (optional) - Filter by user
- `date` (optional) - Filter by date

### Submit Daily Report
```http
POST /api/reports
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "date": "2026-01-07",
  "items": [
    {
      "project": "CRM System",
      "client": "ABC Corp",
      "task": "Bug fixes",
      "description": "Fixed login issue",
      "status": "Completed"
    }
  ]
}
```

### Update Report
```http
PUT /api/reports/:id
Authorization: Bearer <token>
```

### Delete Report
```http
DELETE /api/reports/:id
Authorization: Bearer <token>
```

---

## 🎫 Queries (Tech Support)

### Get All Queries
```http
GET /api/queries
Authorization: Bearer <token>
```

### Create Query
```http
POST /api/queries
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Login Issue",
  "description": "Cannot login to system",
  "priority": "high",
  "category": "technical"
}
```

### Update Query Status
```http
PATCH /api/queries/:id
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "Resolved",
  "resolution": "Password reset completed"
}
```

---

## 🔄 WebSocket Events (Socket.IO)

### Connection
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    userId: 'your_user_id'
  }
});
```

### Events

**Attendance Updates:**
- `attendanceUpdated` - Emitted when attendance is updated

**Chat:**
- `chat:message` - New message received
- `chat:typing` - User is typing
- `user:online` - User came online
- `user:offline` - User went offline

**Appointments:**
- `appointmentCreated` - New appointment created
- `appointmentUpdated` - Appointment updated

**Location:**
- `locationUpdate` - Real-time location update

---

## 📝 Error Responses

All endpoints return standard error responses:

**400 Bad Request:**
```json
{
  "error": "Validation error",
  "details": "Email is required"
}
```

**401 Unauthorized:**
```json
{
  "message": "No token, authorization denied"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Server error",
  "details": "Database connection failed"
}
```

---

## 🔒 Rate Limiting

- **Authentication endpoints:** 5 requests per minute
- **General API:** 100 requests per minute
- **File uploads:** 10 requests per hour

---

## 📌 Notes

- All dates are in ISO 8601 format
- Timestamps are in UTC
- File uploads limited to 10MB
- Pagination default: 25 items per page
- Maximum page size: 100 items

---

**For more information, see [README.md](./README.md)**
