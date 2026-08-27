import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { updateProfile, changePassword, fetchMe } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import ErrorBox from "../components/common/ErrorBox";
import DeleteAccountModal from "../components/profile/DeleteAccountModal";
import useDocumentMeta from "../hooks/useDocumentMeta";
import { isPushSupported, getPushStatus, enablePush, disablePush } from "../lib/push";

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

// Height-animated success/error banners so they don't just pop in and yank
// the form layout — same pattern used on the request-pickup form.
function InlineBanner({ children, tone = "success" }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      {tone === "success" ? (
        <div className="text-sm text-amber-dark bg-amber/10 border border-amber/30 rounded-md px-3 py-2.5">
          {children}
        </div>
      ) : (
        <ErrorBox>{children}</ErrorBox>
      )}
    </motion.div>
  );
}

export default function Profile() {
  useDocumentMeta({ title: "Profile", noindex: true });

  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

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

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  // Defaults to true (the common case) until /auth/me confirms otherwise —
  // asking a password-based user for their password is always correct, so
  // erring this way never blocks anyone from the delete flow.
  const [hasPassword, setHasPassword] = useState(true);

  useEffect(() => {
    if (!isPushSupported()) {
      setPushState({ loading: false, supported: false, subscribed: false, denied: false });
      return;
    }
    getPushStatus()
      .then((s) => setPushState({ loading: false, ...s }))
      .catch(() => setPushState({ loading: false, supported: false, subscribed: false, denied: false }));
  }, []);

  useEffect(() => {
    fetchMe()
      .then((res) => setHasPassword(res.data.hasPassword !== false))
      .catch(() => {});
  }, []);

  const handleAccountDeleted = () => {
    setDeleteModalOpen(false);
    logout();
    navigate("/login");
  };

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
      const res = await changePassword({ currentPassword, newPassword });
      // The backend revokes the old session as part of changing the
      // password (see authController.changePassword) and issues a fresh
      // token in the response — swap it in so this tab keeps working
      // instead of the very next request silently failing as "logged out".
      if (res.data?.token) {
        login(res.data.token, user);
      }
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
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="max-w-2xl mx-auto space-y-6"
    >
      <motion.div variants={fadeUp}>
        <h1 className="font-display text-2xl font-bold text-ink mb-1">Profile</h1>
        <p className="text-sm text-inkSoft">Manage your account details.</p>
      </motion.div>

      {/* Profile info */}
      <motion.div variants={fadeUp}>
        <Card className="p-6 sm:p-8">
          <h2 className="font-display font-semibold text-ink mb-5">Account details</h2>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <AnimatePresence>
              {profileError && <InlineBanner tone="error">{profileError}</InlineBanner>}
              {profileSuccess && <InlineBanner>Profile updated.</InlineBanner>}
            </AnimatePresence>

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

            <motion.button whileTap={{ scale: 0.98 }} type="submit" className="btn-primary" disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save changes"}
            </motion.button>
          </form>
        </Card>
      </motion.div>

      {/* Push notifications */}
      <motion.div variants={fadeUp}>
        <Card className="p-6 sm:p-8">
          <h2 className="font-display font-semibold text-ink mb-1.5">Push notifications</h2>
          <p className="text-sm text-inkSoft mb-5">
            Get notified on this device even when ScrapConnect isn't open — pickup updates, new
            messages, and offers accepted.
          </p>

          <AnimatePresence>
            {pushError && <div className="mb-4"><InlineBanner tone="error">{pushError}</InlineBanner></div>}
          </AnimatePresence>

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
              <span className="text-sm font-medium text-ink flex items-center gap-2">
                <motion.span
                  animate={{ backgroundColor: pushState.subscribed ? "#A63D24" : "#D8C9AE" }}
                  transition={{ duration: 0.2 }}
                  className="w-2 h-2 rounded-full"
                />
                {pushState.subscribed ? "Enabled on this device" : "Currently off"}
              </span>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleTogglePush}
                disabled={pushBusy}
                className={pushState.subscribed ? "btn-secondary" : "btn-primary"}
              >
                {pushBusy ? "Working…" : pushState.subscribed ? "Turn off" : "Turn on"}
              </motion.button>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Password change — only meaningful for an account that actually has
          a password to change. A Google-only account never set one, and
          the backend now rejects this cleanly, but hiding the form
          entirely is a better experience than showing a form that can
          only ever fail. */}
      {hasPassword && (
        <motion.div variants={fadeUp}>
          <Card className="p-6 sm:p-8">
            <h2 className="font-display font-semibold text-ink mb-5">Change password</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <AnimatePresence>
                {passwordError && <InlineBanner tone="error">{passwordError}</InlineBanner>}
                {passwordSuccess && <InlineBanner>Password changed successfully.</InlineBanner>}
              </AnimatePresence>

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

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="btn-primary"
                disabled={savingPassword}
              >
                {savingPassword ? "Updating…" : "Change password"}
              </motion.button>
            </form>
          </Card>
        </motion.div>
      )}

      {/* Danger zone */}
      <motion.div variants={fadeUp}>
        <Card className="p-6 sm:p-8 border-rust/30">
          <h2 className="font-display font-semibold text-rust mb-1.5">Danger zone</h2>
          <p className="text-sm text-inkSoft mb-5">
            Permanently delete your ScrapConnect account and personal data. This can't be undone.
          </p>
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="rounded-md border border-rust text-rust text-sm font-semibold px-4 py-2.5 hover:bg-rust/5 transition-colors"
          >
            Delete my account
          </motion.button>
        </Card>
      </motion.div>

      <DeleteAccountModal
        open={deleteModalOpen}
        hasPassword={hasPassword}
        onClose={() => setDeleteModalOpen(false)}
        onDeleted={handleAccountDeleted}
      />
    </motion.div>
  );
}