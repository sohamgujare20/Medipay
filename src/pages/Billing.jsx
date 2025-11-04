import React, { useState } from "react";
import { Search } from "lucide-react";

export default function Billing() {
  const [searchTerm, setSearchTerm] = useState("");

  // Added one medicine record
  const initialMedicines = [
    {
      id: 1,
      name: "Paracetamol",
      batch: "B123",
      expiry: "2026-05-01",
      stock: 20,
      price: 15,
    },
  ];
  const [medicines, setMedicines] = useState(initialMedicines);
  const [cart, setCart] = useState([]);
  const [paymentMode, setPaymentMode] = useState("online");
  const [generateBill, setGenerateBill] = useState(false);

  const addToCart = (med) => {
    setCart((prev) => {
      const exists = prev.find((p) => p.id === med.id);
      if (exists) {
        return prev.map((p) =>
          p.id === med.id ? { ...p, qty: p.qty + 1 } : p
        );
      }
      return [...prev, { ...med, qty: 1 }];
    });
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = +(subtotal * 0.05).toFixed(2);
  const grandTotal = +(subtotal + tax).toFixed(2);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ===== Left Panel: Search + Medicine Table ===== */}
      <div className="lg:col-span-2 bg-[var(--hp-surface)] p-4 rounded-lg shadow-sm border">
        {/* Search Bar */}
        <div className="flex mb-4">
          <input
            type="text"
            placeholder="Search medicine or batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--hp-primary)]"
          />
          <button className="bg-[var(--hp-primary)] px-4 py-2 text-white rounded-r-lg hover:bg-teal-700 transition">
            <Search size={18} />
          </button>
        </div>

        {/* Medicines Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left py-2 px-3 border-b">Medicine Name</th>
                <th className="text-left py-2 px-3 border-b">Batch</th>
                <th className="text-left py-2 px-3 border-b">Expiry</th>
                <th className="text-left py-2 px-3 border-b">Stock</th>
                <th className="text-left py-2 px-3 border-b">Price (₹)</th>
                <th className="text-center py-2 px-3 border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {medicines.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-gray-500">
                    No medicines available.
                  </td>
                </tr>
              ) : (
                medicines.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 px-3 border-b">{m.name}</td>
                    <td className="py-2 px-3 border-b">{m.batch}</td>
                    <td className="py-2 px-3 border-b">{m.expiry}</td>
                    <td className="py-2 px-3 border-b">{m.stock}</td>
                    <td className="py-2 px-3 border-b">₹ {m.price}</td>
                    <td className="text-center py-2 px-3 border-b">
                      <button
                        onClick={() => addToCart(m)}
                        className="text-sm bg-[var(--hp-primary)] text-white px-2 py-1 rounded"
                      >
                        Add
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Right Panel: Cart + Bill ===== */}
      <div className="bg-[var(--hp-surface)] p-4 rounded-lg shadow-sm border flex flex-col">
        <h2 className="text-lg font-semibold text-[var(--hp-primary)] mb-3">
          Bill & Cart
        </h2>

        {/* Cart Items */}
        <div className="flex-1 mb-4">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center text-gray-500">
              No items in cart.
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center bg-gray-50 p-2 rounded"
                >
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      Qty: {item.qty} × ₹{item.price}
                    </div>
                  </div>
                  <div className="font-semibold">₹ {item.price * item.qty}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generate Bill Toggle */}
        <div className="mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="generateBill"
            checked={generateBill}
            onChange={() => setGenerateBill(!generateBill)}
            className="w-4 h-4 accent-[var(--hp-primary)] cursor-pointer"
          />
          <label htmlFor="generateBill" className="cursor-pointer text-gray-700">
            Generate Bill?
          </label>
        </div>

        {/* Payment Mode Selector (Always Visible) */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Payment Mode
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="paymentMode"
                value="online"
                checked={paymentMode === "online"}
                onChange={() => setPaymentMode("online")}
              />
              <span>Online (UPI)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="paymentMode"
                value="offline"
                checked={paymentMode === "offline"}
                onChange={() => setPaymentMode("offline")}
              />
              <span>Offline (Cash/Card)</span>
            </label>
          </div>
        </div>

        {/* Bill Summary */}
        <div className="bg-gray-50 p-3 rounded-lg mb-3">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹ {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax (5%):</span>
            <span>₹ {tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-[var(--hp-primary)]">
            <span>Grand Total:</span>
            <span>₹ {grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* No QR or Bill Button (until data added) */}
        <div className="text-center text-gray-400 text-sm">
          Add medicines to generate a bill.
        </div>
      </div>
    </div>
  );
}
