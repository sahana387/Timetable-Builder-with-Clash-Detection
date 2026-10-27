# Team Prompts — Four-Person Work Split

Use one prompt per teammate in Antigravity. Each person should open the same repository, read `PRD.md`, `AGENTS.md`, and `API_CONTRACT.md`, then work on their own feature branch. Do not all use one shared working tree at the same time.

## Team-wide contribution rule
Make real, small commits after each meaningful milestone. Aim for 2–4 useful commits per teammate during implementation. Do not create empty commits just to increase the count. Push your branch and open a PR if permissions allow. Each teammate should report their branch, commit hashes, tests run, and known issues. Never claim a commit exists until Git confirms it.

Suggested branches:
- Teammate 1: `feat/timetable-grid`
- Teammate 2: `feat/crud-forms-api-client`
- Teammate 3: `feat/express-mongodb-crud`
- Teammate 4: `feat/clash-detection-tests`

---

## Teammate 1 — Timetable Grid and Main UI

**Prompt to copy:**

You own the timetable visualization and main layout for the Timetable Builder with Clash Detection. Before coding, read `PRD.md`, `AGENTS.md`, and `API_CONTRACT.md`. Work on branch `feat/timetable-grid` and stay within your ownership boundaries.

### Your deliverables
- Build the main React page shell in coordination with Teammate 2. Keep the UI focused on the actual timetable workflow rather than a marketing landing page.
- Implement `client/src/components/TimetableGrid.jsx` and `TimetableGrid.css`.
- Display weekly sessions in a clear week view with days and time labels. Each session should show course code/title, time, room, and faculty where available.
- Handle empty schedules and long labels gracefully; make the grid responsive on narrower screens.
- Use stable keys and semantic/accessibility-friendly markup. Do not hard-code fake sessions as the final data source. Use props supplied by the parent; coordinate the exact props with Teammate 2.
- Coordinate `App.jsx` changes instead of replacing another teammate's code.

### Do not
- Modify the Express API or MongoDB models.
- Invent new JSON fields or change the API contract.
- Duplicate the full conflict-detection algorithm in the grid. Display conflict state supplied by the parent/backend.

### Commit checkpoints
1. `feat(ui): add timetable page shell`
2. `feat(ui): render weekly timetable grid`
3. `style(ui): make timetable responsive and accessible`

Commit each completed milestone with a meaningful diff; these are examples, not mandatory exact messages. Test the UI at desktop and mobile widths, then open a PR with screenshots and testing notes.

---

## Teammate 2 — CRUD Forms and Frontend API Integration

**Prompt to copy:**

You own the React forms, data-fetching client, and UI states for course/timetable/session CRUD. Read `PRD.md`, `AGENTS.md`, and `API_CONTRACT.md` first. Work on branch `feat/crud-forms-api-client`.

### Your deliverables
- Implement `client/src/services/api.js` as the shared `fetch` wrapper for JSON requests, base URL configuration, HTTP error handling, and `409` clash payloads.
- Implement `CourseManager.jsx`: list/add/edit/delete courses using the documented API.
- Implement `TimetableManager.jsx`: list/create/select/update/delete timetables using the documented API.
- Implement `SessionForm.jsx`: add/edit sessions under the selected timetable using course, day, time, and room fields.
- Implement `ConflictPanel.jsx` and styles to display `conflicts` from the server in understandable language.
- Coordinate with Teammate 1 about the exact props that the timetable grid receives. Keep the app integrated instead of building isolated demo pages.
- Provide loading, success, empty, validation, and server-error states. Keep form values after a rejected clash so users can correct them.
- Call the API after create/update/delete and refresh the relevant state so the grid stays current.

### Do not
- Change endpoint paths/field names without agreement and an update to `API_CONTRACT.md`.
- Make mock data the app's final source of truth.
- implement your own authoritative clash rules; the server decides whether a session can be saved.

