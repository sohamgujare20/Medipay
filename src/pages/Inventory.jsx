import React, { useState, useMemo } from "react";
import { Plus, X } from "lucide-react";

// Utility to calculate days until expiry
function daysUntil(dateISO) {
  const d = new Date(dateISO);
  const now = new Date();
  const diff = d - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Status badge for expiry or stock
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
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

export default function Inventory() {
  const [inventory, setInventory] = useState([]); // Empty data
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newMed, setNewMed] = useState({
    name: "",
    batch: "",
    price: "",
    qty: "",
    expiry: "",
  });

  // Filter inventory based on search
  const filtered = useMemo(() => {
    if (!search.trim()) return inventory;
    const q = search.toLowerCase();
    return inventory.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.batch.toLowerCase().includes(q)
    );
  }, [search, inventory]);

  // Add new medicine
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
    const id = "M" + String(inventory.length + 1).padStart(3, "0");
    setInventory((prev) => [
      ...prev,
      {
        ...newMed,
        id,
        qty: Number(newMed.qty),
        price: Number(newMed.price),
      },
    ]);
    setNewMed({ name: "", batch: "", price: "", qty: "", expiry: "" });
    setShowModal(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4 text-[var(--hp-primary)]">
        Inventory
      </h1>

      {/* Search + Add button */}
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
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center text-gray-500 py-6"
                >
                  No items in inventory.
                </td>
              </tr>
            ) : (
              filtered.map((item, i) => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50 ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.batch}</td>
                  <td className="px-4 py-3 text-right">{item.qty}</td>
                  <td className="px-4 py-3 text-right">
                    ₹ {item.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(item.expiry).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge qty={item.qty} expiry={item.expiry} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Medicine Modal */}
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
