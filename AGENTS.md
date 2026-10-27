# AGENTS.md — Shared Engineering Rules

These rules apply to every teammate and every AI coding agent contributing to this repository.

## 1. Before coding
1. Read `PRD.md`, `API_CONTRACT.md`, and this file.
2. Inspect `git status`, the current branch, and the existing project before changing anything.
3. If the repository now contains code, preserve working code and adapt rather than blindly replacing files.
4. Confirm your assigned role and only modify your owned files unless a teammate explicitly agrees to a shared change.
5. Coordinate API/field changes before implementing them. `API_CONTRACT.md` is the source of truth.

## 2. Technology constraints
- Use JavaScript, not TypeScript, for this learning project.
- Frontend: React + Vite, semantic HTML, and plain CSS.
- Backend: Node.js + Express.
- Database: MongoDB using Mongoose.
- Frontend/backend exchange JSON over REST.
- Use `fetch` or one small shared client in `client/src/services/api.js`.
- No hard-coded mock data as the finished data source. Temporary fixtures are acceptable for isolated UI work, but replace them with API integration before merge.

## 3. File ownership and boundaries

| Owner | Primary ownership | Avoid editing without agreement |
|---|---|---|
| Teammate 1 — Timetable UI | `client/src/components/TimetableGrid.jsx`, `client/src/components/TimetableGrid.css`, `client/src/App.jsx`, `client/src/index.css` (coordinate App changes) | Backend models/routes; API response structure |
| Teammate 2 — CRUD forms and client API | `client/src/components/CourseManager.jsx`, `client/src/components/TimetableManager.jsx`, `client/src/components/SessionForm.jsx`, `client/src/components/ConflictPanel.jsx`, `client/src/services/api.js` | Backend model and route implementation; grid component internals |
| Teammate 3 — Backend and MongoDB | `server/src/config/`, `server/src/models/`, `server/src/routes/courses.js`, `server/src/routes/timetables.js`, `server/src/app.js`, server setup scripts, `.env.example` | `server/src/services/clashDetection.js`, `server/src/routes/sessions.js` unless coordinated |
| Teammate 4 — Clash detection and tests | `server/src/services/clashDetection.js`, `server/src/routes/sessions.js`, `server/test/` | Course/timetable models and CRUD routes; frontend components; shared API contract without agreement |

Some files such as `App.jsx`, `server/src/app.js`, `package.json`, and API contracts can affect everyone. Make minimal changes, announce them, and avoid concurrent edits. Teammate 3 should create the route-mounting seam for the sessions router; Teammate 4 should export a router using the documented contract.

## 4. Commits and branches — required
- Every human teammate must work on their own branch. Suggested branches:
  - `feat/timetable-grid`
  - `feat/crud-forms-api-client`
  - `feat/express-mongodb-crud`
  - `feat/clash-detection-tests`
- Make small, meaningful commits after each working milestone; aim for 2–4 or more useful commits per person over the project, not artificial commit counts.
- Suggested commit format: `feat(ui): add weekly timetable grid`, `feat(api): add course CRUD`, `feat(clash): reject overlapping room bookings`, `test(clash): cover adjacent time ranges`.
- Commit completed work before switching tasks or asking for review.
- Do not commit `.env`, credentials, `node_modules`, generated builds, or unrelated formatting churn.
- Never create empty commits, rewrite another teammate's commits, or falsely attribute commits to another person. AI agents must not claim that a teammate committed unless Git history confirms it.
- Push branches and open pull requests. Merge through review into the shared branch; do not all edit the same working tree concurrently.
- If credentials or network permissions prevent a push, make the local commits and clearly report that the branch was not pushed.

## 5. Code quality
- Keep components, controllers, models, and pure rules separate.
- Prefer small functions with one responsibility.
- Validate all incoming data on the server; frontend validation is only for usability.
- Use `async/await` and pass errors to a consistent Express error handler.
- Return JSON errors using `API_CONTRACT.md`. Do not return stack traces to the client.
- Use stable IDs as React keys. Avoid array indices as keys for sessions/courses.
- Provide accessible labels, visible focus styles, and useful empty/loading/error states.
- Keep the interface responsive and readable; avoid unnecessary animations or decorative complexity.
- Do not add a new dependency without a clear need and team agreement.

## 6. Clash detector requirements
- Use minute-of-day conversion from strict `HH:mm` values.
- Overlap formula: `startA < endB && startB < endA`.
- Adjacent intervals must not be classified as clashes.
- Compare sessions only on the same day.
- Section match: same `academicYear`, `semester`, and `section`.
- Faculty match: case-insensitive, trimmed, non-empty `facultyName`.
- Room match: case-insensitive, trimmed, non-empty `room`.
- Ignore the session being edited when checking an update.
- Return all matching conflict types and enough details for the UI to identify the conflicting session.
- Keep core rules testable without a running MongoDB connection.

## 7. Definition of done
A task is done only when the implementation is running, manually checked, and/or tested; errors are handled; related docs are updated; and the change is committed on the owner's branch. Do not mark a feature done merely because code was generated.

Before opening a PR, run the relevant tests and lint/build scripts that exist. In the PR description include: what changed, how to test, screenshots for visual changes, any known limitation, and the commits included.
