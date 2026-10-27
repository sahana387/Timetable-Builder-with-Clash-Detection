import React from 'react';
import './TimetableGrid.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetableGrid({
  sessions = [],
  courses = [],
  selectedTimetable = null,
  onEditSession,
  onDeleteSession,
  loading = false
}) {
  if (!selectedTimetable) {
    return (
      <section className="timetable-grid-container" aria-label="Timetable Schedule View">
        <div className="empty-state">
          <h3>No Active Timetable Selected</h3>
          <p>Select or create a timetable above to view its weekly schedule.</p>
        </div>
      </section>
    );
  }

  // Build a lookup map of courses by _id for fast course details resolution
  const courseMap = new Map();
  courses.forEach((c) => {
    courseMap.set(c._id, c);
  });

  // Group sessions by day and sort chronologically by startTime
  const sessionsByDay = {};
  DAYS.forEach((d) => {
    sessionsByDay[d] = [];
  });

  sessions.forEach((s) => {
    if (sessionsByDay[s.dayOfWeek]) {
      sessionsByDay[s.dayOfWeek].push(s);
    }
  });

  DAYS.forEach((d) => {
    sessionsByDay[d].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  return (
    <section className="timetable-grid-container" aria-label="Weekly Timetable Grid">
      <div className="timetable-grid-header">
        <h2>
          Weekly Schedule: {selectedTimetable.name}
          <span className="badge-count" title="Total classes scheduled">
            {sessions.length} {sessions.length === 1 ? 'class' : 'classes'}
          </span>
        </h2>
        <div style={{ fontSize: '0.825rem', color: '#4a5568' }}>
          Year: <strong>{selectedTimetable.academicYear}</strong> &bull; Semester: <strong>{selectedTimetable.semester}</strong> &bull; Section: <strong>{selectedTimetable.section}</strong>
        </div>
      </div>

      {loading ? (
        <div className="loading-indicator">
          <span className="spinner" />
          <span>Refreshing schedule...</span>
        </div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <p><strong>This timetable has no sessions scheduled yet.</strong></p>
          <p>Use the session form above to schedule classes for this cohort.</p>
        </div>
      ) : (
        <div className="days-columns-grid">
          {DAYS.map((day) => {
            const daySessions = sessionsByDay[day] || [];
            return (
              <div key={day} className="day-column">
                <div className="day-column-header">
                  {day} ({daySessions.length})
                </div>
                <div className="day-sessions-list">
                  {daySessions.length === 0 ? (
                    <div className="no-sessions-day">No classes</div>
                  ) : (
                    daySessions.map((session) => {
                      // Resolve course data from populated object or courseId lookup
                      const courseObj =
                        session.course ||
                        (typeof session.courseId === 'object' && session.courseId !== null
                          ? session.courseId
                          : courseMap.get(session.courseId)) ||
                        {};

                      const courseCode = courseObj.courseCode || session.courseCode || 'N/A';
                      const title = courseObj.title || session.courseTitle || 'Untitled Course';
                      const faculty = courseObj.facultyName || session.facultyName || 'Instructor';

                      return (
                        <article
                          key={session._id}
                          className="session-card"
                          aria-label={`Session ${courseCode} at ${session.startTime} in ${session.room}`}
                        >
                          <div className="session-card-header">
                            <span className="session-course-code">{courseCode}</span>
                            <span className="session-room-badge">{session.room}</span>
                          </div>

                          <div className="session-course-title" title={title}>
                            {title}
                          </div>

                          <div className="session-meta">
                            <div className="session-time-tag">
                              <span>⏰</span>
                              <span>{session.startTime} &ndash; {session.endTime}</span>
                            </div>
                            <div>
                              <span>👤</span> {faculty}
                            </div>
                          </div>

                          <div className="session-actions">
                            {onEditSession && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => onEditSession(session)}
                                title="Edit this session"
                              >
                                Edit
                              </button>
                            )}
                            {onDeleteSession && (
                              <button
                                type="button"
                                className="btn btn-danger-outline btn-sm"
                                onClick={() => onDeleteSession(session)}
                                title="Delete this session"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
