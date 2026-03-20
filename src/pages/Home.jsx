import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ShoppingCart, FileText, Box, BarChart2, 
  CheckCircle, Circle, Plus, Trash2, Calendar
} from "lucide-react";
import { api } from "../api";

export default function Home() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [todaySales, setTodaySales] = useState(0);
  const [todayBills, setTodayBills] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiryCount, setExpiryCount] = useState(0);

  // Reminders State
  const [reminders, setReminders] = useState([]);
  const [newReminder, setNewReminder] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invData, billsData, remData] = await Promise.all([
        api.inventory.getAll(),
        api.bills.getAll(),
        api.reminders.getAll()
      ]);

      const todayStr = new Date().toLocaleDateString();

      // Compute Dashboard Stats
      const todaysBills = billsData.filter(bill => {
        const bd = bill.created_at ? new Date(bill.created_at) : new Date();
        return bd.toLocaleDateString() === todayStr;
      });

      const totalSales = todaysBills.reduce((sum, b) => sum + Number(b.total || 0), 0);
      const lowStock = invData.filter(item => Number(item.qty) <= 5).length;
      
      const now = new Date();
      const expiredItems = invData.filter(item => {
        if (!item.expiry) return false;
        return new Date(item.expiry) < now;
      }).length;

      setTodayBills(todaysBills.length);
      setTodaySales(totalSales);
      setLowStockCount(lowStock);
      setExpiryCount(expiredItems);
      setReminders(remData);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reminder Handlers
  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!newReminder.trim()) return;
    try {
      const added = await api.reminders.create({ text: newReminder });
      setReminders(prev => [added, ...prev]);
      setNewReminder("");
    } catch (err) {
      console.error(err);
    }
  };

  const toggleReminder = async (id, currentStatus) => {
    try {
      // Optimistic update
      setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: !currentStatus } : r));
      await api.reminders.update(id, { completed: !currentStatus });
    } catch (err) {
      console.error(err);
      fetchData(); // revert on fail
    }
  };

  const deleteReminder = async (id) => {
    try {
      setReminders(prev => prev.filter(r => r.id !== id));
      await api.reminders.delete(id);
    } catch (err) {
      console.error(err);
    }
  };

  const cardClass = "p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-in-out cursor-pointer relative overflow-hidden group";
  const quickActionClass = "flex flex-col items-center justify-center gap-3 p-6 font-medium rounded-2xl shadow-sm text-white transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-white/20";

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-4 pb-12">
      <div className="flex items-center justify-between mb-8 mt-2">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-700 to-teal-500 animate-slide-down">
          Dashboard Overview
        </h1>
        {loading && <div className="text-teal-600 animate-pulse text-sm font-medium rounded-full bg-teal-50 px-4 py-1">Updating live...</div>}
      </div>

      {/* Info Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className={`${cardClass} animate-fade-up`} style={{ animationDelay: "0.1s" }}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-full blur-xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-gray-500 text-sm font-medium flex items-center gap-2"><Calendar size={14}/> Today's Sales</p>
          <h2 className="text-4xl font-extrabold text-teal-700 mt-3 relative z-10 transition-colors">
            ₹{todaySales.toFixed(2)}
          </h2>
        </div>

        <div className={`${cardClass} animate-fade-up`} style={{ animationDelay: "0.2s" }}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-full blur-xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-gray-500 text-sm font-medium flex items-center gap-2"><FileText size={14}/> Bills Generated</p>
          <h2 className="text-4xl font-extrabold text-sky-600 mt-3 relative z-10">{todayBills}</h2>
        </div>

        <div onClick={() => navigate("/inventory?filter=lowstock")} className={`${cardClass} animate-fade-up`} style={{ animationDelay: "0.3s" }}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full blur-xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-gray-500 text-sm font-medium flex items-center gap-2"><Box size={14}/> Low Stock Alerts</p>
          <h2 className="text-4xl font-extrabold text-amber-500 mt-3 relative z-10">{lowStockCount}</h2>
          <p className="text-xs text-amber-600/70 mt-2 font-medium">Click to view details</p>
        </div>

        <div onClick={() => navigate("/inventory?filter=expired")} className={`${cardClass} animate-fade-up`} style={{ animationDelay: "0.4s" }}>
           <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full blur-xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-gray-500 text-sm font-medium flex items-center gap-2">Expired Medicines</p>
          <h2 className="text-4xl font-extrabold text-red-500 mt-3 relative z-10">{expiryCount}</h2>
          <p className="text-xs text-red-600/70 mt-2 font-medium">Click to view stock</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        
        {/* Quick Actions (Takes 2 columns on lg) */}
        <div className="lg:col-span-2 space-y-4 animate-slide-up">
          <h2 className="text-xl font-bold text-gray-800">Operational Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => navigate("/billing")} className={`${quickActionClass} bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700`}>
              <ShoppingCart size={32} className="opacity-90 drop-shadow-sm" />
              <span className="text-lg">Create New Bill</span>
            </button>
            <button onClick={() => navigate("/receipts")} className={`${quickActionClass} bg-gradient-to-br from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700`}>
              <FileText size={32} className="opacity-90 drop-shadow-sm" />
              <span className="text-lg">View Receipts</span>
            </button>
            <button onClick={() => navigate("/inventory")} className={`${quickActionClass} bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950 border-none`}>
              <Box size={32} className="opacity-80 drop-shadow-sm" />
              <span className="text-lg">Manage Inventory</span>
            </button>
            <button onClick={() => navigate("/analytics")} className={`${quickActionClass} bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700`}>
              <BarChart2 size={32} className="opacity-90 drop-shadow-sm" />
              <span className="text-lg">Check Analytics</span>
            </button>
          </div>
        </div>

        {/* Reminders Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden animate-slide-up lg:col-span-1" style={{ animationDelay: "0.2s" }}>
          <div className="bg-gray-50 px-5 py-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle size={20} className="text-teal-600"/> Tasks & Reminders
            </h2>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto max-h-[320px] bg-white">
            {loading && reminders.length === 0 ? (
              <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : reminders.length > 0 ? (
              <ul className="space-y-3">
                {reminders.map(rem => (
                  <li key={rem.id} className="group flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                    <button onClick={() => toggleReminder(rem.id, rem.completed)} className="mt-0.5 shrink-0 text-gray-400 hover:text-teal-500 transition-colors">
                      {rem.completed ? <CheckCircle size={20} className="text-teal-500" /> : <Circle size={20} />}
                    </button>
                    <span className={`flex-1 text-sm leading-tight pt-0.5 ${rem.completed ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>
                      {rem.text}
                    </span>
                    <button onClick={() => deleteReminder(rem.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-8 text-center px-4">
                <CheckCircle size={32} className="mb-3 opacity-20" />
                <p className="text-sm border-none p-0">You are all caught up!</p>
                <p className="text-xs mt-1 border-none p-0">Add tasks below</p>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <form onSubmit={handleAddReminder} className="flex gap-2 relative">
              <input 
                type="text" 
                placeholder="New reminder..." 
                value={newReminder}
                onChange={e => setNewReminder(e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all bg-white"
              />
              <button disabled={!newReminder.trim()} type="submit" className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-colors shrink-0">
                <Plus size={20} />
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
