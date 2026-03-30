import React, { useEffect, useState } from "react";
import { api } from "../api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Filter, TrendingUp, DollarSign, Package, AlertCircle, Calendar } from "lucide-react";

const COLORS = ["#0f766e", "#0369a1", "#f59e0b", "#ef4444", "#6366f1", "#8b5cf6", "#ec4899", "#10b981"];

export default function Analytics() {
  const [performanceData, setPerformanceData] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Slicers / Filters
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("Last 7 Days");

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

  // Filtered Data Logic
  const filteredReceipts = receipts.filter(r => {
    const rDate = new Date(r.date || r.createdAt);
    const now = new Date();
    
    // Category Slicer
    if (categoryFilter !== "All" && r.category !== categoryFilter) return false;

    // Date Slicer
    if (dateFilter === "Today") {
      return rDate.toDateString() === now.toDateString();
    }
    if (dateFilter === "This Month") {
      return rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear();
    }
    if (dateFilter === "This Quarter") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const rQuarter = Math.floor(rDate.getMonth() / 3);
      return rQuarter === currentQuarter && rDate.getFullYear() === now.getFullYear();
    }
    if (dateFilter === "This Year") {
      return rDate.getFullYear() === now.getFullYear();
    }
    return true; // All Time
  });

  const filteredPerformance = performanceData.filter(p => 
    categoryFilter === "All" || p.category === categoryFilter
  );

  // Compute Stats from Filtered Data
  const totalSales = filteredReceipts.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
  const topMedicine = filteredPerformance[0]?.medicineName || "N/A";
  
  // Charts Data
  const categorySplit = Object.values(
    filteredReceipts.reduce((acc, r) => {
      acc[r.category] = acc[r.category] || { name: r.category, value: 0 };
      acc[r.category].value += r.totalPrice;
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value);

  const salesTrend = [];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    salesTrend.push({
      date: d.toLocaleDateString(),
      day: days[d.getDay()],
      sales: 0
    });
  }
  filteredReceipts.forEach(r => {
    const rDateStr = new Date(r.date || r.createdAt).toLocaleDateString();
    const trendItem = salesTrend.find(t => t.date === rDateStr);
    if (trendItem) trendItem.sales += r.totalPrice;
  });

  const topMedsChart = filteredPerformance
    .slice(0, 5)
    .map(p => ({ name: p.medicineName, sales: p.totalUnitsSold }));

  const categories = ["All", ...new Set(performanceData.map(p => p.category))];

  return (
    <div className="animate-in fade-in duration-700 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Advanced <span className="text-[var(--hp-primary)]">Reporting</span>
          </h1>
          <p className="text-gray-500 font-bold mt-1">Multi-table relational performance tracking</p>
        </div>

        {/* --- PERFORMANCE SLICERS --- */}
        <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 px-3 border-r h-full">
            <Filter size={16} className="text-teal-600" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Slicers</span>
          </div>
          
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-transparent text-sm font-black text-gray-700 focus:outline-none cursor-pointer"
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-transparent text-sm font-black text-gray-700 focus:outline-none cursor-pointer border-l pl-4"
          >
            <option value="Today">Today</option>
            <option value="This Month">This Month</option>
            <option value="This Quarter">This Quarter</option>
            <option value="This Year">This Year</option>
            <option value="All Time">All Time</option>
          </select>
        </div>
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
             <StatCard title="Total Revenue" value={`₹${totalSales.toLocaleString()}`} icon={<DollarSign/>} color="emerald" />
             <StatCard title="Top Performer" value={topMedicine} icon={<TrendingUp/>} color="blue" />
             <StatCard title="Units Moved" value={filteredReceipts.reduce((s, r) => s + r.qty, 0)} icon={<Package/>} color="amber" />
             <StatCard title="Active Alerts" value={notifications.filter(n => !n.completed).length} icon={<AlertCircle/>} color="red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sales Trend */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-2">
               <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                 <Calendar size={16} className="text-teal-600" /> Daily Revenue Flow
               </h3>
               <ResponsiveContainer width="100%" height={300}>
                 <LineChart data={salesTrend}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                   <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontWeight: 'bold'}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontWeight: 'bold'}} />
                   <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                   <Line type="monotone" dataKey="sales" stroke="#0f766e" strokeWidth={5} dot={{ r: 6, fill: '#0f766e', strokeWidth: 0 }} />
                 </LineChart>
               </ResponsiveContainer>
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
               </div>
            </div>

            {/* Category Performance */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-3 overflow-hidden">
               <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-8">Revenue Contribution by Category</h3>
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
            </div>

            {/* NEW: MEDICINE PERFORMANCE TABLE */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 lg:col-span-3 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
                <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">Relational Performance Index</h3>
                <span className="text-[10px] font-black bg-teal-100 text-teal-600 px-2 py-1 rounded-full">{filteredPerformance.length} Items Tracked</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-[10px] uppercase font-black text-gray-400 bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4">Medicine Name</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4 text-center">Units Sold</th>
                      <th className="px-6 py-4 text-right">Revenue</th>
                      <th className="px-6 py-4 text-right">Last Movement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredPerformance.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/80 transition-colors group">
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


