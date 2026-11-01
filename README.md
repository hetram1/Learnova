# Learnova

**Learnova** is a full-stack Learning Management System (LMS) where students can discover courses, enroll, learn through video lectures, and track progress. Educators can build and manage course content and monitor enrollments through a dedicated dashboard.

The application is split into a React frontend and an Express REST API backed by MongoDB.

## Features

### Student experience
- Browse published courses and search by title or category.
- View course descriptions, curriculum, chapters, and lecture details.
- Preview free lectures before enrolling.
- Enroll in courses and access enrolled course content.
- Watch YouTube videos or directly playable video URLs.
- Save lecture completion and view enrolled courses.
- Rate courses after enrollment.

### Educator experience
- Switch an account to the educator role.
- Create, edit, publish, and unpublish courses.
- Add and manage course chapters and video lectures.
- Upload course thumbnails (PNG, JPEG, WebP, or GIF; up to 500 KB).
- View educator-owned courses, enrollment totals, and enrolled students.
- Manage only courses owned by the signed-in educator.

### Authentication and access control
- Clerk handles sign-in and session authentication.
- Clerk webhooks synchronize user creation, updates, and deletion with the application database.
- Protected API routes verify Clerk sessions and educator permissions.
- Full lecture video URLs are available only to enrolled students and the course owner.
- Unpublishing a course removes it from discovery and prevents new enrollments while preserving existing student access.

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite 6, React Router 7 |
| Styling | Tailwind CSS 3 |
| Backend | Node.js 22, Express 5 |
| Database | MongoDB, Mongoose |
| Authentication | Clerk (React SDK and Express SDK) |
| Video | YouTube embeds and direct video URLs |
| Testing | Node.js test runner |
| Deployment | Vercel |

## Architecture

~~~text
┌──────────────────────────┐       HTTPS / JSON       ┌──────────────────────────┐
│                          │  ──────────────────────> │                          │
│     React + Vite         │                          │     Express REST API     │
│     Student / Educator   │  <────────────────────── │     Clerk middleware     │
│     UI                   │                          │     Controllers          │
└──────────────────────────┘                          └────────────┬─────────────┘
                                                                   │
                                                          ┌────────▼────────┐
                                                          │    MongoDB      │
                                                          │    Mongoose     │
                                                          └─────────────────┘

                         Clerk authentication + webhooks
~~~

The frontend communicates with the backend through REST endpoints. The API validates authenticated requests, applies role and course-ownership checks, and reads or writes application data through Mongoose.

## Repository structure

~~~text
Learnova/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── educator/
│   │   │   └── student/
│   │   ├── context/
│   │   ├── pages/
│   │   │   ├── educator/
│   │   │   └── student/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
├── server/
│   ├── configs/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── tests/
│   ├── utils/
│   ├── app.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
└── README.md
~~~

## Getting started

### Prerequisites
- Node.js **22.x**
- npm
- MongoDB (local instance or MongoDB Atlas)
- A Clerk application

### 1. Clone the repository

~~~bash
git clone https://github.com/hetram1/Learnova.git
cd Learnova
~~~

### 2. Install dependencies

Install dependencies separately for the backend and frontend:

~~~bash
cd server
npm ci

cd ../client
npm ci
~~~

### 3. Configure environment variables

Create local environment files from the committed examples.

**Backend — server/.env**

~~~env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=lms
CLERK_PUBLISHABLE_KEY=pk_test_your_key
CLERK_SECRET_KEY=sk_test_your_key
CLERK_WEBHOOK_SECRET=whsec_your_secret
CLIENT_URL=http://localhost:5173
PORT=5000
~~~

**Frontend — client/.env**

~~~env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key
VITE_BACKEND_URL=http://localhost:5000
VITE_CURRENCY=₹
~~~

Use the actual values from your MongoDB and Clerk projects. The frontend and backend Clerk keys must belong to the **same Clerk application**. Never commit real secrets or local .env files.

| Variable | Application | Purpose |
| --- | --- | --- |
| MONGODB_URI | Server | MongoDB connection string |
| MONGODB_DB_NAME | Server | Database name (defaults to lms) |
| CLERK_PUBLISHABLE_KEY | Server | Clerk publishable key used by the API |
| CLERK_SECRET_KEY | Server | Clerk server-side secret |
| CLERK_WEBHOOK_SECRET | Server | Verifies incoming Clerk webhook events |
| CLIENT_URL | Server | Allowed frontend origin(s); multiple origins can be comma-separated |
| PORT | Server | Local API port (defaults to 5000) |
| VITE_CLERK_PUBLISHABLE_KEY | Client | Clerk key used by the frontend |
| VITE_BACKEND_URL | Client | Backend origin, without the /api suffix |
| VITE_CURRENCY | Client | Currency symbol displayed by the frontend |

### 4. Start the application

Run the backend and frontend in **separate terminals**.

