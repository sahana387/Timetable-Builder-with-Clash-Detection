# Product Requirements Document (PRD)

## 1. Project
**Timetable Builder with Clash Detection**

A web application that lets a college user create and manage weekly timetables, maintain a course catalogue, add/edit/delete class sessions, and detect scheduling conflicts before a session is saved.

Repository: https://github.com/sahana387/Timetable-Builder-with-Clash-Detection

> Repository note: the GitHub page appeared empty when this plan was prepared. Treat this as a clean implementation, but inspect the working tree before creating files in case code has since been added.

## 2. Problem statement
Manually preparing a timetable is error-prone. Two classes may overlap for the same cohort, instructor, or room. Keeping course/session details in scattered documents also makes updates difficult. This project centralizes timetable data and checks conflicts consistently.

## 3. Goals
- Build a working React frontend using HTML, CSS, and JavaScript.
- Build a Node.js + Express backend.
- Persist data in MongoDB through Mongoose.
- Demonstrate full CRUD (Create, Read, Update, Delete) using JSON request/response bodies.
- Detect overlapping sessions and explain the type of conflict before saving.
- Let four teammates work independently, commit frequently, and integrate through agreed file/API boundaries.
- Keep the implementation understandable for a student team learning full-stack development.

## 4. Users and core user journey
**Primary user:** a student, class representative, or department user preparing a weekly schedule.

Typical journey:
1. Create a timetable with a name, academic year, semester, and section.
2. Add courses with course code, title, and faculty/instructor.
3. Add sessions by choosing a course, day, start/end time, and room.
4. See the weekly timetable grid update.
5. If a session overlaps another session for the same cohort, instructor, or room, see a clear conflict message and the conflicting session details; do not save the conflicting session by default.
6. Edit or delete courses, timetables, and sessions, subject to the data-integrity rules below.

## 5. Functional requirements

### FR-1: Timetable management
- Create, list, view, update, and delete timetables.
- Required metadata: `name`, `academicYear`, `semester`, and `section`.
- A timetable contains weekly sessions.
- Deleting a timetable deletes its sessions, too, or returns a clear documented error; choose one behavior and test it. Preferred: delete its sessions before deleting the timetable.

### FR-2: Course catalogue
- Create, list, view, update, and delete courses.
- Course fields: `courseCode`, `title`, `facultyName`, and optional `credits`.
- `courseCode` must be unique (case-insensitive after normalization).
- Do not delete a course that is still referenced by sessions. Return HTTP `409 Conflict` with a helpful JSON error.

### FR-3: Session management
- Create, list by timetable, view, update, and delete sessions.
- Session fields: `timetableId`, `courseId`, `dayOfWeek`, `startTime`, `endTime`, and `room`.
- Days supported in the initial version: Monday through Saturday. Sunday is out of scope unless the team adds it consistently throughout the UI, API, validation, and tests.
- Times use 24-hour `HH:mm` strings, e.g. `09:00` and `10:30`.
- `startTime` must be earlier than `endTime`.
- A session references a course and a timetable by MongoDB ObjectId.

### FR-4: Clash detection
Check candidate sessions against existing sessions on the same day. Two sessions overlap when:

`startA < endB && startB < endA`

Touching endpoints are allowed: 09:00–10:00 and 10:00–11:00 do not overlap.

Return these conflict types:
- **SECTION_CLASH:** both sessions belong to the same cohort, defined by matching `academicYear`, `semester`, and `section`.
- **FACULTY_CLASH:** both courses have the same non-empty `facultyName`, compared case-insensitively after trimming.
- **ROOM_CLASH:** both sessions use the same non-empty `room`, compared case-insensitively after trimming.

Rules:
- Exclude the current session when checking an update against itself.
- One pair of sessions may produce more than one conflict type; do not silently hide a room/faculty clash just because a section clash is also present.
- Reject a create/update that has conflicts with HTTP `409`, returning a JSON response with a `conflicts` array. The UI should explain the conflict and keep the form values so the user can correct them.
- Provide a read endpoint for checking existing clashes for a timetable, useful for the UI and testing.

