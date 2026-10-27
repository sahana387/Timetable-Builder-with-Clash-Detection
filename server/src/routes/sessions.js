const express = require('express');
const mongoose = require('mongoose');
const {
  detectClashes,
  detectTimetableClashes,
  validateTimeRange,
  isValidTimeFormat,
  isValidDayOfWeek
} = require('../services/clashDetection');

const router = express.Router({ mergeParams: true });

/**
 * Helper to dynamically resolve models.
 * Prioritizes models defined by Teammate 3, with fallback to registered Mongoose models or schema definition.
 */
function getModels() {
  let Session, Course, Timetable;

  try {
    Session = require('../models/Session');
  } catch (e) {
    Session = mongoose.models.Session;
  }

  try {
    Course = require('../models/Course');
  } catch (e) {
    Course = mongoose.models.Course;
  }

  try {
    Timetable = require('../models/Timetable');
  } catch (e) {
    Timetable = mongoose.models.Timetable;
  }

  if (!Course) {
    const courseSchema = new mongoose.Schema({
      courseCode: { type: String, required: true, trim: true },
      title: { type: String, required: true, trim: true },
      facultyName: { type: String, required: true, trim: true },
      credits: { type: Number, min: 0 }
    });
    Course = mongoose.models.Course || mongoose.model('Course', courseSchema);
  }

  if (!Timetable) {
    const timetableSchema = new mongoose.Schema({
      name: { type: String, required: true, trim: true },
      academicYear: { type: String, required: true, trim: true },
      semester: { type: Number, required: true, min: 1 },
      section: { type: String, required: true, trim: true }
    });
    Timetable = mongoose.models.Timetable || mongoose.model('Timetable', timetableSchema);
  }

  if (!Session) {
    const sessionSchema = new mongoose.Schema({
      timetableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable', required: true },
      courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
      dayOfWeek: {
        type: String,
        required: true,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      room: { type: String, required: true, trim: true }
    });
    Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
  }

  return { Session, Course, Timetable };
}

/**
 * Standard error response helper matching API_CONTRACT.md
 */
function sendError(res, status, code, message, details = []) {
  return res.status(status).json({
    error: {
      code,
      message,
      details
    }
  });
}

/**
 * GET /timetables/:id/sessions
 * List all sessions for a specific timetable, populated with course information.
 */
async function listSessionsByTimetable(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid timetable ID format');
    }

    const { Session, Timetable } = getModels();
    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return sendError(res, 404, 'NOT_FOUND', 'Timetable not found');
    }

    const sessions = await Session.find({ timetableId: id })
      .populate('courseId', 'courseCode title facultyName credits')
      .lean();

    return res.status(200).json(sessions);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /timetables/:id/sessions
 * Create a session under a timetable with clash checking.
 */
async function createSession(req, res, next) {
  try {
    const timetableId = req.params.id || req.body.timetableId;
    if (!timetableId || !mongoose.Types.ObjectId.isValid(timetableId)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Valid timetableId is required');
    }

    const { courseId, dayOfWeek, startTime, endTime, room } = req.body;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Valid courseId is required');
    }

    if (!isValidDayOfWeek(dayOfWeek)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'dayOfWeek must be Monday through Saturday');
    }

    const timeValidation = validateTimeRange(startTime, endTime);
    if (!timeValidation.valid) {
      return sendError(res, 400, 'VALIDATION_ERROR', timeValidation.error);
    }

    if (!room || typeof room !== 'string' || !room.trim()) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'room is required');
    }

    const { Session, Course, Timetable } = getModels();

    const timetable = await Timetable.findById(timetableId).lean();
    if (!timetable) {
      return sendError(res, 404, 'NOT_FOUND', 'Timetable not found');
    }

    const course = await Course.findById(courseId).lean();
    if (!course) {
      return sendError(res, 404, 'NOT_FOUND', 'Course not found');
    }

    // Retrieve existing sessions for the same day to detect potential clashes
    const existingSessions = await Session.find({ dayOfWeek })
      .populate('courseId', 'courseCode title facultyName credits')
      .populate('timetableId', 'name academicYear semester section')
      .lean();

    const candidate = {
      dayOfWeek,
      startTime,
      endTime,
      room: room.trim(),
      course: {
        courseCode: course.courseCode,
        title: course.title,
        facultyName: course.facultyName
      },
      timetable: {
        academicYear: timetable.academicYear,
        semester: timetable.semester,
        section: timetable.section,
        name: timetable.name
      }
    };

    const { hasClash, conflicts } = detectClashes(candidate, existingSessions);

    if (hasClash) {
      return res.status(409).json({
        error: {
          code: 'SCHEDULE_CLASH',
          message: 'This session overlaps with an existing session.',
          details: []
        },
        conflicts
      });
    }

    // Create and save new session
    const newSession = new Session({
      timetableId,
      courseId,
      dayOfWeek,
      startTime,
      endTime,
      room: room.trim()
    });

    await newSession.save();

    const populatedSession = await Session.findById(newSession._id)
      .populate('courseId', 'courseCode title facultyName credits')
      .lean();

    return res.status(201).json(populatedSession);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /sessions/:id
 * Read a single session by ID.
 */
