import React from 'react';
import './ConflictPanel.css';

/**
 * Returns a human-friendly label and description for each clash type
 */
function getConflictMeta(type) {
  switch (type) {
    case 'SECTION_CLASH':
      return {
        label: 'Cohort Conflict',
        className: 'section',
        icon: '👥',
        tip: 'The selected cohort/section already has a class scheduled at this time. Choose another timeslot or day.'
      };
    case 'FACULTY_CLASH':
      return {
        label: 'Faculty Conflict',
        className: 'faculty',
        icon: '👨‍🏫',
        tip: 'The instructor is already booked for another lecture during this time. Choose a different time or instructor.'
      };
    case 'ROOM_CLASH':
      return {
        label: 'Room Conflict',
        className: 'room',
        icon: '🚪',
        tip: 'This room is already reserved by another class. Please select another room or adjust the session hours.'
      };
    default:
      return {
        label: 'Schedule Conflict',
        className: 'room',
        icon: '⚠️',
        tip: 'This session overlaps with another scheduled session. Please adjust the time, day, or location.'
      };
  }
}

export default function ConflictPanel({ conflicts, onDismiss }) {
  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  return (
    <aside
      className="conflict-panel"
      role="alert"
      aria-live="assertive"
      aria-labelledby="conflict-panel-title"
    >
      <div className="conflict-panel-header">
        <h3 id="conflict-panel-title" className="conflict-title">
          <span className="conflict-icon" aria-hidden="true">⚠️</span>
          Schedule Conflict Detected ({conflicts.length} {conflicts.length === 1 ? 'clash' : 'clashes'})
        </h3>
        {onDismiss && (
          <button
            type="button"
            className="close-btn"
            onClick={onDismiss}
            aria-label="Dismiss conflict alert"
            title="Dismiss conflict alert"
          >
            &times;
          </button>
        )}
      </div>

      <p className="conflict-intro">
        The server rejected this session because it overlaps with existing timetable bookings.
        Your entered values have been preserved in the form below so you can adjust them.
      </p>

      <div className="conflict-list">
        {conflicts.map((c, index) => {
          const meta = getConflictMeta(c.type);
          const key = c.conflictingSessionId ? `${c.conflictingSessionId}-${c.type}-${index}` : index;

          return (
            <div key={key} className="conflict-item">
              <div className="conflict-item-header">
                <span className={`conflict-badge ${meta.className}`}>
                  <span aria-hidden="true">{meta.icon}</span>
                  {meta.label}
                </span>
                {c.conflictingSessionId && (
                  <span style={{ fontSize: '0.75rem', color: '#718096' }}>
                    Session Ref: {c.conflictingSessionId.slice(-6)}
                  </span>
                )}
              </div>

              <div className="conflict-message">
                {c.message || 'Overlapping booking detected.'}
              </div>

              {/* Conflicting session details */}
              <div className="conflicting-details">
                {c.courseCode && (
                  <div className="conflicting-details-item">
                    <strong>Course:</strong> {c.courseCode} {c.courseTitle ? `(${c.courseTitle})` : ''}
                  </div>
                )}
                {c.dayOfWeek && (
                  <div className="conflicting-details-item">
                    <strong>Day:</strong> {c.dayOfWeek}
                  </div>
                )}
                {c.startTime && c.endTime && (
                  <div className="conflicting-details-item">
                    <strong>Time:</strong> {c.startTime} &ndash; {c.endTime}
                  </div>
                )}
                {c.room && (
                  <div className="conflicting-details-item">
                    <strong>Room:</strong> {c.room}
                  </div>
                )}
              </div>

              <div className="conflict-resolution-tip">
                <span aria-hidden="true">💡</span>
                <span>{meta.tip}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="conflict-panel-footer">
        <span>Please update the day, time, or room in the session form to resolve.</span>
      </div>
    </aside>
  );
}
