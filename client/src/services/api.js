/**
 * Shared API Client for Timetable Builder
 *
 * Implements fetch wrapper for JSON requests, base URL configuration,
 * HTTP error handling, and 409 clash payload extraction according to API_CONTRACT.md.
 */

const DEFAULT_BASE_URL = 'http://localhost:5000/api';

export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')
    : DEFAULT_BASE_URL;

/**
 * Custom error class representing API failures with structured error & conflict metadata.
 */
export class ApiError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} status - HTTP status code
   * @param {string} [code='API_ERROR'] - Error code from server (e.g., SCHEDULE_CLASH, VALIDATION_ERROR)
   * @param {Array} [details=[]] - Optional array of field-level validation errors
   * @param {Array} [conflicts=[]] - Optional array of clash conflict objects for 409 errors
   */
  constructor(message, status, code = 'API_ERROR', details = [], conflicts = []) {
    super(message || 'An unexpected API error occurred');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = Array.isArray(details) ? details : [];
    this.conflicts = Array.isArray(conflicts) ? conflicts : [];
  }

  /**
   * True if this error represents one or more schedule clashes (HTTP 409 with conflicts)
   */
  get isClash() {
    return this.status === 409 && this.conflicts.length > 0;
  }

  /**
   * True if this is a validation error (HTTP 400)
   */
  get isValidationError() {
    return this.status === 400;
  }

  /**
   * True if resource was not found (HTTP 404)
   */
  get isNotFound() {
    return this.status === 404;
  }

  /**
   * True if a course is referenced and cannot be deleted (HTTP 409)
   */
  get isReferenced() {
    return this.status === 409 && !this.isClash;
  }
}

/**
 * Core fetch wrapper with JSON serialization, header defaults, and error parsing.
 *
 * @param {string} endpoint - Path relative to base URL (e.g. '/courses')
 * @param {RequestInit} [options={}] - Standard fetch options
 * @returns {Promise<any>} Parsed JSON response body or null for 204 No Content
 */
export async function apiRequest(endpoint, options = {}) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkErr) {
    throw new ApiError(
      `Network error: Unable to connect to backend server at ${API_BASE_URL}. Please ensure the server is running.`,
      0,
      'NETWORK_ERROR'
    );
  }

  // 204 No Content - common for successful DELETE operations
  if (response.status === 204) {
    return null;
  }

  // Attempt to parse JSON response
  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (parseErr) {
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      data = text ? { raw: text } : null;
    } catch (_) {
      data = null;
    }
  }

  if (!response.ok) {
    const errorObj = data?.error || {};
    const message =
      errorObj.message ||
      data?.message ||
      (typeof data?.raw === 'string' && data.raw) ||
      `Request failed with status ${response.status}`;
    const code = errorObj.code || data?.code || (response.status === 409 ? 'CONFLICT' : 'HTTP_ERROR');
    const details = errorObj.details || data?.details || [];
    const conflicts = data?.conflicts || [];

    throw new ApiError(message, response.status, code, details, conflicts);
  }

  return data;
}

/* ==========================================================================
   Health Check API
   ========================================================================== */

export async function checkHealth() {
  return apiRequest('/health', { method: 'GET' });
}

/* ==========================================================================
   Courses API (FR-2, API_CONTRACT)
   ========================================================================== */

/**
 * List all courses
 * @returns {Promise<Array<{ _id: string, courseCode: string, title: string, facultyName: string, credits?: number }>>}
 */
export async function getCourses() {
  return apiRequest('/courses', { method: 'GET' });
}

/**
 * Get a single course by ID
 * @param {string} id
 */
export async function getCourse(id) {
  return apiRequest(`/courses/${encodeURIComponent(id)}`, { method: 'GET' });
}

/**
 * Create a new course
 * @param {{ courseCode: string, title: string, facultyName: string, credits?: number }} courseData
 */
export async function createCourse(courseData) {
  return apiRequest('/courses', {
    method: 'POST',
    body: courseData
  });
}

