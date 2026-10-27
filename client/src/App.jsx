import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getTimetableSessions,
  deleteSession,
  checkHealth,
  ApiError
} from './services/api';
import CourseManager from './components/CourseManager';
import TimetableManager from './components/TimetableManager';
import SessionForm from './components/SessionForm';
import ConflictPanel from './components/ConflictPanel';
import TimetableGrid from './components/TimetableGrid';
import './App.css';

export default function App() {
  const [selectedTimetable, setSelectedTimetable] = useState(null);
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [editingSession, setEditingSession] = useState(null);
  const [conflicts, setConflicts] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionError, setSessionError] = useState(null);
  const [backendOnline, setBackendOnline] = useState(null);
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'courses' | 'timetables'

  const sessionFormRef = useRef(null);

  // Health check on mount
  useEffect(() => {
    checkHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  // Fetch sessions whenever selectedTimetable changes
  const fetchSessions = useCallback(async () => {
    if (!selectedTimetable?._id) {
      setSessions([]);
      return;
    }

    setSessionsLoading(true);
    setSessionError(null);
    try {
      const data = await getTimetableSessions(selectedTimetable._id);
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      setSessionError(err.message || 'Failed to load sessions for this timetable');
    } finally {
      setSessionsLoading(false);
    }
  }, [selectedTimetable?._id]);

  useEffect(() => {
    fetchSessions();
    setEditingSession(null);
    setConflicts(null);
  }, [fetchSessions]);

  const handleSelectTimetable = (timetable) => {
    setSelectedTimetable(timetable);
    setEditingSession(null);
    setConflicts(null);
  };

  const handleCoursesChange = (newCourses) => {
    setCourses(newCourses);
  };

  const handleSessionSaved = () => {
    setEditingSession(null);
    setConflicts(null);
    fetchSessions();
  };

  const handleStartEditSession = (session) => {
    setEditingSession(session);
    setConflicts(null);
    // Switch to schedule tab if on another tab and scroll to form
    setActiveTab('schedule');
    if (sessionFormRef.current) {
      sessionFormRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEditSession = () => {
    setEditingSession(null);
    setConflicts(null);
  };

  const handleDeleteSession = async (session) => {
    const courseObj =
      session.course ||
      (typeof session.courseId === 'object' && session.courseId !== null
        ? session.courseId
        : courses.find((c) => c._id === session.courseId)) ||
      {};

    const title = courseObj.courseCode ? `${courseObj.courseCode} (${session.dayOfWeek} ${session.startTime})` : 'this session';
    if (!window.confirm(`Are you sure you want to delete ${title}?`)) {
      return;
    }

    try {
      await deleteSession(session._id);
      if (editingSession?._id === session._id) {
        setEditingSession(null);
      }
      await fetchSessions();
    } catch (err) {
      alert(`Failed to delete session: ${err.message}`);
    }
  };

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="app-brand">
          <h1>📅 Timetable Builder</h1>
          <p>Schedule manager with automated clash detection</p>
        </div>
        <div className="app-status">
          <span className={`status-dot ${backendOnline === false ? 'error' : ''}`} />
          <span>
            {backendOnline === null
              ? 'Checking API...'
              : backendOnline
              ? 'API Connected (Port 5000)'
              : 'API Offline'}
          </span>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="app-tabs" aria-label="Main Sections">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          Timetable & Schedule
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          Course Catalogue ({courses.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'timetables' ? 'active' : ''}`}
          onClick={() => setActiveTab('timetables')}
        >
          Timetables
        </button>
      </nav>

      {/* Main Content Area */}
      <main>
        {/* Timetables Tab */}
        {activeTab === 'timetables' && (
          <TimetableManager
            selectedTimetableId={selectedTimetable?._id}
            onSelectTimetable={handleSelectTimetable}
          />
        )}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <CourseManager
            onCoursesChange={handleCoursesChange}
          />
        )}

        {/* Schedule Tab (Default & Primary View) */}
        {activeTab === 'schedule' && (
          <>
            {/* Always provide timetable selector on top */}
            <TimetableManager
              selectedTimetableId={selectedTimetable?._id}
              onSelectTimetable={handleSelectTimetable}
            />

            {/* Conflict Notification Panel */}
            <ConflictPanel
              conflicts={conflicts}
              onDismiss={() => setConflicts(null)}
            />

            {/* Session Add / Edit Form */}
            <div ref={sessionFormRef}>
              <SessionForm
                selectedTimetable={selectedTimetable}
                courses={courses}
                editingSession={editingSession}
                onSessionSaved={handleSessionSaved}
                onCancelEdit={handleCancelEditSession}
                onConflict={(c) => setConflicts(c)}
              />
            </div>

            {sessionError && (
              <div className="feedback-banner error" role="alert">
                <span>{sessionError}</span>
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setSessionError(null)}
                >
                  &times;
                </button>
              </div>
            )}

            {/* Timetable Grid View (Integrated with Teammate 1) */}
            <TimetableGrid
              sessions={sessions}
              courses={courses}
              selectedTimetable={selectedTimetable}
              onEditSession={handleStartEditSession}
              onDeleteSession={handleDeleteSession}
              loading={sessionsLoading}
            />
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>Timetable Builder with Clash Detection &bull; Full-stack REST API &amp; React Architecture</p>
      </footer>
    </div>
  );
}
