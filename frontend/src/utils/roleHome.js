// Single source of truth for "which page is this role's home base" — used
// by ProtectedRoute (role-mismatch redirects) and the auth pages
// (redirecting an already-logged-in visitor away from login/register).
export const ROLE_HOME = {
  collector: "/collector",
  admin: "/admin",
  user: "/dashboard",
};

export function roleHome(role) {
  return ROLE_HOME[role] || "/dashboard";
}