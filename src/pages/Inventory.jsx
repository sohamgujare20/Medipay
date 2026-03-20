// src/pages/Inventory.jsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Plus, X, Trash2, Edit3, Save } from "lucide-react";
import { api } from "../api";

// Helpers
const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

function daysUntil(dateLike) {
  const d = toDate(dateLike);
  if (!d) return Infinity; // treat unknown expiry as far future
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function safeLocaleDate(dateLike) {
  const d = toDate(dateLike);
  if (!d) return "-";
  return d.toLocaleDateString();
}

// StatusBadge component (defensive)
function StatusBadge({ qty = 0, expiry }) {
  const days = daysUntil(expiry);
  let label = "OK";
  let classes = "bg-green-100 text-green-700";

  if (days <= 0) {
    label = "Expired";
    classes = "bg-red-100 text-red-700";
  } else if (qty <= 5) {
    label = "Low Stock";
    classes = "bg-orange-100 text-orange-700";
  } else if (days <= 30) {
    label = "Expiring Soon";
    classes = "bg-yellow-100 text-yellow-700";
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newMed, setNewMed] = useState({
    name: "",
    batch: "",
    price: "",
    qty: "",
    expiry: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const location = useLocation();
  const isMounted = useRef(false);

  // Load inventory
  useEffect(() => {
    let mounted = true;
    async function fetchInventory() {
      setLoading(true);
      setErrorMsg("");
      try {
        const data = await api.inventory.getAll();

        const normalized = (data || []).map((r) => ({
          ...r,
          qty: Number(r.qty ?? 0),
          price: Number(r.price ?? 0),
        }));

        if (mounted) setInventory(normalized);
      } catch (err) {
        console.error("Failed to load inventory:", err);
        setErrorMsg("Failed to load inventory. Check console for details.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchInventory();
    isMounted.current = true;
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute filteredData when location.search or inventory change
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filter = params.get("filter");
    const now = new Date();

    let data = [...inventory];

    if (filter === "lowstock") {
      data = data.filter((item) => Number(item.qty) <= 5);
    } else if (filter === "expired") {
      data = data.filter((item) => {
        const d = toDate(item.expiry);
        return d ? d < now : false;
      });
    }

    setFilteredData(data);
  }, [location.search, inventory]);

  const finalList = useMemo(() => {
    const source = filteredData.length ? filteredData : inventory;
    if (!search.trim()) return source;
    const q = search.toLowerCase();
    return source.filter(
      (item) =>
        (item.name || "").toLowerCase().includes(q) ||
        (item.batch || "").toLowerCase().includes(q)
    );
  }, [search, inventory, filteredData]);

  // Add medicine
  async function addMedicine(e) {
    e.preventDefault();
    if (
      !newMed.name ||
      !newMed.batch ||
      newMed.qty === "" ||
      newMed.price === "" ||
      !newMed.expiry
    ) {
      alert("Please fill all fields");
      return;
    }
    try {
      const payload = {
        name: newMed.name,
        batch: newMed.batch,
        price: Number(newMed.price),
        qty: Number(newMed.qty),
        expiry: newMed.expiry,
      };

      const data = await api.inventory.create(payload);
      const newItem = {
        ...data,
        qty: Number(data.qty ?? 0),
        price: Number(data.price ?? 0),
      };
      setInventory((prev) => [newItem, ...prev]);
      setNewMed({ name: "", batch: "", price: "", qty: "", expiry: "" });
      setShowModal(false);
    } catch (err) {
      console.error("Failed to add medicine:", err);
      alert("Error adding medicine. Check console for details.");
    }
  }

  // Delete medicine
  async function deleteMedicine(id) {
    if (!window.confirm("Are you sure you want to delete this medicine?")) {
      return;
    }
    try {
      await api.inventory.delete(id);
      setInventory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Failed to delete medicine:", err);
      alert("Error deleting medicine. Check console for details.");
    }
  }

  // Start edit (format expiry as yyyy-mm-dd for date input)
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

  // Save edit
  async function saveEdit(id) {
    try {
      const payload = {
        name: editData.name,
        batch: editData.batch,
        price: Number(editData.price || 0),
        qty: Number(editData.qty || 0),
        expiry: editData.expiry || null,
      };

      const data = await api.inventory.update(id, payload);

      const updatedItem = {
        ...data,
        qty: Number(data.qty ?? 0),
        price: Number(data.price ?? 0),
      };

      setInventory((prev) => prev.map((it) => (it.id === id ? updatedItem : it)));
      setEditingId(null);
      setEditData({});
    } catch (err) {
      console.error("Failed to save edit:", err);
      alert("Error saving changes. Check console for details.");
    }
  }

  const expiredCount = inventory.filter((item) => {
    const d = toDate(item.expiry);
    return d ? d < new Date() : false;
  }).length;

  const lowStockCount = inventory.filter((item) => Number(item.qty) <= 5).length;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4 text-[var(--hp-primary)]">
        Inventory
      </h1>

      {errorMsg && (
        <div className="mb-4 p-3 rounded bg-red-100 text-red-700">{errorMsg}</div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="px-4 py-2 rounded-lg bg-red-100 text-red-700 font-medium">
          Expired: {expiredCount}
        </div>
        <div className="px-4 py-2 rounded-lg bg-orange-100 text-orange-700 font-medium">
          Low Stock: {lowStockCount}
        </div>
        <div className="px-4 py-2 rounded-lg bg-green-100 text-green-700 font-medium">
          Total Items: {inventory.length}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or batch"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--hp-primary)]"
        />
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--hp-primary)] text-white rounded-lg hover:bg-teal-700"
        >
          <Plus size={16} /> Add Medicine
        </button>
      </div>

      <div className="bg-[var(--hp-surface)] border rounded-lg overflow-auto">
        <table className="w-full table-auto">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm">Name</th>
              <th className="text-left px-4 py-3 text-sm">Batch</th>
              <th className="text-right px-4 py-3 text-sm">Stock</th>
              <th className="text-right px-4 py-3 text-sm">Price</th>
              <th className="text-left px-4 py-3 text-sm">Expiry</th>
              <th className="text-center px-4 py-3 text-sm">Status</th>
              <th className="text-center px-4 py-3 text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-6">Loading...</td>
              </tr>
            ) : finalList.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-6">
                  No items found.
                </td>
              </tr>
            ) : (
              finalList.map((item, i) => (
                <tr
                  key={item.id ?? i}
                  className={`hover:bg-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                >
                  <td className="px-4 py-3">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editData.name || ""}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      item.name
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editData.batch || ""}
                        onChange={(e) => setEditData({ ...editData, batch: e.target.value })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      item.batch
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        value={editData.qty || ""}
                        onChange={(e) => setEditData({ ...editData, qty: e.target.value })}
                        className="w-20 px-2 py-1 border rounded text-right"
                      />
                    ) : (
                      item.qty
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editData.price || ""}
                        onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                        className="w-20 px-2 py-1 border rounded text-right"
                      />
                    ) : (
                      `₹ ${Number(item.price ?? 0).toFixed(2)}`
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === item.id ? (
                      <input
                        type="date"
                        value={editData.expiry || ""}
                        onChange={(e) => setEditData({ ...editData, expiry: e.target.value })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      safeLocaleDate(item.expiry)
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge qty={item.qty} expiry={item.expiry} />
                  </td>
                  <td className="px-4 py-3 text-center flex justify-center gap-2">
                    {editingId === item.id ? (
                      <button
                        onClick={() => saveEdit(item.id)}
                        className="flex items-center gap-1 text-green-700 hover:text-green-900"
                      >
                        <Save size={16} /> Save
                      </button>
                    ) : (
                      <button
                        onClick={() => startEdit(item)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      >
                        <Edit3 size={16} /> Edit
                      </button>
                    )}
                    <button
                      onClick={() => deleteMedicine(item.id)}
                      className="text-red-600 hover:text-red-800 flex items-center gap-1"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-900"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-semibold text-[var(--hp-primary)] mb-4">
              Add New Medicine
            </h2>
            <form className="space-y-3" onSubmit={addMedicine}>
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input
                  type="text"
                  value={newMed.name}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--hp-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Batch</label>
                <input
                  type="text"
                  value={newMed.batch}
                  onChange={(e) => setNewMed({ ...newMed, batch: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--hp-primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMed.price}
                    onChange={(e) => setNewMed({ ...newMed, price: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--hp-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Quantity</label>
                  <input
                    type="number"
                    value={newMed.qty}
                    onChange={(e) => setNewMed({ ...newMed, qty: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--hp-primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={newMed.expiry}
                  onChange={(e) => setNewMed({ ...newMed, expiry: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--hp-primary)]"
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[var(--hp-primary)] text-white hover:bg-teal-700"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
