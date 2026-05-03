import React, { useState } from "react";
import { Lock, Sparkles, AlertCircle, Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react";

export default function Login({ onLogin }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "cashier", password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("medipay_user", JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setError(data.message || "Invalid Authorization Code.");
        setIsLoading(false);
      }
    } catch (err) {
      setError("Unable to connect to Security Service.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      <div className="w-full max-w-[1000px] bg-white/5 backdrop-blur-3xl rounded-[4rem] border border-white/10 shadow-[0_32px_120px_-15px_rgba(0,0,0,0.5)] overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        
        {/* Visual Hero Section */}
        <div className="hidden lg:flex flex-col justify-between p-16 bg-gradient-to-br from-teal-600/20 to-transparent relative border-r border-white/5">
           <div>
              <div className="flex items-center gap-4 mb-12">
                 <div className="w-14 h-14 bg-teal-500 rounded-[1.25rem] flex items-center justify-center shadow-[0_0_30px_rgba(20,184,166,0.4)]">
                    <ShieldCheck size={32} className="text-slate-900" />
                 </div>
                 <span className="text-2xl font-black text-white tracking-widest uppercase italic">MediPay</span>
              </div>
              
              <h1 className="text-6xl font-black text-white leading-tight mb-6">
                 Authorized <br />
                 <span className="text-teal-400">Cashier</span> Portal
              </h1>
              <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-[280px]">
                 Encrypted access to the pharmacy inventory and POS infrastructure.
              </p>
           </div>

           <div className="space-y-4">
              <div className="flex items-center gap-3 text-teal-400 font-bold text-xs uppercase tracking-[0.2em]">
                 <div className="w-2 h-2 bg-teal-400 rounded-full animate-ping"></div>
                 Security Core Active
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Session Protocol</p>
                 <p className="text-sm text-slate-300 font-bold">End-to-End Encrypted Terminal</p>
              </div>
           </div>
        </div>

        {/* Form Section */}
        <div className="p-12 md:p-20 flex flex-col justify-center">
           <div className="max-w-xs mx-auto w-full text-center lg:text-left">
              <div className="mb-10 block lg:hidden">
                 <div className="w-20 h-20 bg-teal-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                    <ShieldCheck size={40} className="text-slate-900" />
                 </div>
              </div>

              <div className="mb-12">
                 <h2 className="text-3xl font-black text-white mb-3">Identity Lock</h2>
                 <p className="text-slate-500 font-semibold text-sm">Please provide your authorized passkey to initiate the session.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-8">
                 <div className="space-y-3 group">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] ml-1 group-focus-within:text-teal-400 transition-colors">
                       Security Passkey
                    </label>
                    <div className="relative">
                       <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••"
                          className="w-full bg-white/5 border-2 border-white/10 rounded-[1.5rem] p-5 text-2xl font-black text-white tracking-[1em] text-center focus:outline-none focus:border-teal-500 focus:bg-white/10 transition-all placeholder:tracking-normal placeholder:text-slate-700"
                          maxLength={4}
                          required
                          autoFocus
                       />
                       <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                       >
                          {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                       </button>
                    </div>
                 </div>

                 {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold animate-shake">
                       <AlertCircle size={18} />
                       {error}
                    </div>
                 )}

                 <button
                    type="submit"
                    disabled={isLoading || password.length < 4}
                    className="w-full bg-teal-500 text-slate-900 rounded-[1.5rem] p-5 font-black text-lg shadow-[0_20px_40px_-5px_rgba(20,184,166,0.3)] hover:bg-teal-400 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale disabled:hover:scale-100 flex items-center justify-center gap-3 group"
                 >
                    {isLoading ? (
                       <Loader className="animate-spin" size={24} />
                    ) : (
                       <>
                          Initiate Sync
                          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                       </>
                    )}
                 </button>
              </form>

              <div className="mt-20 text-center">
                 <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    AES-256 Pharmacy Standard Connection
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

const Loader = ({ className, size }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
