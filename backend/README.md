StudyHubAI Backend (FastAPI)

Stack

- FastAPI + Uvicorn
- PostgreSQL (psycopg)
- Gmail SMTP email verification
- JWT auth

Quick start

1) Fill backend/.env values (especially Gmail SMTP and JWT_SECRET).
2) Fill .env.docker values if you want custom DB credentials.
3) Run from project root:
   docker compose up -d --build

Health check

Open: http://localhost:4000/health

Architecture

- app/core: config, security, mailer, shared exceptions
- app/db: connection/session and DB schema initialization
- app/schemas: request DTOs
- app/repositories: SQL/data access layer
- app/services: business logic layer
- app/api/routes: HTTP endpoints
- app/main.py: app bootstrap + middleware + startup init

Auth endpoints

- POST /api/auth/register
  body: { "name": "Student", "email": "student@example.com", "password": "12345678", "role": "student", "groupId": "g1" }

- POST /api/auth/verify-email-code
  body: { "email": "student@example.com", "code": "123456" }

- POST /api/auth/login
  body: { "email": "student@example.com", "password": "12345678" }
