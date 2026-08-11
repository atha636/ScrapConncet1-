import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "./NotificationBell";

const HOME_LINK = { to: "/", label: "Home" };

const USER_LINKS = [
  HOME_LINK,
  { to: "/dashboard", label: "Dashboard" },
  { to: "/request", label: "Request pickup" },
  { to: "/my-requests", label: "My requests" },
];

const COLLECTOR_LINKS = [HOME_LINK, { to: "/collector", label: "Collector" }];
const ADMIN_LINKS = [HOME_LINK, { to: "/admin", label: "Admin" }];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const clickCount = useRef(0);
  const clickTimer = useRef(null);

  const links =
    user?.role === "collector" ? COLLECTOR_LINKS : user?.role === "admin" ? ADMIN_LINKS : USER_LINKS;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  
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
      className={`sticky top-0 z-40 bg-surface border-b transition-shadow duration-200 ${
        scrolled ? "border-line shadow-[0_2px_12px_rgba(36,26,18,0.06)]" : "border-line"
      }`}
    >
      <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
        <motion.button
          whileHover={{ rotate: -3 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleLogoClick}
          className="flex items-center gap-2.5 shrink-0"
          aria-label="ScrapConnect home"
        >
          <img src="/logo-mark.png" alt="" className="w-8 h-8 rounded-md rotate-[-3deg]" />
          <span className="font-display font-bold text-lg text-ink tracking-tight">ScrapConnect</span>
        </motion.button>

        <div className="hidden sm:flex items-center gap-1 flex-1 justify-center">
          {links.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
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
                <span className="relative">{link.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <NotificationBell />

          <Link to="/profile" className="hidden sm:flex items-center gap-2 group">
            <motion.div
              whileHover={{ scale: 1.06 }}
              className="w-7 h-7 rounded-full bg-amber/20 border border-amber/40 flex items-center justify-center text-xs font-bold text-amber-dark font-display"
            >
              {(user?.name || "U")[0].toUpperCase()}
            </motion.div>
            <span className="text-sm text-inkSoft max-w-[110px] truncate group-hover:text-ink transition-colors">
              {user?.name || "User"}
            </span>
          </Link>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="hidden sm:inline-flex btn-secondary !py-2 !px-3.5 text-xs"
          >
            Log out
          </motion.button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden w-9 h-9 rounded-md border border-line flex items-center justify-center text-inkSoft"
            aria-label="Toggle menu"
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
                  {link.label}
                </Link>
              ))}
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className={`px-3 py-2.5 rounded-md text-sm font-medium ${
                  location.pathname === "/profile" ? "text-rust bg-rust/[0.08]" : "text-inkSoft"
                }`}
              >
                Profile
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="text-left px-3 py-2.5 rounded-md text-sm font-medium text-inkSoft"
              >
                Log out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}