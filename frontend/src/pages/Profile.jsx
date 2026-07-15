import { useState, useEffect } from "react";
import { updateProfile, changePassword } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import ErrorBox from "../components/common/ErrorBox";
import useDocumentMeta from "../hooks/useDocumentMeta";
import { isPushSupported, getPushStatus, enablePush, disablePush } from "../lib/push";

export default function Profile() {
  useDocumentMeta({ title: "Profile", noindex: true });

  const { user, login } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [pushState, setPushState] = useState({ loading: true, supported: false, subscribed: false, denied: false });
  const [pushError, setPushError] = useState("");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setPushState({ loading: false, supported: false, subscribed: false, denied: false });
      return;
    }
    getPushStatus()
      .then((s) => setPushState({ loading: false, ...s }))
      .catch(() => setPushState({ loading: false, supported: false, subscribed: false, denied: false }));
  }, []);

  const handleTogglePush = async () => {
    setPushError("");
    setPushBusy(true);
    try {
      if (pushState.subscribed) {
        await disablePush();
        setPushState((s) => ({ ...s, subscribed: false }));
      } else {
        await enablePush();
        setPushState((s) => ({ ...s, subscribed: true, denied: false }));
      }
    } catch (err) {
      setPushError(err.message || "Couldn't update push notification settings.");
    } finally {
      setPushBusy(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess(false);
    setSavingProfile(true);
    try {
      const res = await updateProfile({ name, phone });
      // Refresh the locally stored user (keeps token, updates the profile fields)
      login(localStorage.getItem("token"), res.data);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      const details = err.response?.data?.details;
      setProfileError(details?.[0]?.message || err.response?.data?.message || "Couldn't save changes.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      return setPasswordError("New password must be at least 8 characters.");
    }

    setSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      const details = err.response?.data?.details;
      setPasswordError(details?.[0]?.message || err.response?.data?.message || "Could not change password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink mb-1">Profile</h1>
        <p className="text-sm text-inkSoft">Manage your account details.</p>
      </div>

      {/* Profile info */}
      <Card className="p-6 sm:p-8">
        <h2 className="font-display font-semibold text-ink mb-5">Account details</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          {profileError && <ErrorBox>{profileError}</ErrorBox>}
          {profileSuccess && (
            <div className="text-sm text-amber-dark bg-amber/10 border border-amber/30 rounded-md px-3 py-2.5">
              Profile updated.
            </div>
          )}

          <div>
            <label className="field-label">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field-input"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="field-label">Email</label>
            <input value={user?.email || ""} disabled className="field-input opacity-60 cursor-not-allowed" />
            <p className="text-xs text-inkFaint mt-1.5">Email can't be changed.</p>
          </div>

          <div>
            <label className="field-label">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="field-input"
              placeholder="10-digit number"
            />
          </div>

          <div>
            <label className="field-label">Role</label>
            <input
              value={user?.role === "collector" ? "Collector" : "Requester"}
              disabled
              className="field-input opacity-60 cursor-not-allowed capitalize"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save changes"}
          </button>
        </form>
      </Card>

      {/* Push notifications */}
      <Card className="p-6 sm:p-8">
        <h2 className="font-display font-semibold text-ink mb-1.5">Push notifications</h2>
        <p className="text-sm text-inkSoft mb-5">
          Get notified on this device even when ScrapConnect isn't open — pickup updates, new
          messages, and offers accepted.
        </p>

        {pushError && <div className="mb-4"><ErrorBox>{pushError}</ErrorBox></div>}

        {pushState.loading ? (
          <p className="text-sm text-inkFaint">Checking status…</p>
        ) : !pushState.supported ? (
          <p className="text-sm text-inkFaint">Not supported in this browser.</p>
        ) : pushState.denied ? (
          <p className="text-sm text-inkFaint">
            Notifications are blocked for this site in your browser settings. Enable them there, then refresh this page.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-ink">
              {pushState.subscribed ? "Enabled on this device" : "Currently off"}
            </span>
            <button
              onClick={handleTogglePush}
              disabled={pushBusy}
              className={pushState.subscribed ? "btn-secondary" : "btn-primary"}
            >
              {pushBusy ? "Working…" : pushState.subscribed ? "Turn off" : "Turn on"}
            </button>
          </div>
        )}
      </Card>

      {/* Password change */}
      <Card className="p-6 sm:p-8">
        <h2 className="font-display font-semibold text-ink mb-5">Change password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordError && <ErrorBox>{passwordError}</ErrorBox>}
          {passwordSuccess && (
            <div className="text-sm text-amber-dark bg-amber/10 border border-amber/30 rounded-md px-3 py-2.5">
              Password changed successfully.
            </div>
          )}

          <div>
            <label className="field-label">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="field-input"
              placeholder="Enter your current password"
            />
          </div>

          <div>
            <label className="field-label">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="field-input"
              placeholder="Min. 8 characters, 1 letter, 1 number"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={savingPassword}>
            {savingPassword ? "Updating…" : "Change password"}
          </button>
        </form>
      </Card>
    </div>
  );
}