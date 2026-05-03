import React, { useEffect } from "react";
import { Loader2, ShieldOff } from "lucide-react";

export default function Logout({ onLogout }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onLogout();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onLogout]);

  return (
    <div className="h-[80vh] flex flex-col items-center justify-center text-center space-y-6">
      <div className="relative">
        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-inner">
           <ShieldOff size={48} />
        </div>
        <div className="absolute inset-0 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin"></div>
      </div>
      <div>
        <h1 className="text-3xl font-black text-slate-800">Terminating Session</h1>
        <p className="text-slate-500 font-medium mt-2">Clearing local authorization tokens and synchronizing state...</p>
      </div>
      <div className="flex items-center gap-2 text-red-500 font-bold bg-red-50 px-4 py-2 rounded-full text-xs uppercase tracking-widest">
         <Loader2 className="animate-spin" size={14} />
         Secure Logout in Progress
      </div>
    </div>
  );
}
