const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createSession,
  getSessionById,
  updateSession,
  deleteSession
} = require('../src/routes/sessions');

describe('Session Routes Controller - Unit Tests', () => {

  function createMockRes() {
    return {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
      send(data) {
        this.body = data;
        return this;
      }
    };
  }

  it('rejects createSession with invalid timetableId format (400)', async () => {
    const req = {
      params: { id: 'invalid-id' },
      body: {
        courseId: '665f00000000000000000001',
        dayOfWeek: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
        room: 'C-301'
      }
    };
    const res = createMockRes();
    let nextCalled = false;

    await createSession(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.equal(nextCalled, false);
  });

  it('rejects createSession with invalid time range startTime >= endTime (400)', async () => {
    const req = {
      params: { id: '665f00000000000000000010' },
      body: {
        courseId: '665f00000000000000000001',
        dayOfWeek: 'Monday',
        startTime: '11:00',
        endTime: '10:00',
        room: 'C-301'
      }
    };
    const res = createMockRes();
    let nextCalled = false;

    await createSession(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.equal(res.body.error.message, 'startTime must be earlier than endTime');
    assert.equal(nextCalled, false);
  });

  it('rejects createSession with invalid dayOfWeek (400)', async () => {
    const req = {
      params: { id: '665f00000000000000000010' },
      body: {
        courseId: '665f00000000000000000001',
        dayOfWeek: 'Sunday',
        startTime: '09:00',
        endTime: '10:00',
        room: 'C-301'
      }
    };
    const res = createMockRes();

    await createSession(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.match(res.body.error.message, /Monday through Saturday/);
  });

  it('rejects getSessionById with invalid ObjectId (400)', async () => {
    const req = { params: { id: 'not-an-object-id' } };
    const res = createMockRes();

    await getSessionById(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('rejects updateSession with invalid time format (400)', async () => {
    const req = {
      params: { id: '665f00000000000000000020' },
      body: {
        startTime: '9:00' // missing leading zero
      }
    };
    const res = createMockRes();

    await updateSession(req, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.match(res.body.error.message, /startTime must be a valid 24-hour time/);
  });

  it('rejects deleteSession with invalid ObjectId (400)', async () => {
    const req = { params: { id: 'bad-id' } };
    const res = createMockRes();

    await deleteSession(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });
});
