import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import api from './utils/api';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setLoading(false);
      return;
    }

    setIsAuthenticated(true);
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const response = await api.get('/dashboard/preferences');
      setHasCompletedOnboarding(!!response.data);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setHasCompletedOnboarding(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (token) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    checkOnboardingStatus();
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
            isAuthenticated
              ? <Navigate to={hasCompletedOnboarding ? '/dashboard' : '/onboarding'} />
              : <Login onLogin={handleLogin} />
          }
        />

        <Route
          path="/signup"
          element={
            isAuthenticated
              ? <Navigate to={hasCompletedOnboarding ? '/dashboard' : '/onboarding'} />
              : <Signup onLogin={handleLogin} />
          }
        />

        <Route
          path="/onboarding"
          element={
            isAuthenticated
              ? hasCompletedOnboarding
                ? <Navigate to="/dashboard" />
                : <Onboarding onComplete={handleOnboardingComplete} />
              : <Navigate to="/login" />
          }
        />

        <Route
          path="/dashboard"
          element={
            isAuthenticated
              ? hasCompletedOnboarding
                ? <Dashboard onLogout={handleLogout} />
                : <Navigate to="/onboarding" />
              : <Navigate to="/login" />
          }
        />

        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
// force commit
