import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

const readStoredUser = () => {
  const stored = localStorage.getItem("user");
  const token = localStorage.getItem("token");
  if (!stored || !token) return null;
  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  // Read synchronously on first render — no rehydration flash, no effect needed.
  const [user, setUser] = useState(readStoredUser);
  const [loading] = useState(false);

  // Keep every open tab in sync. Without this, logging in as a different
  // account in one tab leaves other already-open tabs holding a stale
  // in-memory `user` — which then makes wrong role-based routing decisions
  // even though localStorage itself is correct.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "user" || e.key === "token") {
        setUser(readStoredUser());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);