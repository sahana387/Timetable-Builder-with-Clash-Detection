/**
 * Clash Detection Service
 * Pure functions for detecting timetable scheduling conflicts.
 * 
 * Rules enforced:
 * - Strict 24-hour HH:mm format
 * - startTime < endTime
 * - Overlap condition: startA < endB && startB < endA
 * - Adjacent intervals (touching endpoints) do NOT overlap
 * - Comparisons only apply to sessions on the same day
 * - Conflict types:
 *   - SECTION_CLASH: Same cohort (academicYear, semester, section)
 *   - FACULTY_CLASH: Same non-empty facultyName (case-insensitive, trimmed)
 *   - ROOM_CLASH: Same non-empty room (case-insensitive, trimmed)
 * - Self-exclusion when editing an existing session
 */

const VALID_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Validates strict 24-hour HH:mm time format.
 * @param {string} timeStr
 * @returns {boolean}
 */
function isValidTimeFormat(timeStr) {
  return typeof timeStr === 'string' && TIME_REGEX.test(timeStr);
}

/**
 * Validates day of week.
 * @param {string} day
 * @returns {boolean}
 */
function isValidDayOfWeek(day) {
  return typeof day === 'string' && VALID_DAYS.includes(day);
}

/**
 * Converts HH:mm string to minute-of-day integer.
 * @param {string} timeStr 
 * @returns {number}
 */
