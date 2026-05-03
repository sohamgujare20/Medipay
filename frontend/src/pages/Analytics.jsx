import React, { useEffect, useState, useMemo } from "react";
import { api } from "../api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Filter, TrendingUp, IndianRupee, Package, AlertCircle, Calendar, X, ChevronLeft, ChevronRight } from "lucide-react";

const COLORS = ["#0f766e", "#0369a1", "#f59e0b", "#ef4444", "#6366f1", "#8b5cf6", "#ec4899", "#10b981"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Analytics() {
  const [performanceData, setPerformanceData] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [filterMode, setFilterMode] = useState("preset"); // "preset" | "months" | "custom"
  const [presetFilter, setPresetFilter] = useState("All Time");
  const [selectedMonths, setSelectedMonths] = useState([]); // [0..11]
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [perf, recs, notes] = await Promise.all([
          api.analytics.getPerformance(),
          api.analytics.getReceipts(),
          api.notifications.getAll()
        ]);
        setPerformanceData(perf);
        setReceipts(recs);
        setNotifications(notes);
      } catch (error) {
        console.error("Analytics fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Date filter logic
  const dateInRange = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();

    if (filterMode === "preset") {
      if (presetFilter === "All Time") return true;
      if (presetFilter === "Today") return d.toDateString() === now.toDateString();
      if (presetFilter === "Last 7 Days") {
        const week = new Date(); week.setDate(week.getDate() - 7); return d >= week;
      }
      if (presetFilter === "This Week") {
        const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
        return d >= start;
      }
      if (presetFilter === "This Month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (presetFilter === "This Quarter") {
        const q = Math.floor(now.getMonth() / 3);
        return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === now.getFullYear();
      }
      if (presetFilter === "This Year") return d.getFullYear() === now.getFullYear();
      return true;
    }

    if (filterMode === "months") {
      return d.getFullYear() === selectedYear && selectedMonths.includes(d.getMonth());
    }

    if (filterMode === "custom") {
      if (customFrom && d < new Date(customFrom)) return false;
      if (customTo) { const to = new Date(customTo); to.setHours(23,59,59,999); if (d > to) return false; }
      return true;
    }

    return true;
  };

  const filteredReceipts = receipts.filter(r => {
    if (categoryFilter !== "All" && r.category !== categoryFilter) return false;
    return dateInRange(r.date || r.createdAt);
  });

  // Derive performance from filtered receipts (date-aware)
  const receiptPerformance = useMemo(() => {
    const map = {};
    filteredReceipts.forEach(r => {
      const key = r.name || 'Unknown';
      if (!map[key]) map[key] = { medicineName: key, category: r.category || 'General', totalUnitsSold: 0, totalRevenue: 0, lastSold: null };
      map[key].totalUnitsSold += r.qty || 0;
      map[key].totalRevenue += r.totalPrice || 0;
      const d = new Date(r.date || r.createdAt);
      if (!map[key].lastSold || d > new Date(map[key].lastSold)) map[key].lastSold = d;
    });
    return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredReceipts]);

  // Movement chart data — auto-buckets: daily (≤15), weekly (16-60), monthly (60+)
  const movementData = useMemo(() => {
    if (filteredReceipts.length === 0) return { data: [], mode: 'daily' };

    // First, bucket by day
    const dayMap = {};
    filteredReceipts.forEach(r => {
      const d = new Date(r.date || r.createdAt);
      const key = d.toLocaleDateString();
      if (!dayMap[key]) dayMap[key] = { sortKey: d.getTime(), date: d, amount: 0, quantity: 0 };
      dayMap[key].amount += r.totalPrice || 0;
      dayMap[key].quantity += r.qty || 0;
    });
    const dailyEntries = Object.values(dayMap).sort((a, b) => a.sortKey - b.sortKey);
    const totalDays = dailyEntries.length;

    // ≤ 15 days → show daily
    if (totalDays <= 15) {
      return {
        data: dailyEntries.map(e => ({
          label: `${e.date.getDate()} ${MONTH_SHORT[e.date.getMonth()]}`,
          amount: Math.round(e.amount),
          quantity: e.quantity
        })),
        mode: 'daily'
      };
    }

    // 16-60 days → show weekly
    if (totalDays <= 60) {
      const weekMap = {};
      dailyEntries.forEach(e => {
        const d = e.date;
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const key = weekStart.toLocaleDateString();
        if (!weekMap[key]) weekMap[key] = { sortKey: weekStart.getTime(), start: weekStart, amount: 0, quantity: 0 };
        weekMap[key].amount += e.amount;
        weekMap[key].quantity += e.quantity;
      });
      return {
        data: Object.values(weekMap).sort((a, b) => a.sortKey - b.sortKey).map(w => ({
          label: `${w.start.getDate()} ${MONTH_SHORT[w.start.getMonth()]}`,
          amount: Math.round(w.amount),
          quantity: w.quantity
        })),
        mode: 'weekly'
      };
    }

    // 60+ days → show monthly
    const monthMap = {};
    dailyEntries.forEach(e => {
      const key = `${e.date.getFullYear()}-${e.date.getMonth()}`;
      if (!monthMap[key]) monthMap[key] = { sortKey: new Date(e.date.getFullYear(), e.date.getMonth()).getTime(), month: e.date.getMonth(), year: e.date.getFullYear(), amount: 0, quantity: 0 };
      monthMap[key].amount += e.amount;
      monthMap[key].quantity += e.quantity;
    });
    return {
      data: Object.values(monthMap).sort((a, b) => a.sortKey - b.sortKey).map(m => ({
        label: `${MONTH_SHORT[m.month]} ${m.year}`,
        amount: Math.round(m.amount),
        quantity: m.quantity
      })),
      mode: 'monthly'
    };
  }, [filteredReceipts]);

  // Stats
  const totalSales = filteredReceipts.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
  const topMedicine = receiptPerformance[0]?.medicineName || "N/A";
  const totalUnits = filteredReceipts.reduce((s, r) => s + r.qty, 0);

  // Category split
  const categorySplit = Object.values(
    filteredReceipts.reduce((acc, r) => {
      acc[r.category] = acc[r.category] || { name: r.category, value: 0 };
      acc[r.category].value += r.totalPrice;
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value);

  // Sales trend - dynamic based on filter
  const salesTrend = useMemo(() => {
    if (filteredReceipts.length === 0) return [];

    // If months mode, show daily breakdown across selected months
    if (filterMode === "months" && selectedMonths.length > 0) {
      const monthlyData = {};
      selectedMonths.sort((a,b) => a - b).forEach(m => {
        const key = MONTH_SHORT[m];
        monthlyData[key] = { date: key, day: key, sales: 0 };
      });
      filteredReceipts.forEach(r => {
        const rd = new Date(r.date || r.createdAt);
        const key = MONTH_SHORT[rd.getMonth()];
        if (monthlyData[key]) monthlyData[key].sales += r.totalPrice;
      });
      return Object.values(monthlyData);
    }

    // For custom range or presets, bucket by day (up to 31 days) or by month
    const dates = filteredReceipts.map(r => new Date(r.date || r.createdAt));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const diffDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays <= 31) {
      // Daily
      const daily = {};
      for (let i = 0; i < diffDays; i++) {
        const d = new Date(minDate);
        d.setDate(d.getDate() + i);
        const key = d.toLocaleDateString();
        daily[key] = { date: key, day: `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`, sales: 0 };
      }
      filteredReceipts.forEach(r => {
        const key = new Date(r.date || r.createdAt).toLocaleDateString();
        if (daily[key]) daily[key].sales += r.totalPrice;
      });
      return Object.values(daily);
    } else {
      // Monthly
      const monthly = {};
      filteredReceipts.forEach(r => {
        const rd = new Date(r.date || r.createdAt);
        const key = `${MONTH_SHORT[rd.getMonth()]} ${rd.getFullYear()}`;
        if (!monthly[key]) monthly[key] = { date: key, day: key, sales: 0 };
        monthly[key].sales += r.totalPrice;
      });
      return Object.values(monthly);
    }
  }, [filteredReceipts, filterMode, selectedMonths]);

  const topMedsChart = receiptPerformance.slice(0, 5).map(p => ({ name: p.medicineName, sales: p.totalUnitsSold }));
  const categories = ["All", ...new Set(performanceData.map(p => p.category))];

  const toggleMonth = (m) => {
    setSelectedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a,b) => a - b));
  };

  const getActiveLabel = () => {
    if (filterMode === "preset") return presetFilter;
    if (filterMode === "months") {
      if (selectedMonths.length === 0) return "Select months";
      return selectedMonths.map(m => MONTH_SHORT[m]).join(", ") + ` ${selectedYear}`;
    }
    if (filterMode === "custom") {
      if (!customFrom && !customTo) return "Set range";
      return `${customFrom || "..."} → ${customTo || "..."}`;
    }
    return "";
  };

  return (
    <div className="animate-in fade-in duration-700 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Advanced <span className="text-[var(--hp-primary)]">Reporting</span>
          </h1>
          <p className="text-gray-500 font-bold mt-1">Multi-table relational performance tracking</p>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 px-3 border-r h-full">
            <Filter size={16} className="text-teal-600" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Category</span>
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-transparent text-sm font-black text-gray-700 focus:outline-none cursor-pointer">
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* ===== TIME PERIOD FILTER BAR ===== */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 mr-2">
            <Calendar size={18} className="text-teal-600" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Time Period</span>
          </div>

          {/* Mode tabs */}
          {[
            { key: "preset", label: "Quick" },
            { key: "months", label: "By Month" },
            { key: "custom", label: "Custom Range" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilterMode(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                filterMode === tab.key
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-600/20"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}>
              {tab.label}
            </button>
          ))}

          {/* Active label */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400">Showing:</span>
            <span className="bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full text-xs font-black">{getActiveLabel()}</span>
          </div>
        </div>

        {/* Preset options */}
        {filterMode === "preset" && (
          <div className="flex flex-wrap gap-2">
            {["Today", "Last 7 Days", "This Week", "This Month", "This Quarter", "This Year", "All Time"].map(opt => (
              <button key={opt} onClick={() => setPresetFilter(opt)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  presetFilter === opt
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100"
                }`}>
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Month selector */}
        {filterMode === "months" && (
          <div className="space-y-3">
            {/* Year selector */}
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedYear(y => y - 1)}
                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all text-gray-600">
                <ChevronLeft size={16} />
              </button>
              <span className="text-lg font-black text-gray-800 w-16 text-center">{selectedYear}</span>
              <button onClick={() => setSelectedYear(y => y + 1)}
                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all text-gray-600">
                <ChevronRight size={16} />
              </button>
              {selectedMonths.length > 0 && (
                <button onClick={() => setSelectedMonths([])}
                  className="ml-2 px-3 py-1 text-xs font-bold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-all flex items-center gap-1">
                  <X size={12} /> Clear
                </button>
              )}
              <button onClick={() => setSelectedMonths([0,1,2,3,4,5,6,7,8,9,10,11])}
                className="px-3 py-1 text-xs font-bold text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-all">
                Select All
              </button>
            </div>
            {/* Month pills */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
              {MONTH_NAMES.map((month, idx) => (
                <button key={month} onClick={() => toggleMonth(idx)}
                  className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                    selectedMonths.includes(idx)
                      ? "bg-teal-600 text-white shadow-md shadow-teal-600/20 scale-105"
                      : "bg-gray-50 text-gray-500 hover:bg-teal-50 hover:text-teal-600 border border-gray-100"
                  }`}>
                  {MONTH_SHORT[idx]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom date range */}
        {filterMode === "custom" && (
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">From</label>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:border-teal-500 outline-none transition-colors" />
            </div>
            <span className="text-gray-300 font-bold mt-4">→</span>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">To</label>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:border-teal-500 outline-none transition-colors" />
            </div>
            {(customFrom || customTo) && (
              <button onClick={() => { setCustomFrom(""); setCustomTo(""); }}
                className="mt-4 px-3 py-2 text-xs font-bold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-all flex items-center gap-1">
                <X size={12} /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-20 text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 font-black uppercase tracking-widest">Aggregating relational data...</p>
        </div>
      ) : (
        <>
          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <StatCard title="Total Revenue" value={"₹" + totalSales.toLocaleString()} icon={<IndianRupee/>} color="emerald" />
             <StatCard title="Top Performer" value={topMedicine} icon={<TrendingUp/>} color="blue" />
             <StatCard title="Units Moved" value={totalUnits} icon={<Package/>} color="amber" />
             <StatCard title="Active Alerts" value={notifications.filter(n => !n.completed).length} icon={<AlertCircle/>} color="red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sales Trend */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-2">
               <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                 <Calendar size={16} className="text-teal-600" /> Revenue Flow
               </h3>
               {salesTrend.length > 0 ? (
                 <ResponsiveContainer width="100%" height={300}>
                   <LineChart data={salesTrend}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                     <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontWeight: 'bold', fontSize: 12}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontWeight: 'bold'}} />
                     <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} />
                     <Line type="monotone" dataKey="sales" stroke="#0f766e" strokeWidth={5} dot={{ r: 6, fill: '#0f766e', strokeWidth: 0 }} />
                   </LineChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="h-[300px] flex items-center justify-center text-gray-300">
                   <p className="font-bold">No sales data for selected period</p>
                 </div>
               )}
            </div>

            {/* Performance Ranking */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
               <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                 Top 5 Rank
               </h3>
               <div className="flex-1 space-y-4">
                  {topMedsChart.map((med, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-black text-gray-400">#{idx+1}</span>
                          <span className="font-bold text-gray-700">{med.name}</span>
                       </div>
                       <span className="font-black text-teal-600">{med.sales} units</span>
                    </div>
                  ))}
                  {topMedsChart.length === 0 && (
                    <p className="text-gray-300 font-bold text-center py-8">No data</p>
                  )}
               </div>
            </div>

            {/* Category Performance */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-3 overflow-hidden">
               <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-8">Revenue Contribution by Category</h3>
               {categorySplit.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={categorySplit} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                          {categorySplit.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={8}/>)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3">
                       {categorySplit.map((cat, idx) => (
                         <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                              <span className="text-sm font-bold text-gray-600">{cat.name}</span>
                            </div>
                            <span className="font-black text-gray-900">₹{cat.value.toLocaleString()}</span>
                         </div>
                       ))}
                    </div>
                 </div>
               ) : (
                 <div className="h-[200px] flex items-center justify-center text-gray-300">
                   <p className="font-bold">No data for selected period</p>
                 </div>
               )}
            </div>

            {/* MEDICINE MOVEMENT BAR CHART — auto-bucketed */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-3">
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                   <Package size={16} className="text-blue-600" /> Medicine Movement — Amount & Quantity
                 </h3>
                 {movementData.data.length > 0 && (
                   <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 text-blue-600">
                     {movementData.mode === 'daily' ? 'Daily' : movementData.mode === 'weekly' ? 'Weekly' : 'Monthly'} View · {movementData.data.length} entries
                   </span>
                 )}
               </div>
               {movementData.data.length > 0 ? (
                 <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                   <div style={{ minWidth: Math.max(600, movementData.data.length * 70) }}>
                     <ResponsiveContainer width="100%" height={350}>
                       <BarChart data={movementData.data} barGap={6} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                         <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontWeight: 'bold', fontSize: 11}} interval={0} angle={movementData.data.length > 10 ? -35 : 0} textAnchor={movementData.data.length > 10 ? 'end' : 'middle'} height={movementData.data.length > 10 ? 60 : 40} />
                         <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontWeight: 'bold'}} label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af', fontWeight: 'bold', fontSize: 10 } }} />
                         <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontWeight: 'bold'}} label={{ value: 'Quantity', angle: 90, position: 'insideRight', style: { fill: '#9ca3af', fontWeight: 'bold', fontSize: 10 } }} />
                         <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(v, name) => [name === 'amount' ? `₹${v.toLocaleString()}` : v, name === 'amount' ? 'Amount (₹)' : 'Quantity (Units)']} />
                         <Legend formatter={(value) => value === 'amount' ? 'Amount (₹)' : 'Quantity (Units)'} />
                         <Bar yAxisId="left" dataKey="amount" fill="#0f766e" radius={[6, 6, 0, 0]} maxBarSize={40} />
                         <Bar yAxisId="right" dataKey="quantity" fill="#0369a1" radius={[6, 6, 0, 0]} maxBarSize={40} />
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                 </div>
               ) : (
                 <div className="h-[300px] flex items-center justify-center text-gray-300">
                   <p className="font-bold">No movement data for selected period</p>
                 </div>
               )}
            </div>

            {/* MEDICINE PERFORMANCE TABLE (date-aware) */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 lg:col-span-3 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
                <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">Relational Performance Index</h3>
                <span className="text-[10px] font-black bg-teal-100 text-teal-600 px-2 py-1 rounded-full">{receiptPerformance.length} Items in Period</span>
              </div>
              {receiptPerformance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-[10px] uppercase font-black text-gray-400 bg-gray-50/50">
                      <tr>
                        <th className="px-6 py-4">#</th>
                        <th className="px-6 py-4">Medicine Name</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4 text-center">Units Sold</th>
                        <th className="px-6 py-4 text-right">Revenue</th>
                        <th className="px-6 py-4 text-right">Last Movement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {receiptPerformance.map((p, idx) => (
                        <tr key={p.medicineName} className="hover:bg-gray-50/80 transition-colors group">
                          <td className="px-6 py-4 text-xs font-black text-gray-300">{idx + 1}</td>
                          <td className="px-6 py-4 font-bold text-gray-800">{p.medicineName}</td>
                          <td className="px-6 py-4">
                             <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">{p.category}</span>
                          </td>
                          <td className="px-6 py-4 text-center font-black text-gray-400 group-hover:text-teal-600">{p.totalUnitsSold}</td>
                          <td className="px-6 py-4 text-right font-black text-gray-900">₹{p.totalRevenue.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right text-xs text-gray-400 font-bold">
                            {p.lastSold ? new Date(p.lastSold).toLocaleDateString() : "Never"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-300">
                  <p className="font-bold">No medicine data for selected period</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600"
  };
  return (
    <div className="p-6 bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
      <div className={`w-10 h-10 ${colors[color]} rounded-xl flex items-center justify-center mb-4 border border-opacity-10 group-hover:scale-110 transition-transform`}>
        {React.cloneElement(icon, { size: 20 })}
      </div>
      <div className="text-gray-400 font-black text-[10px] tracking-[0.2em] uppercase mb-1">{title}</div>
      <h2 className="text-2xl font-black text-gray-900 leading-tight truncate">{value}</h2>
    </div>
  );
}
