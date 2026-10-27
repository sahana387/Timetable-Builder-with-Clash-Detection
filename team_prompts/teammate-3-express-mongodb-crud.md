# Teammate 3 — Node.js, Express, MongoDB CRUD

You own backend setup, MongoDB configuration, Mongoose models, course/timetable routes, and server integration. Read `PRD.md`, `AGENTS.md`, and `API_CONTRACT.md`. Work on branch `feat/express-mongodb-crud`.

Set up `server/` using Node.js, Express, Mongoose, dotenv, and CORS if needed. Read the MongoDB connection from `MONGODB_URI` and provide `.env.example` without secrets. Implement `Course`, `Timetable`, and `Session` models, course CRUD, timetable CRUD, `/api/health`, central JSON errors, invalid ObjectId handling, and appropriate status codes. Prevent deleting a course used by sessions (`409`). Deleting a timetable should also delete its sessions. Mount a session router seam so Teammate 4 can implement session endpoints without rewriting your files. Document setup, run commands, and MongoDB Atlas/local setup in README.

Do not add clash logic to course/timetable routes or commit `.env` credentials. Preserve `API_CONTRACT.md` unless the team agrees to update it.

Make small meaningful commits for server setup, course CRUD, and timetable CRUD. Test with curl/API client. If the database is unavailable, state that honestly and distinguish code checks from live database tests.
