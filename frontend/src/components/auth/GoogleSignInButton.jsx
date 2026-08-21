import { useState, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { googleAuth } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { roleHome } from "../../utils/roleHome";
import { hasGoogleAuth } from "../../utils/googleAuthConfig";
import GoogleRoleModal from "./GoogleRoleModal";


export default function GoogleSignInButton({ wantsToBeCollector = false, roleChosen = true, onError }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pendingCredential, setPendingCredential] = useState(null);


  const wrapperRef = useRef(null);
  const [buttonWidth, setButtonWidth] = useState(null);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setButtonWidth(Math.round(el.getBoundingClientRect().width));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!hasGoogleAuth) return null;

  const completeSignIn = async (credential, isCollector) => {
    setLoading(true);
    try {
      const res = await googleAuth({ credential, wantsToBeCollector: isCollector, roleChosen: true });
      login(res.data.token, res.data.user);
      navigate(roleHome(res.data.user.role));
    } catch (err) {
      onError?.(err.response?.data?.message || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
      setPendingCredential(null);
    }
  };

  const handleSuccess = async (credentialResponse) => {
    onError?.("");
    const credential = credentialResponse.credential;

    if (roleChosen) {
      await completeSignIn(credential, wantsToBeCollector);
      return;
    }

    setLoading(true);
    try {
      const res = await googleAuth({ credential, roleChosen: false });
      if (res.data.needsRole) {
        // A brand-new account — ask before creating anything.
        setPendingCredential(credential);
        return;
      }
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
      <div ref={wrapperRef} className={loading ? "opacity-50 pointer-events-none" : ""}>
        {buttonWidth !== null && (
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => onError?.("Google sign-in failed. Please try again.")}
            theme="outline"
            shape="rectangular"
            size="large"
            width={buttonWidth}
            text="continue_with"
          />
        )}
      </div>

      <GoogleRoleModal
        open={!!pendingCredential}
        onChoose={(isCollector) => completeSignIn(pendingCredential, isCollector)}
        onCancel={() => setPendingCredential(null)}
      />
    </div>
  );
}