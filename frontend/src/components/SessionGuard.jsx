import React from 'react';
import { Navigate } from 'react-router-dom';
import { client } from '../api/client';

const SessionGuard = ({ children }) => {
  if (!client.sessionToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default SessionGuard;