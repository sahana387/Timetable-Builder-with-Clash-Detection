import React, { useState, useEffect, useCallback } from 'react';
import {
  getTimetables,
  createTimetable,
  updateTimetable,
  deleteTimetable,
  ApiError
} from '../services/api';
import './TimetableManager.css';

const INITIAL_FORM = {
  name: '',
  academicYear: '2026-2027',
  semester: '1',
  section: 'A'
};

export default function TimetableManager({
  selectedTimetableId,
  onSelectTimetable,
  onTimetablesChange
}) {
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch timetables from API
  const fetchTimetables = useCallback(async (preserveSelectionId = null) => {
    setLoading(true);
    setServerError(null);
    try {
      const data = await getTimetables();
      const list = Array.isArray(data) ? data : [];
      setTimetables(list);

      if (typeof onTimetablesChange === 'function') {
        onTimetablesChange(list);
      }

      // Auto-select or preserve selection
      const targetId = preserveSelectionId || selectedTimetableId;
      const matched = list.find((t) => t._id === targetId);
      if (matched) {
        if (typeof onSelectTimetable === 'function') {
          onSelectTimetable(matched);
        }
      } else if (list.length > 0 && !preserveSelectionId) {
        if (typeof onSelectTimetable === 'function') {
          onSelectTimetable(list[0]);
        }
      } else if (list.length === 0) {
        if (typeof onSelectTimetable === 'function') {
          onSelectTimetable(null);
        }
      }
    } catch (err) {
      setServerError(err.message || 'Failed to fetch timetables from server');
    } finally {
      setLoading(false);
    }
  }, [selectedTimetableId, onSelectTimetable, onTimetablesChange]);

  useEffect(() => {
    fetchTimetables();
  }, [fetchTimetables]);

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Timetable name is required (e.g. Semester 3 — Section E)';
    }
    if (!formData.academicYear.trim()) {
      errors.academicYear = 'Academic year is required (e.g. 2026-2027)';
    }
    const semNum = Number(formData.semester);
    if (!formData.semester || isNaN(semNum) || semNum <= 0 || !Number.isInteger(semNum)) {
      errors.semester = 'Semester must be a positive integer (e.g. 1, 2, 3)';
    }
    if (!formData.section.trim()) {
      errors.section = 'Section is required (e.g. A, B, E)';
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
  };

  const startEdit = (timetable) => {
    setEditingId(timetable._id);
    setFormData({
      name: timetable.name || '',
      academicYear: timetable.academicYear || '2026-2027',
      semester: String(timetable.semester || '1'),
      section: timetable.section || ''
    });
    setShowForm(true);
    setValidationErrors({});
    setServerError(null);
    setSuccessMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setShowForm(false);
    setValidationErrors({});
    setServerError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setServerError(null);
    setSuccessMessage(null);

    const payload = {
      name: formData.name.trim(),
      academicYear: formData.academicYear.trim(),
      semester: Number(formData.semester),
      section: formData.section.trim()
    };

    try {
      if (editingId) {
        const updated = await updateTimetable(editingId, payload);
        setSuccessMessage(`Timetable "${updated.name || payload.name}" updated successfully.`);
        setEditingId(null);
        setShowForm(false);
        setFormData(INITIAL_FORM);
        await fetchTimetables(editingId);
      } else {
        const created = await createTimetable(payload);
        setSuccessMessage(`Timetable "${created.name || payload.name}" created successfully.`);
        setShowForm(false);
        setFormData(INITIAL_FORM);
        await fetchTimetables(created._id);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400 && err.details && err.details.length > 0) {
          const fieldMap = {};
          err.details.forEach((d) => {
            if (d.field) fieldMap[d.field] = d.message;
          });
          setValidationErrors(fieldMap);
          setServerError(err.message || 'Validation failed. Please correct form fields.');
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError(err.message || 'Failed to save timetable');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (timetable) => {
    const confirmText =
      `Are you sure you want to delete "${timetable.name}"?\n` +
      `WARNING: This will permanently delete this timetable and ALL its scheduled class sessions.`;

    if (!window.confirm(confirmText)) return;

    setDeletingId(timetable._id);
    setServerError(null);
    setSuccessMessage(null);

    try {
      await deleteTimetable(timetable._id);
      setSuccessMessage(`Timetable "${timetable.name}" and its sessions were deleted.`);
      if (editingId === timetable._id) {
        cancelEdit();
      }
      await fetchTimetables();
    } catch (err) {
      setServerError(err.message || `Failed to delete timetable "${timetable.name}".`);
    } finally {
      setDeletingId(null);
    }
  };

  const currentSelected = timetables.find((t) => t._id === selectedTimetableId) || null;

  return (
    <section className="timetable-manager" aria-labelledby="timetable-manager-title">
      <div className="timetable-manager-header">
        <h2 id="timetable-manager-title">
          Timetable Workspaces
          <span className="badge-count" title="Total timetables">
            {timetables.length}
          </span>
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (showForm && !editingId) {
                setShowForm(false);
              } else {
                setEditingId(null);
                setFormData(INITIAL_FORM);
                setShowForm(true);
              }
            }}
          >
            {showForm && !editingId ? 'Close Form' : '+ New Timetable'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchTimetables(selectedTimetableId)}
            disabled={loading || submitting}
            title="Refresh timetables"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
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

      {/* Active Timetable Selector Bar */}
      {timetables.length > 0 && (
        <div className="timetable-selector-bar">
          <label htmlFor="active-timetable-select">Active Timetable:</label>
          <select
            id="active-timetable-select"
            className="timetable-select"
            value={selectedTimetableId || ''}
            onChange={(e) => {
              const found = timetables.find((t) => t._id === e.target.value);
              if (found && typeof onSelectTimetable === 'function') {
                onSelectTimetable(found);
              }
            }}
          >
            {timetables.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} (Sem {t.semester} - Sec {t.section}) [{t.academicYear}]
              </option>
            ))}
          </select>

          {currentSelected && (
            <div className="timetable-badges">
              <span className="timetable-tag">
                <strong>Year:</strong> {currentSelected.academicYear}
              </span>
              <span className="timetable-tag">
                <strong>Semester:</strong> {currentSelected.semester}
              </span>
              <span className="timetable-tag">
                <strong>Section:</strong> {currentSelected.section}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Timetable Form */}
      {showForm && (
        <form className="timetable-form" onSubmit={handleSubmit} noValidate>
          <h3>{editingId ? 'Edit Timetable Metadata' : 'Create New Timetable'}</h3>
          <div className="form-grid-4">
            <div className="form-group">
              <label htmlFor="name">
                Timetable Name <span className="required">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g. Semester 3 — Section E"
                value={formData.name}
                onChange={handleInputChange}
                className={validationErrors.name ? 'has-error' : ''}
                disabled={submitting}
                required
              />
              {validationErrors.name && (
                <span className="field-error">{validationErrors.name}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="academicYear">
                Academic Year <span className="required">*</span>
              </label>
              <input
                id="academicYear"
                name="academicYear"
                type="text"
                placeholder="e.g. 2026-2027"
                value={formData.academicYear}
                onChange={handleInputChange}
                className={validationErrors.academicYear ? 'has-error' : ''}
                disabled={submitting}
                required
              />
              {validationErrors.academicYear && (
                <span className="field-error">{validationErrors.academicYear}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="semester">
                Semester <span className="required">*</span>
              </label>
              <input
                id="semester"
                name="semester"
                type="number"
                min="1"
                max="12"
                placeholder="e.g. 3"
                value={formData.semester}
                onChange={handleInputChange}
                className={validationErrors.semester ? 'has-error' : ''}
                disabled={submitting}
                required
              />
              {validationErrors.semester && (
                <span className="field-error">{validationErrors.semester}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="section">
                Section <span className="required">*</span>
              </label>
              <input
                id="section"
                name="section"
                type="text"
                placeholder="e.g. E"
                value={formData.section}
                onChange={handleInputChange}
                className={validationErrors.section ? 'has-error' : ''}
                disabled={submitting}
                required
              />
              {validationErrors.section && (
                <span className="field-error">{validationErrors.section}</span>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={cancelEdit}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  <span>{editingId ? 'Saving...' : 'Creating...'}</span>
                </>
              ) : editingId ? (
                'Save Changes'
              ) : (
                'Create Timetable'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Timetables Grid View */}
      {loading && timetables.length === 0 ? (
        <div className="loading-indicator">
          <span className="spinner" />
          <span>Loading timetables...</span>
        </div>
      ) : timetables.length === 0 ? (
        <div className="empty-state">
          <p>No timetables created yet.</p>
          <p>Click "+ New Timetable" to set up your cohort schedule.</p>
        </div>
      ) : (
        <div className="timetables-grid">
          {timetables.map((t) => {
            const isSelected = t._id === selectedTimetableId;
            const isDeleting = deletingId === t._id;
            return (
              <div
                key={t._id}
                className={`timetable-card ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectTimetable && onSelectTimetable(t)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectTimetable && onSelectTimetable(t);
                  }
                }}
              >
                <div>
                  <div className="timetable-card-header">
                    <h4>{t.name}</h4>
                    {isSelected && <span className="badge-active">Active</span>}
                  </div>
                  <div className="timetable-meta">
                    <div>
                      <strong>Academic Year:</strong> {t.academicYear}
                    </div>
                    <div>
                      <strong>Cohort:</strong> Semester {t.semester} &bull; Section {t.section}
                    </div>
                  </div>
                </div>

                <div className="timetable-card-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(t);
                    }}
                    disabled={submitting || isDeleting}
                    title="Edit metadata"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger-outline btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(t);
                    }}
                    disabled={submitting || isDeleting}
                    title="Delete timetable & sessions"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