async function getSessionById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid session ID format');
    }

    const { Session } = getModels();
    const session = await Session.findById(id)
      .populate('courseId', 'courseCode title facultyName credits')
      .populate('timetableId', 'name academicYear semester section')
      .lean();

    if (!session) {
      return sendError(res, 404, 'NOT_FOUND', 'Session not found');
    }

    return res.status(200).json(session);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /sessions/:id
 * Update an existing session with clash checks (excluding self).
 */
async function updateSession(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid session ID format');
    }

    const { courseId, dayOfWeek, startTime, endTime, room } = req.body;

    if (courseId && !mongoose.Types.ObjectId.isValid(courseId)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Valid courseId is required');
    }

    if (dayOfWeek && !isValidDayOfWeek(dayOfWeek)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'dayOfWeek must be Monday through Saturday');
    }

    if (startTime !== undefined && !isValidTimeFormat(startTime)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'startTime must be a valid 24-hour time in HH:mm format');
    }

    if (endTime !== undefined && !isValidTimeFormat(endTime)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'endTime must be a valid 24-hour time in HH:mm format');
    }

    if (startTime && endTime) {
      const rangeCheck = validateTimeRange(startTime, endTime);
      if (!rangeCheck.valid) {
        return sendError(res, 400, 'VALIDATION_ERROR', rangeCheck.error);
      }
    }

    if (room !== undefined && (typeof room !== 'string' || !room.trim())) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'room cannot be empty');
    }

    const { Session, Course, Timetable } = getModels();
    const existingSession = await Session.findById(id);
    if (!existingSession) {
      return sendError(res, 404, 'NOT_FOUND', 'Session not found');
    }

    const targetCourseId = courseId || existingSession.courseId;
    const targetDayOfWeek = dayOfWeek || existingSession.dayOfWeek;
    const targetStartTime = startTime || existingSession.startTime;
    const targetEndTime = endTime || existingSession.endTime;
    const targetRoom = room !== undefined ? room.trim() : existingSession.room;

    const timeValidation = validateTimeRange(targetStartTime, targetEndTime);
    if (!timeValidation.valid) {
      return sendError(res, 400, 'VALIDATION_ERROR', timeValidation.error);
    }

    const course = await Course.findById(targetCourseId).lean();
    if (!course) {
      return sendError(res, 404, 'NOT_FOUND', 'Course not found');
    }

    const timetable = await Timetable.findById(existingSession.timetableId).lean();
    if (!timetable) {
      return sendError(res, 404, 'NOT_FOUND', 'Timetable not found');
    }

    // Check same-day sessions for conflicts (excluding the current session)
    const existingSameDaySessions = await Session.find({ dayOfWeek: targetDayOfWeek })
      .populate('courseId', 'courseCode title facultyName credits')
      .populate('timetableId', 'name academicYear semester section')
      .lean();

    const candidate = {
      _id: existingSession._id,
      dayOfWeek: targetDayOfWeek,
      startTime: targetStartTime,
      endTime: targetEndTime,
      room: targetRoom,
      course: {
        courseCode: course.courseCode,
        title: course.title,
        facultyName: course.facultyName
      },
      timetable: {
        academicYear: timetable.academicYear,
        semester: timetable.semester,
        section: timetable.section,
        name: timetable.name
      }
    };

    const { hasClash, conflicts } = detectClashes(candidate, existingSameDaySessions, {
      excludeSessionId: existingSession._id.toString()
    });

    if (hasClash) {
      return res.status(409).json({
        error: {
          code: 'SCHEDULE_CLASH',
          message: 'This session overlaps with an existing session.',
          details: []
        },
        conflicts
      });
    }

    // Apply updates
    if (courseId) existingSession.courseId = courseId;
    if (dayOfWeek) existingSession.dayOfWeek = dayOfWeek;
    if (startTime) existingSession.startTime = startTime;
    if (endTime) existingSession.endTime = endTime;
    if (room !== undefined) existingSession.room = targetRoom;

    await existingSession.save();

    const updatedPopulated = await Session.findById(existingSession._id)
      .populate('courseId', 'courseCode title facultyName credits')
      .lean();

    return res.status(200).json(updatedPopulated);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /sessions/:id
 * Delete a session. Returns 204 No Content.
 */
