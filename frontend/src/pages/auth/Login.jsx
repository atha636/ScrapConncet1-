import { useState } from "react";
import { loginUser } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const res = await loginUser(form);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      setUser(res.data.user);

      if (res.data.user.role === "collector") {
        navigate("/collector");
      } else {
        navigate("/");
      }

    } catch {
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-black to-indigo-800 relative overflow-hidden">

      {/* Glow Background */}
      <div className="absolute w-[400px] h-[400px] bg-purple-600 opacity-30 blur-[120px] top-[-100px] left-[-100px]" />
      <div className="absolute w-[400px] h-[400px] bg-blue-500 opacity-30 blur-[120px] bottom-[-100px] right-[-100px]" />

      {/* Card */}
      <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 w-full max-w-md shadow-xl">

        <h2 className="text-3xl font-bold text-center text-white mb-6">
          Welcome Back 👋
        </h2>

        <div className="space-y-4">

          <input
            type="email"
            placeholder="Email"
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
            className="w-full p-3 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-300"
          />

          <input
            type="password"
            placeholder="Password"
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
            className="w-full p-3 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-300"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:scale-[1.02] transition"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-300 mt-6">
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-purple-400 cursor-pointer hover:underline"
          >
            Register
          </span>
        </p>

      </div>
    </div>
  );
}