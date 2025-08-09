import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Get token from URL hash or query params
    const params = new URLSearchParams(window.location.search);
    const token = params.get("access_token");

    if (token) {
      localStorage.setItem("access_token", token);
      navigate("/", { replace: true });
    } else {
      // Handle missing token
      navigate("/", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex h-screen items-center justify-center text-white">
      <p>Signing you in...</p>
    </div>
  );
}
