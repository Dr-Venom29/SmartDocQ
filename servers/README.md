# SmartDoc Node API (servers/)

## Environment variables
Copy `.env.example` to `.env` and fill in:

- PORT: default 5000
- MONGO_URI: MongoDB Atlas connection string
- JWT_SECRET: strong random secret for signing auth cookies
- FRONTEND_ORIGINS: comma-separated allowlist for CORS (e.g., http://localhost:3000, https://your-frontend.vercel.app)
- CLOUDINARY_*: optional for avatars
- SERVICE_TOKEN: shared secret for server-to-server requests from Flask
- FLASK_ASK_URL, FLASK_INDEX_URL, FLASK_CONVERT_URL: Flask service endpoints

## Authentication
Uses httpOnly cookies for JWT storage. Key endpoints:
- POST `/api/auth/login` — Sets auth cookie
- POST `/api/auth/logout` — Clears auth cookie
- GET `/api/auth/verify` — Validates session from cookie

## Scripts
- `npm start` to run the server (default port 5000)

## Health
- GET /healthz returns `{ "status": "ok" }`
