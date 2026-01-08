import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TripDetailsPage from './pages/TripDetailsPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/trip/:tripId" element={<TripDetailsPage />} />
      </Routes>
    </Router>
  );
}

export default App;