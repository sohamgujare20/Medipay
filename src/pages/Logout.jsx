import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Logout() {
  const nav = useNavigate();
  useEffect(() => {
    // TODO: clear auth tokens here
    setTimeout(() => nav("/"), 300);
  }, [nav]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4 text-[var(--hp-primary)]">Logging Out...</h1>
      <p className="text-gray-600">If you were logged in, your session would be cleared.</p>
    </div>
  );
}
