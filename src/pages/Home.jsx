import React from "react";
import { ShoppingCart, FileText, Box, BarChart2 } from "lucide-react";

export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6 text-[var(--hp-primary)]">
        Dashboard Overview
      </h1>

      {/* Info Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Today's Sales */}
        <div className="p-5 bg-[var(--hp-surface)] rounded-xl shadow-md border hover:shadow-lg transition-shadow">
          <p className="text-gray-500 text-sm">Today's Sales</p>
          <h2 className="text-3xl font-bold text-[var(--hp-primary)] mt-2">
            ₹ 0
          </h2>
        </div>

        {/* Bills Generated */}
        <div className="p-5 bg-[var(--hp-surface)] rounded-xl shadow-md border hover:shadow-lg transition-shadow">
          <p className="text-gray-500 text-sm">Bills Generated</p>
          <h2 className="text-3xl font-bold text-[var(--hp-accent)] mt-2">
            0
          </h2>
        </div>

        {/* Low Stock Alerts */}
        <div className="p-5 bg-[var(--hp-surface)] rounded-xl shadow-md border hover:shadow-lg transition-shadow">
          <p className="text-gray-500 text-sm">Low Stock Alerts</p>
          <h2 className="text-3xl font-bold text-[var(--hp-warning)] mt-2">
            0
          </h2>
        </div>

        {/* Expiry Alerts */}
        <div className="p-5 bg-[var(--hp-surface)] rounded-xl shadow-md border hover:shadow-lg transition-shadow">
          <p className="text-gray-500 text-sm">Expiry Alerts</p>
          <h2 className="text-3xl font-bold text-[var(--hp-danger)] mt-2">
            0
          </h2>
        </div>
      </div>

      {/* Quick Actions Section */}
      <h2 className="text-xl font-semibold mb-4 text-gray-700">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button className="flex items-center justify-center gap-2 p-4 bg-[var(--hp-primary)] text-white font-medium rounded-xl shadow hover:bg-teal-700 transition">
          <ShoppingCart size={20} />
          New Bill
        </button>

        <button className="flex items-center justify-center gap-2 p-4 bg-[var(--hp-accent)] text-white font-medium rounded-xl shadow hover:bg-sky-800 transition">
          <FileText size={20} />
          View Receipts
        </button>

        <button className="flex items-center justify-center gap-2 p-4 bg-[var(--hp-warning)] text-white font-medium rounded-xl shadow hover:bg-amber-600 transition">
          <Box size={20} />
          Check Inventory
        </button>

        <button className="flex items-center justify-center gap-2 p-4 bg-[var(--hp-danger)] text-white font-medium rounded-xl shadow hover:bg-red-700 transition">
          <BarChart2 size={20} />
          View Reports
        </button>
      </div>
    </div>
  );
}