function parseTimeToMinutes(timeStr) {
  if (!isValidTimeFormat(timeStr)) {
    throw new Error(`Invalid time format "${timeStr}". Expected strict 24-hour "HH:mm".`);
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Validates that startTime and endTime are properly formatted and startTime < endTime.
 * @param {string} startTime 
 * @param {string} endTime 
 * @returns {{ valid: boolean, error?: string }}
 */
function validateTimeRange(startTime, endTime) {
  if (!isValidTimeFormat(startTime)) {
    return { valid: false, error: 'startTime must be a valid 24-hour time in HH:mm format' };
  }
  if (!isValidTimeFormat(endTime)) {
    return { valid: false, error: 'endTime must be a valid 24-hour time in HH:mm format' };
  }
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);

  if (startMin >= endMin) {
    return { valid: false, error: 'startTime must be earlier than endTime' };
  }

  return { valid: true };
}

/**
 * Determines whether two time intervals overlap on the minute scale.
 * Formula: startA < endB && startB < endA
 * Adjacent intervals (e.g. 09:00-10:00 and 10:00-11:00) return false.
 * @param {number} startA 
 * @param {number} endA 
 * @param {number} startB 
 * @param {number} endB 
 * @returns {boolean}
 */
function hasTimeOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

/**
 * Normalizes string by trimming and converting to lowercase.
 * Returns empty string if value is null/undefined.
 * @param {string|null|undefined} val 
 * @returns {string}
 */
function normalizeString(val) {
  return typeof val === 'string' ? val.trim().toLowerCase() : '';
}

/**
 * Checks if two cohorts match (same academicYear, semester, section).
 * @param {object} cohortA 
 * @param {object} cohortB 
 * @returns {boolean}
 */
function isSameCohort(cohortA, cohortB) {
  if (!cohortA || !cohortB) return false;

  const yearA = normalizeString(cohortA.academicYear);
  const yearB = normalizeString(cohortB.academicYear);

  const semA = cohortA.semester !== undefined && cohortA.semester !== null ? String(cohortA.semester).trim() : '';
  const semB = cohortB.semester !== undefined && cohortB.semester !== null ? String(cohortB.semester).trim() : '';

  const secA = normalizeString(cohortA.section);
  const secB = normalizeString(cohortB.section);

  if (!yearA || !yearB || !semA || !semB || !secA || !secB) {
    return false;
  }

  return yearA === yearB && semA === semB && secA === secB;
}

/**
 * Checks if two strings match after trim and case-insensitivity, ignoring blanks.
 * @param {string} a 
 * @param {string} b 
 * @returns {boolean}
 */
function isSameNormalized(a, b) {
  const normA = normalizeString(a);
  const normB = normalizeString(b);
  if (!normA || !normB) return false;
  return normA === normB;
}

/**
 * Extracts course and timetable information from a session.
 * Supports populated objects or nested references.
 */
function extractSessionDetails(session) {
  const course = session.course || session.courseId || {};
  const timetable = session.timetable || session.timetableId || {};

  return {
    id: session._id ? session._id.toString() : session.id ? session.id.toString() : undefined,
    dayOfWeek: session.dayOfWeek,
    startTime: session.startTime,
    endTime: session.endTime,
    room: session.room || '',
    courseCode: course.courseCode || session.courseCode || '',
    courseTitle: course.title || session.courseTitle || '',
    facultyName: course.facultyName || session.facultyName || '',
    academicYear: timetable.academicYear || session.academicYear || '',
    semester: timetable.semester !== undefined ? timetable.semester : session.semester,
    section: timetable.section || session.section || '',
    timetableName: timetable.name || session.timetableName || ''
  };
}

/**
 * Checks conflicts between a candidate session and an existing session.
 * @param {object} candidate 
 * @param {object} existing 
 * @param {string|null} excludeSessionId 
 * @returns {Array<object>} array of conflict objects
 */
function checkSessionPairClash(candidate, existing, excludeSessionId = null) {
  const cand = extractSessionDetails(candidate);
  const exist = extractSessionDetails(existing);

  // Self-exclusion: If existing session is the one being updated, skip
  const targetExcludeId = excludeSessionId || cand.id;
  if (targetExcludeId && exist.id && String(exist.id) === String(targetExcludeId)) {
    return [];
  }

  // Compare only on the same day
  if (cand.dayOfWeek !== exist.dayOfWeek) {
    return [];
  }

  // Check time overlap: startA < endB && startB < endA
  const candStart = parseTimeToMinutes(cand.startTime);
  const candEnd = parseTimeToMinutes(cand.endTime);
  const existStart = parseTimeToMinutes(exist.startTime);
  const existEnd = parseTimeToMinutes(exist.endTime);

  if (!hasTimeOverlap(candStart, candEnd, existStart, existEnd)) {
    return [];
  }

  const conflicts = [];
  const baseConflictInfo = {
    conflictingSessionId: exist.id,
    courseCode: exist.courseCode,
    courseTitle: exist.courseTitle,
    dayOfWeek: exist.dayOfWeek,
    startTime: exist.startTime,
    endTime: exist.endTime,
    room: exist.room
  };

  // 1. SECTION_CLASH: Same cohort
  if (isSameCohort(
    { academicYear: cand.academicYear, semester: cand.semester, section: cand.section },
    { academicYear: exist.academicYear, semester: exist.semester, section: exist.section }
  )) {
    const cohortStr = `${exist.academicYear || ''} Sem ${exist.semester || ''} Sec ${exist.section || ''}`.trim();
    conflicts.push({
      type: 'SECTION_CLASH',
      message: `Cohort (${cohortStr}) already has a class scheduled during this time.`,
      ...baseConflictInfo
    });
  }

  // 2. FACULTY_CLASH: Same faculty
  if (isSameNormalized(cand.facultyName, exist.facultyName)) {
    conflicts.push({
      type: 'FACULTY_CLASH',
      message: `Faculty ${exist.facultyName.trim()} is already scheduled to teach during this time.`,
      ...baseConflictInfo
    });
  }

  // 3. ROOM_CLASH: Same room
  if (isSameNormalized(cand.room, exist.room)) {
    conflicts.push({
      type: 'ROOM_CLASH',
      message: `Room ${exist.room.trim()} is already booked during this time.`,
      ...baseConflictInfo
    });
  }

  return conflicts;
}

/**
 * Detects all clashes for a candidate session against a list of existing sessions.
 * Pure function: Does not require active DB connection.
 * 
 * @param {object} candidateSession - Candidate session details (with course and timetable metadata if available)
 * @param {Array<object>} existingSessions - Array of existing sessions
 * @param {object} [options] - Options, e.g. { excludeSessionId }
 * @returns {{ hasClash: boolean, conflicts: Array<object> }}
 */
function detectClashes(candidateSession, existingSessions = [], options = {}) {
  const timeValidation = validateTimeRange(candidateSession.startTime, candidateSession.endTime);
  if (!timeValidation.valid) {
    throw new Error(timeValidation.error);
  }

  if (!isValidDayOfWeek(candidateSession.dayOfWeek)) {
    throw new Error(`Invalid dayOfWeek "${candidateSession.dayOfWeek}". Must be one of: ${VALID_DAYS.join(', ')}.`);
  }

  const excludeSessionId = options.excludeSessionId || candidateSession._id || candidateSession.id;
  const conflicts = [];

  for (const existing of existingSessions) {
    const pairConflicts = checkSessionPairClash(candidateSession, existing, excludeSessionId);
    conflicts.push(...pairConflicts);
  }

  return {
    hasClash: conflicts.length > 0,
    conflicts
  };
}

/**
 * Detects all internal clashes across an array of stored sessions.
 * Useful for timetable clash review (GET /timetables/:id/clashes).
 * 
 * @param {Array<object>} sessions 
 * @returns {{ hasClash: boolean, conflicts: Array<object> }}
 */
function detectTimetableClashes(sessions = []) {
  const conflicts = [];
  const seenPairs = new Set();

  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const pairConflicts = checkSessionPairClash(sessions[i], sessions[j]);
      for (const conflict of pairConflicts) {
        const pairKey = `${conflict.type}-${sessions[i]._id || i}-${sessions[j]._id || j}`;
        if (!seenPairs.has(pairKey)) {
          seenPairs.add(pairKey);
          conflicts.push(conflict);
        }
      }
    }
  }

  return {
    hasClash: conflicts.length > 0,
    conflicts
  };
}

module.exports = {
  VALID_DAYS,
  isValidTimeFormat,
  isValidDayOfWeek,
  parseTimeToMinutes,
  validateTimeRange,
  hasTimeOverlap,
  normalizeString,
  isSameCohort,
  isSameNormalized,
  extractSessionDetails,
  checkSessionPairClash,
  detectClashes,
  detectTimetableClashes
};
