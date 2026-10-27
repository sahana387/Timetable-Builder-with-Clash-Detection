const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidTimeFormat,
  isValidDayOfWeek,
  parseTimeToMinutes,
  validateTimeRange,
  hasTimeOverlap,
  isSameCohort,
  isSameNormalized,
  checkSessionPairClash,
  detectClashes,
  detectTimetableClashes
} = require('../src/services/clashDetection');

describe('Clash Detection Service - Pure Rule Tests', () => {

  describe('1. Time Format & Range Validation', () => {
    it('accepts valid 24-hour HH:mm time strings', () => {
      assert.equal(isValidTimeFormat('00:00'), true);
      assert.equal(isValidTimeFormat('09:00'), true);
      assert.equal(isValidTimeFormat('14:30'), true);
      assert.equal(isValidTimeFormat('23:59'), true);
    });

    it('rejects invalid time formats', () => {
      assert.equal(isValidTimeFormat('9:00'), false);
      assert.equal(isValidTimeFormat('24:00'), false);
      assert.equal(isValidTimeFormat('25:30'), false);
      assert.equal(isValidTimeFormat('12:60'), false);
      assert.equal(isValidTimeFormat(''), false);
      assert.equal(isValidTimeFormat(null), false);
      assert.equal(isValidTimeFormat(undefined), false);
      assert.equal(isValidTimeFormat(1200), false);
    });

    it('converts HH:mm to correct minute of day', () => {
      assert.equal(parseTimeToMinutes('00:00'), 0);
      assert.equal(parseTimeToMinutes('09:00'), 540);
      assert.equal(parseTimeToMinutes('09:30'), 570);
      assert.equal(parseTimeToMinutes('14:45'), 885);
      assert.equal(parseTimeToMinutes('23:59'), 1439);
    });

    it('validates startTime must be strictly earlier than endTime', () => {
      assert.deepEqual(validateTimeRange('09:00', '10:00'), { valid: true });
      assert.deepEqual(validateTimeRange('10:00', '10:00'), {
        valid: false,
        error: 'startTime must be earlier than endTime'
      });
      assert.deepEqual(validateTimeRange('11:00', '10:00'), {
        valid: false,
        error: 'startTime must be earlier than endTime'
      });
      assert.deepEqual(validateTimeRange('invalid', '10:00'), {
        valid: false,
        error: 'startTime must be a valid 24-hour time in HH:mm format'
      });
      assert.deepEqual(validateTimeRange('09:00', '25:00'), {
        valid: false,
        error: 'endTime must be a valid 24-hour time in HH:mm format'
      });
    });

    it('validates allowed days of the week (Monday - Saturday)', () => {
      assert.equal(isValidDayOfWeek('Monday'), true);
      assert.equal(isValidDayOfWeek('Wednesday'), true);
      assert.equal(isValidDayOfWeek('Saturday'), true);
      assert.equal(isValidDayOfWeek('Sunday'), false); // MVP scope excludes Sunday
      assert.equal(isValidDayOfWeek('Funday'), false);
    });
  });

  describe('2. Time Interval Overlap Logic (startA < endB && startB < endA)', () => {
    it('returns false for non-overlapping sessions separated by time', () => {
      // 09:00-10:00 (540-600) and 11:00-12:00 (660-720)
      assert.equal(hasTimeOverlap(540, 600, 660, 720), false);
      assert.equal(hasTimeOverlap(660, 720, 540, 600), false);
    });

    it('returns false for adjacent sessions (touching boundary endpoints)', () => {
      // 09:00-10:00 (540-600) and 10:00-11:00 (600-660)
      assert.equal(hasTimeOverlap(540, 600, 600, 660), false);
      assert.equal(hasTimeOverlap(600, 660, 540, 600), false);
    });

    it('returns true for overlapping sessions', () => {
      // Partial overlap: 09:30-10:30 (570-630) and 10:00-11:00 (600-660)
      assert.equal(hasTimeOverlap(570, 630, 600, 660), true);
      assert.equal(hasTimeOverlap(600, 660, 570, 630), true);

      // Fully contained: 10:15-10:45 (615-645) inside 10:00-11:00 (600-660)
      assert.equal(hasTimeOverlap(615, 645, 600, 660), true);
      assert.equal(hasTimeOverlap(600, 660, 615, 645), true);

      // Identical interval: 10:00-11:00 (600-660) and 10:00-11:00 (600-660)
      assert.equal(hasTimeOverlap(600, 660, 600, 660), true);
    });
  });

  describe('3. Day of Week Isolation', () => {
    it('does not clash if sessions are on different days even with same time, room, and cohort', () => {
      const candidate = {
        dayOfWeek: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
        room: 'C-301',
        course: { facultyName: 'Dr. Rao', courseCode: 'CS101' },
        timetable: { academicYear: '2026-2027', semester: 3, section: 'A' }
      };

      const existingTuesday = {
        _id: 'sess-2',
        dayOfWeek: 'Tuesday',
        startTime: '09:00',
        endTime: '10:00',
        room: 'C-301',
        course: { facultyName: 'Dr. Rao', courseCode: 'CS101' },
        timetable: { academicYear: '2026-2027', semester: 3, section: 'A' }
      };

      const result = detectClashes(candidate, [existingTuesday]);
      assert.equal(result.hasClash, false);
      assert.equal(result.conflicts.length, 0);
    });
  });

  describe('4. Section Clash (Same Cohort: academicYear, semester, section)', () => {
    const existing = {
      _id: 'sess-cohort-1',
      dayOfWeek: 'Monday',
      startTime: '09:00',
      endTime: '10:30',
      room: 'Room-101',
      course: { courseCode: 'CS201', title: 'Data Structures', facultyName: 'Dr. Rao' },
      timetable: { academicYear: '2026-2027', semester: 3, section: 'A' }
    };

    it('detects SECTION_CLASH when same cohort has overlapping sessions in different rooms', () => {
      const candidate = {
        dayOfWeek: 'Monday',
        startTime: '10:00',
        endTime: '11:00',
        room: 'Room-202', // different room
        course: { courseCode: 'CS202', title: 'Algorithms', facultyName: 'Dr. Smith' }, // different faculty
        timetable: { academicYear: '2026-2027', semester: 3, section: 'A' } // same cohort
      };

      const result = detectClashes(candidate, [existing]);
      assert.equal(result.hasClash, true);
      assert.equal(result.conflicts.length, 1);
      assert.equal(result.conflicts[0].type, 'SECTION_CLASH');
      assert.equal(result.conflicts[0].conflictingSessionId, 'sess-cohort-1');
      assert.equal(result.conflicts[0].courseCode, 'CS201');
    });

    it('does not clash if section is different', () => {
      const candidateDiffSection = {
        dayOfWeek: 'Monday',
        startTime: '10:00',
        endTime: '11:00',
        room: 'Room-202',
        course: { courseCode: 'CS202', title: 'Algorithms', facultyName: 'Dr. Smith' },
        timetable: { academicYear: '2026-2027', semester: 3, section: 'B' } // section B
      };

      const result = detectClashes(candidateDiffSection, [existing]);
      assert.equal(result.hasClash, false);
    });

    it('does not clash if semester is different', () => {
      const candidateDiffSem = {
        dayOfWeek: 'Monday',
        startTime: '10:00',
        endTime: '11:00',
        room: 'Room-202',
        course: { courseCode: 'CS202', title: 'Algorithms', facultyName: 'Dr. Smith' },
        timetable: { academicYear: '2026-2027', semester: 5, section: 'A' } // semester 5
      };

      const result = detectClashes(candidateDiffSem, [existing]);
      assert.equal(result.hasClash, false);
    });
  });

  describe('5. Faculty Clash (Same Faculty: case-insensitive & trimmed)', () => {
    const existing = {
      _id: 'sess-fac-1',
      dayOfWeek: 'Wednesday',
      startTime: '11:00',
      endTime: '12:30',
      room: 'Lab-1',
      course: { courseCode: 'CS301', title: 'OS', facultyName: 'Dr. Raman' },
      timetable: { academicYear: '2026-2027', semester: 5, section: 'A' }
    };

    it('detects FACULTY_CLASH when same instructor teaches another section during overlap', () => {
      const candidate = {
        dayOfWeek: 'Wednesday',
        startTime: '12:00',
        endTime: '13:00',
        room: 'Lab-2', // different room
        course: { courseCode: 'CS302', title: 'Networks', facultyName: '  dr. raman  ' }, // same faculty with whitespace and lowercase
        timetable: { academicYear: '2026-2027', semester: 5, section: 'B' } // different section
      };

      const result = detectClashes(candidate, [existing]);
      assert.equal(result.hasClash, true);
      assert.equal(result.conflicts.length, 1);
      assert.equal(result.conflicts[0].type, 'FACULTY_CLASH');
      assert.equal(result.conflicts[0].conflictingSessionId, 'sess-fac-1');
    });

    it('does not clash when faculty names are different or empty', () => {
      const candidateDiffFac = {
        dayOfWeek: 'Wednesday',
        startTime: '12:00',
        endTime: '13:00',
        room: 'Lab-2',
        course: { courseCode: 'CS302', title: 'Networks', facultyName: 'Prof. Sharma' },
        timetable: { academicYear: '2026-2027', semester: 5, section: 'B' }
      };

      const result = detectClashes(candidateDiffFac, [existing]);
      assert.equal(result.hasClash, false);
    });
  });

  describe('6. Room Clash (Same Room: case-insensitive & trimmed)', () => {
    const existing = {
      _id: 'sess-room-1',
      dayOfWeek: 'Thursday',
      startTime: '14:00',
      endTime: '15:30',
      room: 'C-301',
      course: { courseCode: 'MATH101', title: 'Calculus', facultyName: 'Prof. A' },
      timetable: { academicYear: '2026-2027', semester: 1, section: 'A' }
    };

    it('detects ROOM_CLASH when another class books the same room during overlap', () => {
      const candidate = {
        dayOfWeek: 'Thursday',
        startTime: '15:00',
        endTime: '16:00',
        room: '  c-301  ', // same room with extra spaces and lowercase
        course: { courseCode: 'PHY101', title: 'Physics', facultyName: 'Prof. B' },
        timetable: { academicYear: '2026-2027', semester: 1, section: 'B' }
      };

      const result = detectClashes(candidate, [existing]);
      assert.equal(result.hasClash, true);
      assert.equal(result.conflicts.length, 1);
      assert.equal(result.conflicts[0].type, 'ROOM_CLASH');
      assert.equal(result.conflicts[0].conflictingSessionId, 'sess-room-1');
      assert.equal(result.conflicts[0].room, 'C-301');
    });

    it('does not clash when room is different', () => {
      const candidateDiffRoom = {
        dayOfWeek: 'Thursday',
        startTime: '15:00',
        endTime: '16:00',
        room: 'C-302',
        course: { courseCode: 'PHY101', title: 'Physics', facultyName: 'Prof. B' },
        timetable: { academicYear: '2026-2027', semester: 1, section: 'B' }
      };

      const result = detectClashes(candidateDiffRoom, [existing]);
      assert.equal(result.hasClash, false);
    });
  });

  describe('7. Multiple Simultaneous Conflict Types', () => {
    it('returns SECTION_CLASH, FACULTY_CLASH, and ROOM_CLASH when all 3 coincide', () => {
      const existing = {
        _id: 'sess-multi-1',
        dayOfWeek: 'Friday',
        startTime: '09:00',
        endTime: '10:30',
        room: 'Auditorium-1',
        course: { courseCode: 'CS401', title: 'Machine Learning', facultyName: 'Dr. Rao' },
        timetable: { academicYear: '2026-2027', semester: 7, section: 'A' }
      };

      const candidate = {
        dayOfWeek: 'Friday',
        startTime: '10:00',
        endTime: '11:00',
        room: 'auditorium-1',
        course: { courseCode: 'CS402', title: 'AI', facultyName: 'dr. rao' },
        timetable: { academicYear: '2026-2027', semester: 7, section: 'A' }
      };

      const result = detectClashes(candidate, [existing]);
      assert.equal(result.hasClash, true);
      assert.equal(result.conflicts.length, 3);

      const types = result.conflicts.map(c => c.type);
      assert.ok(types.includes('SECTION_CLASH'));
      assert.ok(types.includes('FACULTY_CLASH'));
      assert.ok(types.includes('ROOM_CLASH'));
    });
  });

  describe('8. Self-Exclusion When Editing a Session', () => {
    it('does not conflict with itself when updating a session', () => {
      const existingSelf = {
        _id: '665f00000000000000000099',
        dayOfWeek: 'Saturday',
        startTime: '10:00',
        endTime: '11:00',
        room: 'C-101',
        course: { courseCode: 'CS100', title: 'Intro CS', facultyName: 'Dr. Rao' },
        timetable: { academicYear: '2026-2027', semester: 1, section: 'A' }
      };

      // Updating the session with a slightly adjusted time
      const candidateUpdate = {
        _id: '665f00000000000000000099',
        dayOfWeek: 'Saturday',
        startTime: '10:15',
        endTime: '11:15',
        room: 'C-101',
        course: { courseCode: 'CS100', title: 'Intro CS', facultyName: 'Dr. Rao' },
        timetable: { academicYear: '2026-2027', semester: 1, section: 'A' }
      };

      const result = detectClashes(candidateUpdate, [existingSelf], {
        excludeSessionId: '665f00000000000000000099'
      });

      assert.equal(result.hasClash, false);
      assert.equal(result.conflicts.length, 0);
    });

    it('still detects clash with a different session during update', () => {
      const existingOther = {
        _id: '665f00000000000000000088',
        dayOfWeek: 'Saturday',
        startTime: '10:30',
        endTime: '11:30',
        room: 'C-101',
        course: { courseCode: 'CS102', title: 'Web Dev', facultyName: 'Prof. Smith' },
        timetable: { academicYear: '2026-2027', semester: 1, section: 'B' }
      };

      const candidateUpdate = {
        _id: '665f00000000000000000099',
        dayOfWeek: 'Saturday',
        startTime: '10:15',
        endTime: '11:15',
        room: 'C-101',
        course: { courseCode: 'CS100', title: 'Intro CS', facultyName: 'Dr. Rao' },
        timetable: { academicYear: '2026-2027', semester: 1, section: 'A' }
      };

      const result = detectClashes(candidateUpdate, [existingOther], {
        excludeSessionId: '665f00000000000000000099'
      });

      assert.equal(result.hasClash, true);
      assert.equal(result.conflicts[0].type, 'ROOM_CLASH');
      assert.equal(result.conflicts[0].conflictingSessionId, '665f00000000000000000088');
    });
  });

  describe('9. Timetable-Wide Clash Detection (detectTimetableClashes)', () => {
    it('identifies internal conflicts across multiple sessions', () => {
      const sessions = [
        {
          _id: 's1',
          dayOfWeek: 'Monday',
          startTime: '09:00',
          endTime: '10:00',
          room: '101',
          course: { facultyName: 'Dr. A', courseCode: 'C1' },
          timetable: { academicYear: '2026-2027', semester: 1, section: 'A' }
        },
        {
          _id: 's2',
          dayOfWeek: 'Monday',
          startTime: '09:30',
          endTime: '10:30',
          room: '101', // room clash with s1
          course: { facultyName: 'Dr. B', courseCode: 'C2' },
          timetable: { academicYear: '2026-2027', semester: 1, section: 'B' }
        },
        {
          _id: 's3',
          dayOfWeek: 'Monday',
          startTime: '10:30',
          endTime: '11:30',
          room: '101', // adjacent to s2 (10:30) -> no clash
          course: { facultyName: 'Dr. C', courseCode: 'C3' },
          timetable: { academicYear: '2026-2027', semester: 1, section: 'A' }
        }
      ];

      const { hasClash, conflicts } = detectTimetableClashes(sessions);
      assert.equal(hasClash, true);
      assert.equal(conflicts.length, 1);
      assert.equal(conflicts[0].type, 'ROOM_CLASH');
    });
  });

  describe('10. API Contract Payload Compliance', () => {
    it('returns conflict objects with all required keys from API_CONTRACT.md', () => {
      const existing = {
        _id: '665f00000000000000000022',
        dayOfWeek: 'Monday',
        startTime: '09:30',
        endTime: '10:30',
        room: 'C-301',
        course: { courseCode: 'CS202', title: 'Database Systems', facultyName: 'Dr. Jones' },
        timetable: { academicYear: '2026-2027', semester: 3, section: 'E' }
      };

      const candidate = {
        dayOfWeek: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
        room: 'C-301',
        course: { courseCode: 'CS201', title: 'Data Structures', facultyName: 'Dr. Rao' },
        timetable: { academicYear: '2026-2027', semester: 3, section: 'B' }
      };

      const { conflicts } = detectClashes(candidate, [existing]);
      const conflict = conflicts[0];

      assert.equal(conflict.type, 'ROOM_CLASH');
      assert.ok(typeof conflict.message === 'string' && conflict.message.length > 0);
      assert.equal(conflict.conflictingSessionId, '665f00000000000000000022');
      assert.equal(conflict.courseCode, 'CS202');
      assert.equal(conflict.courseTitle, 'Database Systems');
      assert.equal(conflict.dayOfWeek, 'Monday');
      assert.equal(conflict.startTime, '09:30');
      assert.equal(conflict.endTime, '10:30');
      assert.equal(conflict.room, 'C-301');
    });
  });
});
