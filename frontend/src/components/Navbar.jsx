import React from "react";
import { Menu } from "lucide-react";

export default function Navbar({ collapsed, setCollapsed }) {
  return (
    <header className="flex items-center justify-between p-4 bg-[var(--hp-surface)] border-b">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded hover:bg-gray-100"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>
        <div className="text-lg font-semibold text-[var(--hp-primary)]">MediPay Dashboard</div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm">Owner - medi.store@example.com</div>
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">MG</div>
      </div>
    </header>
  );
}
