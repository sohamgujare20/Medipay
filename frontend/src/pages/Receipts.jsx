// src/pages/Receipts.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileText, Search, Trash2, Eye, 
  CreditCard, Smartphone, Calendar, 
  TrendingUp, Activity, Inbox
} from "lucide-react";
import { api } from "../api";

export default function Receipts() {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Stats calculation
  const stats = {
    totalRevenue: receipts.reduce((sum, r) => sum + Number(r.total), 0).toFixed(2),
    totalBills: receipts.length,
    todayCount: receipts.filter(r => new Date(r.createdAt || r.created_at).toLocaleDateString() === new Date().toLocaleDateString()).length
  };

  const normalizeBill = (row) => {
    if (!row) return null;
    const createdAt = row.createdAt || row.created_at || new Date();
    return {
      id: row._id || row.id,
      billNo: row.bill_no,
      date: new Date(createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      total: Number(row.total).toFixed(2),
      paymentMode: row.payment_mode || "online",
      customerName: row.customer_name || "Guest Customer",
      mobile: row.mobile || "—",
      daysToRefill: row.days_to_refill ?? null,
      createdAt: createdAt,
      metadata: row.metadata || {}
    };
  };

  const loadBills = async () => {
    setLoading(true);
    try {
      const data = await api.bills.getAll();
      const normalized = (data || []).map(normalizeBill).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      setReceipts(normalized);
    } catch (err) {
      console.error("Failed to load receipts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this receipt? This action cannot be undone.")) return;
    try {
      await api.bills.delete(id);
      setReceipts(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const filteredReceipts = receipts.filter(r => 
    r.customerName.toLowerCase().includes(search.toLowerCase()) ||
    r.mobile.includes(search) ||
    String(r.billNo).includes(search)
  );

  return (
    <div className="animate-in fade-in duration-700 max-w-7xl mx-auto px-4 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 mt-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Receipt <span className="text-[var(--hp-primary)]">History</span>
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Transaction logs and billing record management</p>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={loadBills} className="p-3 bg-white border rounded-xl hover:bg-gray-50 transition shadow-sm text-gray-600">
            <Activity size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Revenue</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-gray-900">₹{stats.totalRevenue}</h3>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg"><TrendingUp size={20} /></div>
          </div>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Bills</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-gray-900">{stats.totalBills} Transactions</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={20} /></div>
          </div>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Today's Volume</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-gray-900">{stats.todayCount} Receipts</h3>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Calendar size={20} /></div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mb-8">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--hp-primary)] transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search by Customer, Mobile or Bill Number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent border focus:border-[var(--hp-primary)] focus:bg-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 font-medium transition-all"
          />
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 text-sm font-black text-gray-500 uppercase tracking-widest">Customer Details</th>
                <th className="px-6 py-5 text-sm font-black text-gray-500 uppercase tracking-widest">Bill No</th>
                <th className="px-6 py-5 text-sm font-black text-gray-500 uppercase tracking-widest">Date & Time</th>
                <th className="px-6 py-5 text-sm font-black text-gray-500 uppercase tracking-widest text-center">Payment</th>
                <th className="px-6 py-5 text-sm font-black text-gray-500 uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-5 text-sm font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center text-gray-400 font-bold animate-pulse uppercase tracking-[.2em]">Retrieving Records...</td></tr>
              ) : filteredReceipts.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center">
                  <Inbox size={48} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-400 font-bold uppercase tracking-widest">No matching receipts</p>
                </td></tr>
              ) : (
                filteredReceipts.map((bill) => (
                  <tr key={bill.id} className="group hover:bg-teal-50/30 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center font-bold">
                          {bill.customerName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">{bill.customerName}</p>
                          <p className="text-xs font-medium text-gray-400 flex items-center gap-1 mt-1">
                            <Smartphone size={10} /> {bill.mobile}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-black text-gray-400">#{bill.billNo}</td>
                    <td className="px-6 py-5 text-sm font-bold text-gray-600">{bill.date}</td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        bill.paymentMode === 'online' 
                        ? 'bg-blue-50 text-blue-600 border-blue-100' 
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {bill.paymentMode}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <p className="font-black text-lg text-[var(--hp-primary)] tracking-tight">₹{bill.total}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end items-center gap-2">
                        <button 
                          onClick={() => navigate(`/receipts/${bill.id}`)}
                          className="p-2 text-gray-400 hover:text-[var(--hp-primary)] hover:bg-teal-50 rounded-xl transition cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(bill.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
