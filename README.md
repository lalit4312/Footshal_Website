# Neco Insurance Futsal Cup

A JavaScript MERN starter for a Neco Insurance futsal tournament site. The React client reads tournament information from the Express API; the API stores it in MongoDB. Public pages only receive published tournaments/results and active teams/sponsors. Admin routes use an HTTP-only JWT cookie and role checks.

## Requirements

- Node.js 18 or newer
- MongoDB (local or Atlas)

## Run locally

1. Configure the API:

   ```powershell
   cd server
   npm install
   Copy-Item .env.example .env
   ```

   Set a unique `JWT_SECRET` of at least 32 characters and a reachable `MONGODB_URI` in `server/.env`. The sample CORS origin is for the Vite development server (`http://localhost:5173`).

2. Create the first Super Admin with explicitly chosen credentials:

   ```powershell
   $env:ADMIN_NAME = "Tournament Admin"
   $env:ADMIN_EMAIL = "admin@example.com"
   $env:ADMIN_PASSWORD = "use-a-unique-password-of-12-or-more-characters"
   node src/scripts/create-admin.js
   ```

   The bootstrap script refuses to run without those environment values and only creates the first account.

3. Start the API in one terminal:

   ```powershell
   cd server
   npm start
   ```

4. Start the React client in another terminal:

   ```powershell
   cd client
   npm install
   npm run dev
   ```

   Open the Vite URL (normally `http://localhost:5173`). The Vite development server proxies `/api` requests to `http://localhost:4000`.

## Included functionality

- Public overview, fixtures, published results, computed standings, teams, players, sponsors, stats summary and knockout-round display.
- Responsive tournament site and mobile navigation.
- Admin sign-in, role-aware navigation, basic CRUD forms for tournaments, teams, players, fixtures and sponsors, user management for Super Admins, and audit-log viewing for Admin/Super Admin.
- Draft/publish match results, standings and summary-stat calculation from published results.
- Password hashing, JWT HTTP-only cookies, Helmet, CORS allow-list, rate limiting, Mongoose validation and audit records.
- Admin-created accounts require a password of at least 12 characters. No default credentials are included.

## API

The API route reference and operational notes are in [server/README.md](./server/README.md). Public requests use `/api/public`; authenticated management routes use `/api/admin`; authentication uses `/api/auth`.

## Validation

```powershell
cd client
npm run build
cd ../server
npm test
```

## Current scope and production work

This implementation provides a working data-backed foundation, not every requirement in the full product brief and not a production deployment certification. MongoDB must be configured for end-to-end operation. The current version does not yet include Cloudinary/Multer media uploads, CSV import/export, Socket.IO push updates (the client refreshes public data periodically), full match-event/scorer entry, head-to-head tie-break calculations, a generated bracket progression engine, or deployment automation. Tournament/team/player profile detail routes and a complete operational dashboard for all domain workflows are also not included. Do not treat URL-based logo/photo fields as a secure upload system. Review cookie/CORS settings, add integration tests against a replica-set MongoDB, and configure hosting/secrets/backups before production use.
