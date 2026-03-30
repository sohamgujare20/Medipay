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
          const daysPassed = Math.floor((now - billDate) / (1000 * 60 * 60 * 24));
          b.remainingDays = b.daysToRefill - daysPassed;
          return b;
        })
        .sort((a, b) => a.remainingDays - b.remainingDays);

      setBills(needsReminder);
      setSystemAlerts(alertsData || []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sendManualReminder = async (bill) => {
    alert(`📢 Manual Reminder sent to ${bill.customerName}:\n\n"Dear ${bill.customerName}, your medicines are almost finished! Please visit MediStore soon."`);
    
    const newMetadata = {
      ...bill.metadata,
      manualReminderCount: (bill.manualReminderCount || 0) + 1,
      last_manual_reminder: new Date().toISOString()
    };
    
    try {
      await api.bills.updateMetadata(bill.id, newMetadata);
      setBills((prev) =>
        prev.map((b) =>
          b.id === bill.id
            ? { ...b, manualReminderCount: newMetadata.manualReminderCount, metadata: newMetadata }
            : b
        )
      );
    } catch (error) {
        console.warn("Failed to update reminder metrics.", error);
    }
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Refill Reminders */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest flex items-center gap-2 px-2">
            <Clock className="text-amber-500" size={20} /> Refill Reminders
          </h2>
          
          {loading ? (
            <div className="text-center py-20 text-gray-400 font-bold">Analysing patient refill schedules...</div>
          ) : bills.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-20 text-center">
              <CheckCircle size={48} className="text-gray-200 mx-auto mb-4" />
              <p className="text-xl font-bold text-gray-400">Schedule Clear</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bills.map((bill) => (
                <div key={bill.id} className={`bg-white rounded-3xl border shadow-sm transition-all hover:shadow-xl overflow-hidden ${bill.remainingDays <= 0 ? 'border-red-100' : 'border-gray-50'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-4">
                    <div className={`p-6 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r ${bill.remainingDays <= 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                       {bill.remainingDays <= 0 ? (
                         <div className="text-red-600 font-black">
                            <AlertCircle className="mx-auto mb-1" />
                            <div className="uppercase text-[10px] tracking-widest">Urgent</div>
                            <div className="text-2xl leading-none font-black">{Math.abs(bill.remainingDays)}d</div>
                            <div className="text-[10px] opacity-70">OVERDUE</div>
                         </div>
                       ) : (
                         <div className="text-amber-600 font-black">
                            <Clock className="mx-auto mb-1" />
                            <div className="uppercase text-[10px] tracking-widest">Upcoming</div>
                            <div className="text-2xl leading-none font-black">{bill.remainingDays}d</div>
                            <div className="text-[10px] opacity-70">REMAINING</div>
                         </div>
                       )}
                    </div>
                    
                    <div className="p-6 md:col-span-2">
                       <div className="flex items-center gap-4 mb-3">
                          <div className="w-10 h-10 bg-[var(--hp-primary)] text-white rounded-xl flex items-center justify-center font-black">
                            {bill.customerName.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-black text-gray-800 text-lg leading-tight">{bill.customerName}</h3>
                            <p className="text-gray-400 text-sm font-bold">{bill.mobile}</p>
                          </div>
                       </div>
                       <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400 border-t pt-3">
                          <div className="flex items-center gap-1"><Info size={12} /> Bill #{bill.billNo}</div>
                          <div className="flex items-center gap-1"><Calendar size={12} /> {new Date(bill.createdAt).toLocaleDateString()}</div>
                       </div>
                    </div>

                    <div className="p-6 bg-gray-50/50 flex flex-col justify-center gap-2">
                       <button
                         onClick={() => sendManualReminder(bill)}
                         disabled={bill.metadata?.reminders_cancelled}
                         className="w-full bg-[var(--hp-primary)] text-white py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-teal-700 transition shadow-sm disabled:opacity-30"
                       >
                         Send Reminder
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: System Alerts */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest flex items-center gap-2 px-2">
            <Info className="text-blue-500" size={20} /> System Alerts
          </h2>
          
          <div className="bg-gray-50 rounded-3xl p-4 border border-gray-100 min-h-[400px] space-y-4">
             {loading ? (
               <div className="text-center py-10 text-gray-400 font-bold">Syncing logs...</div>
             ) : systemAlerts.length === 0 ? (
               <div className="text-center py-20">
                  <Bell className="text-gray-200 mx-auto mb-2 opacity-30" size={40} />
                  <p className="text-gray-300 font-bold uppercase text-xs tracking-widest">Logs Clear</p>
               </div>
             ) : (
               systemAlerts.map(alert => (
                 <div key={alert.id} className={`p-4 rounded-2xl shadow-sm border group relative transition-all ${alert.type === 'message' ? 'bg-teal-50 border-teal-100' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                       {alert.type === 'message' ? <Send size={14} className="text-teal-600" /> : <Info size={14} className="text-blue-500" />}
                       <span className={`text-[10px] font-black uppercase tracking-widest ${alert.type === 'message' ? 'text-teal-600' : 'text-blue-500'}`}>
                         {alert.type === 'message' ? 'SMS Sent' : 'System Alert'}
                       </span>
                    </div>
                    <p className="text-sm font-bold text-gray-700 leading-relaxed mb-1">
                      {alert.text}
                    </p>
                    {alert.message && (
                      <div className="bg-white/60 p-2.5 rounded-lg border border-teal-200/50 text-[11px] font-medium text-gray-500 italic mt-2">
                        "{alert.message}"
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-gray-50 mt-3 pt-2">
                       <span className="text-[9px] font-black text-gray-400 uppercase">
                         {new Date(alert.created_at || alert.createdAt).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                       </span>
                       <button 
                         onClick={() => deleteAlert(alert.id)}
                         className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                         <Trash2 size={12} />
                       </button>
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

