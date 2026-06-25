# SmartDoc Node API (servers/)

## Environment variables
Copy `.env.example` to `.env` and fill in:

- PORT: default 5000
- MONGO_URI: MongoDB Atlas connection string
- JWT_SECRET: strong random secret for signing auth cookies
- FRONTEND_ORIGINS: comma-separated allowlist for CORS (e.g., http://localhost:3000, https://your-frontend.vercel.app)
- FRONTEND_URL: base URL used when generating password-reset links (e.g., https://smartdocq.vercel.app)
- CLOUDINARY_*: optional for avatars
- DNS_SERVERS: optional comma-separated DNS servers for Node's resolver (e.g., `1.1.1.1,8.8.8.8`) if Atlas lookups fail with `querySrv ECONNREFUSED`
- SERVICE_TOKEN: shared secret for server-to-server requests from Flask (required; server refuses to start if missing; must match backend `SERVICE_TOKEN`)
- FLASK_ASK_URL, FLASK_INDEX_URL, FLASK_CONVERT_URL: Flask service endpoints

## Authentication
Uses httpOnly cookies for JWT storage. Key endpoints:
- POST `/api/auth/login` — Sets auth cookie
- POST `/api/auth/logout` — Clears auth cookie
- GET `/api/auth/verify` — Validates session from cookie

### Security Controls
- **Rate Limiting**: Core authentication routes (`login`, `signup`, `forgot-password`, `reset-password`, `google`) are protected by an `express-rate-limit` guard restricting IPs to 30 authentication-related requests per 15 minutes.
- **Enumeration Protection**: Login failures return generic `"Invalid email or password"` responses to prevent scanning/enumeration of active emails.
- **Google OAuth Compatibility**: Safe checks prevent server crashes during credential comparison or profile updates for accounts created via Google Sign-In.

## Validation & Responses
- Auth and admin routes use centralized Zod schemas via a `validate` middleware to enforce strict shapes for `body`, `query`, and `params`.
- Successful API responses include `success: true` along with any payload fields.
- Failed responses include `success: false`, a human-readable `message`, and, for validation failures, an `errors` array with structured details.

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
