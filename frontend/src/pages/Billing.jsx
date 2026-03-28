// src/pages/Billing.jsx
import React, { useState, useEffect, useRef } from "react";
import { Search, Trash2, Plus, Minus, User, Phone, Clock, ShoppingCart } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { api } from "../api";
export default function Billing() {
  const [medicines, setMedicines] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [cart, setCart] = useState([]);
  const [paymentMode, setPaymentMode] = useState("online");
  const [generateBill, setGenerateBill] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [daysToRefill, setDaysToRefill] = useState("");
  const [billNo, setBillNo] = useState(1);
  const [errors, setErrors] = useState({});
  const [printBillData, setPrintBillData] = useState(null);
  const realtimeChannelRef = useRef(null);

  // ---------- Load medicines from Supabase inventory (with localStorage fallback) ----------
  const loadMedicines = async () => {
    try {
      const data = await api.inventory.getAll();

      // normalize numeric fields and map MongoDB _id to React id natively
      const normalized = (data || []).map((r) => ({
        ...r,
        id: r._id || r.id || crypto.randomUUID(), 
        qty: Number(r.qty ?? 0),
        price: Number(r.price ?? 0),
        expiry: r.expiry ?? null,
      }));

      setMedicines(normalized);
    } catch (err) {
      console.error("Inventory load failed:", err);
    }
  };

  useEffect(() => {
    loadMedicines();

    // Realtime removed - assuming single-user local flow
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Load bill number (first missing positive integer) ----------
  const computeNextBillNo = async () => {
    try {
      const data = await api.bills.getAll();

      const usedNumbers = (data || []).map((r) => Number(r.bill_no)).filter(Boolean).sort((a, b) => a - b);
      const nextAvailable =
        usedNumbers.findIndex((num, i) => num !== i + 1) === -1
          ? usedNumbers.length + 1
          : usedNumbers.findIndex((num, i) => num !== i + 1) + 1;

      setBillNo(nextAvailable);
    } catch (err) {
      console.error("Failed to compute bill number from Supabase, fallback to localStorage bills:", err);
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
    }
  };

  useEffect(() => {
    computeNextBillNo();
  }, []);

  // ---------- Filtering ----------
  const filteredMedicines = medicines.filter(
    (med) =>
      (med.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (med.batch || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ---------- Cart handlers ----------
  const handleAddToCart = (med) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === med.id);
      if (existing) {
        return prev.map((item) => (item.id === med.id ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...prev, { ...med, qty: 1 }];
    });
  };

  const handleQtyChange = (id, qty) => {
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qty: Math.max(1, qty) } : item))
    );
  };

  const handlePriceChange = (id, price) => {
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, price: Math.max(0, price) } : item))
    );
  };

  const handleRemove = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // ---------- Totals ----------
  const subtotal = cart.reduce((acc, item) => acc + Number(item.price || 0) * Number(item.qty || 0), 0);
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + tax;

  const today = new Date();
  const getRowClass = (expiryDate) => {
    if (!expiryDate) return "";
    const expiry = new Date(expiryDate);
    if (expiry < today) return "bg-red-100";
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) return "bg-yellow-100";
    return "";
  };

  // ---------- Validation ----------
  const validateInputs = () => {
    const newErrors = {};
    if (generateBill) {
      if (!customerName.trim()) newErrors.customerName = "Customer name is required.";
      if (!mobile.trim()) newErrors.mobile = "Mobile number is required.";
      else if (!/^\d{10}$/.test(mobile)) newErrors.mobile = "Enter a valid 10-digit mobile number.";
      
      if (daysToRefill && Number(daysToRefill) <= 0) {
        newErrors.daysToRefill = "Enter a valid number greater than 0.";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---------- Save Bill + Reduce Stock (Supabase) ----------
  const saveBill = async (auto = false) => {
    if (cart.length === 0) {
      setErrors({ cart: "Please add at least one medicine to generate a bill." });
      return;
    }
    if (!validateInputs()) return;

    try {
      // compute nextAvailable again just before insert to avoid collisions
      const billsData = await api.bills.getAll();
      const usedNumbers = (billsData || []).map((r) => Number(r.bill_no)).filter(Boolean).sort((a, b) => a - b);
      const nextAvailable =
        usedNumbers.findIndex((num, i) => num !== i + 1) === -1
          ? usedNumbers.length + 1
          : usedNumbers.findIndex((num, i) => num !== i + 1) + 1;

      // create bill object to save locally and to Supabase
      const newBill = {
        bill_no: nextAvailable,
        total: Number(grandTotal.toFixed(2)),
        payment_mode: paymentMode,
        customer_name: customerName.trim() || "Guest",
        mobile,
        days_to_refill: daysToRefill ? Number(daysToRefill) : null,
        items: cart.map((c) => ({
          id: c.id,
          name: c.name,
          batch: c.batch,
          qty: Number(c.qty),
          price: Number(c.price),
        })),
      };

      // Let the Backend intelligently handle FEFO (First-Expired-First-Out) stock deduction
      // We simply pass the bill to the backend and it sorts out which batches to deduct from!
      await api.bills.create(newBill);

      // Trigger the beautiful Print Bill Modal with all final calculations
      setPrintBillData({
        ...newBill,
        _subtotal: subtotal.toFixed(2),
        _tax: tax.toFixed(2),
        _isSaved: generateBill
      });

      // clear cart + inputs and prepare next bill no
      setCart([]);
      setCustomerName("");
      setMobile("");
      setDaysToRefill("");
      setErrors({});
      setBillNo(nextAvailable + 1);

      // refresh medicines to reflect updated stock
      loadMedicines();
    } catch (err) {
      console.error("Failed to save bill:", err);
      alert("Error saving bill. Check console for details.");
    }
  };

  // Auto-save bill for Online Payment (same behavior as before)
  useEffect(() => {
    if (paymentMode === "online" && cart.length > 0) {
      const timer = setTimeout(() => saveBill(true), 5000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMode, cart]);

  // preserve existing UI — below is your original JSX with state hooks wired to new logic
  return (    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* ===== Centerpiece Search & Cart Table (Left 75%) ===== */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        
        {/* Step 1: Pos Autocomplete Search Bar */}
        <div className="relative z-20">
          <div className="flex items-center bg-white border-2 border-[var(--hp-surface)] rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-[var(--hp-primary)] focus-within:border-[var(--hp-primary)] transition-all">
            <span className="pl-5 text-gray-500">
              <Search size={24} />
            </span>
            <input
              type="text"
              placeholder="Search or click here to view available inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
              className="flex-1 px-4 py-4 md:py-5 text-lg border-none focus:outline-none focus:ring-0 bg-transparent"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="pr-5 text-gray-400 hover:text-red-500 transition font-bold text-sm tracking-wide uppercase"
              >
                Clear
              </button>
            )}
          </div>
          
          {/* Autocomplete Dropdown shows on typing OR focus */}
          {(searchTerm || isSearchFocused) && (
            <div className="absolute top-[110%] left-0 right-0 bg-white border rounded-xl shadow-2xl max-h-[400px] overflow-y-auto z-50">
              {filteredMedicines.length > 0 ? (
                <ul className="py-2">
                  {filteredMedicines.slice(0, 100).map((med) => (
                    <li 
                      key={med.id}
                      onClick={() => {
                        handleAddToCart(med);
                        setSearchTerm("");
                      }}
                      className="px-6 py-4 hover:bg-teal-50 cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0 transition"
                    >
                      <div>
                        <div className="font-bold text-gray-800 text-lg">{med.name}</div>
                        <div className="text-sm font-medium text-gray-500 mt-1">
                          Batch: {med.batch} <span className="mx-2 text-gray-300">|</span> Exp: {med.expiry ? new Date(med.expiry).toLocaleDateString() : "-"}
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className="font-bold text-[var(--hp-primary)] text-xl">₹{Number(med.price).toFixed(2)}</div>
                        <div className={`text-xs font-bold px-3 py-1 rounded-full mt-2 inline-block ${med.qty > 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          STOCK: {med.qty}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-6 py-10 text-center text-gray-400 font-medium">
                  No medicines found matching "{searchTerm}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Active Cart View */}
        <div className="bg-[var(--hp-surface)] p-5 rounded-2xl shadow-sm border flex flex-col flex-1 min-h-[40vh]">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <h2 className="text-xl font-bold text-[var(--hp-primary)] flex items-center gap-2">
              <ShoppingCart size={24} /> Active Cart Items
            </h2>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center gap-1.5 transition bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg">
                <Trash2 size={16}/> Clear Entire Cart
              </button>
            )}
          </div>

          <div className="overflow-x-auto flex-1">
            {cart.length > 0 ? (
              <table className="min-w-full">
                <thead className="bg-gray-50/70">
                  <tr>
                    <th className="text-left py-3 px-3 border-b border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-wider">Medicine</th>
                    <th className="text-center py-3 px-3 border-b border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-wider">Qty</th>
                    <th className="text-right py-3 px-3 border-b border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-wider">Price (₹)</th>
                    <th className="text-right py-3 px-3 border-b border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-wider">Total (₹)</th>
                    <th className="text-center py-3 px-3 border-b border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-wider">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition border-b border-dashed border-gray-200">
                      <td className="py-4 px-3 font-semibold text-gray-800 ext-base">{item.name}</td>
                      <td className="py-4 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleQtyChange(item.id, item.qty - 1)}
                            className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition shadow-sm"
                          >
                            <Minus size={16} strokeWidth={3} />
                          </button>
                          <span className="w-8 font-extrabold text-center text-gray-800 text-lg">{item.qty}</span>
                          <button
                            onClick={() => handleQtyChange(item.id, item.qty + 1)}
                            className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-green-100 hover:text-green-600 transition shadow-sm"
                          >
                            <Plus size={16} strokeWidth={3} />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={(e) =>
                            handlePriceChange(item.id, Number(e.target.value))
                          }
                          className="w-[90px] border border-gray-300 rounded-lg px-2 py-2 text-right font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--hp-primary)] text-gray-700 shadow-inner"
                          min="0"
                        />
                      </td>
                      <td className="py-4 px-3 text-right font-black text-xl text-[var(--hp-primary)]">
                        {(item.qty * item.price).toFixed(2)}
                      </td>
                      <td className="py-4 px-3 text-center">
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="text-red-500 hover:text-red-700 transition p-2 hover:bg-red-50 rounded-full"
                          title="Remove from Cart"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-[30vh] md:h-[40vh]">
                <ShoppingCart size={80} className="mb-6 text-gray-200" />
                <p className="text-2xl font-bold text-gray-300">Your cart is completely empty</p>
                <p className="text-md mt-2 font-medium text-gray-400">Scan barcodes or use the big search bar above to instantly drop items here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Right Options Panel (Right 25%) ===== */}
      <div className="bg-[var(--hp-surface)] p-6 rounded-2xl shadow-sm border flex flex-col self-start lg:sticky lg:top-4 max-h-[95vh] overflow-y-auto w-full">
        <div className="flex items-center justify-between mb-5 border-b pb-4">
          <h2 className="text-lg font-black text-gray-800 uppercase tracking-widest text-sm">Checkout</h2>
          {generateBill && (
            <div className="bg-teal-50 px-3 py-1 rounded-full text-xs font-bold border border-teal-100 text-[var(--hp-primary)] uppercase tracking-wider">
              Ref: #{billNo}
            </div>
          )}
        </div>

        {/* Save to Receipts */}
        <div className="mb-4 flex items-center gap-3">
          <input
            type="checkbox"
            id="generateBill"
            checked={generateBill}
            onChange={() => setGenerateBill(!generateBill)}
            className="w-5 h-5 accent-[var(--hp-primary)] cursor-pointer rounded"
          />
          <label htmlFor="generateBill" className="cursor-pointer text-gray-700 font-bold tracking-wide">
            Save to Receipts DB?
          </label>
        </div>

        {/* Customer Info */}
        {generateBill && (
          <div className="bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200 mb-4 z-10 relative">
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-gray-500">
                Customer Name
              </label>
              <div className="relative shadow-sm rounded-lg">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--hp-primary)]">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-white font-medium ${
                    errors.customerName ? "border-red-500 focus:ring-red-200" : "focus:border-[var(--hp-primary)] focus:ring-teal-100"
                  }`}
                />
              </div>
              {errors.customerName && (
                <p className="text-red-500 text-xs mt-1.5 font-bold">{errors.customerName}</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-gray-500">
                Mobile Number
              </label>
              <div className="relative shadow-sm rounded-lg">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--hp-primary)]">
                  <Phone size={18} />
                </span>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Customer mobile"
                  className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-white font-medium tracking-wider ${
                    errors.mobile ? "border-red-500 focus:ring-red-200" : "focus:border-[var(--hp-primary)] focus:ring-teal-100"
                  }`}
                />
              </div>
              {errors.mobile && (
                <p className="text-red-500 text-xs mt-1.5 font-bold">{errors.mobile}</p>
              )}
            </div>

            <div className="mb-1">
              <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-gray-500">
                Refill Reminder <span className="text-gray-400 font-semibold lowercase tracking-normal bg-white px-1 ml-1 rounded">(optional)</span>
              </label>
              <div className="relative shadow-sm rounded-lg">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--hp-primary)]">
                  <Clock size={18} />
                </span>
                <input
                  type="number"
                  value={daysToRefill}
                  onChange={(e) => setDaysToRefill(e.target.value)}
                  placeholder="Days (e.g., 30)"
                  className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-white font-bold ${
                    errors.daysToRefill ? "border-red-500 focus:ring-red-200" : "focus:border-[var(--hp-primary)] focus:ring-teal-100"
                  }`}
                />
              </div>
              {errors.daysToRefill && (
                <p className="text-red-500 text-xs mt-1.5 font-bold">{errors.daysToRefill}</p>
              )}
            </div>
          </div>
        )}

        {/* Payment Mode block-style */}
        <div className="mb-5 mt-2">
          <label className="block text-xs font-black uppercase tracking-widest mb-2.5 text-gray-500">
            Select Payment Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMode("online")}
              className={`py-3 px-2 rounded-xl border-2 font-black text-sm tracking-wide transition transform hover:scale-[1.02] ${
                paymentMode === "online"
                  ? "border-[var(--hp-primary)] bg-teal-50 text-[var(--hp-primary)] shadow-md"
                  : "border-gray-200 text-gray-400 hover:border-gray-300 bg-white"
              }`}
            >
              Online / UPI
            </button>
            <button
              onClick={() => setPaymentMode("offline")}
              className={`py-3 px-2 rounded-xl border-2 font-black text-sm tracking-wide transition transform hover:scale-[1.02] ${
                paymentMode === "offline"
                  ? "border-gray-800 bg-gray-800 text-white shadow-md shadow-gray-400"
                  : "border-gray-200 text-gray-400 hover:border-gray-300 bg-white"
              }`}
            >
              Cash / Card
            </button>
          </div>
        </div>

        {/* Bill Summary */}
        <div className="bg-gray-50/80 p-5 rounded-xl mb-4 border border-gray-200 shadow-inner flex flex-col items-end text-right">
          <div className="w-full">
            <div className="flex justify-between py-1.5 text-gray-600 font-semibold tracking-wide">
              <span>Subtotal:</span>
              <span className="text-gray-800">₹ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1.5 text-gray-500 text-sm font-semibold border-b border-gray-200/80 pb-3 mb-3">
              <span>GST (5%):</span>
              <span className="text-green-600">+ ₹ {tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 font-black text-2xl text-[var(--hp-primary)] uppercase tracking-wide">
              <span>TOTAL:</span>
              <span>₹ {grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* QR / Generate Bill */}
        {grandTotal > 0 && (
          <div className="mt-2">
            {paymentMode === "online" && (
              <div className="flex flex-col items-center bg-white border-2 border-dashed border-teal-200 p-4 rounded-xl">
                <QRCodeCanvas
                  value={`upi://pay?pa=store@upi&pn=MediPay&am=${grandTotal.toFixed(2)}`}
                  size={140}
                  level="H"
                />
                <p className="font-exrabold text-lg mt-3 text-gray-800 tracking-wide">
                  Pay <span className="text-[var(--hp-primary)]">₹{grandTotal.toFixed(2)}</span>
                </p>
                <p className="text-xs text-green-600 font-bold mt-1 tracking-wider uppercase">
                  (Auto generates receipt on scan)
                </p>
              </div>
            )}

            {paymentMode === "offline" && (
              <button
                onClick={() => saveBill(false)}
                className="w-full bg-[var(--hp-primary)] text-white py-4 rounded-xl hover:bg-teal-700 transition font-black text-lg tracking-widest uppercase shadow-lg shadow-teal-500/30 transform hover:-translate-y-1"
              >
                GENERATE BILL
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bill Print Modal */}
      {printBillData && (
        <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative">
            <div className="text-center mb-4 border-b pb-4">
              <h2 className="text-2xl font-bold text-[var(--hp-primary)]">MediPay</h2>
              <p className="text-xs text-gray-500 mt-1">Pharmacy Receipt</p>
              <p className="text-sm font-medium mt-2">Bill No: #{printBillData.bill_no}</p>
              <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
            </div>
            
            <div className="mb-4 text-sm">
              <p><b>Customer:</b> {printBillData.customer_name}</p>
              <p><b>Phone:</b> {printBillData.mobile || "N/A"}</p>
              <p className="capitalize"><b>Payment Mode:</b> {printBillData.payment_mode}</p>
            </div>

            <div className="mb-4 max-h-[40vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">Item</th>
                    <th className="text-center py-1">Qty</th>
                    <th className="text-right py-1">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {printBillData.items.map((it, idx) => (
                    <tr key={idx} className="border-b border-dashed border-gray-200">
                      <td className="py-2 pr-2">{it.name}</td>
                      <td className="text-center py-2">{it.qty}</td>
                      <td className="text-right py-2 whitespace-nowrap">₹ {(it.qty * it.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t pt-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹ {printBillData._subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>GST (5%)</span>
                <span>+ ₹ {printBillData._tax}</span>
              </div>
              <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t text-[var(--hp-primary)]">
                <span>Total</span>
                <span>₹ {printBillData.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-center text-xs text-gray-400 mt-6">
              Thank you for choosing MediPay!
              <br/>
              {!printBillData._isSaved && "(Local copy, wasn't saved to DB tracking)"}
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={() => window.print()}
              className="px-6 py-2 bg-white text-gray-800 font-medium rounded shadow-lg hover:bg-gray-100 transition"
            >
              Print Receipt
            </button>
            <button
              onClick={() => setPrintBillData(null)}
              className="px-6 py-2 bg-[var(--hp-primary)] text-white font-medium rounded shadow-lg hover:bg-teal-700 transition"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
