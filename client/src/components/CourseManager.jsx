import React, { useState, useEffect, useCallback } from 'react';
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  ApiError
} from '../services/api';
import './CourseManager.css';

const INITIAL_FORM = {
  courseCode: '',
  title: '',
  facultyName: '',
  credits: ''
};

export default function CourseManager({ onCoursesChange, onCourseSelect }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch courses from API
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setServerError(null);
    try {
      const data = await getCourses();
      const courseList = Array.isArray(data) ? data : [];
      setCourses(courseList);
      if (typeof onCoursesChange === 'function') {
        onCoursesChange(courseList);
      }
    } catch (err) {
      setServerError(err.message || 'Failed to load courses from server');
    } finally {
      setLoading(false);
    }
  }, [onCoursesChange]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const validateForm = () => {
    const errors = {};
    if (!formData.courseCode.trim()) {
      errors.courseCode = 'Course code is required (e.g. CS201)';
    }
    if (!formData.title.trim()) {
      errors.title = 'Course title is required';
    }
    if (!formData.facultyName.trim()) {
      errors.facultyName = 'Faculty name is required';
    }
    if (formData.credits !== '' && formData.credits !== null && formData.credits !== undefined) {
      const credNum = Number(formData.credits);
      if (isNaN(credNum) || credNum < 0) {
        errors.credits = 'Credits must be a non-negative number';
      }
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

  const startEdit = (course) => {
    setEditingId(course._id);
    setFormData({
      courseCode: course.courseCode || '',
      title: course.title || '',
      facultyName: course.facultyName || '',
      credits: course.credits !== undefined && course.credits !== null ? String(course.credits) : ''
    });
    setValidationErrors({});
    setServerError(null);
    setSuccessMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM);
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
      courseCode: formData.courseCode.trim(),
      title: formData.title.trim(),
      facultyName: formData.facultyName.trim()
    };

    if (formData.credits !== '') {
      payload.credits = Number(formData.credits);
    }

    try {
      if (editingId) {
        const updated = await updateCourse(editingId, payload);
        setSuccessMessage(`Course "${updated.courseCode || payload.courseCode}" updated successfully.`);
        setEditingId(null);
        setFormData(INITIAL_FORM);
      } else {
        const created = await createCourse(payload);
        setSuccessMessage(`Course "${created.courseCode || payload.courseCode}" added successfully.`);
        setFormData(INITIAL_FORM);
      }
      await fetchCourses();
    } catch (err) {
      // Keep form data so user can fix and retry
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setServerError(`Conflict: ${err.message || 'Course code already exists'}`);
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
        setServerError(err.message || 'Failed to save course');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (course) => {
    const confirmMessage = `Are you sure you want to delete course "${course.courseCode} - ${course.title}"?\nThis cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    setDeletingId(course._id);
    setServerError(null);
    setSuccessMessage(null);

    try {
      await deleteCourse(course._id);
      setSuccessMessage(`Course "${course.courseCode}" deleted successfully.`);
      if (editingId === course._id) {
        cancelEdit();
      }
      await fetchCourses();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setServerError(
          `Cannot delete course "${course.courseCode}": It is referenced by one or more timetable sessions. Remove those sessions first.`
        );
      } else {
        setServerError(err.message || `Failed to delete course "${course.courseCode}".`);
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="course-manager" aria-labelledby="course-manager-title">
      <div className="course-manager-header">
        <h2 id="course-manager-title">
          Course Catalogue
          <span className="badge-count" title="Total courses">
            {courses.length}
          </span>
        </h2>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={fetchCourses}
          disabled={loading || submitting}
          title="Refresh courses from server"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
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

      {/* Course Add / Edit Form */}
      <form className="course-form" onSubmit={handleSubmit} noValidate>
        <h3>{editingId ? 'Edit Course' : 'Add New Course'}</h3>
        <div className="form-grid-4">
          <div className="form-group">
            <label htmlFor="courseCode">
              Course Code <span className="required">*</span>
            </label>
            <input
              id="courseCode"
              name="courseCode"
              type="text"
              placeholder="e.g. CS201"
              value={formData.courseCode}
              onChange={handleInputChange}
              className={validationErrors.courseCode ? 'has-error' : ''}
              disabled={submitting}
              required
            />
            {validationErrors.courseCode && (
              <span className="field-error">{validationErrors.courseCode}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="title">
              Course Title <span className="required">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="e.g. Data Structures"
              value={formData.title}
              onChange={handleInputChange}
              className={validationErrors.title ? 'has-error' : ''}
              disabled={submitting}
              required
            />
            {validationErrors.title && (
              <span className="field-error">{validationErrors.title}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="facultyName">
              Faculty / Instructor <span className="required">*</span>
            </label>
            <input
              id="facultyName"
              name="facultyName"
              type="text"
              placeholder="e.g. Dr. Rao"
              value={formData.facultyName}
              onChange={handleInputChange}
              className={validationErrors.facultyName ? 'has-error' : ''}
              disabled={submitting}
              required
            />
            {validationErrors.facultyName && (
              <span className="field-error">{validationErrors.facultyName}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="credits">Credits (optional)</label>
            <input
              id="credits"
              name="credits"
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 4"
              value={formData.credits}
              onChange={handleInputChange}
              className={validationErrors.credits ? 'has-error' : ''}
              disabled={submitting}
            />
            {validationErrors.credits && (
              <span className="field-error">{validationErrors.credits}</span>
            )}
          </div>
        </div>

        <div className="form-actions">
          {editingId && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={cancelEdit}
              disabled={submitting}
            >
              Cancel
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
                <span>{editingId ? 'Updating...' : 'Adding...'}</span>
              </>
            ) : editingId ? (
              'Update Course'
            ) : (
              'Add Course'
            )}
          </button>
        </div>
      </form>

      {/* Courses List */}
      <div className="courses-table-container">
        {loading && courses.length === 0 ? (
          <div className="loading-indicator">
            <span className="spinner" />
            <span>Loading courses...</span>
          </div>
        ) : courses.length === 0 ? (
          <div className="empty-state">
            <p>No courses registered yet.</p>
            <p>Use the form above to add your first course to the catalogue.</p>
          </div>
        ) : (
          <table className="courses-table">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Title</th>
                <th scope="col">Faculty</th>
                <th scope="col">Credits</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => {
                const isEditing = editingId === course._id;
                const isDeleting = deletingId === course._id;
                return (
                  <tr
                    key={course._id}
                    className={isEditing ? 'editing' : ''}
                    onClick={() => onCourseSelect && onCourseSelect(course)}
                  >
                    <td className="course-code-cell">{course.courseCode}</td>
                    <td>{course.title}</td>
                    <td>{course.facultyName}</td>
                    <td>{course.credits !== undefined && course.credits !== null ? course.credits : '—'}</td>
                    <td>
                      <div className="actions-cell">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(course);
                          }}
                          disabled={submitting || isDeleting}
                          title={`Edit ${course.courseCode}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger-outline btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(course);
                          }}
                          disabled={submitting || isDeleting}
                          title={`Delete ${course.courseCode}`}
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
