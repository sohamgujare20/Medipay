// src/pages/ReceiptDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, Send, User, Phone, Calendar, CreditCard, ShoppingBag, FileText, Share2 } from "lucide-react";
import { api } from "../api";

export default function ReceiptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchBill() {
      try {
        const data = await api.bills.getAll();
        const found = data.find((b) => (b._id || b.id) === id);
        if (!found) {
          setError("Bill not found.");
        } else {
          setBill(found);
        }
      } catch (err) {
        console.error("Failed to fetch bill details:", err);
        setError("Error loading bill details.");
      } finally {
        setLoading(false);
      }
    }
    fetchBill();
  }, [id]);

  const handleManualReminder = async () => {
    if (!bill || !bill.mobile) return;
    
    // Simulate sending SMS
    alert(`📢 Manual Reminder sent to ${bill.customer_name || 'Customer'} (${bill.mobile}):\n\n"Dear ${bill.customer_name}, your refill for Bill #${bill.bill_no} is almost due. Please visit MediStore soon!"`);

    // Update metadata if needed
    const metadata = bill.metadata || {};
    const newMetadata = {
      ...metadata,
      manual_reminder_sent: true,
      last_manual_reminder: new Date().toISOString()
    };

    try {
      await api.bills.updateMetadata(id, newMetadata);
      setBill({ ...bill, metadata: newMetadata });
    } catch (err) {
      console.warn("Failed to update reminder metadata.", err);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading receipt details...</div>;
  if (error) return (
    <div className="p-6 text-center text-red-500">
      <p>{error}</p>
      <button onClick={() => navigate("/receipts")} className="mt-4 text-blue-600 hover:underline">Go back to Receipts</button>
    </div>
  );
  if (!bill) return null;

  const subtotal = bill.items.reduce((acc, it) => acc + (it.qty * it.price), 0);
  const tax = subtotal * 0.05;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate("/receipts")}
        className="flex items-center gap-2 text-gray-600 hover:text-[var(--hp-primary)] mb-6 transition no-print"
      >
        <ArrowLeft size={20} /> Back to Receipts
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-4 no-print">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span className="p-2 bg-teal-50 text-[var(--hp-primary)] rounded-xl"><FileText size={28} /></span>
            Receipt <span className="text-[var(--hp-primary)]">Details</span>
          </h1>
          <p className="text-gray-500 mt-2 font-medium">#{bill.bill_no} • Generated on {new Date(bill.createdAt || Date.now()).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--hp-primary)] text-white rounded-xl font-bold hover:bg-teal-700 transition shadow-lg shadow-teal-500/20"
          >
            <Printer size={18} /> Print Receipt
          </button>
          <button className="p-3 bg-white border rounded-xl hover:bg-gray-50 transition shadow-sm text-gray-600">
            <Share2 size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden printable-receipt">
        {/* Header */}
        <div className="bg-gray-50 p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Receipt #{bill.bill_no}</h1>
            <p className="text-gray-500 flex items-center gap-2 mt-1">
              <Calendar size={16} /> {new Date(bill.createdAt || Date.now()).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleManualReminder}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--hp-primary)] text-white rounded-lg hover:bg-teal-700 transition font-medium"
            >
              <Send size={18} /> Send Manual Reminder
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 border-b">
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Customer Information</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-50 text-[var(--hp-primary)] flex items-center justify-center">
                <User size={20} />
              </div>
              <div>
                <p className="font-bold text-gray-800 text-lg">{bill.customer_name || "Guest Customer"}</p>
                <p className="text-gray-500 flex items-center gap-1">
                  <Phone size={14} /> {bill.mobile || "No Mobile Provided"}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Payment Summary</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard size={20} />
              </div>
              <div>
                <p className="font-bold text-gray-800 text-lg capitalize">{bill.payment_mode} Payment</p>
                <p className="text-gray-500 font-medium">Refill due in {bill.days_to_refill || 0} days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Item Table */}
        <div className="p-8">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
            <ShoppingBag size={18} /> Purchase Details
          </h3>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-600 text-sm">Medicine / Item</th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-sm">Batch No</th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-sm text-center">Quantity</th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-sm text-right">Unit Price</th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-sm text-right">Total Price</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bill.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800">{item.name}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-medium">
                      {item.batch || "—"}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-800 font-bold">
                      {item.qty}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 font-medium whitespace-nowrap">
                      ₹ {Number(item.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-[var(--hp-primary)] font-bold whitespace-nowrap">
                      ₹ {(item.qty * item.price).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer / Total */}
        <div className="bg-gray-50 p-8 flex flex-col items-end border-t">
          <div className="w-full md:w-64 space-y-2">
            <div className="flex justify-between text-gray-600 font-medium">
              <span>Subtotal:</span>
              <span>₹ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500 text-sm pb-2 border-b">
              <span>GST (5%):</span>
              <span>+ ₹ {tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-black text-2xl text-[var(--hp-primary)] pt-2 uppercase">
              <span>Grand Total:</span>
              <span>₹ {bill.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center text-gray-400 text-sm font-medium">
        MediPay POS - Simplified Pharmacy Management
        <br/>
        &copy; {new Date().getFullYear()} All Rights Reserved
      </div>
    </div>
  );
}
