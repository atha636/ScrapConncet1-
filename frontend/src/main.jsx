import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext"; // 👈 add this
import { ThemeProvider } from "./context/ThemeContext";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { hasGoogleAuth } from "./utils/googleAuthConfig";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// GoogleOAuthProvider requires a real clientId to be useful, but shouldn't
// be a hard dependency for the rest of the app to boot — without wrapping
// conditionally here, the app would crash on startup if
// VITE_GOOGLE_CLIENT_ID isn't set yet (e.g. running locally before Google
// sign-in has been configured). GoogleSignInButton (see components/auth)
// separately renders nothing in that case, so email/password auth is
// entirely unaffected either way.
const appTree = (
  <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </ThemeProvider>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    {hasGoogleAuth ? (
      <GoogleOAuthProvider clientId={googleClientId}>{appTree}</GoogleOAuthProvider>
    ) : (
      appTree
    )}
  </ErrorBoundary>
);

// Registered unconditionally (not just when the user opts into push) —
// an active SW registration is one of the browser's installability
// requirements for "Add to Home Screen" / the install prompt.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  });
}