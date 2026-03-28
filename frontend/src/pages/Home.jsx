// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ShoppingCart, FileText, Box, BarChart2, 
  Bell, ArrowRight, TrendingUp, AlertTriangle, 
  Calendar, CheckCircle, Package
} from "lucide-react";
import { api } from "../api";

export default function Home() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todaySales: 0,
    todayBills: 0,
    totalBills: 0,
    lowStockCount: 0,
    expiryCount: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invData, billsData] = await Promise.all([
        api.inventory.getAll(),
        api.bills.getAll()
      ]);

      const todayStr = new Date().toLocaleDateString();

      // Compute Dashboard Stats
      const todaysBills = billsData.filter(bill => {
        const bd = bill.createdAt || bill.created_at ? new Date(bill.createdAt || bill.created_at) : new Date();
        return bd.toLocaleDateString() === todayStr;
      });

      const totalSales = todaysBills.reduce((sum, b) => sum + Number(b.total || 0), 0);
      const lowStock = invData.filter(item => Number(item.qty) <= 5).length;
      
      const now = new Date();
      const expiredItems = invData.filter(item => {
        if (!item.expiry) return false;
        return new Date(item.expiry) < now;
      }).length;

      setStats({
        todaySales: totalSales,
        todayBills: todaysBills.length,
        totalBills: billsData.length,
        lowStockCount: lowStock,
        expiryCount: expiredItems
      });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const cardClass = "relative overflow-hidden p-6 bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer group";
  const actionCardClass = "flex items-center gap-4 p-5 bg-white rounded-2xl border-2 border-transparent hover:border-[var(--hp-primary)] hover:shadow-lg transition-all transform hover:scale-[1.03] group cursor-pointer";

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12 animate-in fade-in duration-700">
      
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 mt-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Medi<span className="text-[var(--hp-primary)]">Pay</span> Dashboard
          </h1>
          <p className="text-gray-500 mt-2 font-medium flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Welcome back! Here's how your pharmacy is performing today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-gray-900">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="text-xs text-gray-400 font-medium">Session Active: Cashier Room 1</p>
          </div>
          <button 
            onClick={fetchData} 
            className="p-3 bg-white border rounded-xl hover:bg-gray-50 transition shadow-sm text-gray-600"
            title="Refresh Stats"
          >
            <TrendingUp size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        
        {/* Sales Card */}
        <div onClick={() => navigate("/analytics")} className={cardClass}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-teal-50 rounded-full blur-2xl group-hover:bg-teal-100 transition-colors"></div>
          <div className="flex items-center gap-3 text-teal-600 font-bold text-sm tracking-wider uppercase mb-4">
            <TrendingUp size={16} /> Today's Sales
          </div>
          <h2 className="text-4xl font-black text-gray-900">₹{stats.todaySales.toFixed(2)}</h2>
          <p className="text-xs text-gray-400 font-bold mt-4 flex items-center gap-1 group-hover:text-teal-600 transition-colors">
            View analytics report <ArrowRight size={12} />
          </p>
        </div>

        {/* Bills Card */}
        <div onClick={() => navigate("/receipts")} className={cardClass}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors"></div>
          <div className="flex items-center gap-3 text-blue-600 font-bold text-sm tracking-wider uppercase mb-4">
            <FileText size={16} /> Bills Generated
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl font-black text-gray-900">{stats.todayBills}</h2>
            <span className="text-sm text-gray-400 font-bold">Today</span>
          </div>
          <p className="text-xs text-gray-400 font-bold mt-4 flex items-center gap-1 group-hover:text-blue-600 transition-colors">
            See all {stats.totalBills} receipts <ArrowRight size={12} />
          </p>
        </div>

        {/* Low Stock Card */}
        <div onClick={() => navigate("/inventory")} className={cardClass}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full blur-2xl group-hover:bg-amber-100 transition-colors"></div>
          <div className="flex items-center gap-3 text-amber-500 font-bold text-sm tracking-wider uppercase mb-4">
            <Package size={16} /> Low Stock Alerts
          </div>
          <h2 className="text-4xl font-black text-gray-900">{stats.lowStockCount}</h2>
          <p className="text-xs text-gray-400 font-bold mt-4 flex items-center gap-1 group-hover:text-amber-500 transition-colors">
            Reorder medicines <ArrowRight size={12} />
          </p>
        </div>

        {/* Expiry Card */}
        <div onClick={() => navigate("/inventory")} className={cardClass}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 rounded-full blur-2xl group-hover:bg-red-100 transition-colors"></div>
          <div className="flex items-center gap-3 text-red-500 font-bold text-sm tracking-wider uppercase mb-4">
            <AlertTriangle size={16} /> Expired Batch
          </div>
          <h2 className="text-4xl font-black text-gray-900">{stats.expiryCount}</h2>
          <p className="text-xs text-gray-400 font-bold mt-4 flex items-center gap-1 group-hover:text-red-500 transition-colors">
            Check inventory <ArrowRight size={12} />
          </p>
        </div>
      </div>

      {/* Operational Actions */}
      <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest mb-6 flex items-center gap-2">
        <CheckCircle size={24} className="text-[var(--hp-primary)]" /> Quick Operations
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <div onClick={() => navigate("/billing")} className={actionCardClass}>
          <div className="w-14 h-14 bg-teal-50 text-[var(--hp-primary)] rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-[var(--hp-primary)] group-hover:text-white transition-colors duration-300">
            <ShoppingCart size={28} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-gray-900">New Checkout</h4>
            <p className="text-sm text-gray-500 font-medium">Create and print medicine bills</p>
          </div>
        </div>

        <div onClick={() => navigate("/notification")} className={actionCardClass}>
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-red-500 group-hover:text-white transition-colors duration-300">
            <Bell size={28} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-gray-900">Notification</h4>
            <p className="text-sm text-gray-500 font-medium">Reminders & refill follow-ups</p>
          </div>
        </div>

        <div onClick={() => navigate("/inventory")} className={actionCardClass}>
          <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
            <Box size={28} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-gray-900">Inventory</h4>
            <p className="text-sm text-gray-500 font-medium">Stock levels & medicine logs</p>
          </div>
        </div>

        <div onClick={() => navigate("/receipts")} className={actionCardClass}>
          <div className="w-14 h-14 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
            <FileText size={28} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-gray-900">Receipt History</h4>
            <p className="text-sm text-gray-500 font-medium">View and reprint past transactions</p>
          </div>
        </div>

        <div onClick={() => navigate("/analytics")} className={actionCardClass}>
          <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
            <BarChart2 size={28} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-gray-900">Report Center</h4>
            <p className="text-sm text-gray-500 font-medium">Daily & annual sales insights</p>
          </div>
        </div>

      </div>

      {/* Extra space for footer-like feel */}
      <div className="mt-20 text-center">
        <div className="inline-flex items-center gap-2 px-6 py-2 bg-gray-50 rounded-full border border-gray-100 text-gray-400 text-sm font-bold">
          <Calendar size={14} /> System v2.1 • All services operational
        </div>
      </div>
    </div>
  );
}
