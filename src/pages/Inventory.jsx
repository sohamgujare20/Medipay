import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Plus, X, Trash2, Edit3, Save } from "lucide-react";

// 🧮 Utility: calculate days until expiry
function daysUntil(dateISO) {
  const d = new Date(dateISO);
  const now = new Date();
  const diff = d - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// 🏷 Status Badge Component
function StatusBadge({ qty, expiry }) {
  const days = daysUntil(expiry);
  let label = "OK";
  let color = "bg-green-100 text-green-700";

  if (days <= 0) {
    label = "Expired";
    color = "bg-red-100 text-red-700";
  } else if (qty <= 5) {
    label = "Low Stock";
    color = "bg-orange-100 text-orange-700";
  } else if (days <= 30) {
    label = "Expiring Soon";
    color = "bg-yellow-100 text-yellow-700";
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
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

  const location = useLocation();
  const isFirstRender = useRef(true);

  // ✅ Load inventory from localStorage initially
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("inventory") || "[]");
      if (Array.isArray(stored)) setInventory(stored);
    } catch (error) {
      console.error("Failed to load inventory:", error);
    }
  }, []);

  // ✅ Sync updates from Billing (localStorage change)
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "inventory") {
        try {
          const updated = JSON.parse(event.newValue || "[]");
          if (Array.isArray(updated)) setInventory(updated);
        } catch (error) {
          console.error("Failed to sync inventory:", error);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // ✅ Save inventory changes (except first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      localStorage.setItem("inventory", JSON.stringify(inventory));
    } catch (error) {
      console.error("Failed to save inventory:", error);
    }
  }, [inventory]);

  // ✅ Handle filtering via URL (low stock / expired)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filter = params.get("filter");

    const now = new Date();

    let data = [...inventory];

    if (filter === "lowstock") {
      data = data.filter((item) => item.qty <= 5);
    } else if (filter === "expired") {
      data = data.filter((item) => new Date(item.expiry) < now);
    }

    setFilteredData(data);
  }, [location, inventory]);

  // 🔍 Search within current filter
  const finalList = useMemo(() => {
    if (!search.trim()) return filteredData.length ? filteredData : inventory;
    const q = search.toLowerCase();
    const source = filteredData.length ? filteredData : inventory;
    return source.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.batch.toLowerCase().includes(q)
    );
  }, [search, inventory, filteredData]);

  // ➕ Add new medicine
  function addMedicine(e) {
    e.preventDefault();
    if (
      !newMed.name ||
      !newMed.batch ||
      !newMed.qty ||
      !newMed.price ||
      !newMed.expiry
    ) {
      alert("Please fill all fields");
      return;
    }

    const id = "M" + String(Date.now()).slice(-4);
    const newMedicine = {
      ...newMed,
      id,
      qty: Number(newMed.qty),
      price: Number(newMed.price),
    };

    const updated = [...inventory, newMedicine];
    setInventory(updated);
    localStorage.setItem("inventory", JSON.stringify(updated));
    setNewMed({ name: "", batch: "", price: "", qty: "", expiry: "" });
    setShowModal(false);
  }

  // 🗑 Delete a medicine
  function deleteMedicine(id) {
    if (window.confirm("Are you sure you want to delete this medicine?")) {
      const updated = inventory.filter((item) => item.id !== id);
      setInventory(updated);
      localStorage.setItem("inventory", JSON.stringify(updated));
    }
  }

  // ✏️ Start editing
  function startEdit(item) {
    setEditingId(item.id);
    setEditData({ ...item });
  }

  // 💾 Save edits
  function saveEdit(id) {
    const updated = inventory.map((item) =>
      item.id === id
        ? { ...editData, qty: Number(editData.qty), price: Number(editData.price) }
        : item
    );
    setInventory(updated);
    localStorage.setItem("inventory", JSON.stringify(updated));
    setEditingId(null);
  }

  // 🧾 Count Expired & Low Stock for display
  const expiredCount = inventory.filter(
    (item) => new Date(item.expiry) < new Date()
  ).length;

  const lowStockCount = inventory.filter((item) => item.qty <= 5).length;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4 text-[var(--hp-primary)]">
        Inventory
      </h1>

      {/* Summary Section */}
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

      {/* Search + Add */}
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

      {/* Table */}
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
            {finalList.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-6">
                  No items found.
                </td>
              </tr>
            ) : (
              finalList.map((item, i) => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50 ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-3">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) =>
                          setEditData({ ...editData, name: e.target.value })
                        }
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
                        value={editData.batch}
                        onChange={(e) =>
                          setEditData({ ...editData, batch: e.target.value })
                        }
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
                        value={editData.qty}
                        onChange={(e) =>
                          setEditData({ ...editData, qty: e.target.value })
                        }
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
                        value={editData.price}
                        onChange={(e) =>
                          setEditData({ ...editData, price: e.target.value })
                        }
                        className="w-20 px-2 py-1 border rounded text-right"
                      />
                    ) : (
                      `₹ ${item.price.toFixed(2)}`
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === item.id ? (
                      <input
                        type="date"
                        value={editData.expiry}
                        onChange={(e) =>
                          setEditData({ ...editData, expiry: e.target.value })
                        }
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      new Date(item.expiry).toLocaleDateString()
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

      {/* ➕ Add Medicine Modal */}
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
                  onChange={(e) =>
                    setNewMed({ ...newMed, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--hp-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Batch</label>
                <input
                  type="text"
                  value={newMed.batch}
                  onChange={(e) =>
                    setNewMed({ ...newMed, batch: e.target.value })
                  }
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
                    onChange={(e) =>
                      setNewMed({ ...newMed, price: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--hp-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Quantity</label>
                  <input
                    type="number"
                    value={newMed.qty}
                    onChange={(e) =>
                      setNewMed({ ...newMed, qty: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--hp-primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={newMed.expiry}
                  onChange={(e) =>
                    setNewMed({ ...newMed, expiry: e.target.value })
                  }
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
