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
  Menu
} from "lucide-react";

const menuItems = [
  { name: "Home", path: "/", icon: Home },
  { name: "Billing", path: "/billing", icon: ShoppingCart },
  { name: "Receipts", path: "/receipts", icon: FileText },
  { name: "Inventory", path: "/inventory", icon: Box },
  { name: "Analytics", path: "/analytics", icon: BarChart2 },
  { name: "Prescription OCR", path: "/ocr", icon: Camera },
  { name: "Settings", path: "/settings", icon: Settings },
  { name: "Logout", path: "/logout", icon: LogOut }
];

export default function Sidebar({ collapsed, setCollapsed }) {
  return (
    <aside className={`h-full transition-all duration-200 ${collapsed ? "w-20" : "w-64"} bg-[var(--hp-surface)] border-r`}>
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-[var(--hp-primary)] flex items-center justify-center text-white font-bold">M</div>
            {!collapsed && <div className="text-lg font-semibold text-[var(--hp-primary)]">MediPay</div>}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
            className="p-2 rounded hover:bg-gray-100"
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                to={item.path}
                key={item.name}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md p-2 transition-colors
                  ${isActive ? "bg-[var(--hp-primary)] text-white" : "text-gray-700 hover:bg-gray-50"}`
                }
              >
                <div className="flex items-center justify-center">
                  <Icon size={18} />
                </div>
                {!collapsed && <span className="truncate">{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          {!collapsed ? (
            <div className="text-sm text-gray-500">Logged in as: <span className="font-medium text-gray-800">Cashier</span></div>
          ) : (
            <div className="text-xs text-gray-500">Cashier</div>
          )}
        </div>
      </div>
    </aside>
  );
}