### Commit checkpoints
1. `feat(client): add shared JSON API client`
2. `feat(client): add course and timetable CRUD forms`
3. `feat(client): add session form and conflict feedback`

Before PR, verify every CRUD form calls the real API, handles error responses, and works after a refresh.

---

## Teammate 3 — Node.js, Express, MongoDB CRUD

**Prompt to copy:**

You own backend setup, database configuration, Mongoose models, course/timetable routes, and server integration. Read `PRD.md`, `AGENTS.md`, and `API_CONTRACT.md` first. Work on branch `feat/express-mongodb-crud`.

### Your deliverables
- Set up `server/` with Node.js, Express, Mongoose, dotenv, and CORS as needed.
- Use environment variable `MONGODB_URI`; create `.env.example` without secrets.
- Implement `Course`, `Timetable`, and `Session` Mongoose models with sensible required-field, enum, and uniqueness validation.
- Implement course CRUD routes and timetable CRUD routes exactly as in `API_CONTRACT.md`.
- Prevent deleting a course that is used by sessions (return `409`). Deleting a timetable should also delete its sessions, according to the contract.
- Add `/api/health`, central JSON error handling, invalid ObjectId handling, and clear status codes.
- Mount a sessions router at `/api` or an equivalent routing setup that lets Teammate 4 implement `GET/POST /timetables/:id/sessions` and `/sessions/:id` endpoints without rewriting your files. Agree on the export name and interface first.
- Add setup/run scripts and a README explaining local MongoDB or MongoDB Atlas configuration.

### Do not
- Write a second clash detector in course/timetable route files.
- change the API contract without agreement.
- commit real credentials or a local `.env` file.

### Commit checkpoints
1. `chore(server): scaffold Express and MongoDB connection`
2. `feat(api): add course CRUD with Mongoose`
3. `feat(api): add timetable CRUD and error handling`

Test endpoints with curl, an API client, or automated tests. Report what was actually tested, including if a MongoDB connection was unavailable.

---

## Teammate 4 — Clash Detection, Session Routes, Tests

**Prompt to copy:**

You own the clash-detection rules, session CRUD route integration, and automated tests. Read `PRD.md`, `AGENTS.md`, and `API_CONTRACT.md` first. Work on branch `feat/clash-detection-tests`. Coordinate model names and route mounting with Teammate 3 before coding.

### Your deliverables
- Implement the clash-detection logic in `server/src/services/clashDetection.js`. Keep the core comparison logic testable without MongoDB where possible.
- Implement `server/src/routes/sessions.js` for list/create sessions under a timetable and get/update/delete a session, using the exact contract.
- On create/update, load relevant same-day sessions and the referenced course/timetable data, run clash detection, and return `409` with a `conflicts` array when needed. Exclude the session being edited.
- Add `GET /timetables/:id/clashes` or coordinate its placement with Teammate 3 while keeping the contract intact.
- Return conflict entries with type, readable message, conflicting session ID, course details, day, times, and room where available.
- Add tests for: normal non-overlap, true overlap, adjacent endpoints, different day, same-cohort clash, same-faculty clash, same-room clash, multiple conflict types, and editing a session without self-conflict.
- Coordinate with Teammate 2 on the conflict payload; do not change the contract unilaterally.

### Rules
- Strict time parsing: valid `HH:mm`; reject invalid times and `startTime >= endTime`.
- Overlap formula: `startA < endB && startB < endA`.
- Compare only sessions on the same day.
- Cohort equality uses `academicYear`, `semester`, and `section`.
- Faculty and room equality use trimmed, case-insensitive matching and ignore empty values.

### Commit checkpoints
1. `feat(clash): add pure time-overlap and conflict rules`
2. `feat(api): add session CRUD with conflict prevention`
3. `test(clash): cover overlap boundaries and conflict types`

Run tests, add any needed test command to `package.json`, and state any untested integration dependency. Do not claim live MongoDB integration passed if no database was available.
