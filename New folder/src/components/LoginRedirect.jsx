import React from "react";
import { Navigate, useLocation } from "react-router-dom";

// Preserves the page the user tried to reach (e.g. an invite link /join/CODE)
// so we can return there after login.
export default function LoginRedirect() {
  const location = useLocation();
  const next = location.pathname + location.search;
  return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
}