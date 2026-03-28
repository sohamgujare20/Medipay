// src/pages/Notification.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api";
import { Bell, User, Phone, Calendar, CheckCircle, AlertCircle, Clock, Send } from "lucide-react";

export default function Notification() {
  const [bills, setBills] = useState([]);
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

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.bills.getAll();
      const now = new Date();
      
      const needsReminder = (data || [])
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
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const sendManualReminder = async (bill) => {
    // Simulate sending SMS
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
            <div className="bg-red-50 p-2 rounded-xl text-red-500">
              <Bell size={32} />
            </div>
            Notification Center
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Manage medicine refill reminders and customer follow-ups</p>
        </div>
        <button 
          onClick={loadNotifications}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition font-bold text-gray-600 shadow-sm"
        >
          Refresh List
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 font-bold">Checking for pending reminders...</div>
      ) : bills.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed p-20 text-center shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-gray-300" />
          </div>
          <p className="text-2xl font-bold text-gray-300 uppercase tracking-widest">No Notifications</p>
          <p className="text-gray-400 mt-2">All customers are up to date with their refills.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {bills.map((bill) => (
            <div key={bill.id} className={`bg-white rounded-2xl border shadow-sm transition-all hover:shadow-md overflow-hidden ${bill.remainingDays <= 0 ? 'border-red-200' : 'border-gray-100'}`}>
              <div className="grid grid-cols-1 md:grid-cols-4 items-center">
                
                {/* Status Column */}
                <div className={`p-6 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r ${bill.remainingDays <= 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                  {bill.remainingDays === 0 ? (
                    <>
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-2">
                        <AlertCircle size={24} />
                      </div>
                      <p className="font-black text-red-600 uppercase tracking-tighter">Due Today!</p>
                    </>
                  ) : bill.remainingDays < 0 ? (
                    <>
                      <div className="w-12 h-12 bg-red-800 rounded-full flex items-center justify-center text-white mb-2">
                        <AlertCircle size={24} />
                      </div>
                      <p className="font-black text-red-800 uppercase tracking-tighter">Past Due</p>
                      <p className="text-xs text-red-700 font-bold mt-1">{Math.abs(bill.remainingDays)} day(s) ago</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mb-2">
                        <Clock size={24} />
                      </div>
                      <p className="font-black text-yellow-600 uppercase tracking-tighter">Upcoming</p>
                      <p className="text-xs text-yellow-700 font-bold mt-1">in {bill.remainingDays} days</p>
                    </>
                  )}
                </div>

                {/* Customer Info */}
                <div className="p-6 md:col-span-2 flex flex-col md:flex-row gap-6 md:items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-50 text-[var(--hp-primary)] rounded-full flex items-center justify-center font-bold text-xl">
                      {bill.customerName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-800">{bill.customerName}</p>
                      <p className="text-gray-500 flex items-center gap-1 font-medium">
                        <Phone size={14} /> {bill.mobile}
                      </p>
                    </div>
                  </div>
                  <div className="border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 space-y-1">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Bill Reference</p>
                    <p className="font-bold text-gray-700">Receipt #{bill.billNo}</p>
                    <p className="text-xs text-gray-500 font-medium">Purchased: {new Date(bill.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-6 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs font-bold px-3 py-2 bg-gray-50 rounded-lg text-gray-500">
                    <span>Auto-Sent:</span>
                    <span className={bill.autoReminderCount > 0 ? "text-green-600" : ""}>{bill.autoReminderCount}/2</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold px-3 py-2 bg-gray-50 rounded-lg text-gray-500">
                    <span>Manual-Sent:</span>
                    <span>{bill.manualReminderCount} times</span>
                  </div>
                  <button
                    onClick={() => sendManualReminder(bill)}
                    disabled={bill.metadata?.reminders_cancelled}
                    className="w-full mt-1 bg-[var(--hp-primary)] text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Send size={16} /> Send Manual Reminder
                  </button>
                </div>

              </div>
              {bill.metadata?.reminders_cancelled && (
                <div className="bg-gray-100 p-2 text-center text-xs font-bold text-gray-500 tracking-widest uppercase">
                  Notifications Permanently Cancelled - Customer Refilled Early
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
