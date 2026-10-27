import React from 'react';
import './TimetableGrid.css';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

// Grid displays hours from 08:00 to 18:00
const TIME_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00'
];

/**
 * Converts HH:mm to minutes from midnight
 */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * TimetableGrid Component
 * Renders weekly schedule across Monday-Saturday with hourly time rows.
 */
function TimetableGrid({
  timetable,
  selectedTimetable,
  sessions = [],
  conflicts = [],
  courses = [],
  isLoading = false,
  loading = false,
  onEditSession,
  onDeleteSession
}) {
  const activeTimetable = timetable || selectedTimetable;
  const isGridLoading = isLoading || loading;

  if (isGridLoading) {
    return (
      <div className="grid-loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true"></div>
        <p>Loading weekly schedule...</p>
      </div>
    );
  }

  if (!activeTimetable) {
    return (
      <div className="grid-empty-state">
        <div className="empty-icon" aria-hidden="true">📋</div>
        <h3>No Timetable Selected</h3>
        <p>Please select an existing timetable or create a new one to view its schedule.</p>
      </div>
    );
  }

  // Create a fast lookup Set for conflicting session IDs
  const conflictingSessionIds = new Set();
  const conflictTypeMap = new Map();

  const conflictList = Array.isArray(conflicts) ? conflicts : [];
  conflictList.forEach((c) => {
    if (c.conflictingSessionId) {
      conflictingSessionIds.add(String(c.conflictingSessionId));
      conflictTypeMap.set(String(c.conflictingSessionId), c.type);
    }
  });

  // Course lookup map for fast resolution if courses prop passed
  const courseMap = new Map();
  if (Array.isArray(courses)) {
    courses.forEach((c) => {
      if (c && c._id) courseMap.set(String(c._id), c);
    });
  }

  // Group sessions by day of week
  const sessionsByDay = {};
  DAYS_OF_WEEK.forEach((day) => {
    sessionsByDay[day] = [];
  });

  sessions.forEach((session) => {
    if (sessionsByDay[session.dayOfWeek]) {
      sessionsByDay[session.dayOfWeek].push(session);
    }
  });

  // Sort sessions within each day by start time
  DAYS_OF_WEEK.forEach((day) => {
    sessionsByDay[day].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  });

  const totalSessionsCount = sessions.length;

  return (
    <div className="timetable-grid-wrapper">
      {/* Grid Subheader / Stats */}
      <div className="grid-toolbar">
        <div className="grid-toolbar-info">
          <span className="info-label">Week View:</span>
          <strong>{activeTimetable.name}</strong>
          <span className="session-count-badge">
            {totalSessionsCount} {totalSessionsCount === 1 ? 'class session' : 'class sessions'}
          </span>
        </div>
        {conflictList.length > 0 && (
          <div className="grid-conflict-alert" role="alert">
            <span className="alert-icon" aria-hidden="true">⚠️</span>
            <span>{conflictList.length} schedule conflict{conflictList.length === 1 ? '' : 's'} detected</span>
          </div>
        )}
      </div>

      {totalSessionsCount === 0 ? (
        <div className="grid-empty-state">
          <div className="empty-icon" aria-hidden="true">📅</div>
          <h3>Schedule is Empty</h3>
          <p>There are no sessions scheduled for this timetable yet.</p>
          <p className="empty-subtext">Use the session form to schedule classes throughout the week.</p>
        </div>
      ) : (
        <div className="table-responsive-container">
          <table className="timetable-table" aria-label={`Weekly Schedule for ${activeTimetable.name}`}>
            <thead>
              <tr>
                <th scope="col" className="time-col-header">Time</th>
                {DAYS_OF_WEEK.map((day) => (
                  <th scope="col" key={day} className="day-col-header">
                    <span className="day-name">{day}</span>
                    <span className="day-count">
                      {sessionsByDay[day].length} class{sessionsByDay[day].length === 1 ? '' : 'es'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slotTime) => {
                const slotMinutes = timeToMinutes(slotTime);
                const nextSlotMinutes = slotMinutes + 60;

                return (
                  <tr key={slotTime} className="time-row">
                    <th scope="row" className="time-cell">
                      <span className="time-slot-label">{slotTime}</span>
                    </th>
                    {DAYS_OF_WEEK.map((day) => {
                      // Find sessions that start in this 1-hour slot
                      const slotSessions = sessionsByDay[day].filter((s) => {
                        const startMin = timeToMinutes(s.startTime);
                        return startMin >= slotMinutes && startMin < nextSlotMinutes;
                      });

                      return (
                        <td key={`${day}-${slotTime}`} className="schedule-cell">
                          {slotSessions.map((session) => {
                            const sessionId = session._id || session.id;
                            const isConflicting = conflictingSessionIds.has(String(sessionId));
                            const conflictType = conflictTypeMap.get(String(sessionId));

                            const courseObj =
                              session.course ||
                              (typeof session.courseId === 'object' && session.courseId !== null
                                ? session.courseId
                                : courseMap.get(String(session.courseId))) ||
                              {};

                            const courseCode = courseObj.courseCode || session.courseCode || 'N/A';
                            const courseTitle = courseObj.title || session.courseTitle || 'Untitled Course';
                            const facultyName = courseObj.facultyName || session.facultyName || '';
                            const roomName = session.room || '';

                            return (
                              <article
                                key={sessionId}
                                className={`session-card ${isConflicting ? 'has-conflict' : ''}`}
                                aria-label={`Class ${courseCode}: ${courseTitle} from ${session.startTime} to ${session.endTime}`}
                              >
                                {isConflicting && (
                                  <div className="card-conflict-badge" title="Schedule Conflict">
                                    <span aria-hidden="true">⚠️</span> {conflictType || 'CLASH'}
                                  </div>
                                )}
                                <div className="card-header">
                                  <span className="course-code-badge">{courseCode}</span>
                                  <span className="session-time-text">
                                    {session.startTime} - {session.endTime}
                                  </span>
                                </div>
                                <h4 className="course-title" title={courseTitle}>
                                  {courseTitle}
                                </h4>
                                <div className="card-footer">
                                  {roomName && (
                                    <span className="detail-item room-item" title={`Room: ${roomName}`}>
                                      <span className="item-icon" aria-hidden="true">🚪</span> {roomName}
                                    </span>
                                  )}
                                  {facultyName && (
                                    <span className="detail-item faculty-item" title={`Faculty: ${facultyName}`}>
                                      <span className="item-icon" aria-hidden="true">👤</span> {facultyName}
                                    </span>
                                  )}
                                </div>
                                <div className="card-actions">
                                  {onEditSession && (
                                    <button
                                      type="button"
                                      className="btn-card-action btn-edit"
                                      onClick={() => onEditSession(session)}
                                      aria-label={`Edit ${courseCode} session`}
                                      title="Edit session"
                                    >
                                      ✏️ Edit
                                    </button>
                                  )}
                                  {onDeleteSession && (
                                    <button
                                      type="button"
                                      className="btn-card-action btn-delete"
                                      onClick={() => {
                                        if (window.confirm(`Delete ${courseCode} (${session.startTime} - ${session.endTime})?`)) {
                                          onDeleteSession(session);
                                        }
                                      }}
                                      aria-label={`Delete ${courseCode} session`}
                                      title="Delete session"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TimetableGrid;
