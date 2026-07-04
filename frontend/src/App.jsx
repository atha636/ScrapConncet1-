import AppRoutes from "./routes/AppRoutes";
import Navbar from "./components/layout/Navbar";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {user && <Navbar />}
      <div className={user ? "max-w-5xl mx-auto px-5 py-8" : ""}>
        <AppRoutes />
      </div>
    </div>
  );
}