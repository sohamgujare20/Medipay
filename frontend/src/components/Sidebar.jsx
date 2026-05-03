import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  ShoppingCart,
  FileText,
  Box,
  BarChart2,
  Camera,
  Settings,
  LogOut,
  Bell,
  Menu,
  Sparkles,
  Activity,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const menuItems = [
  { name: "Home", path: "/", icon: Home },
  { name: "Billing", path: "/billing", icon: ShoppingCart },
  { name: "Receipts", path: "/receipts", icon: FileText },
  { name: "Notification", path: "/notification", icon: Bell },
  { name: "Inventory", path: "/inventory", icon: Box },
  { name: "Analytics", path: "/analytics", icon: BarChart2 },
  { name: "AI Agents", path: "/ai-agents", icon: Sparkles },
  { name: "Settings", path: "/settings", icon: Settings },
  { name: "Logout", path: "/logout", icon: LogOut }
];

export default function Sidebar({ collapsed, setCollapsed, user }) {
  return (
    <aside className={`fixed md:relative inset-y-0 left-0 transition-all duration-300 z-50 
      ${collapsed ? "-translate-x-full md:translate-x-0 md:w-20" : "translate-x-0 w-64"} 
      bg-white border-r border-gray-200/60 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]`}>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Header Section */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-black shadow-md shadow-teal-500/20 shrink-0">
              <Activity size={20} strokeWidth={3} />
            </div>
            {!collapsed && (
              <div className="text-xl font-black text-gray-900 tracking-tight whitespace-nowrap animate-in fade-in duration-300">
                Medi<span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-blue-600">Pay</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
            className="p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 text-gray-400 hover:text-teal-600 transition-all hidden md:flex items-center justify-center"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            // Add a subtle separator before Settings
            const isBottomSection = item.name === "Settings" || item.name === "Logout";
            
            return (
              <React.Fragment key={item.name}>
                {item.name === "Settings" && <div className="h-px bg-gray-100 my-4 mx-2" />}
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-4 rounded-xl p-3.5 transition-all duration-200 group
                    ${isActive 
                      ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md shadow-teal-500/20 font-bold translate-x-1" 
                      : "text-gray-500 font-medium hover:bg-gray-50 hover:text-gray-900"}`
                  }
                >
                  <div className={`flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110`}>
                    <Icon size={20} />
                  </div>
                  {!collapsed && (
                    <span className="tracking-tight whitespace-nowrap">{item.name}</span>
                  )}
                </NavLink>
              </React.Fragment>
            );
          })}


        </nav>

        {/* User Profile Section */}
        <div className="p-4 shrink-0">
          <div className="p-3 bg-gray-50/80 rounded-2xl border border-gray-100/80 flex items-center gap-3 transition-all hover:bg-gray-50 hover:border-gray-200">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm ring-2 ring-white shrink-0">
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'A'}
            </div>
            {!collapsed && (
              <div className="overflow-hidden whitespace-nowrap animate-in fade-in duration-300">
                <p className="text-sm font-black text-gray-800 truncate leading-tight mb-0.5">{user?.name || 'Administrator'}</p>
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest truncate leading-tight">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 mr-1.5 animate-pulse"></span>
                  {user?.role || 'System'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

