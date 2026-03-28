import { useState } from "react";
import { registerUser } from "../../services/authService";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async () => {
    try {
      setLoading(true);

      await registerUser(form);

      alert("✅ Registered successfully!");
      navigate("/login");

    } catch (err) {
      console.error(err);
      alert("❌ Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">

      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md space-y-4">

        <h2 className="text-2xl font-bold text-center">
          Create Account
        </h2>

        <input
          name="name"
          placeholder="Full Name"
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />

        <input
          name="email"
          placeholder="Email"
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />

        <select
          name="role"
          onChange={handleChange}
          className="w-full p-2 border rounded"
        >
          <option value="user">User</option>
          <option value="collector">Collector</option>
        </select>

        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full bg-purple-600 text-white p-2 rounded hover:bg-purple-700"
        >
          {loading ? "Registering..." : "Register"}
        </button>

      </div>

    </div>
  );
}