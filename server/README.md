# Timetable Builder Server

Backend REST API for **Timetable Builder with Clash Detection**, built with Node.js, Express, and MongoDB (via Mongoose).

## Prerequisites
- Node.js (v18+ recommended)
- MongoDB running locally or a MongoDB Atlas connection string

## Environment Variables

Copy `.env.example` to `.env` in the `server` directory (or root):

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Port for Express API server | `5000` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://localhost:27017/timetable_builder` |
| `CLIENT_ORIGIN` | Allowed CORS client origin | `http://localhost:5173` |

### Using MongoDB Atlas (Cloud)
Set `MONGODB_URI` in `.env`:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/timetable_builder?retryWrites=true&w=majority
```

### Using Local MongoDB (Community Edition)
Start MongoDB service and set:
```env
MONGODB_URI=mongodb://localhost:27017/timetable_builder
```

## Running the Server

```bash
# Install dependencies
npm install

# Start in development mode (with auto-reload)
npm run dev

# Start in production mode
npm start

# Run automated tests
npm test
```

## API Endpoints Overview

- `GET /api/health` — Health check
- `GET /api/courses` — List all courses
- `POST /api/courses` — Create new course
- `GET /api/courses/:id` — Get course details
- `PATCH /api/courses/:id` — Update course
- `DELETE /api/courses/:id` — Delete course (fails with 409 if referenced by sessions)
- `GET /api/timetables` — List timetables
- `POST /api/timetables` — Create timetable
- `GET /api/timetables/:id` — Get timetable details
- `PATCH /api/timetables/:id` — Update timetable
- `DELETE /api/timetables/:id` — Delete timetable (cascades and removes associated sessions)
- `GET /api/timetables/:id/sessions` — List sessions for timetable
- `POST /api/timetables/:id/sessions` — Create session with clash prevention
- `GET /api/sessions/:id` — Get single session
- `PATCH /api/sessions/:id` — Update session with clash prevention
- `DELETE /api/sessions/:id` — Delete session
- `GET /api/timetables/:id/clashes` — Scan timetable for schedule conflicts
