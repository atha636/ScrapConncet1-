import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { user, setUser } = useAuth();

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <div className="flex justify-between items-center p-4 shadow bg-white">
      <h1 className="font-bold text-xl">ScrapConnect</h1>

      <div className="flex gap-4">
        {user?.role === "user" && (
          <>
            <Link to="/">Dashboard</Link>
            <Link to="/request">Request</Link>
            <Link to="/my-requests">My Requests</Link>
          </>
        )}

        {user?.role === "collector" && (
          <Link to="/collector">Collector</Link>
        )}

        <button onClick={logout}>Logout</button>
      </div>
    </div>
  );
}