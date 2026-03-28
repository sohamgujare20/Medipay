// src/pages/Notifications.jsx
import React, { useEffect, useState, useRef } from "react";
import { api } from "../api";

export default function Notifications() {
  const [bills, setBills] = useState([]);
  const channelRef = useRef(null);

  const normalizeBill = (row) => {
    if (!row) return null;
    const createdAt = row.created_at ? new Date(row.created_at) : new Date();
    const metadata = row.metadata || {};

    let autoSentCount = 0;
    if (metadata.sms_1day_before) autoSentCount++;
    if (metadata.sms_1day_after) autoSentCount++;

    return {
      id: row.id,
      billNo: row.bill_no,
      date: createdAt.toLocaleString(),
      total: Number(row.total).toFixed(2),
      customerName: row.customer_name || "—",
      mobile: row.mobile || "—",
      daysToRefill: row.days_to_refill ?? null,
      autoReminderCount: autoSentCount,
      manualReminderCount: metadata.manualReminderCount || 0,
      metadata: metadata,
      __created_at: createdAt.toISOString(),
    };
  };

  const loadNotifications = async () => {
    try {
      const data = await api.bills.getAll();

      const now = new Date();
      const needsReminder = (data || [])
        .map(normalizeBill)
        .filter((b) => b.daysToRefill) // Show all bills that have a refill day set
        .map((b) => {
          const billDate = new Date(b.__created_at);
          const daysPassed = Math.floor((now - billDate) / (1000 * 60 * 60 * 24));
          b.remainingDays = b.daysToRefill - daysPassed;
          return b;
        });

      setBills(needsReminder);
    } catch (err) {
      console.error("Failed to load bills:", err);
    }
  };

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendManualReminder = async (bill) => {
    alert(`📢 Manual Reminder sent to ${bill.customerName}:\n\nYour medicines are almost finished! Please visit MediStore soon.`);
    
    const newMetadata = {
      ...bill.metadata,
      manualReminderCount: bill.manualReminderCount + 1
    };
    
    try {
      await api.bills.updateMetadata(bill.id, newMetadata);
      setBills((prev) =>
        prev.map((b) =>
          b.id === bill.id
            ? { ...b, manualReminderCount: b.manualReminderCount + 1, metadata: newMetadata }
            : b
        )
      );
    } catch (error) {
        console.warn("Failed to update reminder metrics.", error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6 text-[var(--hp-primary)]">
        Refill Notifications
      </h1>

      {bills.length === 0 ? (
        <p className="text-gray-500 text-center">No notifications pending.</p>
      ) : (
        <div className="overflow-auto rounded-lg border bg-white">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">Customer Name</th>
                <th className="px-4 py-3 text-left">Mobile</th>
                <th className="px-4 py-3 text-left">Bill No</th>
                <th className="px-4 py-3 text-center">Days to Refill</th>
                <th className="px-4 py-3 text-center">Auto Sent</th>
                <th className="px-4 py-3 text-center">Manual Sent</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">{bill.customerName}</td>
                  <td className="px-4 py-2">{bill.mobile}</td>
                  <td className="px-4 py-2">#{bill.billNo}</td>
                  <td className="px-4 py-2 text-center font-medium">
                    {bill.metadata?.reminders_cancelled ? (
                      <span className="text-gray-400">—</span>
                    ) : bill.remainingDays === 0 ? (
                      <span className="text-red-600">Refill Due Today!</span>
                    ) : bill.remainingDays < 0 ? (
                      <span className="text-red-800">Past Due</span>
                    ) : (
                      <span className="text-yellow-600">{bill.remainingDays} days</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {bill.metadata?.reminders_cancelled ? (
                      <span className="text-gray-500 text-sm font-medium border bg-gray-100 rounded px-2 py-0.5">Cancelled (Refilled Early)</span>
                    ) : (
                      <span className={bill.autoReminderCount > 0 ? "text-green-600 font-medium" : "text-gray-600"}>
                        {bill.autoReminderCount}/2
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center font-medium text-gray-600">
                    {bill.manualReminderCount}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      className="text-white bg-[var(--hp-primary)] px-3 py-1 rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      onClick={() => sendManualReminder(bill)}
                      disabled={bill.metadata?.reminders_cancelled}
                    >
                      Manually Remind
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