/**
 * Update an existing course
 * @param {string} id
 * @param {Partial<{ courseCode: string, title: string, facultyName: string, credits?: number }>} updates
 */
export async function updateCourse(id, updates) {
  return apiRequest(`/courses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: updates
  });
}

/**
 * Delete a course by ID. Returns 409 if course is referenced by any session.
 * @param {string} id
 */
export async function deleteCourse(id) {
  return apiRequest(`/courses/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

/* ==========================================================================
   Timetables API (FR-1, API_CONTRACT)
   ========================================================================== */

/**
 * List all timetables
 * @returns {Promise<Array<{ _id: string, name: string, academicYear: string, semester: number, section: string }>>}
 */
export async function getTimetables() {
  return apiRequest('/timetables', { method: 'GET' });
}

/**
 * Get a single timetable by ID
 * @param {string} id
 */
export async function getTimetable(id) {
  return apiRequest(`/timetables/${encodeURIComponent(id)}`, { method: 'GET' });
}

/**
 * Create a new timetable
 * @param {{ name: string, academicYear: string, semester: number, section: string }} timetableData
 */
export async function createTimetable(timetableData) {
  return apiRequest('/timetables', {
    method: 'POST',
    body: timetableData
  });
}

/**
 * Update an existing timetable
 * @param {string} id
 * @param {Partial<{ name: string, academicYear: string, semester: number, section: string }>} updates
 */
export async function updateTimetable(id, updates) {
  return apiRequest(`/timetables/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: updates
  });
}

/**
 * Delete a timetable and all its nested sessions
 * @param {string} id
 */
export async function deleteTimetable(id) {
  return apiRequest(`/timetables/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

/* ==========================================================================
   Sessions API (FR-3, FR-4, API_CONTRACT)
   ========================================================================== */

/**
 * List sessions under a timetable
 * @param {string} timetableId
 * @returns {Promise<Array<object>>}
 */
export async function getTimetableSessions(timetableId) {
  return apiRequest(`/timetables/${encodeURIComponent(timetableId)}/sessions`, {
    method: 'GET'
  });
}

/**
 * Create a new session under a timetable with clash checking
 * @param {string} timetableId
 * @param {{ courseId: string, dayOfWeek: string, startTime: string, endTime: string, room: string }} sessionData
 */
export async function createSession(timetableId, sessionData) {
  return apiRequest(`/timetables/${encodeURIComponent(timetableId)}/sessions`, {
    method: 'POST',
    body: sessionData
  });
}

/**
 * Read one session by ID
 * @param {string} sessionId
 */
export async function getSession(sessionId) {
  return apiRequest(`/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'GET'
  });
}

/**
 * Update a session with clash checking (excluding self)
 * @param {string} sessionId
 * @param {Partial<{ courseId: string, dayOfWeek: string, startTime: string, endTime: string, room: string }>} updates
 */
export async function updateSession(sessionId, updates) {
  return apiRequest(`/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'PATCH',
    body: updates
  });
}

/**
 * Delete a session by ID
 * @param {string} sessionId
 */
export async function deleteSession(sessionId) {
  return apiRequest(`/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE'
  });
}

/* ==========================================================================
   Clashes API (FR-4, API_CONTRACT)
   ========================================================================== */

/**
 * Detect clashes in stored timetable data
 * @param {string} timetableId
 * @returns {Promise<{ conflicts: Array<object> }>}
 */
export async function getTimetableClashes(timetableId) {
  return apiRequest(`/timetables/${encodeURIComponent(timetableId)}/clashes`, {
    method: 'GET'
  });
}

export default {
  API_BASE_URL,
  ApiError,
  apiRequest,
  checkHealth,
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  getTimetables,
  getTimetable,
  createTimetable,
  updateTimetable,
  deleteTimetable,
  getTimetableSessions,
  createSession,
  getSession,
  updateSession,
  deleteSession,
  getTimetableClashes
};
