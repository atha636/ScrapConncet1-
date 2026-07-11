import { useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  const clickCount = useRef(0);
  const clickTimer = useRef(null);

  const links =
    user?.role === "collector" ? COLLECTOR_LINKS : user?.role === "admin" ? ADMIN_LINKS : USER_LINKS;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Single click -> public landing page. Three clicks within the window ->
  // hidden admin portal. There's no visible link to /admin-login anywhere
  // else in the app on purpose.
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
    <nav className="sticky top-0 z-40 bg-surface border-b border-line">
      <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
        <button onClick={handleLogoClick} className="flex items-center gap-2.5 shrink-0" aria-label="ScrapConnect home">
          <div className="w-8 h-8 rounded-md bg-rust flex items-center justify-center rotate-[-3deg]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FAF5EA" strokeWidth="2.3">
              <path d="M3 7l4-4h10l4 4M3 7v11a2 2 0 002 2h14a2 2 0 002-2V7M3 7h18" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <span className="font-display font-bold text-lg text-ink tracking-tight">ScrapConnect</span>
        </button>

        <div className="hidden sm:flex items-center gap-1 flex-1 justify-center">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "text-rust bg-rust/[0.08]"
                  : "text-inkSoft hover:text-ink hover:bg-line/40"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <NotificationBell />

          <Link to="/profile" className="hidden sm:flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-full bg-amber/20 border border-amber/40 flex items-center justify-center text-xs font-bold text-amber-dark font-display">
              {(user?.name || "U")[0].toUpperCase()}
            </div>
            <span className="text-sm text-inkSoft max-w-[110px] truncate">{user?.name || "User"}</span>
          </Link>

          <button onClick={handleLogout} className="btn-secondary !py-2 !px-3.5 text-xs">
            Log out
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden w-9 h-9 rounded-md border border-line flex items-center justify-center text-inkSoft"
            aria-label="Toggle menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              {menuOpen ? (
                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              ) : (
                <><line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" /></>
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-line px-4 py-3 flex flex-col gap-1 bg-surface">
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
        </div>
      )}
    </nav>
  );
}