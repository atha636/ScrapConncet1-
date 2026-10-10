import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import NotificationBell from "./NotificationBell";
import ConfirmModal from "../common/ConfirmModal";
import LanguageToggle from "../common/LanguageToggle";
import { useT } from "../../i18n/core";

// `label` is a translation key (see i18n/locales), resolved at render time.
const HOME_LINK = { to: "/", label: "nav.home" };
const ABOUT_LINK = { to: "/about", label: "nav.about", secondary: true };
const RATES_LINK = { to: "/scrap-rates", label: "nav.rates", secondary: true };
const QUOTES_LINK = { to: "/quotes", label: "nav.quotes", secondary: true };
const HELP_LINK = { to: "/help", label: "nav.help", secondary: true };
const IMPACT_LINK = { to: "/impact", label: "nav.impact", secondary: true };

const USER_LINKS = [
  HOME_LINK,
  { to: "/dashboard", label: "nav.dashboard" },
  { to: "/request", label: "nav.requestPickup" },
  { to: "/my-requests", label: "nav.myRequests" },
  QUOTES_LINK,
  IMPACT_LINK,
  RATES_LINK,
  HELP_LINK,
  ABOUT_LINK,
];

const COLLECTOR_LINKS = [HOME_LINK, { to: "/collector", label: "nav.collector" }, IMPACT_LINK, RATES_LINK, HELP_LINK, ABOUT_LINK];
const ADMIN_LINKS = [HOME_LINK, { to: "/admin", label: "nav.admin" }, RATES_LINK, ABOUT_LINK];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const clickCount = useRef(0);
  const clickTimer = useRef(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  const links =
    user?.role === "collector" ? COLLECTOR_LINKS : user?.role === "admin" ? ADMIN_LINKS : USER_LINKS;

  // Secondary links (Impact, Rates, About) sit inline on wide screens and
  // fold into a "More" menu below that, so the bar never wraps or crowds.
  const primaryLinks = links.filter((l) => !l.secondary);
  const secondaryLinks = links.filter((l) => l.secondary);
  // Roles with few links (collector, admin) can show everything inline on wide
  // screens; the user role has too many to fit, so it always uses "More".
  const inlineSecondary = links.length <= 6;
  const moreActive = secondaryLinks.some((l) => l.to === location.pathname);

  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const renderLink = (link, extraClass = "") => {
    const active = location.pathname === link.to;
    return (
      <Link
        key={link.to}
        to={link.to}
        className={`relative px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${extraClass} ${
          active ? "text-rust" : "text-inkSoft hover:text-ink hover:bg-line/40"
        }`}
      >
        {active && (
          <motion.span
            layoutId="nav-active-pill"
            className="absolute inset-0 rounded-md bg-rust/[0.08]"
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          />
        )}
        <span className="relative">{t(link.label)}</span>
      </Link>
    );
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const confirmLogout = () => {
    setConfirmLogoutOpen(false);
    logout();
    navigate("/login");
  };

  // Single click -> public landing page. Three clicks within the window ->
  // hidden admin portal. There's no visible link to /admin-login anywhere
  // else in the app on purpose. (Logic unchanged — only the visual wrapper
  // around this button was touched.)
  const handleLogoClick = (e) => {
    e.preventDefault();
    clickCount.current += 1;

    if (clickCount.current === 3) {
      clearTimeout(clickTimer.current);
      clickCount.current = 0;
      navigate("/admin-login");
      return;
    }

    clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      clickCount.current = 0;
      navigate("/");
    }, 350);
  };

  return (
    <nav
      className={`print:hidden sticky top-0 z-40 bg-surface border-b transition-shadow duration-200 ${
        scrolled ? "border-line shadow-[0_2px_12px_rgba(36,26,18,0.06)]" : "border-line"
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
        <motion.button
          whileHover={{ rotate: -3 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleLogoClick}
          className="flex items-center gap-2.5 shrink-0"
          aria-label={t("nav.homeAria")}
        >
          <img src="/logo-mark.png" alt="" className="w-8 h-8 rounded-md rotate-[-3deg]" />
          <span className="font-display font-bold text-lg text-ink tracking-tight">ScrapConnect</span>
        </motion.button>

        <div className="hidden sm:flex items-center gap-0.5 flex-1 justify-center min-w-0">
          {primaryLinks.map((link) => renderLink(link))}

          {/* Wide screens: secondary links inline */}
          {inlineSecondary && secondaryLinks.map((link) => renderLink(link, "hidden xl:inline-flex"))}

          {/* Narrower screens: the same links in a "More" menu */}
          {secondaryLinks.length > 0 && (
            <div ref={moreRef} className={inlineSecondary ? "relative xl:hidden" : "relative"}>
              <button
                onClick={() => setMoreOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                className={`inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  moreActive || moreOpen ? "text-rust bg-rust/[0.08]" : "text-inkSoft hover:text-ink hover:bg-line/40"
                }`}
              >
                {t("nav.more")}
                <motion.svg
                  animate={{ rotate: moreOpen ? 180 : 0 }}
                  transition={{ duration: 0.15 }}
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                >
                  <polyline points="6 9 12 15 18 9" />
                </motion.svg>
              </button>

              <AnimatePresence>
                {moreOpen && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.14 }}
                    className="absolute left-1/2 -translate-x-1/2 top-full mt-2 min-w-[170px] bg-surface border border-line rounded-lg shadow-lg p-1.5 z-50"
                  >
                    {secondaryLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        role="menuitem"
                        onClick={() => setMoreOpen(false)}
                        className={`block px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                          location.pathname === link.to
                            ? "text-rust bg-rust/[0.08]"
                            : "text-inkSoft hover:text-ink hover:bg-line/40"
                        }`}
                      >
                        {t(link.label)}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="w-9 h-9 rounded-md border border-line flex items-center justify-center text-inkSoft hover:text-rust hover:border-rust/50 transition-colors"
            aria-label={theme === "dark" ? t("nav.toLight") : t("nav.toDark")}
            title={theme === "dark" ? t("nav.toLight") : t("nav.toDark")}
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === "dark" ? (
                <motion.svg
                  key="sun"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="4.5" />
                  <line x1="12" y1="1.5" x2="12" y2="4" />
                  <line x1="12" y1="20" x2="12" y2="22.5" />
                  <line x1="4.2" y1="4.2" x2="6" y2="6" />
                  <line x1="18" y1="18" x2="19.8" y2="19.8" />
                  <line x1="1.5" y1="12" x2="4" y2="12" />
                  <line x1="20" y1="12" x2="22.5" y2="12" />
                  <line x1="4.2" y1="19.8" x2="6" y2="18" />
                  <line x1="18" y1="6" x2="19.8" y2="4.2" />
                </motion.svg>
              ) : (
                <motion.svg
                  key="moon"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <path d="M20 14.5a8.5 8.5 0 1 1-9.5-9.5 7 7 0 0 0 9.5 9.5z" strokeLinejoin="round" />
                </motion.svg>
              )}
            </AnimatePresence>
          </motion.button>

          <LanguageToggle />

          <NotificationBell />

          <Link to="/profile" title={user?.name || "User"} className="hidden sm:flex items-center gap-2 group">
            <motion.div
              whileHover={{ scale: 1.06 }}
              className="w-7 h-7 rounded-full bg-amber/20 border border-amber/40 flex items-center justify-center text-xs font-bold text-amber-dark font-display"
            >
              {(user?.name || "U")[0].toUpperCase()}
            </motion.div>
            <span className="hidden 2xl:inline text-sm text-inkSoft max-w-[110px] truncate group-hover:text-ink transition-colors">
              {user?.name || "User"}
            </span>
          </Link>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setConfirmLogoutOpen(true)}
            className="hidden sm:inline-flex btn-secondary !py-2 !px-3.5 text-xs"
          >
            {t("nav.logout")}
          </motion.button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden w-9 h-9 rounded-md border border-line flex items-center justify-center text-inkSoft"
            aria-label={t("nav.toggleMenu")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <motion.line
                x1="3" y1="7" x2="21" y2="7"
                animate={menuOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
                style={{ originX: "12px", originY: "7px" }}
                transition={{ duration: 0.2 }}
              />
              <motion.line
                x1="3" y1="12" x2="21" y2="12"
                animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration: 0.15 }}
              />
              <motion.line
                x1="3" y1="17" x2="21" y2="17"
                animate={menuOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
                style={{ originX: "12px", originY: "17px" }}
                transition={{ duration: 0.2 }}
              />
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="sm:hidden border-t border-line bg-surface overflow-hidden"
          >
            <div className="px-4 py-3 flex flex-col gap-1">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-md text-sm font-medium ${
                    location.pathname === link.to ? "text-rust bg-rust/[0.08]" : "text-inkSoft"
                  }`}
                >
                  {t(link.label)}
                </Link>
              ))}
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className={`px-3 py-2.5 rounded-md text-sm font-medium ${
                  location.pathname === "/profile" ? "text-rust bg-rust/[0.08]" : "text-inkSoft"
                }`}
              >
                {t("nav.profile")}
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmLogoutOpen(true);
                }}
                className="text-left px-3 py-2.5 rounded-md text-sm font-medium text-inkSoft"
              >
                {t("nav.logout")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={confirmLogoutOpen}
        title={t("nav.logoutTitle")}
        message={t("nav.logoutMessage")}
        confirmLabel={t("nav.logout")}
        cancelLabel={t("nav.cancel")}
        onConfirm={confirmLogout}
        onCancel={() => setConfirmLogoutOpen(false)}
      />
    </nav>
  );
}