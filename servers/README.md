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

## Public share links

SmartDoc supports sharing a read-only snapshot of a document chat via a public link.

- Create share (auth required): `POST /api/share/chat/:documentId`
	- Returns `{ shareId, title }`
- View share (public): `GET /api/share/:shareId`
- Export share as PDF (public): `GET /api/share/:shareId/export.pdf`

### Security

- Share links expire after ~24 hours (`410` if expired).
- Share IDs are high-entropy URL-safe strings (currently 32 chars base64url); legacy shorter IDs may still resolve.
- Public share endpoints are rate-limited (100 requests/min per IP) to prevent abuse.
