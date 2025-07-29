# 🎯 DevTinder Backend

DevTinder is a developer matchmaking and networking platform — like Tinder, but for devs. This is the **backend** repo built using Node.js, Express.js, MongoDB, and JWT authentication.

---

## 🚀 Tech Stack

- **Node.js**
- **Express.js**
- **MongoDB** (with Mongoose)
- **JWT Auth** (secure HTTP-only cookies)
- **bcryptjs** (for password hashing)
- **dotenv**
- **CORS**
- **Cookie-parser**

---

## ✅ Features

### 🔐 Authentication
- Sign up, login, and logout
- JWT token-based authentication via HTTP-only cookies
- Password hashing with bcryptjs
- Auth middleware to protect private routes

### 👤 Profile Management
- View current user's profile
- Update profile fields
- Secure password update with current password validation

### 🧑‍🤝‍🧑 Connection Requests
- Send requests with status: `Interested` or `Ignored`
- Accept or reject incoming requests
- Prevent self-requests and duplicates using Mongoose validation

### 🧭 Developer Feed
- Get a list of suggested developers (excluding current user, connections, ignored users, and pending requests)
- Pagination supported via query params `?page=1&limit=10`

---

## 📦 API Endpoints

### Auth Routes (`/auth`)
| Method | Route         | Description         |
|--------|---------------|---------------------|
| POST   | /signup       | Register new user   |
| POST   | /login        | Login user          |
| POST   | /logout       | Logout user         |

### Profile Routes (`/profile`)
| Method | Route         | Description              |
|--------|---------------|--------------------------|
| GET    | /view         | View profile             |
| PATCH  | /edit         | Edit profile details     |
| PATCH  | /password     | Change password          |

### Connection Routes (`/request`)
| Method | Route                                     | Description                   |
|--------|-------------------------------------------|-------------------------------|
| POST   | /send/:status/:toUserId                   | Send connection request       |
| POST   | /review/:status/:requestId                | Accept/Reject connection      |

### User Routes (`/user`)
| Method | Route                     | Description                            |
|--------|---------------------------|----------------------------------------|
| GET    | /feed                     | Get suggested developers               |
| GET    | /requests/received        | Get incoming requests                  |
| GET    | /connections              | Get accepted connections               |

---

## ⚙️ Setup Instructions

### 1. Clone the repo
```bash
git clone https://github.com/ISHADOW007/devTinder-backendNew.git
cd devTinder-backendNew