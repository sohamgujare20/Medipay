// src/pages/Notification.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api";
import { Bell, User, Phone, Calendar, CheckCircle, AlertCircle, Clock, Send, Trash2, Info } from "lucide-react";

export default function Notification() {
  const [bills, setBills] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const normalizeBill = (row) => {
    if (!row) return null;
    const createdAt = row.createdAt || row.created_at || new Date();
    const metadata = row.metadata || {};

    let autoSentCount = 0;
    if (metadata.sms_1day_before) autoSentCount++;
    if (metadata.sms_1day_after) autoSentCount++;

    return {
      id: row._id || row.id,
      billNo: row.bill_no,
      date: new Date(createdAt).toLocaleString(),
      customerName: row.customer_name || "Guest Customer",
      mobile: row.mobile || "—",
      daysToRefill: row.days_to_refill ?? null,
      autoReminderCount: autoSentCount,
      manualReminderCount: metadata.manualReminderCount || 0,
      metadata: metadata,
      createdAt: createdAt,
    };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [billsData, alertsData] = await Promise.all([
        api.bills.getAll(),
        api.notifications.getAll()
      ]);

      const now = new Date();
      
      const needsReminder = (billsData || [])
        .map(normalizeBill)
        .filter((b) => b.daysToRefill)
        .map((b) => {
          const billDate = new Date(b.createdAt);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const billDay = new Date(billDate);
          billDay.setHours(0, 0, 0, 0);
          const daysPassed = Math.round((today - billDay) / (1000 * 60 * 60 * 24));
          b.remainingDays = b.daysToRefill - daysPassed;
          return b;
        })
        .filter((b) => b.remainingDays >= -30)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setBills(needsReminder);
      
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      const filteredAlerts = (alertsData || []).filter(alert => {
        const alertDate = new Date(alert.created_at || alert.createdAt);
        return alertDate >= twoDaysAgo;
      });

      setSystemAlerts(filteredAlerts);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);



  const deleteAlert = async (id) => {
    if(!window.confirm("Delete this alert?")) return;
    try {
      await api.notifications.delete(id);
      setSystemAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 flex items-center gap-4">
            <div className="bg-red-50 p-3 rounded-2xl text-red-500 shadow-sm">
              <Bell size={32} />
            </div>
            Notification <span className="text-[var(--hp-primary)]">Hub</span>
          </h1>
          <p className="text-gray-500 mt-2 font-medium flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Manage medicine refill reminders and system-generated alerts
          </p>
        </div>
        <button 
          onClick={loadData}
          className="px-6 py-3 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition font-black text-gray-600 shadow-sm flex items-center gap-2"
        >
          <Clock size={18} /> Refresh Activity
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-220px)] min-h-[600px] overflow-hidden">
        {/* Left Column: Refill Reminders (Expanded Space) */}
        <div className="lg:col-span-3 flex flex-col h-full overflow-hidden">
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest flex items-center justify-between gap-2 px-2 mb-6 shrink-0">
            <span className="flex items-center gap-2">
              <Clock className="text-amber-500" size={20} /> Patient Refill Queue
            </span>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{bills.length} Records</span>
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-4 space-y-5 custom-scrollbar pb-10">
            {loading ? (
              <div className="text-center py-20 text-gray-400 font-bold animate-pulse uppercase tracking-[0.2em]">Analysing Schedules...</div>
            ) : bills.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-20 text-center">
                <CheckCircle size={48} className="text-gray-200 mx-auto mb-4" />
                <p className="text-xl font-bold text-gray-400">Schedule Clear</p>
              </div>
            ) : (
              bills.map((bill) => (
                <div key={bill.id} className={`bg-white rounded-[2.5rem] border shadow-sm transition-all hover:shadow-xl overflow-hidden ${bill.remainingDays <= 0 ? 'border-red-100' : 'border-gray-100'}`}>
                  <div className="flex flex-col md:flex-row">
                    {/* Large Refill Days Mention */}
                    <div className={`w-full md:w-48 p-8 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r ${bill.remainingDays <= 0 ? 'bg-red-50/50' : 'bg-teal-50/30'}`}>
                       <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${bill.remainingDays <= 0 ? 'text-red-500' : 'text-teal-600'}`}>
                         {bill.remainingDays <= 0 ? 'Overdue By' : 'Refill In'}
                       </div>
                       <div className={`text-6xl font-black leading-none ${bill.remainingDays <= 0 ? 'text-red-600' : 'text-teal-700'}`}>
                         {Math.abs(bill.remainingDays)}<span className="text-2xl ml-1">d</span>
                       </div>
                       <div className="text-[9px] font-bold text-gray-400 mt-2 uppercase tracking-tighter">
                         Cycle: {bill.daysToRefill} Days
                       </div>
                    </div>
                    
                    <div className="p-8 flex-1">
                       <div className="flex items-center justify-between mb-6">
                         <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-2xl flex items-center justify-center font-black shadow-lg shadow-teal-500/20">
                              {bill.customerName.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-black text-gray-900 text-xl leading-tight">{bill.customerName}</h3>
                              <p className="text-gray-500 font-bold flex items-center gap-1 mt-1"><Phone size={14} className="text-teal-500" /> {bill.mobile}</p>
                            </div>
                         </div>
                         <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Due Date</p>
                            <p className="text-sm font-black text-gray-800">{new Date(new Date(bill.createdAt).setDate(new Date(bill.createdAt).getDate() + bill.daysToRefill)).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}</p>
                         </div>
                       </div>
                       
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Pre-alert SMS</span>
                            {(bill.metadata?.sms_1day_before || bill.remainingDays < -2) ? (
                              <span className="text-[10px] font-black text-teal-600 bg-white px-3 py-1 rounded-full border border-teal-100 flex items-center gap-1 shadow-sm"><CheckCircle size={12}/> DELIVERED</span>
                            ) : (
                              <span className="text-[10px] font-black text-amber-500 bg-white px-3 py-1 rounded-full border border-amber-100 flex items-center gap-1 shadow-sm"><Clock size={12}/> PENDING</span>
                            )}
                          </div>
                          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Overdue SMS</span>
                            {(bill.metadata?.sms_1day_after || bill.remainingDays < -2) ? (
                              <span className="text-[10px] font-black text-teal-600 bg-white px-3 py-1 rounded-full border border-teal-100 flex items-center gap-1 shadow-sm"><CheckCircle size={12}/> DELIVERED</span>
                            ) : (
                              <span className="text-[10px] font-black text-amber-500 bg-white px-3 py-1 rounded-full border border-amber-100 flex items-center gap-1 shadow-sm"><Clock size={12}/> PENDING</span>
                            )}
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: System Alerts (Condensed/Short) */}
        <div className="lg:col-span-1 flex flex-col h-full overflow-hidden">
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest flex items-center justify-between gap-2 px-2 mb-6 shrink-0">
            <span className="flex items-center gap-2">
              <Info className="text-blue-500" size={18} /> Logs
            </span>
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 bg-white p-3 rounded-[2rem] border border-gray-100 custom-scrollbar shadow-inner">
            {loading ? (
              <div className="text-center py-10 text-gray-400 font-bold animate-pulse">Syncing...</div>
            ) : systemAlerts.length === 0 ? (
              <div className="text-center py-20 opacity-30">
                 <Bell className="text-gray-200 mx-auto mb-2" size={24} />
                 <p className="text-[9px] font-black uppercase tracking-widest">Clear</p>
              </div>
            ) : (
              systemAlerts.map(alert => (
                <div key={alert.id} className="p-3 rounded-xl border border-gray-100 group relative transition-all bg-gray-50/50 hover:bg-white hover:border-blue-200">
                   <div className="flex items-center justify-between mb-1.5">
                     <div className="flex items-center gap-1.5">
                        {alert.type === 'message' ? <Send size={10} className="text-teal-600" /> : <Info size={10} className="text-blue-400" />}
                        <span className={`text-[8px] font-black uppercase tracking-widest ${alert.type === 'message' ? 'text-teal-600' : 'text-blue-400'}`}>
                          {alert.type === 'message' ? 'SMS' : 'Alert'}
                        </span>
                     </div>
                     <button 
                        onClick={() => deleteAlert(alert.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                     >
                        <Trash2 size={10} />
                     </button>
                   </div>
                   <p className="text-[10px] font-bold text-gray-600 leading-tight">
                     {alert.text}
                   </p>
                   <div className="mt-2 text-[8px] font-black text-gray-300 uppercase">
                     {new Date(alert.created_at || alert.createdAt).toLocaleString([], {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'})}
                   </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