Terminal 1 — backend:

~~~bash
cd server
npm run server
~~~

Terminal 2 — frontend:

~~~bash
cd client
npm run dev
~~~

Open **http://localhost:5173**. The API runs at **http://localhost:5000** by default.

Sign in through Clerk. To access course-management features, choose **Become Educator** in the application.

## REST API

All API responses are JSON and include a success field. Authenticated endpoints expect a Clerk session token in the Authorization: Bearer <token> header.

| Area | Method | Endpoint | Purpose |
| --- | --- | --- | --- |
| Course discovery | GET | /api/courses | List published courses; supports search and category filters |
| Course details | GET | /api/courses/:id | Retrieve course details and public course content |
| Course management | POST | /api/courses | Create a course (educator) |
| Course management | PUT / DELETE | /api/courses/:id | Update or delete an owned course |
| Chapters | GET / POST | /api/courses/:id/chapters | Read or add chapters |
| Chapters | GET / PUT / DELETE | /api/courses/:id/chapters/:chapterId | Read, update, or delete a chapter |
| Lectures | GET / POST | /api/courses/:id/chapters/:chapterId/lectures | Read or add lectures |
| Lectures | GET / PUT / DELETE | /api/courses/:id/chapters/:chapterId/lectures/:lectureId | Read, update, or delete a lecture |
| Enrollments | GET | /api/enrollments | List the signed-in student's enrollments |
| Enrollments | POST | /api/enrollments/:courseId | Enroll in a course |
| Progress | PUT | /api/enrollments/:courseId/progress/:lectureId | Save lecture completion |
| Ratings | PUT | /api/enrollments/:courseId/rating | Submit or update a course rating |
| User profile | GET / PATCH | /api/users/me | Read or update the current user's name |
| Educator role | POST | /api/educator/update-role | Become an educator |
| Educator dashboard | GET | /api/educator/dashboard | Retrieve educator dashboard totals |
| Educator courses | GET | /api/educator/courses | List the educator's courses |
| Educator students | GET | /api/educator/students | List students enrolled in the educator's courses |
| Clerk webhook | POST | /clerk | Synchronize Clerk user events |

### Course publishing and video access

To publish a course, each chapter must contain at least one lecture. A lecture needs a title, a positive duration in minutes, and an HTTP(S) video URL. YouTube watch, short, embed, shorts, and live URLs are supported, along with directly playable browser video URLs.

Videos remain hosted at their supplied URLs. Course thumbnail images are stored with the course in MongoDB; accepted formats are PNG, JPEG, WebP, and GIF, up to 500 KB.

Enrollment is direct. **Payment processing is not part of the current enrollment flow.** Course price and discount fields are retained in the course data, but they do not represent processed payments or revenue.

## Tests and quality checks

Run the frontend checks:

~~~bash
cd client
npm run lint
npm run build
~~~

Run the backend integration tests:

~~~bash
cd server
npm test
~~~

The backend test suite requires a reachable MONGODB_URI. It creates a randomly named learnova_test_* database, exercises the Express application and authentication flow with test credentials, and removes only its own test data. The MongoDB user must be allowed to create indexes and read/write the test collections.

Coverage includes authentication and role enforcement, course ownership, origin restrictions, course/chapter/lecture operations, draft visibility, private video URL access, enrollment deduplication, saved progress, ratings, educator dashboard data, and Clerk webhook signatures and retries.

## Deployment on Vercel

The repository can be deployed as two Vercel projects.

### Backend API
1. Import the repository into Vercel.
2. Set the project root directory to server.
3. Use the Node.js 22 runtime and the included server/vercel.json.
4. Configure the server environment variables from server/.env.example.
5. Set CLIENT_URL to the deployed frontend origin.

### Frontend
1. Create a second Vercel project using the same repository.
2. Set the project root directory to client.
3. Select Vite, use npm run build, and set the output directory to dist.
4. Set VITE_BACKEND_URL to the deployed API HTTPS origin and configure VITE_CLERK_PUBLISHABLE_KEY.
5. Configure the production frontend domain in Clerk.

Finally, configure the Clerk webhook endpoint as https://<api-domain>/clerk and subscribe to user.created, user.updated, and user.deleted. Add the webhook signing secret to CLERK_WEBHOOK_SECRET.

MongoDB Atlas must allow connections from the API deployment environment. Redeploy the frontend whenever a VITE_* variable changes because Vite embeds these values at build time.

## Security notes
- Keep Clerk secret keys and webhook signing secrets on the server only.
- Do not commit .env files, credentials, or production secrets.
- Keep the frontend and backend configured for the same Clerk instance.
- Use HTTPS and restrict allowed frontend origins in production.
- Course ownership and enrollment checks are enforced by the backend; frontend route protection alone is not an authorization boundary.

---

Built with React, Node.js, Express, MongoDB, and Clerk.
