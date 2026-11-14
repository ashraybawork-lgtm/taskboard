# Taskboard - Task Management Application

Full-stack web app: Node.js + Express + MongoDB (Mongoose) + JWT authentication.

## Features
- User register / login (passwords hashed with bcrypt, JWT token)
- Authorization: every user can only see and change their own tasks
- CRUD for tasks (title, details, priority, due date, status)
- Board view: To do / In progress / Done, search and priority filter
- Responsive design (mobile + desktop), light and dark theme

## API
| Method | Route | What it does |
|---|---|---|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Sign in, returns token |
| GET | /api/auth/me | Current user |
| GET | /api/tasks | List my tasks |
| POST | /api/tasks | Create task |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |

## Run locally
1. Install Node.js (v18+)
2. Copy `.env.example` to `.env` and fill MONGO_URI and JWT_SECRET
3. `npm install`
4. `npm start` and open http://localhost:3000
