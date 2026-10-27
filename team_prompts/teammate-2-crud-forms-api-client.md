# Teammate 2 — CRUD Forms and Frontend API Integration

You own the React forms, data-fetching client, and UI states for course/timetable/session CRUD. Read `PRD.md`, `AGENTS.md`, and `API_CONTRACT.md`. Work on branch `feat/crud-forms-api-client`.

Implement `client/src/services/api.js` as a shared JSON `fetch` wrapper with base URL configuration and consistent error handling. Build `CourseManager.jsx`, `TimetableManager.jsx`, `SessionForm.jsx`, and `ConflictPanel.jsx` with add/list/edit/delete flows using the API contract. Coordinate grid props with Teammate 1. Add loading, success, empty, validation, and server-error states; preserve form values after a `409` clash response and refresh data after mutations. The final app must use the API, not mock data.

Do not edit backend models/routes or change API fields without updating `API_CONTRACT.md` with team agreement. The backend is authoritative for clash decisions.

Make frequent meaningful commits (e.g. shared API client; course/timetable CRUD; session form/conflict feedback). Verify the forms work against the running server before opening a PR.
