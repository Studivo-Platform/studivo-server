# Studivo

![Studivo Banner](https://via.placeholder.com/1200x320?text=Studivo)

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white) ![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white) ![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?logo=socket.io&logoColor=white) ![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?logo=redis&logoColor=white) ![Gemini](https://img.shields.io/badge/Google%20Gemini-AI-8E75FF) ![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white) ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

Studivo is a student reverse marketplace where students post what they need and local sellers respond with offers. Requests are parsed with Google Gemini AI, external product results are compared side-by-side, and conversations happen in real time through in-app chat.

## Features

- 🧠 AI-powered request parsing for category, specs, and budget
- 🛍️ Reverse marketplace flow for students and sellers
- 🔎 External product discovery from Amazon, Noon, OLX, B.Tech, and Aqar
- ⚡ Live offer notifications and real-time chat with Socket.IO
- 🔐 Full authentication with Google OAuth, JWT, refresh token rotation, and role-based access
- 📦 Admin tools for moderation, analytics, and content management

## Tech Stack

### Backend

| Layer         | Stack                   |
| ------------- | ----------------------- |
| Runtime       | Node.js, Express        |
| Database      | MongoDB Atlas, Mongoose |
| Real-time     | Socket.IO               |
| Queue & Cache | Redis, BullMQ           |
| AI            | Google Gemini API       |
| Scraping      | Playwright              |
| Auth          | Passport.js, JWT        |
| Validation    | Zod                     |
| Email         | SendGrid                |
| Testing       | Jest                    |

### Frontend

| Layer                | Stack                                 |
| -------------------- | ------------------------------------- |
| Framework            | Next.js 16, React 19                  |
| Language             | TypeScript                            |
| Styling              | Tailwind CSS v4                       |
| UI                   | shadcn/ui                             |
| State/Data           | React Query, Zustand                  |
| Internationalization | next-intl (Arabic + English, RTL/LTR) |
| Feedback             | Sonner                                |

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- MongoDB Atlas account
- Redis instance
- Google Gemini API key
- Google OAuth credentials
- SendGrid API key

### Clone and install

#### Backend

```bash
git clone https://github.com/Studivo-Platform/studivo-server.git
cd studivo-server
npm install
```

#### Frontend

```bash
git clone https://github.com/Studivo-Platform/studivo-ui.git
cd studivo-ui
npm install
```

### Environment variables

Create a `.env` file in the backend root based on the variables below. You can also use a `.env.example` file if you keep one in the repo.

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/studivo
REDIS_URL=redis://localhost:6379

JWT_SECRET=replace_with_a_long_secret
JWT_REFRESH_SECRET=replace_with_another_long_secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash
AI_CACHE_TTL=86400

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

SENDGRID_API_KEY=SG.your_sendgrid_key
SENDGRID_FROM_EMAIL=hello@yourdomain.com

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

NOON_AFFILIATE_ID=your_noon_affiliate_id
AMAZON_PARTNER_TAG=studivo0b-21
AMAZON_HOST=www.amazon.eg
```

### Run locally

#### Backend

```bash
npm run dev
```

The API will run at `http://localhost:5000` and expose a health check at `http://localhost:5000/health`.

#### Frontend

```bash
npm run dev
```

The frontend should run at `http://localhost:3000` by default.

## Project Structure

```text
src/
  config/
  controllers/
  middleware/
  models/
  repositories/
  routes/
  services/
  socket/
  utils/
  validators/
  workers/
```

## API Endpoints

### Auth

| Method | Path                       | Description                   | Auth |
| ------ | -------------------------- | ----------------------------- | ---- |
| POST   | /api/auth/register         | Register a new account        | No   |
| POST   | /api/auth/login            | Login with email and password | No   |
| GET    | /api/auth/verify/:token    | Verify email address          | No   |
| POST   | /api/auth/refresh          | Refresh access token          | No   |
| POST   | /api/auth/complete-profile | Finish profile setup          | No   |
| POST   | /api/auth/forgot-password  | Request password reset        | No   |
| PATCH  | /api/auth/reset-password   | Reset password                | No   |
| POST   | /api/auth/logout           | Logout current session        | Yes  |
| GET    | /api/auth/me               | Get current user profile      | Yes  |
| PATCH  | /api/auth/profile          | Update profile                | Yes  |
| POST   | /api/auth/upload-avatar    | Upload profile image          | Yes  |
| PATCH  | /api/auth/change-password  | Change password               | Yes  |
| GET    | /api/auth/google           | Start Google OAuth flow       | No   |
| GET    | /api/auth/google/callback  | OAuth callback                | No   |

### Requests

| Method | Path                     | Description                          | Auth |
| ------ | ------------------------ | ------------------------------------ | ---- |
| POST   | /api/requests            | Create a new student request         | Yes  |
| GET    | /api/requests/my         | Get current student's requests       | Yes  |
| GET    | /api/requests            | Browse open requests as seller/admin | Yes  |
| GET    | /api/requests/:id        | Get request details                  | Yes  |
| PATCH  | /api/requests/:id/status | Close a request                      | Yes  |

### Offers

| Method | Path                           | Description               | Auth |
| ------ | ------------------------------ | ------------------------- | ---- |
| POST   | /api/offers                    | Submit a seller offer     | Yes  |
| GET    | /api/offers/my                 | Get current seller offers | Yes  |
| GET    | /api/offers/request/:requestId | Get offers for a request  | Yes  |
| PATCH  | /api/offers/:id                | Update an existing offer  | Yes  |
| DELETE | /api/offers/:id                | Withdraw an offer         | Yes  |

### Search

| Method | Path                 | Description                      | Auth |
| ------ | -------------------- | -------------------------------- | ---- |
| GET    | /api/search          | Search local and indexed results | No   |
| GET    | /api/search/external | Search external marketplaces     | Yes  |

### Chat

| Method | Path                            | Description                       | Auth |
| ------ | ------------------------------- | --------------------------------- | ---- |
| POST   | /api/conversations              | Create or start a conversation    | Yes  |
| GET    | /api/conversations/my           | List current user's conversations | Yes  |
| GET    | /api/conversations/:id/messages | Get conversation messages         | Yes  |

### Notifications

| Method | Path                        | Description                   | Auth |
| ------ | --------------------------- | ----------------------------- | ---- |
| GET    | /api/notifications          | List notifications            | Yes  |
| PATCH  | /api/notifications/read-all | Mark all as read              | Yes  |
| PATCH  | /api/notifications/:id/read | Mark one notification as read | Yes  |

### Admin

| Method | Path                            | Description         | Auth |
| ------ | ------------------------------- | ------------------- | ---- |
| GET    | /api/admin/users                | List users          | Yes  |
| GET    | /api/admin/users/:id            | Get user details    | Yes  |
| PATCH  | /api/admin/users/:id/deactivate | Deactivate a user   | Yes  |
| PATCH  | /api/admin/users/:id/reactivate | Reactivate a user   | Yes  |
| GET    | /api/admin/requests             | List all requests   | Yes  |
| DELETE | /api/admin/requests/:id         | Delete a request    | Yes  |
| GET    | /api/admin/offers               | List all offers     | Yes  |
| DELETE | /api/admin/offers/:id           | Delete an offer     | Yes  |
| GET    | /api/admin/stats                | Get dashboard stats | Yes  |

## Contributing

Use the following conventions:

- Branch names: `feature/short-description`, `fix/short-description`, `chore/short-description`
- Commit format: `feat: add something`, `fix: resolve something`, `chore: update something`

## License

This project is licensed under the MIT License.
