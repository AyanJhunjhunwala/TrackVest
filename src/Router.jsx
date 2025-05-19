import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import TrackVestApp from './TrackVestApp';

/**
 * Application router component
 * Sets up routing for different pages in the application
 */
export default function Router() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<TrackVestApp />} />
          {/* Add other routes as needed */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  );
} 