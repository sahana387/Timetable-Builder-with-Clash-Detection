const express = require('express');
const mongoose = require('mongoose');
const Timetable = require('../models/Timetable');
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
 * GET /timetables
 * List all timetables.
 */
router.get('/', async (req, res, next) => {
  try {
    const timetables = await Timetable.find().sort({ academicYear: -1, semester: 1, section: 1 });
    return res.status(200).json(timetables);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /timetables
 * Create a new timetable.
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, academicYear, semester, section } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'name is required');
    }

    if (!academicYear || typeof academicYear !== 'string' || !academicYear.trim()) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'academicYear is required');
    }

    if (semester === undefined || semester === null || typeof semester !== 'number' || semester < 1) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'semester must be a positive integer');
    }

    if (!section || typeof section !== 'string' || !section.trim()) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'section is required');
    }

    const timetable = new Timetable({
      name: name.trim(),
      academicYear: academicYear.trim(),
      semester,
      section: section.trim().toUpperCase()
    });

    await timetable.save();
    return res.status(201).json(timetable);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /timetables/:id
 * Retrieve a single timetable by ID.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid timetable ID format');
    }

    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return sendError(res, 404, 'NOT_FOUND', 'Timetable not found');
    }

    return res.status(200).json(timetable);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /timetables/:id
 * Update timetable metadata.
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid timetable ID format');
    }

    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return sendError(res, 404, 'NOT_FOUND', 'Timetable not found');
    }

    const { name, academicYear, semester, section } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'name cannot be empty');
      }
      timetable.name = name.trim();
    }

    if (academicYear !== undefined) {
      if (typeof academicYear !== 'string' || !academicYear.trim()) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'academicYear cannot be empty');
      }
      timetable.academicYear = academicYear.trim();
    }

    if (semester !== undefined) {
      if (typeof semester !== 'number' || semester < 1) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'semester must be a positive integer');
      }
      timetable.semester = semester;
    }

    if (section !== undefined) {
      if (typeof section !== 'string' || !section.trim()) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'section cannot be empty');
      }
      timetable.section = section.trim().toUpperCase();
    }

    await timetable.save();
    return res.status(200).json(timetable);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /timetables/:id
 * Delete timetable and cascade-delete its sessions.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid timetable ID format');
    }

    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return sendError(res, 404, 'NOT_FOUND', 'Timetable not found');
    }

    // Cascade delete: clean up all sessions associated with this timetable
    await Session.deleteMany({ timetableId: id });

    // Delete the timetable itself
    await Timetable.findByIdAndDelete(id);

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
