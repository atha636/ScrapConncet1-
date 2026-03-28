import { useState } from "react";
import AppRoutes from "./routes/AppRoutes";
import Navbar from "./components/layout/Navbar";

export default function App() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div
      className={`min-h-screen transition-all ${
        darkMode ? "bg-[#060818] text-white" : "bg-gray-100 text-black"
      }`}
    >
      {/* Background Gradient Glow */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute w-[500px] h-[500px] bg-purple-600 opacity-20 blur-[120px] top-[-100px] left-[-100px]" />
        <div className="absolute w-[400px] h-[400px] bg-blue-500 opacity-20 blur-[120px] bottom-[-100px] right-[-100px]" />
      </div>

      {/* Navbar */}
      <Navbar />

      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="px-3 py-2 rounded-lg bg-purple-600 text-white"
        >
          {darkMode ? "☀ Light" : "🌙 Dark"}
        </button>
      </div>

      {/* Main Routes */}
      <div className="pt-16 px-4">
        <AppRoutes />
      </div>
    </div>
  );
}