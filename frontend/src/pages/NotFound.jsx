import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { roleHome } from "../utils/roleHome";
import useDocumentMeta from "../hooks/useDocumentMeta";

export default function NotFound() {
  useDocumentMeta({ title: "Page Not Found", noindex: true });

  const { user } = useAuth();
  const backTo = user ? roleHome(user.role) : "/";
  const backLabel = user ? "Back to your dashboard" : "Back to home";

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-dashed border-line flex items-center justify-center text-inkFaint rotate-[-4deg]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </div>
        <div className="font-mono text-xs text-inkFaint tracking-widest mb-2">ERROR 404</div>
        <h1 className="font-display text-2xl font-bold text-ink mb-3">
          This scrap ticket doesn't exist.
        </h1>
        <p className="text-sm text-inkSoft leading-relaxed mb-8">
          The page you're looking for was moved, deleted, or never existed in the first place.
        </p>
        <Link to={backTo} className="btn-primary inline-flex">
          {backLabel}
        </Link>
      </div>
    </div>
  );
}