const express = require('express');
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Session = require('../models/Session');

const router = express.Router();

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
 * GET /courses
 * List all courses.
 */
router.get('/', async (req, res, next) => {
  try {
    const courses = await Course.find().sort({ courseCode: 1 });
    return res.status(200).json(courses);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /courses
 * Create a new course.
 */
router.post('/', async (req, res, next) => {
  try {
    const { courseCode, title, facultyName, credits } = req.body;

    if (!courseCode || typeof courseCode !== 'string' || !courseCode.trim()) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'courseCode is required');
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'title is required');
    }

    if (!facultyName || typeof facultyName !== 'string' || !facultyName.trim()) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'facultyName is required');
    }

    if (credits !== undefined && (typeof credits !== 'number' || credits < 0)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'credits must be a non-negative number');
    }

    const normalizedCode = courseCode.trim().toUpperCase();

    // Check for duplicate course code (case-insensitive after normalization)
    const existingCourse = await Course.findOne({
      courseCode: { $regex: new RegExp(`^${normalizedCode}$`, 'i') }
    });

    if (existingCourse) {
      return sendError(res, 409, 'DUPLICATE_COURSE', `Course with code "${normalizedCode}" already exists.`);
    }

    const course = new Course({
      courseCode: normalizedCode,
      title: title.trim(),
      facultyName: facultyName.trim(),
      credits: credits !== undefined ? credits : 0
    });

    await course.save();
    return res.status(201).json(course);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /courses/:id
 * Retrieve single course by ID.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid course ID format');
    }

    const course = await Course.findById(id);
    if (!course) {
      return sendError(res, 404, 'NOT_FOUND', 'Course not found');
    }

    return res.status(200).json(course);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /courses/:id
 * Update course details.
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid course ID format');
    }

    const course = await Course.findById(id);
    if (!course) {
      return sendError(res, 404, 'NOT_FOUND', 'Course not found');
    }

    const { courseCode, title, facultyName, credits } = req.body;

    if (courseCode !== undefined) {
      if (typeof courseCode !== 'string' || !courseCode.trim()) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'courseCode cannot be empty');
      }
      const normalizedCode = courseCode.trim().toUpperCase();
      const existing = await Course.findOne({
        _id: { $ne: id },
        courseCode: { $regex: new RegExp(`^${normalizedCode}$`, 'i') }
      });
      if (existing) {
        return sendError(res, 409, 'DUPLICATE_COURSE', `Course with code "${normalizedCode}" already exists.`);
      }
      course.courseCode = normalizedCode;
    }

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'title cannot be empty');
      }
      course.title = title.trim();
    }

    if (facultyName !== undefined) {
      if (typeof facultyName !== 'string' || !facultyName.trim()) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'facultyName cannot be empty');
      }
      course.facultyName = facultyName.trim();
    }

    if (credits !== undefined) {
      if (typeof credits !== 'number' || credits < 0) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'credits must be a non-negative number');
      }
      course.credits = credits;
    }

    await course.save();
    return res.status(200).json(course);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /courses/:id
 * Delete course if unused. Returns 409 if referenced by any session.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid course ID format');
    }

    const course = await Course.findById(id);
    if (!course) {
      return sendError(res, 404, 'NOT_FOUND', 'Course not found');
    }

    // Integrity constraint: Check if course is used in any sessions
    const sessionCount = await Session.countDocuments({ courseId: id });
    if (sessionCount > 0) {
      return sendError(
        res,
        409,
        'COURSE_IN_USE',
        `Cannot delete course "${course.courseCode}" because it is currently assigned to ${sessionCount} session(s).`
      );
    }

    await Course.findByIdAndDelete(id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
