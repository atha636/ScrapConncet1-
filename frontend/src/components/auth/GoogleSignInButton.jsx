import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { googleAuth } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { roleHome } from "../../utils/roleHome";
import { hasGoogleAuth } from "../../utils/googleAuthConfig";

// Renders nothing if Google sign-in isn't configured (see main.jsx) — the
// rest of the auth pages work exactly as before with plain email/password,
// this is additive.
export default function GoogleSignInButton({ wantsToBeCollector = false, onError }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (!hasGoogleAuth) return null;

  const handleSuccess = async (credentialResponse) => {
    onError?.("");
    setLoading(true);
    try {
      const res = await googleAuth({
        credential: credentialResponse.credential,
        wantsToBeCollector,
      });
      login(res.data.token, res.data.user);
      navigate(roleHome(res.data.user.role));
    } catch (err) {
      onError?.(err.response?.data?.message || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className={loading ? "opacity-50 pointer-events-none" : ""}>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => onError?.("Google sign-in failed. Please try again.")}
          theme="outline"
          shape="pill"
          width="100%"
          text="continue_with"
        />
      </div>
    </div>
  );
}