import React, { useState, useEffect } from "react";
import { Search, Trash2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

export default function Billing() {
  // ✅ Load medicines from Inventory (localStorage)
  const [medicines, setMedicines] = useState([]);

  useEffect(() => {
    const storedInventory = JSON.parse(localStorage.getItem("inventory") || "[]");
    setMedicines(storedInventory);
  }, []);

  // ✅ Auto-update Billing when Inventory changes (live sync)
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "inventory") {
        const updated = JSON.parse(event.newValue || "[]");
        setMedicines(updated);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [paymentMode, setPaymentMode] = useState("online");
  const [generateBill, setGenerateBill] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [daysToRefill, setDaysToRefill] = useState("");
  const [billNo, setBillNo] = useState(1);
  const [errors, setErrors] = useState({});

  // Load Bill No
  useEffect(() => {
    const existingBills = JSON.parse(localStorage.getItem("bills") || "[]");
    if (existingBills.length > 0) {
      const usedNumbers = existingBills.map((b) => b.billNo).sort((a, b) => a - b);
      const nextAvailable =
        usedNumbers.findIndex((num, i) => num !== i + 1) === -1
          ? usedNumbers.length + 1
          : usedNumbers.findIndex((num, i) => num !== i + 1) + 1;
      setBillNo(nextAvailable);
    } else {
      setBillNo(1);
    }
  }, []);

  const filteredMedicines = medicines.filter(
    (med) =>
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.batch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddToCart = (med) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === med.id);
      if (existing) {
        return prev.map((item) =>
          item.id === med.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...med, qty: 1 }];
    });
  };

  const handleQtyChange = (id, qty) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: Math.max(1, qty) } : item
      )
    );
  };

  const handleRemove = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + tax;

  const today = new Date();
  const getRowClass = (expiryDate) => {
    const expiry = new Date(expiryDate);
    if (expiry < today) return "bg-red-100";
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) return "bg-yellow-100";
    return "";
  };

  // ✅ Validate inputs (inline errors)
  const validateInputs = () => {
    const newErrors = {};

    if (generateBill) {
      if (!customerName.trim()) newErrors.customerName = "Customer name is required.";
      if (!mobile.trim()) newErrors.mobile = "Mobile number is required.";
      else if (!/^\d{10}$/.test(mobile))
        newErrors.mobile = "Enter a valid 10-digit mobile number.";
      if (!daysToRefill) newErrors.daysToRefill = "Days to refill is required.";
      else if (Number(daysToRefill) <= 0)
        newErrors.daysToRefill = "Enter a valid number greater than 0.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 🧾 Save Bill + Reduce Stock
  const saveBill = (auto = false) => {
    if (cart.length === 0) {
      setErrors({ cart: "Please add at least one medicine to generate a bill." });
      return;
    }

    if (!validateInputs()) return;

    const existingBills = JSON.parse(localStorage.getItem("bills") || "[]");
    const usedNumbers = existingBills.map((b) => b.billNo).sort((a, b) => a - b);
    const nextAvailable =
      usedNumbers.findIndex((num, i) => num !== i + 1) === -1
        ? usedNumbers.length + 1
        : usedNumbers.findIndex((num, i) => num !== i + 1) + 1;

    const newBill = {
      id: Date.now(),
      billNo: nextAvailable,
      date: new Date().toLocaleString(),
      total: grandTotal.toFixed(2),
      paymentMode,
      customerName: customerName.trim() || "Guest",
      mobile,
      daysToRefill,
      items: cart,
    };

    // ✅ Reduce stock from inventory for sold medicines
    let inventory = JSON.parse(localStorage.getItem("inventory") || "[]");
    const updatedInventory = inventory.map((item) => {
      const sold = cart.find(
        (c) => c.name === item.name && c.batch === item.batch
      );
      if (sold) {
        const newQty = Math.max(item.qty - sold.qty, 0);
        return { ...item, qty: newQty };
      }
      return item;
    });
    localStorage.setItem("inventory", JSON.stringify(updatedInventory));

    // ✅ Save Bill only if "Save to Receipts" is ON
    if (generateBill) {
      localStorage.setItem("bills", JSON.stringify([newBill, ...existingBills]));
    }

    alert(
      generateBill
        ? "✅ Bill saved to Receipts and stock updated!"
        : "✅ Bill generated successfully (not saved to Receipts)."
    );

    setCart([]);
    setCustomerName("");
    setMobile("");
    setDaysToRefill("");
    setErrors({});
    setBillNo(nextAvailable + 1);
  };

  // Auto-save bill for Online Payment
  useEffect(() => {
    if (paymentMode === "online" && cart.length > 0) {
      const timer = setTimeout(() => saveBill(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [paymentMode, cart]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ===== Left Panel ===== */}
      <div className="lg:col-span-2 bg-[var(--hp-surface)] p-4 rounded-lg shadow-sm border">
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
              {filteredMedicines.length > 0 ? (
                filteredMedicines.map((med) => (
                  <tr
                    key={med.id}
                    className={`${getRowClass(med.expiry)} hover:bg-gray-50`}
                  >
                    <td className="py-2 px-3 border-b">{med.name}</td>
                    <td className="py-2 px-3 border-b">{med.batch}</td>
                    <td className="py-2 px-3 border-b">
                      {new Date(med.expiry).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3 border-b">{med.qty}</td>
                    <td className="py-2 px-3 border-b">{med.price}</td>
                    <td className="py-2 px-3 border-b text-center">
                      <button
                        onClick={() => handleAddToCart(med)}
                        className="px-3 py-1 bg-[var(--hp-primary)] text-white rounded hover:bg-teal-700 transition"
                      >
                        Add
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-gray-500">
                    No medicines found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Right Panel ===== */}
      <div className="bg-[var(--hp-surface)] p-4 rounded-lg shadow-sm border flex flex-col">
        <h2 className="text-lg font-semibold text-[var(--hp-primary)] mb-3">
          Bill & Cart
        </h2>

        {generateBill && (
          <div className="mb-3">
            <span className="font-medium text-gray-700">Bill No: </span>
            <span className="text-[var(--hp-primary)] font-semibold">
              #{billNo}
            </span>
          </div>
        )}

        {/* Cart Section */}
        <div className="flex-1 overflow-auto mb-4">
          {cart.length > 0 ? (
            <table className="min-w-full border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left py-2 px-3 border-b">Medicine</th>
                  <th className="text-center py-2 px-3 border-b">Qty</th>
                  <th className="text-right py-2 px-3 border-b">Price</th>
                  <th className="text-right py-2 px-3 border-b">Total</th>
                  <th className="text-center py-2 px-3 border-b">Remove</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3 border-b">{item.name}</td>
                    <td className="py-2 px-3 border-b text-center">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) =>
                          handleQtyChange(item.id, Number(e.target.value))
                        }
                        className="w-16 border rounded px-1 py-1 text-center"
                        min="1"
                      />
                    </td>
                    <td className="py-2 px-3 border-b text-right">{item.price}</td>
                    <td className="py-2 px-3 border-b text-right">
                      {(item.qty * item.price).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 border-b text-center">
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 text-center">No items in cart.</p>
          )}
        </div>

        {/* Save to Receipts */}
        <div className="mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="generateBill"
            checked={generateBill}
            onChange={() => setGenerateBill(!generateBill)}
            className="w-4 h-4 accent-[var(--hp-primary)] cursor-pointer"
          />
          <label htmlFor="generateBill" className="cursor-pointer text-gray-700">
            Save to Receipts?
          </label>
        </div>

        {/* Customer Info */}
        {generateBill && (
          <>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                  errors.customerName
                    ? "border-red-500"
                    : "focus:ring-[var(--hp-primary)]"
                }`}
              />
              {errors.customerName && (
                <p className="text-red-600 text-xs mt-1">
                  {errors.customerName}
                </p>
              )}
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Mobile Number
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter customer mobile"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                  errors.mobile
                    ? "border-red-500"
                    : "focus:ring-[var(--hp-primary)]"
                }`}
              />
              {errors.mobile && (
                <p className="text-red-600 text-xs mt-1">{errors.mobile}</p>
              )}
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Days to Refill Reminder
              </label>
              <input
                type="number"
                value={daysToRefill}
                onChange={(e) => setDaysToRefill(e.target.value)}
                placeholder="e.g., 30"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                  errors.daysToRefill
                    ? "border-red-500"
                    : "focus:ring-[var(--hp-primary)]"
                }`}
              />
              {errors.daysToRefill && (
                <p className="text-red-600 text-xs mt-1">
                  {errors.daysToRefill}
                </p>
              )}
            </div>
          </>
        )}

        {/* Payment Mode */}
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

        {/* QR / Generate Bill */}
        {grandTotal > 0 && (
          <>
            {paymentMode === "online" && (
              <div className="flex flex-col items-center mb-3">
                <QRCodeCanvas
                  value={`upi://pay?pa=store@upi&pn=MediPay&am=${grandTotal.toFixed(
                    2
                  )}`}
                  size={128}
                />
                <p className="text-sm mt-2 text-gray-700">
                  Scan to pay ₹{grandTotal.toFixed(2)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  (Auto receipt will be saved after payment)
                </p>
              </div>
            )}

            {paymentMode === "offline" && (
              <button
                onClick={() => saveBill(false)}
                className="mt-3 w-full bg-[var(--hp-primary)] text-white py-2 rounded-lg hover:bg-teal-700 transition font-medium"
              >
                Generate Bill
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
