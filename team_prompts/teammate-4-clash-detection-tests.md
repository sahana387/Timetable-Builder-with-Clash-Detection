# Teammate 4 — Clash Detection, Session Routes, Tests

You own clash rules, session CRUD route integration, and automated tests. Read `PRD.md`, `AGENTS.md`, and `API_CONTRACT.md`. Work on branch `feat/clash-detection-tests`. Coordinate model names and router mounting with Teammate 3 first.

Implement `server/src/services/clashDetection.js` with testable overlap and clash rules. Implement `server/src/routes/sessions.js` for session list/create/get/update/delete and wire it to the existing server. Check same-day sessions for section, faculty, and room clashes. Return HTTP `409` and the documented JSON `conflicts` array when a create/update conflicts. Exclude the session being edited. Add an endpoint for checking existing timetable clashes and tests for overlap, adjacency, different days, section/faculty/room conflicts, multiple conflict types, invalid ranges, and self-exclusion during updates. Keep JSON fields consistent with the API contract.

Rules: strict `HH:mm`; `startTime < endTime`; overlap iff `startA < endB && startB < endA`; same day only; same cohort means same `academicYear`, `semester`, `section`; normalize faculty and room with trim + case-insensitive comparison and ignore blank values.

Make focused commits for pure rules, session routes, and tests. Run the tests and report whether live MongoDB integration was truly tested. Never claim unrun tests passed.
