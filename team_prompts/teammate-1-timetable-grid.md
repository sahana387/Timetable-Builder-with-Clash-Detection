# Teammate 1 — Timetable Grid and Main UI

You own the timetable visualization and main layout for the Timetable Builder with Clash Detection. Read `PRD.md`, `AGENTS.md`, and `API_CONTRACT.md`. Work on branch `feat/timetable-grid`.

Implement `client/src/components/TimetableGrid.jsx` and `TimetableGrid.css`. Build a clean React page shell in coordination with Teammate 2. Display sessions in a clear weekly grid with day/time labels and show course code/title, time, room, and faculty. Handle empty schedules, long labels, mobile responsiveness, accessibility, and stable React keys. Use data passed through props; hard-coded sample sessions must not be the final data source. Coordinate `App.jsx` changes with Teammate 2.

Do not edit backend files, invent JSON fields, or duplicate authoritative clash logic. Display conflict state provided by parent/backend.

Make frequent meaningful commits (suggested milestones): `feat(ui): add timetable page shell`, `feat(ui): render weekly timetable grid`, `style(ui): make timetable responsive and accessible`. Test desktop/mobile layouts, then open a PR with screenshots and notes.
