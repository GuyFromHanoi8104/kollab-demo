import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

// Guards routes that genuinely require an account: Dashboard, Manage
// Campaigns, Saved Creators, Messages, Settings. Redirects to Login if
// there's no real Supabase session.
//
// Browsing is public -- NOT applied to /discover (Discover Creators),
// /discover-brands, /campaigns, or /creator/:id (Creator Profile). Those
// pages handle guests themselves: hiding account-only sections (Recently
// Viewed, Saved Lists) and gating specific actions (e.g. Creator Profile's
// "Invite to Campaign" button checks login itself and redirects rather than
// blocking the whole page).
//
// NOTE: checks "logged in at all", not role (brand vs creator).
export default function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();

  // Wait for the initial session check before deciding -- otherwise a
  // logged-in user briefly flashes a redirect to /login on page load.
  if (loading) {
    return null;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}