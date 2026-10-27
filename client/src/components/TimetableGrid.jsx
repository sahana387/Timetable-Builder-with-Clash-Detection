import React from 'react';
import './TimetableGrid.css';

/**
 * TimetableGrid Component
 * Displays weekly class sessions across days (Monday - Saturday) and time blocks.
 */
function TimetableGrid({
  timetable,
  sessions = [],
  conflicts = [],
  isLoading = false,
  onEditSession,
  onDeleteSession
}) {
  if (isLoading) {
    return (
      <div className="grid-loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true"></div>
        <p>Loading schedule...</p>
      </div>
    );
  }

  if (!timetable) {
    return (
      <div className="grid-empty-state">
        <h3>No Timetable Selected</h3>
        <p>Please select or create a timetable to display the weekly schedule.</p>
      </div>
    );
  }

  return (
    <div className="timetable-grid-wrapper">
      <div className="timetable-grid-container">
        {/* Grid content will be fully populated in Milestone 2 */}
        <p>Timetable Grid Shell Ready</p>
      </div>
    </div>
  );
}

export default TimetableGrid;
