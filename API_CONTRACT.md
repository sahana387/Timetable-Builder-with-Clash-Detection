# API Contract — Timetable Builder

This document is the shared frontend/backend contract. If a change is needed, discuss it with all four teammates and update this file before implementation changes.

## Conventions
- Base URL during local development: `http://localhost:5000/api`
- Content type: `application/json`
- IDs are MongoDB ObjectId strings serialized as JSON strings.
- Use `camelCase` for all JSON keys.
- Successful reads/creates/updates return JSON. A successful delete returns `204 No Content` unless the team consistently chooses a JSON confirmation.
- Error format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "startTime must be earlier than endTime",
    "details": []
  }
}
```

`details` can contain field errors. A clash error must include a top-level `conflicts` array as shown below.

## Data shapes

### Course
```json
{
  "_id": "665f00000000000000000001",
  "courseCode": "CS201",
  "title": "Data Structures",
  "facultyName": "Dr. Rao",
  "credits": 4
}
```

`courseCode`, `title`, and `facultyName` are required. `credits` is optional and must be a non-negative number if supplied. `courseCode` is unique after trimming and case normalization.

### Timetable
```json
{
  "_id": "665f00000000000000000010",
  "name": "Semester 3 — Section E",
  "academicYear": "2026-2027",
  "semester": 3,
  "section": "E"
}
```

All fields are required. `semester` is a positive integer.

### Session create/update body
```json
{
  "courseId": "665f00000000000000000001",
  "dayOfWeek": "Monday",
  "startTime": "09:00",
  "endTime": "10:00",
  "room": "C-301"
}
```

`timetableId` is supplied by the nested URL when creating a session under a timetable. The response should populate the course with `courseCode`, `title`, and `facultyName`, and can include the timetable's `section` metadata. The frontend should not rely on the exact shape of populated Mongoose objects beyond the fields documented here.

## Endpoints

| Method | Endpoint | Purpose | Success |
|---|---|---|---|
| GET | `/health` | Health check | `200` JSON |
| GET | `/courses` | List courses | `200` array |
| POST | `/courses` | Create course | `201` course |
| GET | `/courses/:id` | Read course | `200` course |
| PATCH | `/courses/:id` | Update fields | `200` course |
| DELETE | `/courses/:id` | Delete course if unused | `204`; `409` if referenced |
| GET | `/timetables` | List timetables | `200` array |
| POST | `/timetables` | Create timetable | `201` timetable |
| GET | `/timetables/:id` | Read timetable | `200` timetable |
| PATCH | `/timetables/:id` | Update fields | `200` timetable |
| DELETE | `/timetables/:id` | Delete timetable and its sessions | `204` |
| GET | `/timetables/:id/sessions` | List sessions for timetable | `200` array |
| POST | `/timetables/:id/sessions` | Create a session with clash checks | `201` session; `409` for clashes |
| GET | `/sessions/:id` | Read one session | `200` session |
| PATCH | `/sessions/:id` | Update a session with clash checks | `200` session; `409` for clashes |
| DELETE | `/sessions/:id` | Delete session | `204` |
| GET | `/timetables/:id/clashes` | Detect clashes in stored timetable data | `200` `{ "conflicts": [] }` |

For list operations, returning an array directly is acceptable. Keep it consistent across frontend and backend.

## Clash response example
HTTP `409 Conflict`:
```json
{
  "error": {
    "code": "SCHEDULE_CLASH",
    "message": "This session overlaps with an existing session.",
    "details": []
  },
  "conflicts": [
    {
      "type": "ROOM_CLASH",
      "message": "Room C-301 is already booked during this time.",
      "conflictingSessionId": "665f00000000000000000022",
      "courseCode": "CS202",
      "courseTitle": "Database Systems",
      "dayOfWeek": "Monday",
      "startTime": "09:30",
      "endTime": "10:30",
      "room": "C-301"
    }
  ]
}
```

`type` must be one of `SECTION_CLASH`, `FACULTY_CLASH`, or `ROOM_CLASH`. Multiple types may be returned for the same overlapping pair.

## Status codes
- `400`: malformed ID, invalid body, missing required fields, invalid time/day.
- `404`: course, timetable, or session does not exist.
- `409`: duplicate course code, course still in use, or schedule conflict.
- `500`: unexpected server error; do not return stack traces or secrets.

## Validation rules
- `dayOfWeek`: `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, or `Saturday`.
- Times are strict 24-hour `HH:mm`; e.g. `09:05`, `17:45`. Reject `9:5`, `25:00`, and invalid times.
- `startTime` must be earlier than `endTime`.
- Normalize room, course code, and faculty comparisons with trim + case-insensitive comparison.
- A session update must exclude its own `_id` from conflict comparisons.
