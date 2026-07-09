import { Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import AdminLogin from "../pages/auth/AdminLogin";
import Home from "../pages/Home";

import UserDashboard from "../pages/user/Dashboard";
import RequestPickup from "../pages/user/RequestPickup";
import MyRequests from "../pages/user/MyRequests";

import CollectorDashboard from "../pages/collector/Dashboard";
import Profile from "../pages/Profile";
import AdminPanel from "../pages/AdminPanel";

import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>

      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin-login" element={<AdminLogin />} />

      <Route
        path="/"
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

    </Routes>
  );
}