// src/components/user/privateroute.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * PrivateRoute can be used two ways:
 *  - <Route element={<PrivateRoute />}><Route path="..." element={...} /></Route>
 *  - <Route path="/" element={<PrivateRoute><AppLayout/></PrivateRoute>} />
 *
 * This component checks for access token and either renders children or redirects to /login.
 */
export default function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // not authenticated -> send to login and preserve where user wanted to go
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If children were provided, render them. Otherwise allow nested routes via Outlet.
  return children ? children : <Outlet />;
}
