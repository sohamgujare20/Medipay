// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ShoppingCart, FileText, Box, BarChart2, 
  Bell, ArrowRight, TrendingUp, AlertTriangle, 
  Calendar, CheckCircle, Package, Clock, Activity
} from "lucide-react";
import { api } from "../api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

export default function Home() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
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

      // Chart Data for last 7 days
      const last7Days = Array.from({length: 7}).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { date: d.toLocaleDateString(), sales: 0, dateObj: d };
      });

      billsData.forEach(bill => {
        const bd = bill.createdAt || bill.created_at ? new Date(bill.createdAt || bill.created_at) : new Date();
        const dateStr = bd.toLocaleDateString();
        const dayMatch = last7Days.find(d => d.date === dateStr);
        if (dayMatch) {
          dayMatch.sales += Number(bill.total || 0);
        }
      });
      
      const cData = last7Days.map(d => ({
        name: d.dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
        Sales: d.sales
      }));
      setChartData(cData);

    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const cardClass = "relative overflow-hidden p-6 bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer group flex flex-col justify-between";
  const actionCardClass = "flex items-center gap-4 p-5 bg-white/60 backdrop-blur-md rounded-2xl border border-gray-100 hover:border-teal-500 hover:shadow-xl transition-all transform hover:-translate-y-1 group cursor-pointer";

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12 animate-in fade-in duration-700 bg-gray-50/50 min-h-screen rounded-3xl mt-4">
      
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pt-8 px-2">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-600 rounded-full text-xs font-bold mb-4 tracking-wider uppercase border border-teal-100 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            Live Dashboard
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
            Medi<span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-blue-600">Pay</span> Overview
          </h1>
          <p className="text-gray-500 mt-2 font-medium text-lg">
            Here's what's happening in your pharmacy today.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-right hidden md:block px-4 border-r border-gray-100">
            <p className="text-sm font-bold text-gray-900">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="text-xs text-teal-600 font-bold flex items-center justify-end gap-1"><Clock size={12}/> Session Active</p>
          </div>
          <button 
            onClick={fetchData} 
            className="p-3 bg-teal-50 text-teal-600 rounded-xl hover:bg-teal-500 hover:text-white transition-all shadow-sm flex items-center gap-2 font-bold text-sm"
            title="Refresh Stats"
          >
            <TrendingUp size={18} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        
        {/* Sales Card */}
        <div onClick={() => navigate("/analytics")} className={cardClass}>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-teal-50 rounded-full blur-3xl group-hover:bg-teal-100 transition-colors duration-500"></div>
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <TrendingUp size={24} strokeWidth={2.5} />
              </div>
              <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold">+12%</span>
            </div>
            <div className="text-gray-500 font-bold text-sm tracking-wider uppercase mb-1">Today's Sales</div>
            <h2 className="text-4xl font-black text-gray-900 relative z-10">₹{stats.todaySales.toFixed(2)}</h2>
          </div>
          <p className="text-xs text-gray-400 font-bold mt-6 flex items-center gap-1 group-hover:text-teal-600 transition-colors">
            View analytics report <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* Bills Card */}
        <div onClick={() => navigate("/receipts")} className={cardClass}>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl group-hover:bg-blue-100 transition-colors duration-500"></div>
          <div>
             <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <FileText size={24} strokeWidth={2.5} />
              </div>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">Today</span>
            </div>
            <div className="text-gray-500 font-bold text-sm tracking-wider uppercase mb-1">Bills Generated</div>
            <h2 className="text-4xl font-black text-gray-900 relative z-10">{stats.todayBills}</h2>
          </div>
          <p className="text-xs text-gray-400 font-bold mt-6 flex items-center gap-1 group-hover:text-blue-600 transition-colors">
            See all {stats.totalBills} receipts <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* Low Stock Card */}
        <div onClick={() => navigate("/inventory")} className={cardClass}>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-50 rounded-full blur-3xl group-hover:bg-amber-100 transition-colors duration-500"></div>
          <div>
             <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <Package size={24} strokeWidth={2.5} />
              </div>
              {stats.lowStockCount > 0 && <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold animate-pulse">Action Needed</span>}
            </div>
            <div className="text-gray-500 font-bold text-sm tracking-wider uppercase mb-1">Low Stock Alerts</div>
            <h2 className="text-4xl font-black text-gray-900 relative z-10">{stats.lowStockCount}</h2>
          </div>
          <p className="text-xs text-gray-400 font-bold mt-6 flex items-center gap-1 group-hover:text-amber-500 transition-colors">
            Reorder medicines <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* Expiry Card */}
        <div onClick={() => navigate("/inventory")} className={cardClass}>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-red-50 rounded-full blur-3xl group-hover:bg-red-100 transition-colors duration-500"></div>
          <div>
             <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <AlertTriangle size={24} strokeWidth={2.5} />
              </div>
              {stats.expiryCount > 0 && <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold animate-pulse">Critical</span>}
            </div>
            <div className="text-gray-500 font-bold text-sm tracking-wider uppercase mb-1">Expired Batch</div>
            <h2 className="text-4xl font-black text-gray-900 relative z-10">{stats.expiryCount}</h2>
          </div>
          <p className="text-xs text-gray-400 font-bold mt-6 flex items-center gap-1 group-hover:text-red-500 transition-colors">
            Check inventory <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <Activity size={24} className="text-teal-500" /> Sales Trend (Last 7 Days)
            </h3>
            <button onClick={() => navigate("/analytics")} className="text-sm font-bold text-teal-600 hover:text-teal-700 bg-teal-50 px-4 py-2 rounded-xl transition-colors">
              Full Report
            </button>
          </div>
          <div className="h-[300px] w-full">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">Loading chart data...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12, fontWeight: 600}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12, fontWeight: 600}} tickFormatter={(val) => `₹${val}`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                    itemStyle={{ color: '#14b8a6' }}
                    formatter={(value) => [`₹${value}`, 'Sales']}
                  />
                  <Area type="monotone" dataKey="Sales" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" activeDot={{r: 8, strokeWidth: 0, fill: '#14b8a6', style: {filter: 'drop-shadow(0px 4px 6px rgba(20, 184, 166, 0.5))'}}} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Operational Actions */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-black text-gray-800 flex items-center gap-2 mb-2">
            <CheckCircle size={24} className="text-blue-500" /> Quick Operations
          </h3>
          
          <div onClick={() => navigate("/billing")} className={actionCardClass}>
            <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/30 group-hover:scale-110 transition-transform duration-300">
              <ShoppingCart size={22} />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900">New Checkout</h4>
              <p className="text-xs text-gray-500 font-medium">Create medicine bills</p>
            </div>
          </div>

          <div onClick={() => navigate("/inventory")} className={actionCardClass}>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
              <Box size={22} />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900">Inventory</h4>
              <p className="text-xs text-gray-500 font-medium">Manage stock & medicines</p>
            </div>
          </div>

          <div onClick={() => navigate("/notification")} className={actionCardClass}>
            <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-red-500/30 group-hover:scale-110 transition-transform duration-300">
              <Bell size={22} />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900">Notifications</h4>
              <p className="text-xs text-gray-500 font-medium">Reminders & follow-ups</p>
            </div>
          </div>

          <div onClick={() => navigate("/receipts")} className={actionCardClass}>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
              <FileText size={22} />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900">Receipts</h4>
              <p className="text-xs text-gray-500 font-medium">Past transaction history</p>
            </div>
          </div>
          
        </div>
      </div>

    </div>
  );
}
