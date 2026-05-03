import React, { useState } from "react";
import { Menu, Activity, LogOut, User, ChevronDown, Download } from "lucide-react";

export default function Navbar({ collapsed, setCollapsed, user, onLogout, isInstallable, onInstall }) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="flex items-center justify-between px-8 py-4 bg-white/70 backdrop-blur-xl border-b border-gray-200/60 sticky top-0 z-40 shadow-sm transition-all duration-300">
      <div className="flex items-center gap-5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2.5 rounded-xl bg-white border border-gray-100 hover:bg-gray-50 hover:shadow-sm transition-all text-gray-600 active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20 hidden sm:flex">
            <Activity size={18} strokeWidth={3} />
          </div>
          <div className="text-xl font-black text-gray-900 tracking-tight">
            MediPay <span className="text-gray-400 font-medium">Workspace</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {isInstallable && (
          <button
            onClick={onInstall}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-full text-xs font-black shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:-translate-y-0.5 transition-all active:scale-95 group"
          >
            <Download size={16} className="group-hover:animate-bounce" />
            INSTALL APP
          </button>
        )}

        <div className="text-right hidden sm:block px-5 py-2 bg-gray-50/80 rounded-full border border-gray-100 shadow-inner">
          <p className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <span className="text-teal-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
              {user?.role || 'Admin'}
            </span> 
            <span className="text-gray-300">|</span> 
            <span className="lowercase normal-case font-semibold text-gray-500">{user?.email || 'admin@medipay.com'}</span>
          </p>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 p-1.5 pr-3 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-slate-900 flex items-center justify-center text-white font-black text-sm shadow-lg ring-2 ring-white group-hover:ring-teal-100 transition-all transform group-hover:-translate-y-0.5">
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'A'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-black text-gray-800 leading-none mb-1">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{user?.role || 'Admin'}</p>
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-0" onClick={() => setShowDropdown(false)}></div>
              <div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-gray-100 p-2 z-10 animate-fade-in origin-top-right">
                <div className="p-4 border-b border-gray-50 mb-1">
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Signed in as</p>
                   <p className="font-black text-gray-900 truncate">{user?.email || 'admin@medipay.com'}</p>
                </div>
                
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