async function deleteSession(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid session ID format');
    }

    const { Session } = getModels();
    const session = await Session.findByIdAndDelete(id);
    if (!session) {
      return sendError(res, 404, 'NOT_FOUND', 'Session not found');
    }

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /timetables/:id/clashes
 * Detect clashes in stored timetable sessions.
 */
async function getTimetableClashes(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid timetable ID format');
    }

    const { Session, Timetable } = getModels();
    const timetable = await Timetable.findById(id).lean();
    if (!timetable) {
      return sendError(res, 404, 'NOT_FOUND', 'Timetable not found');
    }

    // Load timetable sessions and cross-reference with all active sessions on matching days
    const timetableSessions = await Session.find({ timetableId: id })
      .populate('courseId', 'courseCode title facultyName credits')
      .populate('timetableId', 'name academicYear semester section')
      .lean();

    if (timetableSessions.length === 0) {
      return res.status(200).json({ conflicts: [] });
    }

    const days = [...new Set(timetableSessions.map(s => s.dayOfWeek))];
    const allRelevantSessions = await Session.find({ dayOfWeek: { $in: days } })
      .populate('courseId', 'courseCode title facultyName credits')
      .populate('timetableId', 'name academicYear semester section')
      .lean();

    const conflicts = [];
    const seenConflictKeys = new Set();

    for (const session of timetableSessions) {
      const { conflicts: sessionConflicts } = detectClashes(session, allRelevantSessions, {
        excludeSessionId: session._id.toString()
      });

      for (const c of sessionConflicts) {
        const idA = session._id.toString();
        const idB = c.conflictingSessionId ? c.conflictingSessionId.toString() : '';
        const pairKey = [idA, idB].sort().join('-') + '-' + c.type;
        if (!seenConflictKeys.has(pairKey)) {
          seenConflictKeys.add(pairKey);
          conflicts.push(c);
        }
      }
    }

    return res.status(200).json({ conflicts });
  } catch (error) {
    next(error);
  }
}

// Support mounting at /api (router handles both /timetables and /sessions)
router.get('/timetables/:id/sessions', listSessionsByTimetable);
router.post('/timetables/:id/sessions', createSession);
router.get('/timetables/:id/clashes', getTimetableClashes);

router.get('/sessions/:id', getSessionById);
router.patch('/sessions/:id', updateSession);
router.delete('/sessions/:id', deleteSession);


module.exports = router;
module.exports.listSessionsByTimetable = listSessionsByTimetable;
module.exports.createSession = createSession;
module.exports.getSessionById = getSessionById;
module.exports.updateSession = updateSession;
module.exports.deleteSession = deleteSession;
module.exports.getTimetableClashes = getTimetableClashes;
