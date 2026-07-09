import { useLocation } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import Navbar from "./components/layout/Navbar";
import { useAuth } from "./context/AuthContext";

// Pages with their own full-bleed layout (nav, hero, footer) — never wrap
// these in the authenticated app chrome, even if the visitor happens to be
// logged in (e.g. clicking the logo from inside the dashboard).
const STANDALONE_ROUTES = ["/home", "/admin-login"];

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  const isStandalone = STANDALONE_ROUTES.includes(location.pathname);
  const showAppChrome = user && !isStandalone;

  return (
    <div className="min-h-screen">
      {showAppChrome && <Navbar />}
      <div className={showAppChrome ? "max-w-5xl mx-auto px-5 py-8" : ""}>
        <AppRoutes />
      </div>
    </div>
  );
}