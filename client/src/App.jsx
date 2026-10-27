import React, { useState } from 'react';
import TimetableGrid from './components/TimetableGrid';

function App() {
  // State managed at the app level, coordinating with Teammate 2's API client
  const [selectedTimetable, setSelectedTimetable] = useState({
    _id: 'default-timetable',
    name: 'Weekly Class Schedule',
    academicYear: '2026-2027',
    semester: 3,
    section: 'E'
  });

  const [sessions, setSessions] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Edit / delete handlers to pass down to TimetableGrid
  const handleEditSession = (session) => {
    // Teammate 2 can hook into this callback to populate SessionForm
    console.log('Edit session requested:', session);
  };

  const handleDeleteSession = (sessionId) => {
    // Teammate 2 can hook into this callback or trigger DELETE /api/sessions/:id
    setSessions((prev) => prev.filter((s) => s._id !== sessionId && s.id !== sessionId));
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
            <span className="meta-pill" title="Current Academic Session">
              Academic Year: {selectedTimetable?.academicYear || '2026-2027'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="app-main">
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

        {/* Weekly Timetable Grid Visualization */}
        <section aria-label="Weekly Schedule Visualization">
          <TimetableGrid
            timetable={selectedTimetable}
            sessions={sessions}
            conflicts={conflicts}
            isLoading={isLoading}
            onEditSession={handleEditSession}
            onDeleteSession={handleDeleteSession}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
