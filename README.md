# PasteFlow

> The fastest way to share text online.

Full-stack Next.js app with MongoDB, NextAuth.js, dark developer UI.

## Stack
- **Next.js 14** (App Router, API Routes)
- **MongoDB** (Mongoose, TTL indexes for expiration)
- **NextAuth.js** (email/password auth)
- **Vercel** deployment target

## Quick Start

```bash
cp .env.local.example .env.local
# Fill in MONGODB_URI and NEXTAUTH_SECRET
npm install
npm run dev
```

## Environment Variables

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/pasteflow
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
```

## Project Structure

```
app/
  api/auth/[...nextauth]/  ← NextAuth handler
  api/auth/register/       ← POST register user
  api/pastes/              ← POST create, GET user list
  api/pastes/[id]/         ← GET paste, DELETE
  api/raw/[id]/            ← Raw text endpoint
  p/[id]/                  ← Paste viewer
  auth/signin|register/    ← Auth pages
  dashboard/               ← User paste management
models/Paste.ts            ← Mongoose schema
models/User.ts             ← User schema
lib/mongodb.ts             ← DB connection singleton
```

## API

```
POST /api/pastes           Create paste
GET  /api/pastes/:id       Get paste (header: x-paste-password)
GET  /api/raw/:id          Raw text
DELETE /api/pastes/:id     Delete paste
POST /api/auth/register    Register user
```

## Deploy to Vercel

```bash
vercel
# Set env vars in Vercel dashboard
```

## MongoDB Atlas (Free)
1. Create M0 cluster at mongodb.com/atlas
2. Whitelist 0.0.0.0/0 for Vercel
3. Copy connection string to MONGODB_URI

Collections are auto-created. TTL index on `expiresAt` handles auto-deletion.
