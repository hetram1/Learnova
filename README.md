# Learnova

A React/Vite/Tailwind LMS with an Express REST API, MongoDB/Mongoose persistence, and Clerk authentication.

Students can discover published courses, search by title, preview free lectures, enroll, watch YouTube or direct video URLs, and save lecture completion. Educators can create and edit courses, thumbnails, chapters, and lectures; publish or unpublish content; and view their own courses and enrollments.

## Local setup

Use Node.js 22 or later. Install dependencies in both applications:

```powershell
cd server
npm ci
Copy-Item .env.example .env
cd ../client
npm ci
Copy-Item .env.example .env
```

Keep any existing configured .env files instead of overwriting them. Fill in the values from your MongoDB and Clerk projects. Frontend and backend Clerk keys must belong to the same Clerk instance.

- Server: MONGODB_URI, CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY, CLERK_WEBHOOK_SECRET.
- MONGODB_DB_NAME defaults to lms. The URI is passed intact, including Atlas query parameters.
- CLIENT_URL is the exact frontend origin, without a trailing slash. Multiple allowed origins can be comma separated.
- Client: VITE_CLERK_PUBLISHABLE_KEY, VITE_BACKEND_URL (the API origin, without /api), and optional VITE_CURRENCY.

Start each app in a separate terminal:

```powershell
cd server
npm run server
```

```powershell
cd client
npm run dev
```

The defaults are http://localhost:5173 and http://localhost:5000. Sign in through Clerk. Select **Become Educator** to enable course management. User profiles are synchronized on authenticated API requests, so enrollment and creation work before a webhook is delivered. Clerk's UserButton handles account settings; signed webhooks synchronize account creation, updates, and deletion.

## Course content and access

Create a draft, add chapters and video lectures, then publish it. Every published chapter must contain a lecture with a title, positive duration in minutes, and HTTP(S) video URL. YouTube watch, short, embed, shorts, and live video URLs are supported, along with directly playable browser video URLs. Videos remain hosted at the supplied URLs.

Thumbnail uploads accept PNG, JPEG, WebP, and GIF files up to 500 KB and persist the image with the course in MongoDB. No additional upload service is required.

The API verifies Clerk sessions and checks server-managed educator metadata. Educators can modify only their own courses. Anonymous visitors see published course outlines and free preview URLs. Full video URLs require enrollment or course ownership. Unpublishing removes discovery and new enrollment while retaining access for existing students. Courses with enrollments must be unpublished rather than deleted.

Enrollment is direct; payment processing is outside this project's scope. Prices and discounts are retained from the existing course form. Dashboard totals represent actual courses and enrollments, not inferred payment revenue.

## REST API

All responses use JSON with a success flag. Send Clerk session tokens as Authorization: Bearer <token> for authenticated routes.

| Resource | Routes |
| --- | --- |
| Discovery | GET /api/courses?search=...&category=..., GET /api/courses/:id |
| Courses | POST /api/courses, PUT /api/courses/:id, DELETE /api/courses/:id |
| Chapters | GET/POST /api/courses/:id/chapters, GET/PUT/DELETE /api/courses/:id/chapters/:chapterId |
| Lectures | GET/POST /api/courses/:id/chapters/:chapterId/lectures, GET/PUT/DELETE /api/courses/:id/chapters/:chapterId/lectures/:lectureId |
| Enrollment | GET /api/enrollments, POST /api/enrollments/:courseId |
| Progress | PUT /api/enrollments/:courseId/progress/:lectureId |
| Existing course ratings | PUT /api/enrollments/:courseId/rating |
| Current user | GET/PATCH /api/users/me |
| Educator role | POST /api/educator/update-role |
| Educator dashboard | GET /api/educator/dashboard, /api/educator/courses, /api/educator/students |
| Clerk webhook | POST /clerk |

Clerk webhook endpoint: subscribe to user.created, user.updated, and user.deleted. Set the signing secret in CLERK_WEBHOOK_SECRET. Signature verification uses the original request bytes and repeated deliveries are safe.

## Verification

```powershell
cd client
npm run lint
npm run build
cd ../server
npm test
```

The integration suite requires a reachable MONGODB_URI. It creates a randomly named learnova_test_* database, uses the actual Express application and Clerk JWT verification with a test-only RSA key, and controls Clerk profile responses without creating real Clerk accounts. It deletes only records in its own test database at the end. The database user needs permission to create indexes and read/write those test collections. Existing LMS data is untouched.

Tests cover role and ownership enforcement, invalid and expired tokens, origin restrictions, course/chapter/lecture CRUD, draft visibility, private URL redaction, enrollment deduplication, saved progress, ratings, dashboard data, and webhook signatures and retries.

## Vercel deployment

Create two Vercel projects linked to this repository and branch:

1. **API:** root directory server; Node.js 22; use the included server/vercel.json. Add all server environment variables from .env.example. CLIENT_URL must match the deployed frontend origin.
2. **Frontend:** root directory client; framework Vite; build command npm run build; output directory dist. Set VITE_BACKEND_URL to the deployed API HTTPS origin and VITE_CLERK_PUBLISHABLE_KEY to the matching Clerk publishable key. The included rewrite supports direct links to React routes.
3. Configure MongoDB Atlas network access for the API's deployment network. Configure the frontend domain in Clerk for your production instance, and register https://<api-domain>/clerk with the three user events.
4. Redeploy the frontend after changing any VITE_* values, since Vite embeds them at build time.

The API exports the Express app for Vercel and starts a listener only when executed locally. MongoDB connections are reused across function invocations. No frontend secrets or local .env files should be committed.

See the official [Express on Vercel documentation](https://vercel.com/docs/frameworks/backend/express) for deployment behavior.
