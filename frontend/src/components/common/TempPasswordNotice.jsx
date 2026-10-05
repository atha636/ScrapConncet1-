import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Shown to a collector whose account an admin created with a temporary
// password (user.mustChangePassword). It reappears on every login until the
// password is actually changed from the Profile page, which clears the flag.
export default function TempPasswordNotice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);

  if (!user?.mustChangePassword || dismissed || location.pathname === "/profile") return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-surface border border-line rounded-lg shadow-lg max-w-sm w-full p-6">
        <h2 className="font-display text-lg font-bold text-ink mb-2">Change your temporary password</h2>
        <p className="text-sm text-inkSoft mb-5">
          You're signed in with a temporary password. Open your Profile and set a new one using the "Current password"
          and "New password" form.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/profile")}
            className="flex-1 bg-rust text-white text-sm font-medium py-2 rounded-md"
          >
            Go to Profile
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-sm px-4 py-2 rounded-md border border-line text-inkSoft"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}