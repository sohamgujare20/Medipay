import React, { useEffect, useState } from "react";
import { 
  ShieldCheck, 
  Lock, 
  History, 
  UserCheck,
  AlertTriangle
} from "lucide-react";
import { Toaster } from "react-hot-toast";

export default function Settings() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const savedUser = localStorage.getItem("medipay_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Restrict access to Cashier only (as requested)
  if (user && user.role !== "Cashier") {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-[3rem] shadow-xl border border-red-50">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
           <AlertTriangle size={40} />
        </div>
        <h1 className="text-3xl font-black text-slate-800">Access Restricted</h1>
        <p className="text-slate-500 font-medium mt-2 max-w-md">
          Authentication protocols dictate that only <span className="text-red-500 font-bold">Authorized Cashiers</span> can access this secure configuration module.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <Toaster position="top-right" />
      
      <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-12 h-12 bg-teal-500 rounded-2xl flex items-center justify-center text-slate-900 shadow-lg">
                <ShieldCheck size={28} />
             </div>
             <span className="text-xs font-black uppercase tracking-widest text-teal-400">Security & Authentication Portal</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter">Login Access Details</h1>
          <p className="text-slate-400 font-medium mt-4 max-w-xl text-lg">
            Below is your current session authorization. Your access is restricted and synchronized with the <span className="text-teal-400 font-bold">'authentication'</span> core database.
          </p>
        </div>
        
        {/* Background Decorative */}
        <Lock className="absolute right-0 bottom-0 text-white/5 -mb-20 -mr-20" size={400} />
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Active Identity Card */}
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-8">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center shadow-inner">
                <UserCheck size={30} />
             </div>
             <div>
                <h3 className="text-xl font-black text-slate-800">Current Identity</h3>
                <p className="text-sm text-slate-400 font-medium uppercase tracking-tight">Active session data</p>
             </div>
          </div>

          <div className="space-y-6">
             <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-center transition-all hover:border-teal-200">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Username</p>
                   <p className="text-lg font-black text-slate-700 capitalize">{user?.username || 'Loading...'}</p>
                </div>
                <div className="px-4 py-1.5 bg-teal-100 text-teal-700 rounded-full text-[10px] font-black uppercase tracking-widest">Verified</div>
             </div>

             <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-center">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Role</p>
                   <p className="text-lg font-black text-slate-700">{user?.role || 'Cashier'}</p>
                </div>
                <div className="text-slate-400"><History size={20} /></div>
             </div>

             <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Session ID</p>
                <code className="text-sm font-bold text-teal-600 bg-white px-3 py-1 rounded-lg border border-teal-50">{user?.id || 'AUTH_TEMP_SESSION'}</code>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
}
