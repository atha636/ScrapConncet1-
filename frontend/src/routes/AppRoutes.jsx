import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import AdminLogin from "../pages/auth/AdminLogin";
import Home from "../pages/Home";

import UserDashboard from "../pages/user/Dashboard";
import RequestPickup from "../pages/user/RequestPickup";
import MyRequests from "../pages/user/MyRequests";

import CollectorDashboard from "../pages/collector/Dashboard";
import Profile from "../pages/Profile";

import ProtectedRoute from "./ProtectedRoute";
import Loader from "../components/common/Loader";

// Code-split — AdminPanel pulls in Recharts (and its D3 dependencies),
// which added ~400KB to the bundle. Only admins ever see this page, so it
// shouldn't cost every requester/collector a slower initial load.
const AdminPanel = lazy(() => import("../pages/AdminPanel"));

export default function AppRoutes() {
  return (
    <Routes>

      {/* The actual site root — public marketing page, no login required */}
      <Route path="/" element={<Home />} />
      {/* Old bookmarks/links to /home still work */}
      <Route path="/home" element={<Navigate to="/" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin-login" element={<AdminLogin />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute role="user">
            <UserDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/request"
        element={
          <ProtectedRoute role="user">
            <RequestPickup />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-requests"
        element={
          <ProtectedRoute role="user">
            <MyRequests />
          </ProtectedRoute>
        }
      />

      <Route
        path="/collector"
        element={
          <ProtectedRoute role="collector">
            <CollectorDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <Suspense fallback={<Loader />}>
              <AdminPanel />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* No role restriction — every role has a profile */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

    </Routes>
  );
}