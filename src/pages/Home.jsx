import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, FileText, Box, BarChart2 } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  const [todaySales, setTodaySales] = useState(0);
  const [todayBills, setTodayBills] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiryCount, setExpiryCount] = useState(0); // expired items

  // 🧾 Function to calculate and update all dashboard stats
  const updateDashboardData = () => {
    const bills = JSON.parse(localStorage.getItem("bills") || "[]");
    const inventory = JSON.parse(localStorage.getItem("inventory") || "[]");

    const today = new Date().toLocaleDateString();

    // ✅ Filter bills created today
    const todaysBills = bills.filter((bill) => {
      const billDate = new Date(bill.date).toLocaleDateString();
      return billDate === today;
    });

    // 🪙 Calculate today's total sales
    const totalSales = todaysBills.reduce(
      (sum, bill) => sum + parseFloat(bill.total || 0),
      0
    );

    // ⚠️ Low stock count (≤ 5)
    const lowStock = inventory.filter((item) => item.qty <= 5).length;

    // 💀 Expired items count (expiry < today)
    const now = new Date();
    const expiredItems = inventory.filter((item) => {
      const expiry = new Date(item.expiry);
      return expiry < now;
    }).length;

    // ✅ Update state
    setTodayBills(todaysBills.length);
    setTodaySales(totalSales);
    setLowStockCount(lowStock);
    setExpiryCount(expiredItems);
  };

  // 🔄 Run once on mount + refresh live when "bills" or "inventory" change
  useEffect(() => {
    updateDashboardData();

    // Listen for any localStorage updates (new bill, inventory change)
    const handleStorageChange = (event) => {
      if (event.key === "bills" || event.key === "inventory") {
        updateDashboardData();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // ✨ Animation & style classes
  const cardClass =
    "p-5 bg-[var(--hp-surface)] rounded-xl shadow-md border hover:shadow-lg hover:scale-[1.03] transition-transform duration-300 ease-out cursor-pointer";

  const quickActionClass =
    "flex items-center justify-center gap-2 p-4 font-medium rounded-xl shadow-md text-white transform hover:scale-[1.05] transition-all duration-300";

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold mb-6 text-[var(--hp-primary)] animate-slide-down">
        Dashboard Overview
      </h1>

      {/* Info Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Today's Sales */}
        <div
          className={`${cardClass} animate-fade-up`}
          style={{ animationDelay: "0.1s" }}
        >
          <p className="text-gray-500 text-sm">Today's Sales</p>
          <h2 className="text-3xl font-bold text-[var(--hp-primary)] mt-2">
            ₹ {todaySales.toFixed(2)}
          </h2>
        </div>

        {/* Bills Generated */}
        <div
          className={`${cardClass} animate-fade-up`}
          style={{ animationDelay: "0.2s" }}
        >
          <p className="text-gray-500 text-sm">Bills Generated</p>
          <h2 className="text-3xl font-bold text-[var(--hp-accent)] mt-2">
            {todayBills}
          </h2>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => navigate("/inventory?filter=lowstock")}
          className={`${cardClass} animate-fade-up`}
          style={{ animationDelay: "0.3s" }}
        >
          <p className="text-gray-500 text-sm">Low Stock Alerts</p>
          <h2 className="text-3xl font-bold text-[var(--hp-warning)] mt-2">
            {lowStockCount}
          </h2>
          <p className="text-xs text-gray-500 mt-1">(Click to view details)</p>
        </div>

        {/* Expiry Alerts */}
        <div
          onClick={() => navigate("/inventory?filter=expired")}
          className={`${cardClass} animate-fade-up`}
          style={{ animationDelay: "0.4s" }}
        >
          <p className="text-gray-500 text-sm">Expired Medicines</p>
          <h2 className="text-3xl font-bold text-[var(--hp-danger)] mt-2">
            {expiryCount}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            (Click to view expired stock)
          </p>
        </div>
      </div>

      {/* Quick Actions Section */}
      <h2 className="text-xl font-semibold mb-4 text-gray-700 animate-slide-down">
        Quick Actions
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => navigate("/billing")}
          className={`${quickActionClass} bg-[var(--hp-primary)] hover:bg-teal-700`}
        >
          <ShoppingCart size={20} />
          New Bill
        </button>

        <button
          onClick={() => navigate("/receipts")}
          className={`${quickActionClass} bg-[var(--hp-accent)] hover:bg-sky-800`}
        >
          <FileText size={20} />
          View Receipts
        </button>

        <button
          onClick={() => navigate("/inventory")}
          className={`${quickActionClass} bg-[var(--hp-warning)] hover:bg-amber-600`}
        >
          <Box size={20} />
          Check Inventory
        </button>

        <button
          onClick={() => navigate("/analytics")}
          className={`${quickActionClass} bg-[var(--hp-danger)] hover:bg-red-700`}
        >
          <BarChart2 size={20} />
          View Reports
        </button>
      </div>
    </div>
  );
}
