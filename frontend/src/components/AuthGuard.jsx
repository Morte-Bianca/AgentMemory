import React from 'react';
import { Navigate } from 'react-router-dom';
import { client } from '../api/client';

const AuthGuard = ({ children }) => {
  if (!client.apiKey) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default AuthGuard;
