// src/pages/Receipts.jsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient"; // ensure path matches your project

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const channelRef = useRef(null);

  // Helper: normalize a DB bill row into the shape your UI expects
  const normalizeBill = (row) => {
    if (!row) return null;
    const createdAt = row.created_at ? new Date(row.created_at) : new Date();
    return {
      id: row.id,
      billNo: row.bill_no,
      date: createdAt.toLocaleString(),
      total: Number(row.total).toFixed(2),
      paymentMode: row.payment_mode || "—",
      customerName: row.customer_name || "—",
      mobile: row.mobile || "—",
      daysToRefill: row.days_to_refill ?? null,
      items: Array.isArray(row.items) ? row.items : [],
      // runtime-only flags:
      autoSmsSent: row.metadata?.autoSmsSent || false,
      remainingDays: undefined, // computed below
      // keep raw created_at as ISO for calculations
      __created_at: createdAt.toISOString(),
    };
  };

  // Load bills from Supabase; if fails, fallback to localStorage
  const loadBills = async () => {
    try {
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalized = (data || []).map(normalizeBill);
      // compute remainingDays & update autoSmsSent locally
      const now = new Date();
      const withRemaining = normalized.map((b) => {
        const billDate = new Date(b.__created_at);
        if (b.daysToRefill) {
          const daysPassed = Math.floor((now - billDate) / (1000 * 60 * 60 * 24));
          b.remainingDays = Math.max(b.daysToRefill - daysPassed, 0);
        }
        return b;
      });

      setReceipts(withRemaining);
      // keep localStorage for compatibility
      try {
        localStorage.setItem("bills", JSON.stringify(withRemaining));
      } catch (e) {}
    } catch (err) {
      console.error("Failed to load bills from Supabase, falling back to localStorage:", err);
      const stored = JSON.parse(localStorage.getItem("bills") || "[]");
      setReceipts(stored);
    }
  };

  useEffect(() => {
    loadBills();

    // Realtime subscription to bills table so UI updates when new bills are added/deleted/updated
    try {
      const ch = supabase
        .channel("public:bills")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bills" },
          (payload) => {
            const rec = payload.new ?? payload.old;
            if (!rec) return;
            const normalized = normalizeBill(rec);
            setReceipts((prev) => {
              if (payload.eventType === "INSERT") {
                // compute remainingDays before inserting
                const now = new Date();
                if (normalized.daysToRefill) {
                  const billDate = new Date(normalized.__created_at);
                  const daysPassed = Math.floor((now - billDate) / (1000 * 60 * 60 * 24));
                  normalized.remainingDays = Math.max(normalized.daysToRefill - daysPassed, 0);
                }
                const next = [normalized, ...prev];
                try { localStorage.setItem("bills", JSON.stringify(next)); } catch (e) {}
                return next;
              }
              if (payload.eventType === "UPDATE") {
                const next = prev.map((p) => (p.id === normalized.id ? { ...p, ...normalized } : p));
                try { localStorage.setItem("bills", JSON.stringify(next)); } catch (e) {}
                return next;
              }
              if (payload.eventType === "DELETE") {
                const next = prev.filter((p) => p.id !== normalized.id);
                try { localStorage.setItem("bills", JSON.stringify(next)); } catch (e) {}
                return next;
              }
              return prev;
            });
          }
        )
        .subscribe();

      channelRef.current = ch;
    } catch (e) {
      console.warn("Realtime subscription to bills failed:", e);
    }

    return () => {
      try {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-check refill countdown and send automatic reminder (preserve original behavior)
  useEffect(() => {
    if (receipts.length === 0) return;

    const now = new Date();
    let updatedReceipts = receipts.map((bill) => {
      // ensure we have a Date for bill creation. original code used bill.date as string - might be localized string
      let billDate;
      if (bill.__created_at) {
        billDate = new Date(bill.__created_at);
      } else {
        // fallback: try parsing bill.date (if stored as local string)
        billDate = bill.date ? new Date(bill.date) : new Date();
      }

      if (billDate && bill.daysToRefill) {
        const daysPassed = Math.floor((now - billDate) / (1000 * 60 * 60 * 24));
        const remaining = Math.max(bill.daysToRefill - daysPassed, 0);

        // Auto SMS alert when refill days ≤ 1
        if (remaining <= 1 && !bill.autoSmsSent) {
          alert(
            `📢 Auto Reminder for ${bill.customerName || "Customer"}:\n\nYour medicines are almost finished! Please visit MediStore soon.`
          );
          bill.autoSmsSent = true; // mark as sent locally
        }

        return { ...bill, remainingDays: remaining, autoSmsSent: !!bill.autoSmsSent };
      }
      return bill;
    });

    // persist back to localStorage and state
    try {
      localStorage.setItem("bills", JSON.stringify(updatedReceipts));
    } catch (e) {
      // ignore
    }
    setReceipts(updatedReceipts);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipts.length]);

  // Delete Bill (attempt to delete from Supabase; fallback to localStorage)
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this receipt?")) return;

    // try to delete from Supabase if id looks like a uuid
    let deletedFromDb = false;
    try {
      // attempt delete
      const { error } = await supabase.from("bills").delete().eq("id", id);
      if (!error) deletedFromDb = true;
    } catch (e) {
      console.warn("Delete from Supabase failed:", e);
    }

    // update local state & localStorage regardless
    const updatedReceipts = receipts.filter((bill) => bill.id !== id);
    setReceipts(updatedReceipts);
    try {
      localStorage.setItem("bills", JSON.stringify(updatedReceipts));
    } catch (e) {}

    if (!deletedFromDb) {
      // if couldn't delete from DB, warn (but we still removed locally)
      console.warn("Receipt removed locally; could not remove from Supabase (if present).");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6 text-[var(--hp-primary)]">
        Receipts & Auto Refill Reminders
      </h1>

      {receipts.length === 0 ? (
        <p className="text-gray-500 text-center">No saved bills yet.</p>
      ) : (
        <div className="overflow-auto rounded-lg border bg-white">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">Customer Name</th>
                <th className="px-4 py-3 text-left">Mobile</th>
                <th className="px-4 py-3 text-left">Bill No</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Payment</th>
                <th className="px-4 py-3 text-center">Days to Refill</th>
                <th className="px-4 py-3 text-center">Reminder Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((bill) => (
                <tr key={bill.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">
                    {bill.customerName || "—"}
                  </td>
                  <td className="px-4 py-2">{bill.mobile || "—"}</td>
                  <td className="px-4 py-2">#{bill.billNo}</td>
                  <td className="px-4 py-2">{bill.date}</td>
                  <td className="px-4 py-2 capitalize">{bill.paymentMode}</td>

                  {/* Days to Refill Countdown */}
                  <td className="px-4 py-2 text-center">
                    {bill.remainingDays !== undefined
                      ? bill.remainingDays === 0
                        ? "Refill Due!"
                        : `${bill.remainingDays} days`
                      : bill.daysToRefill || "—"}
                  </td>

                  {/* Auto Reminder Status */}
                  <td className="px-4 py-2 text-center">
                    {bill.autoSmsSent ? (
                      <span className="text-green-600 font-medium">Sent ✅</span>
                    ) : bill.remainingDays !== undefined && bill.remainingDays <= 1 ? (
                      <span className="text-orange-600 font-medium">Sending...</span>
                    ) : (
                      <span className="text-gray-500">Pending</span>
                    )}
                  </td>

                  <td className="px-4 py-2 text-right font-semibold text-[var(--hp-primary)]">
                    ₹{bill.total}
                  </td>

                  {/* View / Delete */}
                  <td className="px-4 py-2 text-center space-x-2">
                    <button
                      className="text-white bg-[var(--hp-primary)] px-3 py-1 rounded hover:bg-teal-700"
                      onClick={() => setSelectedBill(bill)}
                    >
                      View
                    </button>
                    <button
                      className="text-white bg-red-600 px-3 py-1 rounded hover:bg-red-700"
                      onClick={() => handleDelete(bill.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bill Details Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-lg relative">
            <button
              className="absolute top-3 right-3 text-gray-700 text-lg"
              onClick={() => setSelectedBill(null)}
            >
              ✖
            </button>

            <h2 className="text-xl font-semibold text-[var(--hp-primary)] mb-3">
              Receipt Details
            </h2>

            <p><b>Customer Name:</b> {selectedBill.customerName || "—"}</p>
            <p><b>Mobile:</b> {selectedBill.mobile || "—"}</p>
            <p><b>Bill No:</b> #{selectedBill.billNo}</p>
            <p><b>Date:</b> {selectedBill.date}</p>
            <p><b>Payment:</b> {selectedBill.paymentMode}</p>
            <p><b>Total:</b> ₹{selectedBill.total}</p>
            <p>
              <b>Days to Refill:</b>{" "}
              {selectedBill.remainingDays !== undefined
                ? selectedBill.remainingDays
                : selectedBill.daysToRefill || "—"}
            </p>

            <h3 className="font-semibold mt-4 mb-2">Items:</h3>
            <ul className="space-y-2 max-h-40 overflow-auto">
              {selectedBill.items.map((i, index) => (
                <li key={index} className="border p-2 rounded bg-gray-50">
                  {i.name} — {i.qty} × ₹{i.price} ={" "}
                  <b>₹{(i.qty * i.price).toFixed(2)}</b>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setSelectedBill(null)}
              className="mt-4 w-full bg-[var(--hp-primary)] text-white py-2 rounded-lg hover:bg-teal-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
