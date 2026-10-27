import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getTimetableSessions,
  deleteSession,
  getCourses,
  checkHealth
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
  const [conflicts, setConflicts] = useState([]);
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

    // Also pre-fetch courses
    getCourses()
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch(() => {});
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
    setConflicts([]);
  }, [fetchSessions]);

  const handleSelectTimetable = (timetable) => {
    setSelectedTimetable(timetable);
    setEditingSession(null);
    setConflicts([]);
  };

  const handleCoursesChange = (newCourses) => {
    setCourses(newCourses);
  };

  const handleSessionSaved = () => {
    setEditingSession(null);
    setConflicts([]);
    fetchSessions();
  };

  const handleStartEditSession = (session) => {
    setEditingSession(session);
    setConflicts([]);
    setActiveTab('schedule');
    if (sessionFormRef.current) {
      sessionFormRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEditSession = () => {
    setEditingSession(null);
    setConflicts([]);
  };

  const handleDeleteSession = async (sessionOrId) => {
    const sessionId = typeof sessionOrId === 'string' ? sessionOrId : (sessionOrId?._id || sessionOrId?.id);
    if (!sessionId) return;

    try {
      await deleteSession(sessionId);
      if (editingSession && (editingSession._id === sessionId || editingSession.id === sessionId)) {
        setEditingSession(null);
      }
      await fetchSessions();
    } catch (err) {
      alert(`Failed to delete session: ${err.message}`);
    }
  };

  return (
    <div className="app-shell">
      {/* Top Application Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-wrapper">
            <div className="brand-icon" aria-hidden="true">📅</div>
            <div>
              <h1 className="brand-title">Timetable Builder</h1>
              <p className="brand-subtitle">Smart Scheduling with Conflict Detection</p>
            </div>
          </div>
          <div className="header-actions">
            <span className="meta-pill" title="API Connectivity Status">
              {backendOnline === null
                ? 'Connecting API...'
                : backendOnline
                ? '● API Online'
                : '○ API Offline'}
            </span>
            {selectedTimetable && (
              <span className="meta-pill" title="Academic Year">
                Academic Year: {selectedTimetable.academicYear}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="app-main">
        {/* Navigation Tabs */}
        <nav className="app-tabs" aria-label="Main Sections" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'schedule' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('schedule')}
          >
            Weekly Schedule
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'courses' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('courses')}
          >
            Course Catalogue ({courses.length})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'timetables' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('timetables')}
          >
            Timetables
          </button>
        </nav>

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

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <>
            {/* Timetable Overview Banner & Selector */}
            <TimetableManager
              selectedTimetableId={selectedTimetable?._id}
              onSelectTimetable={handleSelectTimetable}
            />

            {/* Timetable Overview Banner */}
            <div className="timetable-banner">
              <div className="timetable-title-group">
                <h2>{selectedTimetable ? selectedTimetable.name : 'No Timetable Selected'}</h2>
                {selectedTimetable && (
                  <div className="timetable-meta-tags">
                    <span className="meta-pill">Semester {selectedTimetable.semester}</span>
                    <span className="meta-pill">Section {selectedTimetable.section}</span>
                    <span className="meta-pill">{sessions.length} Session{sessions.length === 1 ? '' : 's'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Conflict Notification Panel */}
            <ConflictPanel
              conflicts={conflicts}
              onDismiss={() => setConflicts([])}
            />

            {/* Session Add / Edit Form */}
            <div ref={sessionFormRef}>
              <SessionForm
                selectedTimetable={selectedTimetable}
                courses={courses}
                editingSession={editingSession}
                onSessionSaved={handleSessionSaved}
                onCancelEdit={handleCancelEditSession}
                onConflict={(c) => setConflicts(c || [])}
              />
            </div>

            {sessionError && (
              <div className="feedback-banner error" role="alert" style={{ marginBottom: '1rem' }}>
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

            {/* Weekly Timetable Grid Visualization */}
            <section aria-label="Weekly Schedule Visualization">
              <TimetableGrid
                timetable={selectedTimetable}
                selectedTimetable={selectedTimetable}
                sessions={sessions}
                conflicts={conflicts}
                courses={courses}
                isLoading={sessionsLoading}
                loading={sessionsLoading}
                onEditSession={handleStartEditSession}
                onDeleteSession={handleDeleteSession}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
