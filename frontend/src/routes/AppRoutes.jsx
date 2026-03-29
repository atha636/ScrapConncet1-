import { Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

import UserDashboard from "../pages/user/Dashboard";
import RequestPickup from "../pages/user/RequestPickup";
import MyRequests from "../pages/user/MyRequests";

import CollectorDashboard from "../pages/collector/Dashboard";

import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

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

    </Routes>
  );
}