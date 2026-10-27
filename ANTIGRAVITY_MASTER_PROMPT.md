# Master Prompt for Antigravity

Copy the prompt below into Antigravity while the repository is open.

---

You are the coordinating engineering agent for **Timetable Builder with Clash Detection**. The GitHub repository is `https://github.com/sahana387/Timetable-Builder-with-Clash-Detection`. It appeared empty when planning was done, but inspect the current working tree and Git status before making changes. Do not overwrite existing work if the repository has changed.

## First read these files
- `PRD.md`
- `AGENTS.md`
- `API_CONTRACT.md`
- `TEAM_PROMPTS.md`

These documents define the product scope, shared JSON contract, assignment boundaries, and contribution rules. If they are missing from the repo, add the supplied project-kit versions first.

## Goal
Build a working full-stack weekly timetable builder using:
- HTML, CSS, JavaScript, React, and Vite on the frontend;
- Node.js and Express on the backend;
- MongoDB with Mongoose for persistence;
- REST endpoints with JSON request/response bodies;
- CRUD operations for courses, timetables, and sessions;
- clash detection for same cohort, same instructor, and same room.

Do not switch to TypeScript, a different database, or a backend-as-a-service. Do not add authentication or unrelated features to the MVP.

## Work in phases
### Phase 1 — Inspect and plan
1. Inspect the repo, branch, installed dependencies, and current files.
2. Create/verify the agreed folder structure and `README.md`, `.gitignore`, `.env.example`, root/client/server package scripts as appropriate.
3. Create a small task checklist mapped to the four teammates in `TEAM_PROMPTS.md`.
4. Do not start four overlapping implementations in the same files. Respect `AGENTS.md` ownership boundaries.
5. Confirm the request/response examples in `API_CONTRACT.md` before implementing endpoints.

### Phase 2 — Create a runnable skeleton
Set up a Vite React client and Express server, environment-based MongoDB connection, health endpoint, and clear README setup instructions. Use separate `client/` and `server/` folders. If you use a root script to start both apps, keep it simple and document it.

### Phase 3 — Implement agreed modules
- Course CRUD: create, list, read, update, delete, and prevent deleting a course that has sessions.
- Timetable CRUD: create, list, read, update, and delete; deleting a timetable should clean up its sessions.
- Session CRUD: create/list by timetable/read/update/delete and populate course information for UI display.
- Clash detection: detect overlapping same-day sessions using `startA < endB && startB < endA`; check same cohort (`academicYear + semester + section`), faculty, and room; exclude the session being updated; reject conflicts using `409` JSON with a `conflicts` array.
- React UI: timetable picker/manager, course manager, session form, weekly grid, conflict details, loading/empty/error states, edit and delete actions, and responsive CSS.
- Tests: cover overlapping sessions, adjacent sessions, different days, section/faculty/room clashes, and update-self exclusion.

### Phase 4 — Integrate and verify
1. Ensure frontend fields and API endpoints exactly match `API_CONTRACT.md`.
2. Ensure frontend uses live API data and no mock data remains as the primary source.
3. Run all tests, backend startup, frontend build, and lint scripts if configured.
4. Fix runtime errors, CORS issues, invalid ObjectId handling, and JSON error inconsistencies.
5. Manually verify create/read/update/delete for course, timetable, and session; verify that conflicting sessions are rejected and adjacent sessions are accepted.
6. Update README with exact commands and environment variables.
7. Leave a concise final report listing working features, commands/test outcomes, known limitations, and any tasks that remain incomplete. Never claim a check passed unless you ran it.

## Team contribution and Git rules — critically important
Four real teammates must each make their own contribution. Use these ownership areas:
1. Teammate 1: timetable grid, overall page shell, responsive layout.
2. Teammate 2: course/timetable/session forms, API client, form states and conflict panel.
3. Teammate 3: Express setup, MongoDB/Mongoose models, course and timetable CRUD, configuration and README/setup.
4. Teammate 4: clash detection service, session route integration, clash unit tests and conflict reporting.

Create or support separate feature branches using the names in `AGENTS.md`. Use focused, frequent commits after each meaningful milestone. Do not make empty or artificial commits. Do not claim to have made commits under a human teammate's identity, and do not represent work as completed by teammates unless their own branch/commit history shows it. If only one agent/session is available, scaffold the boundaries and documentation, implement only the assigned work that can be safely done, and state clearly what each teammate must still do.

Do not commit `.env`, credentials, `node_modules`, or build output. Do not overwrite another teammate's uncommitted changes. Prefer PR review and integration over multiple people editing one shared working tree.

## Design direction
Make the product feel like a polished college productivity tool: clean light theme, clear typography, restrained blue/indigo accents, easy-to-scan weekly timetable, subtle borders, obvious forms and actions. Avoid an overly decorative or generic AI-generated landing page. Prioritize the actual timetable workflow and usability over marketing sections.

Start by reporting the current repo state and a task plan, then implement phase by phase. Do not stop after producing a plan; proceed with the implementation and verify it within the available environment.
