import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      // Check if user has completed onboarding
      checkOnboardingStatus(token);
    } else {
      setLoading(false);
    }
  }, []);

  const checkOnboardingStatus = async (token) => {
    try {
      const response = await fetch('http://localhost:5000/api/dashboard/preferences', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setHasCompletedOnboarding(!!data);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (token) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    checkOnboardingStatus(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setHasCompletedOnboarding(false);
  };

  const handleOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to={hasCompletedOnboarding ? '/dashboard' : '/onboarding'} />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/signup"
          element={
            isAuthenticated ? (
              <Navigate to={hasCompletedOnboarding ? '/dashboard' : '/onboarding'} />
            ) : (
              <Signup onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/onboarding"
          element={
            isAuthenticated ? (
              hasCompletedOnboarding ? (
                <Navigate to="/dashboard" />
              ) : (
                <Onboarding onComplete={handleOnboardingComplete} />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              hasCompletedOnboarding ? (
                <Dashboard onLogout={handleLogout} />
              ) : (
                <Navigate to="/onboarding" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
