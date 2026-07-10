import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { roleHome } from "../utils/roleHome";

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  // Prevents redirect flash while auth state is being restored (e.g. from localStorage/token)
  if (loading) return null;

  if (!user) return <Navigate to="/login" />;

  // Send a role-mismatched user to THEIR OWN dashboard, not a hardcoded
  // path — e.g. a collector hitting a user-only route should land on
  // /collector, not get bounced to the public marketing page.
  if (role && user.role !== role) return <Navigate to={roleHome(user.role)} />;

  return children;
}