### FR-5: Timetable display
- Display sessions in a weekly grid with days as columns or clearly separated columns and times as rows.
- Each session card displays at least course code/title, time, room, and faculty.
- Visually distinguish sessions and show a useful empty state when a timetable has no sessions.
- Show conflict feedback near the form and/or timetable. Do not rely only on red/green color; include text or an icon with a label.

### FR-6: User feedback
- Provide loading, success, empty, and error states.
- Confirm before destructive deletes.
- Show server validation messages rather than generic “Something went wrong” messages whenever possible.
- Validate required fields in the UI and repeat validation on the backend; backend validation is authoritative.

## 6. Suggested JSON API contract
Full contract and sample payloads are in `API_CONTRACT.md`. Use that file as the integration source of truth.

Base path: `/api`

- `GET /health`
- `GET /courses`, `POST /courses`
- `GET /courses/:id`, `PATCH /courses/:id`, `DELETE /courses/:id`
- `GET /timetables`, `POST /timetables`
- `GET /timetables/:id`, `PATCH /timetables/:id`, `DELETE /timetables/:id`
- `GET /timetables/:id/sessions`, `POST /timetables/:id/sessions`
- `GET /sessions/:id`, `PATCH /sessions/:id`, `DELETE /sessions/:id`
- `GET /timetables/:id/clashes`

All request and response bodies are JSON. Use consistent response keys and status codes.

## 7. Technology and architecture
- Frontend: HTML, CSS, JavaScript, React, Vite.
- Backend: Node.js, Express.
- Database: MongoDB, accessed through Mongoose.
- API: REST endpoints using JSON.
- Tests: Node's built-in test runner for pure clash rules; add API tests if time permits.
- Use plain CSS first. Avoid introducing a UI component framework unless the team agrees.
- Use environment variables for configuration; commit `.env.example`, never `.env`.

Suggested structure:

```text
/
├── PRD.md
├── AGENTS.md
├── API_CONTRACT.md
├── ANTIGRAVITY_MASTER_PROMPT.md
├── TEAM_PROMPTS.md
├── team_prompts/
├── client/                 # React + Vite
│   └── src/
│       ├── components/
│       ├── services/api.js
│       ├── App.jsx
│       └── main.jsx
├── server/
│   └── src/
│       ├── config/
│       ├── models/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       └── app.js
├── .env.example
└── README.md
```

The implementation may adjust this structure if there is a clear reason, but preserve the agreed file ownership in `AGENTS.md`.

## 8. Non-functional requirements
- Keep code readable and split into small components/modules.
- Use meaningful names, consistent formatting, and comments for non-obvious clash rules.
- Avoid duplicating clash logic in multiple places. The backend service is authoritative; a lightweight frontend preview is optional.
- Never trust user input simply because it came from the React form.
- Never expose MongoDB credentials or commit real environment files.
- Do not add authentication, timetable optimization, room capacity planning, notifications, PDF import/export, or deployment pipelines to the initial MVP unless all core requirements are complete.
- The app should run locally with documented setup steps.

## 9. Acceptance criteria
The project is ready for demonstration when:
1. The client and server run locally using documented commands.
2. MongoDB connection uses an environment variable.
3. Course, timetable, and session CRUD work against MongoDB; data persists after server restart.
4. React performs real API requests and displays server data; hard-coded mock data is not the final data source.
5. Invalid time ranges and missing required fields are rejected.
6. Overlapping sessions trigger clear `409` JSON responses for section, instructor, and/or room clashes.
7. An update does not conflict with itself.
8. Adjacent sessions are accepted.
9. The UI supports create/edit/delete and shows empty/loading/error states.
10. At least the core clash rules have automated tests.
11. All four teammates have their own focused branch and meaningful commits, with no commits falsely attributed to someone else.
12. README documents install, environment setup, running, testing, API basics, and the four team workstreams.

## 10. MVP out of scope
Authentication, multiple user roles, automatic timetable optimization, drag-and-drop rescheduling, attendance tracking, classroom capacity checks, notifications, and production hosting. Do not let these distract from CRUD and correct clash detection.
