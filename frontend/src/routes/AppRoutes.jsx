import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Home from "../pages/Home";
import ProtectedRoute from "./ProtectedRoute";
import Loader from "../components/common/Loader";

// Everything except Home is lazy-loaded. Home is the landing page almost
// every visitor hits first (including logged-out traffic and search
// crawlers), so it stays in the main bundle for the fastest possible first
// paint; every other route — auth forms, both dashboards, admin, profile —
// only downloads its JS when the person actually navigates there. This is
// what took the single ~1MB bundle down to a small shared chunk plus one
// small chunk per page, which matters most on the slower mobile connections
// this app is mainly used on.
const Login = lazy(() => import("../pages/auth/Login"));
const AboutUs = lazy(() => import("../pages/AboutUs"));const Register = lazy(() => import("../pages/auth/Register"));
const AdminLogin = lazy(() => import("../pages/auth/AdminLogin"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const VerifyEmail = lazy(() => import("../pages/auth/VerifyEmail"));

const UserDashboard = lazy(() => import("../pages/user/Dashboard"));
const RequestPickup = lazy(() => import("../pages/user/RequestPickup"));
const MyRequests = lazy(() => import("../pages/user/MyRequests"));

const CollectorDashboard = lazy(() => import("../pages/collector/Dashboard"));
const Profile = lazy(() => import("../pages/Profile"));
const NotFound = lazy(() => import("../pages/NotFound"));
const AdminPanel = lazy(() => import("../pages/AdminPanel"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/home" element={<Navigate to="/" replace />} />

        <Route path="/about" element={<AboutUs />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

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
              <AdminPanel />
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

        {/* Catch-all — must stay last so it doesn't shadow real routes above it */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}