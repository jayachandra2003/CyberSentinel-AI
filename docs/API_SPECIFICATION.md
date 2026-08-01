# CyberSentinel AI API Specifications (v1)

Base URL: `/api/v1`

Standard JSON Response Envelope:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "timestamp": "2026-07-31T18:00:00Z",
    "version": "1.0.0"
  }
}
```

---

## 📌 Health & System Endpoints

### 1. Root Status
- **Method**: `GET /`
- **Response**: `200 OK`
```json
{
  "name": "CyberSentinel AI API Gateway",
  "status": "online",
  "version": "1.0.0"
}
```

### 2. Service Health Check
- **Method**: `GET /health`
- **Response**: `200 OK`
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2026-07-31T18:00:00Z"
}
```

---

## 🔐 Authentication Endpoints

### 1. Register Account
- **Method**: `POST /api/v1/auth/register`
- **Request Body**:
```json
{
  "email": "analyst@cybersentinel.ai",
  "password": "SecurePassword123!",
  "full_name": "Security Analyst"
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "analyst@cybersentinel.ai",
    "full_name": "Security Analyst",
    "role": "USER",
    "is_active": true,
    "is_verified": false,
    "created_at": "2026-07-31T18:00:00Z"
  }
}
```

### 2. Authenticate & Login
- **Method**: `POST /api/v1/auth/login`
- **Request Body**:
```json
{
  "email": "analyst@cybersentinel.ai",
  "password": "SecurePassword123!"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "token_type": "bearer",
    "expires_in": 1800,
    "user": {
      "id": 1,
      "email": "analyst@cybersentinel.ai",
      "full_name": "Security Analyst",
      "role": "USER"
    }
  }
}
```

### 3. Refresh Access Token
- **Method**: `POST /api/v1/auth/refresh`
- **Request Body**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```
- **Response**: `200 OK`

### 4. Logout User Session
- **Method**: `POST /api/v1/auth/logout`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response**: `200 OK`

### 5. Get Current Authenticated Profile
- **Method**: `GET /api/v1/auth/me` or `GET /api/v1/users/me`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response**: `200 OK`
