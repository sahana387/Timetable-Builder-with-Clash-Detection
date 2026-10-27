const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

// Minimal mock request/response helper for express app
function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(key, val) { this.headers[key] = val; },
    getHeader(key) { return this.headers[key]; },
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

describe('Backend Express & CRUD Setup - Unit Tests (Teammate 3)', () => {

  describe('1. Health Check Endpoint', () => {
    it('returns 200 OK with status and service description for /api/health', (t, done) => {
      const req = {
        method: 'GET',
        url: '/api/health',
        headers: {}
      };
      const res = createMockRes();
      res.json = function(data) {
        assert.equal(res.statusCode, 200);
        assert.equal(data.status, 'ok');
        assert.ok(data.timestamp);
        assert.equal(data.service, 'Timetable Builder API');
        done();
      };

      app.handle(req, res);
    });

    it('returns 200 OK for root /health', (t, done) => {
      const req = {
        method: 'GET',
        url: '/health',
        headers: {}
      };
      const res = createMockRes();
      res.json = function(data) {
        assert.equal(res.statusCode, 200);
        assert.equal(data.status, 'ok');
        done();
      };

      app.handle(req, res);
    });
  });

  describe('2. Course Validation Rules', () => {
    it('rejects POST /api/courses without courseCode (400)', (t, done) => {
      const req = {
        method: 'POST',
        url: '/api/courses',
        headers: { 'content-type': 'application/json' },
        body: {
          title: 'Algorithms',
          facultyName: 'Dr. Smith'
        }
      };
      const res = createMockRes();
      res.json = function(data) {
        assert.equal(res.statusCode, 400);
        assert.equal(data.error.code, 'VALIDATION_ERROR');
        assert.match(data.error.message, /courseCode is required/);
        done();
      };

      app.handle(req, res);
    });

    it('rejects POST /api/courses with negative credits (400)', (t, done) => {
      const req = {
        method: 'POST',
        url: '/api/courses',
        headers: { 'content-type': 'application/json' },
        body: {
          courseCode: 'CS101',
          title: 'Algorithms',
          facultyName: 'Dr. Smith',
          credits: -2
        }
      };
      const res = createMockRes();
      res.json = function(data) {
        assert.equal(res.statusCode, 400);
        assert.equal(data.error.code, 'VALIDATION_ERROR');
        assert.match(data.error.message, /credits must be a non-negative number/);
        done();
      };

      app.handle(req, res);
    });

    it('rejects GET /api/courses/:id with invalid ObjectId format (400)', (t, done) => {
      const req = {
        method: 'GET',
        url: '/api/courses/not-a-valid-id',
        headers: {}
      };
      const res = createMockRes();
      res.json = function(data) {
        assert.equal(res.statusCode, 400);
        assert.equal(data.error.code, 'VALIDATION_ERROR');
        assert.match(data.error.message, /Invalid course ID format/);
        done();
      };

      app.handle(req, res);
    });
  });

  describe('3. Timetable Validation Rules', () => {
    it('rejects POST /api/timetables without name (400)', (t, done) => {
      const req = {
        method: 'POST',
        url: '/api/timetables',
        headers: { 'content-type': 'application/json' },
        body: {
          academicYear: '2026-2027',
          semester: 3,
          section: 'A'
        }
      };
      const res = createMockRes();
      res.json = function(data) {
        assert.equal(res.statusCode, 400);
        assert.equal(data.error.code, 'VALIDATION_ERROR');
        assert.match(data.error.message, /name is required/);
        done();
      };

      app.handle(req, res);
    });

    it('rejects POST /api/timetables with invalid semester <= 0 (400)', (t, done) => {
      const req = {
        method: 'POST',
        url: '/api/timetables',
        headers: { 'content-type': 'application/json' },
        body: {
          name: 'Section B',
          academicYear: '2026-2027',
          semester: 0,
          section: 'B'
        }
      };
      const res = createMockRes();
      res.json = function(data) {
        assert.equal(res.statusCode, 400);
        assert.equal(data.error.code, 'VALIDATION_ERROR');
        assert.match(data.error.message, /semester must be a positive integer/);
        done();
      };

      app.handle(req, res);
    });

    it('rejects GET /api/timetables/:id with invalid ObjectId format (400)', (t, done) => {
      const req = {
        method: 'GET',
        url: '/api/timetables/bad-id',
        headers: {}
      };
      const res = createMockRes();
      res.json = function(data) {
        assert.equal(res.statusCode, 400);
        assert.equal(data.error.code, 'VALIDATION_ERROR');
        assert.match(data.error.message, /Invalid timetable ID format/);
        done();
      };

      app.handle(req, res);
    });
  });

  describe('4. 404 and Error Handling Middleware', () => {
    it('returns 404 NOT_FOUND for unknown endpoints', (t, done) => {
      const req = {
        method: 'GET',
        url: '/api/nonexistent-route-path',
        headers: {}
      };
      const res = createMockRes();
      res.json = function(data) {
        assert.equal(res.statusCode, 404);
        assert.equal(data.error.code, 'NOT_FOUND');
        done();
      };

      app.handle(req, res);
    });
  });
});
