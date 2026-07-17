import { useLocation } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import Navbar from "./components/layout/Navbar";
import { useAuth } from "./context/AuthContext";


const STANDALONE_ROUTES = ["/", "/login", "/register", "/admin-login"];

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