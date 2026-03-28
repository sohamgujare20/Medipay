// src/pages/Inventory.jsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Plus, X, Trash2, Edit3, Save, Search, 
  Filter, Box, AlertTriangle, Clock, 
  MoreVertical, ChevronRight, Package, Inbox
} from "lucide-react";
import { api } from "../api";

// Helper functions
const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

function daysUntil(dateLike) {
  const d = toDate(dateLike);
  if (!d) return Infinity;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function safeLocaleDate(dateLike) {
  const d = toDate(dateLike);
  if (!d) return "—";
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Modern Status Badge
function StatusBadge({ qty = 0, expiry }) {
  const days = daysUntil(expiry);
  let label = "Healthy";
  let classes = "bg-teal-50 text-teal-700 border-teal-100";

  if (days <= 0) {
    label = "Expired";
    classes = "bg-red-50 text-red-700 border-red-100";
  } else if (qty <= 5) {
    label = "Low Stock";
    classes = "bg-amber-50 text-amber-700 border-amber-100";
  } else if (days <= 30) {
    label = "Near Expiry";
    classes = "bg-blue-50 text-blue-700 border-blue-100";
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-tight border ${classes}`}>
      {label}
    </span>
  );
}

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newMed, setNewMed] = useState({ name: "", batch: "", price: "", qty: "", expiry: "" });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Load Inventory
  const fetchInventory = async () => {
    setLoading(true);
    try {
      const data = await api.inventory.getAll();
      const normalized = (data || []).map((r) => ({
        ...r,
        id: r._id || r.id || crypto.randomUUID(),
        qty: Number(r.qty ?? 0),
        price: Number(r.price ?? 0),
      }));
      setInventory(normalized);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Filter Logic
  const params = new URLSearchParams(location.search);
  const filterType = params.get("filter") || "all";

  const finalList = useMemo(() => {
    const now = new Date();
    let data = [...inventory];

    // Apply URL Filters
    if (filterType === "lowstock") {
      data = data.filter((item) => Number(item.qty) <= 5);
    } else if (filterType === "expired") {
      data = data.filter((item) => {
        const d = toDate(item.expiry);
        return d ? d < now : false;
      });
    }

    // Apply Search
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (item) =>
          (item.name || "").toLowerCase().includes(q) ||
          (item.batch || "").toLowerCase().includes(q)
      );
    }

    return data;
  }, [inventory, filterType, search]);

  // Handlers
  async function addMedicine(e) {
    e.preventDefault();
    if (!newMed.name || !newMed.batch || newMed.qty === "" || newMed.price === "" || !newMed.expiry) {
      alert("Please fill all fields");
      return;
    }
    try {
      const payload = { ...newMed, price: Number(newMed.price), qty: Number(newMed.qty) };
      const data = await api.inventory.create(payload);
      setInventory((prev) => [{ ...data, id: data._id || data.id, qty: Number(data.qty), price: Number(data.price) }, ...prev]);
      setNewMed({ name: "", batch: "", price: "", qty: "", expiry: "" });
      setShowModal(false);
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteMedicine(id) {
    if (!window.confirm("Are you sure you want to delete this medicine?")) return;
    try {
      await api.inventory.delete(id);
      setInventory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  function startEdit(item) {
    const expiryDate = toDate(item.expiry);
    setEditingId(item.id);
    setEditData({
      ...item,
      qty: String(item.qty ?? ""),
      price: String(item.price ?? ""),
      expiry: expiryDate ? expiryDate.toISOString().slice(0, 10) : "",
    });
  }

  async function saveEdit(id) {
    try {
      const payload = { ...editData, price: Number(editData.price), qty: Number(editData.qty) };
      const data = await api.inventory.update(id, payload);
      setInventory((prev) => prev.map((it) => (it.id === id ? { ...data, id: data._id || data.id, qty: Number(data.qty), price: Number(data.price) } : it)));
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteExpired() {
    const expiredCount = inventory.filter(p => daysUntil(p.expiry) <= 0).length;
    if (expiredCount === 0) return;
    
    if (!window.confirm(`Are you sure you want to permanently delete ALL ${expiredCount} expired items? This action cannot be undone.`)) return;
    
    try {
      setLoading(true);
      await api.inventory.deleteExpired();
      await fetchInventory(); // Refresh list after bulk delete
      alert(`Successfully removed all ${expiredCount} expired items.`);
    } catch (err) {
      console.error("Failed to delete expired items:", err);
      alert("Error deleting expired items.");
    } finally {
      setLoading(false);
    }
  }

  // Stats for Cards
  const stats = {
    total: inventory.length,
    lowStock: inventory.filter(p => p.qty <= 5).length,
    expired: inventory.filter(p => daysUntil(p.expiry) <= 0).length
  };

  return (
    <div className="animate-in fade-in duration-700 max-w-7xl mx-auto px-4 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 mt-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Inventory <span className="text-[var(--hp-primary)]">Stock</span>
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Real-time management of pharmacy medical supplies</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--hp-primary)] text-white rounded-2xl font-black tracking-widest uppercase text-sm hover:bg-teal-700 transition shadow-lg shadow-teal-500/20 active:scale-95"
        >
          <Plus size={20} strokeWidth={3} /> Add New Medicine
        </button>
      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div onClick={() => navigate("/inventory")} className={`p-6 bg-white rounded-3xl border shadow-sm cursor-pointer hover:shadow-md transition-all ${filterType === 'all' ? 'border-[var(--hp-primary)] ring-4 ring-teal-50' : 'border-gray-100'}`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 text-[var(--hp-primary)] rounded-xl flex items-center justify-center">
              <Inbox size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total SKU</p>
              <h3 className="text-2xl font-black text-gray-900">{stats.total} Items</h3>
            </div>
          </div>
        </div>

        <div onClick={() => navigate("?filter=lowstock")} className={`p-6 bg-white rounded-3xl border shadow-sm cursor-pointer hover:shadow-md transition-all ${filterType === 'lowstock' ? 'border-amber-500 ring-4 ring-amber-50' : 'border-gray-100'}`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Low Stock</p>
              <h3 className="text-2xl font-black text-gray-900">{stats.lowStock} Alerts</h3>
            </div>
          </div>
        </div>

        <div onClick={() => navigate("?filter=expired")} className={`p-6 bg-white rounded-3xl border shadow-sm cursor-pointer hover:shadow-md transition-all ${filterType === 'expired' ? 'border-red-500 ring-4 ring-red-50' : 'border-gray-100'}`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Expired</p>
              <h3 className="text-2xl font-black text-gray-900">{stats.expired} Batches</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--hp-primary)] transition-colors" size={20} />
          <input
            type="text"
            placeholder="Quick search by medicine name or batch code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent border focus:border-[var(--hp-primary)] focus:bg-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 font-medium transition-all"
          />
        </div>
        <div className="flex gap-2">
          {filterType === "expired" && stats.expired > 0 && (
            <button 
              onClick={handleDeleteExpired}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-red-700 transition shadow-md shadow-red-500/10 active:scale-95"
            >
              <Trash2 size={14} /> Delete All Expired ({stats.expired})
            </button>
          )}
          <button onClick={() => setSearch("")} className="px-4 py-3.5 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition">Reset</button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 text-sm font-black text-gray-500 uppercase tracking-widest">Medicine & Batch</th>
                <th className="px-6 py-5 text-sm font-black text-gray-500 uppercase tracking-widest text-center">In Stock</th>
                <th className="px-6 py-5 text-sm font-black text-gray-500 uppercase tracking-widest text-right">Unit Price</th>
                <th className="px-6 py-5 text-sm font-black text-gray-500 uppercase tracking-widest">Expiry Date</th>
                <th className="px-6 py-5 text-sm font-black text-gray-500 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-5 text-sm font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center text-gray-400 font-bold animate-pulse uppercase tracking-[.2em]">Syncing Database...</td></tr>
              ) : finalList.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center">
                  <Package size={48} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-400 font-bold uppercase tracking-widest">No matching results found</p>
                </td></tr>
              ) : (
                finalList.map((item) => (
                  <tr key={item.id} className="group hover:bg-teal-50/30 transition-colors">
                    <td className="px-6 py-5">
                      {editingId === item.id ? (
                        <div className="space-y-2">
                          <input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full p-2 border rounded-lg text-sm" />
                          <input type="text" value={editData.batch} onChange={e => setEditData({...editData, batch: e.target.value})} className="w-full p-2 border rounded-lg text-xs font-mono bg-gray-50" />
                        </div>
                      ) : (
                        <div>
                          <p className="font-black text-gray-900 text-lg leading-tight">{item.name}</p>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Batch: {item.batch}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                       {editingId === item.id ? (
                        <input type="number" value={editData.qty} onChange={e => setEditData({...editData, qty: e.target.value})} className="w-20 p-2 border rounded-lg text-center font-bold" />
                      ) : (
                        <span className={`text-xl font-black ${item.qty <= 5 ? 'text-amber-500' : 'text-gray-900'}`}>{item.qty}</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right font-black text-lg text-gray-800">
                       {editingId === item.id ? (
                        <input type="number" step="0.01" value={editData.price} onChange={e => setEditData({...editData, price: e.target.value})} className="w-24 p-2 border rounded-lg text-right" />
                      ) : (
                        `₹${item.price.toFixed(2)}`
                      )}
                    </td>
                    <td className="px-6 py-5 font-bold text-gray-600">
                       {editingId === item.id ? (
                        <input type="date" value={editData.expiry} onChange={e => setEditData({...editData, expiry: e.target.value})} className="p-2 border rounded-lg text-sm" />
                      ) : (
                        safeLocaleDate(item.expiry)
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <StatusBadge qty={item.qty} expiry={item.expiry} />
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end items-center gap-2">
                        {editingId === item.id ? (
                          <>
                            <button onClick={() => saveEdit(item.id)} className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition shadow-sm"><Save size={18} /></button>
                            <button onClick={() => setEditingId(null)} className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition"><X size={18} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(item)} className="p-2 text-gray-400 hover:text-[var(--hp-primary)] hover:bg-teal-50 rounded-xl transition cursor-pointer" title="Edit Item"><Edit3 size={18} /></button>
                            <button onClick={() => deleteMedicine(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition cursor-pointer" title="Delete Item"><Trash2 size={18} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Medicine Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-xl w-full p-10 relative animate-in zoom-in duration-300">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition"><X size={24} /></button>
            
            <div className="mb-8">
              <h2 className="text-3xl font-black text-gray-900">Add <span className="text-[var(--hp-primary)]">Inventory</span></h2>
              <p className="text-gray-500 font-medium mt-1">Register a new medicine batch to the database</p>
            </div>

            <form className="space-y-6" onSubmit={addMedicine}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Medicine Name</label>
                  <input type="text" value={newMed.name} onChange={e => setNewMed({ ...newMed, name: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 border-transparent border focus:border-[var(--hp-primary)] focus:bg-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 font-bold transition-all" placeholder="e.g. Paracetamol 500mg" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Batch Number</label>
                  <input type="text" value={newMed.batch} onChange={e => setNewMed({ ...newMed, batch: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 border-transparent border focus:border-[var(--hp-primary)] focus:bg-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 font-bold transition-all" placeholder="e.g. BTC-9982" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Expiry Date</label>
                  <input type="date" value={newMed.expiry} onChange={e => setNewMed({ ...newMed, expiry: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 border-transparent border focus:border-[var(--hp-primary)] focus:bg-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 font-bold transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Unit Price (₹)</label>
                  <input type="number" step="0.01" value={newMed.price} onChange={e => setNewMed({ ...newMed, price: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 border-transparent border focus:border-[var(--hp-primary)] focus:bg-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 font-bold transition-all" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Initial Qty</label>
                  <input type="number" value={newMed.qty} onChange={e => setNewMed({ ...newMed, qty: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 border-transparent border focus:border-[var(--hp-primary)] focus:bg-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 font-bold transition-all" placeholder="0" />
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-200 transition">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-[var(--hp-primary)] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-teal-700 transition shadow-lg shadow-teal-500/20 active:scale-95">Complete Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
