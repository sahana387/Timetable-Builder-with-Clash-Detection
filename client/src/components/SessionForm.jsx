import React, { useState, useEffect } from 'react';
import {
  createSession,
  updateSession,
  ApiError
} from '../services/api';
import './SessionForm.css';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

const TIME_PRESETS = [
  { label: '09:00–10:00', start: '09:00', end: '10:00' },
  { label: '10:00–11:00', start: '10:00', end: '11:00' },
  { label: '11:15–12:15', start: '11:15', end: '12:15' },
  { label: '12:15–13:15', start: '12:15', end: '13:15' },
  { label: '14:00–15:00', start: '14:00', end: '15:00' },
  { label: '15:00–16:00', start: '15:00', end: '16:00' }
];

const INITIAL_FORM = {
  courseId: '',
  dayOfWeek: 'Monday',
  startTime: '09:00',
  endTime: '10:00',
  room: ''
};

export default function SessionForm({
  selectedTimetable,
  courses = [],
  editingSession = null,
  onSessionSaved,
  onCancelEdit,
  onConflict
}) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // When editingSession changes, populate form values
  useEffect(() => {
    if (editingSession) {
      const cId =
        typeof editingSession.courseId === 'object' && editingSession.courseId !== null
          ? editingSession.courseId._id
          : editingSession.courseId || editingSession.course?._id || '';

      setFormData({
        courseId: cId,
        dayOfWeek: editingSession.dayOfWeek || 'Monday',
        startTime: editingSession.startTime || '09:00',
        endTime: editingSession.endTime || '10:00',
        room: editingSession.room || ''
      });
      setValidationErrors({});
      setServerError(null);
      setSuccessMessage(null);
    } else {
      // If we switched out of edit mode, reset form
      setFormData((prev) => ({
        ...INITIAL_FORM,
        courseId: courses.length > 0 && !prev.courseId ? courses[0]._id : prev.courseId
      }));
    }
  }, [editingSession, courses]);

  // If no courseId is selected but courses are available, default to first course
  useEffect(() => {
    if (!formData.courseId && courses.length > 0) {
      setFormData((prev) => ({ ...prev, courseId: courses[0]._id }));
    }
  }, [courses, formData.courseId]);

  const validateForm = () => {
    const errors = {};
    if (!formData.courseId) {
      errors.courseId = 'Please select a course';
    }
    if (!formData.dayOfWeek || !DAYS_OF_WEEK.includes(formData.dayOfWeek)) {
      errors.dayOfWeek = 'Please select a valid day (Monday – Saturday)';
    }

    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!formData.startTime || !timeRegex.test(formData.startTime)) {
      errors.startTime = 'Start time must be strict HH:mm (e.g. 09:00)';
    }
    if (!formData.endTime || !timeRegex.test(formData.endTime)) {
      errors.endTime = 'End time must be strict HH:mm (e.g. 10:00)';
    }

    if (
      formData.startTime &&
      formData.endTime &&
      timeRegex.test(formData.startTime) &&
      timeRegex.test(formData.endTime)
    ) {
      if (formData.startTime >= formData.endTime) {
        errors.endTime = 'End time must be later than start time';
      }
    }

    if (!formData.room.trim()) {
      errors.room = 'Room is required (e.g. C-301)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const applyTimePreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      startTime: preset.start,
      endTime: preset.end
    }));
    setValidationErrors((prev) => ({ ...prev, startTime: null, endTime: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTimetable) {
      setServerError('Please select a timetable workspace first.');
      return;
    }

    if (!validateForm()) return;

    setSubmitting(true);
    setServerError(null);
    setSuccessMessage(null);
    if (typeof onConflict === 'function') {
      onConflict(null);
    }

    const payload = {
      courseId: formData.courseId,
      dayOfWeek: formData.dayOfWeek,
      startTime: formData.startTime,
      endTime: formData.endTime,
      room: formData.room.trim()
    };

    try {
      let savedSession;
      if (editingSession) {
        savedSession = await updateSession(editingSession._id, payload);
        setSuccessMessage('Session updated successfully!');
      } else {
        savedSession = await createSession(selectedTimetable._id, payload);
        setSuccessMessage('Session scheduled successfully!');
      }

      // Notify parent to refresh grid
      if (typeof onSessionSaved === 'function') {
        onSessionSaved(savedSession);
      }

      // Reset form on success
      if (editingSession) {
        if (typeof onCancelEdit === 'function') {
          onCancelEdit();
        }
      } else {
        setFormData({
          ...INITIAL_FORM,
          courseId: courses.length > 0 ? courses[0]._id : '',
          room: payload.room // keep room as convenience for repeated scheduling
        });
      }
    } catch (err) {
      // CRITICAL UX REQUIREMENT:
      // "Keep form values after a rejected clash so users can correct them."
      // We do NOT clear formData here!

      if (err instanceof ApiError) {
        if (err.isClash) {
          setServerError(`Schedule Conflict: ${err.message}`);
          if (typeof onConflict === 'function') {
            onConflict(err.conflicts);
          }
        } else if (err.status === 400 && err.details && err.details.length > 0) {
          const fieldMap = {};
          err.details.forEach((d) => {
            if (d.field) fieldMap[d.field] = d.message;
          });
          setValidationErrors(fieldMap);
          setServerError(err.message || 'Validation failed. Please correct the fields below.');
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError(err.message || 'An unexpected error occurred while saving the session.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!selectedTimetable) {
    return (
      <div className="session-form-container">
        <div className="no-selection-alert">
          <p><strong>No Timetable Selected</strong></p>
          <p>Please create or select an active timetable above to schedule sessions.</p>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="session-form-container">
        <div className="no-selection-alert">
          <p><strong>Course Catalogue Empty</strong></p>
          <p>Add at least one course in the Course Catalogue above before scheduling a session.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="session-form-container" aria-labelledby="session-form-title">
      <div className="session-form-header">
        <h2 id="session-form-title">
          {editingSession ? 'Edit Class Session' : 'Schedule Class Session'}
          {editingSession && <span className="editing-badge">Editing Mode</span>}
        </h2>
        <span style={{ fontSize: '0.85rem', color: '#4a5568' }}>
          Cohort: <strong>Sem {selectedTimetable.semester} - Sec {selectedTimetable.section}</strong>
        </span>
      </div>

      {serverError && (
        <div className="feedback-banner error" role="alert">
          <span>{serverError}</span>
          <button
            type="button"
            className="close-btn"
            onClick={() => setServerError(null)}
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      {successMessage && (
        <div className="feedback-banner success" role="status">
          <span>{successMessage}</span>
          <button
            type="button"
            className="close-btn"
            onClick={() => setSuccessMessage(null)}
            aria-label="Dismiss message"
          >
            &times;
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid-5">
          {/* Course Select */}
          <div className="form-group">
            <label htmlFor="session-courseId">
              Course <span className="required">*</span>
            </label>
            <select
              id="session-courseId"
              name="courseId"
              value={formData.courseId}
              onChange={handleInputChange}
              className={validationErrors.courseId ? 'has-error' : ''}
              disabled={submitting}
              required
            >
              <option value="">-- Choose Course --</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.courseCode} &ndash; {c.title} ({c.facultyName})
                </option>
              ))}
            </select>
            {validationErrors.courseId && (
              <span className="field-error">{validationErrors.courseId}</span>
            )}
          </div>

          {/* Day of Week */}
          <div className="form-group">
            <label htmlFor="session-dayOfWeek">
              Day of Week <span className="required">*</span>
            </label>
            <select
              id="session-dayOfWeek"
              name="dayOfWeek"
              value={formData.dayOfWeek}
              onChange={handleInputChange}
              className={validationErrors.dayOfWeek ? 'has-error' : ''}
              disabled={submitting}
              required
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {validationErrors.dayOfWeek && (
              <span className="field-error">{validationErrors.dayOfWeek}</span>
            )}
          </div>

          {/* Start Time */}
          <div className="form-group">
            <label htmlFor="session-startTime">
              Start Time (HH:mm) <span className="required">*</span>
            </label>
            <input
              id="session-startTime"
              name="startTime"
              type="time"
              value={formData.startTime}
              onChange={handleInputChange}
              className={validationErrors.startTime ? 'has-error' : ''}
              disabled={submitting}
              required
            />
            {validationErrors.startTime && (
              <span className="field-error">{validationErrors.startTime}</span>
            )}
          </div>

          {/* End Time */}
          <div className="form-group">
            <label htmlFor="session-endTime">
              End Time (HH:mm) <span className="required">*</span>
            </label>
            <input
              id="session-endTime"
              name="endTime"
              type="time"
              value={formData.endTime}
              onChange={handleInputChange}
              className={validationErrors.endTime ? 'has-error' : ''}
              disabled={submitting}
              required
            />
            {validationErrors.endTime && (
              <span className="field-error">{validationErrors.endTime}</span>
            )}
          </div>

          {/* Room */}
          <div className="form-group">
            <label htmlFor="session-room">
              Room / Lab <span className="required">*</span>
            </label>
            <input
              id="session-room"
              name="room"
              type="text"
              placeholder="e.g. C-301"
              value={formData.room}
              onChange={handleInputChange}
              className={validationErrors.room ? 'has-error' : ''}
              disabled={submitting}
              required
            />
            {validationErrors.room && (
              <span className="field-error">{validationErrors.room}</span>
            )}
          </div>
        </div>

        {/* Quick Time Presets */}
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#718096', marginRight: '0.5rem' }}>
            Quick Times:
          </span>
          <div className="time-presets" style={{ display: 'inline-flex' }}>
            {TIME_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="time-preset-btn"
                onClick={() => applyTimePreset(p)}
                disabled={submitting}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          {editingSession && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancelEdit}
              disabled={submitting}
            >
              Cancel Edit
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner" aria-hidden="true" />
                <span>{editingSession ? 'Updating Session...' : 'Scheduling Session...'}</span>
              </>
            ) : editingSession ? (
              'Save Session Changes'
            ) : (
              'Add Session to Schedule'
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
