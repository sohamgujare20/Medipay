// src/pages/Billing.jsx
import React, { useState, useEffect, useRef } from "react";
import { Search, Trash2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../supabaseClient"; // <- ensure path is correct

export default function Billing() {
  const [medicines, setMedicines] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [paymentMode, setPaymentMode] = useState("online");
  const [generateBill, setGenerateBill] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [daysToRefill, setDaysToRefill] = useState("");
  const [billNo, setBillNo] = useState(1);
  const [errors, setErrors] = useState({});
  const realtimeChannelRef = useRef(null);

  // ---------- Load medicines from Supabase inventory (with localStorage fallback) ----------
  const loadMedicines = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // normalize numeric fields
      const normalized = (data || []).map((r) => ({
        ...r,
        qty: Number(r.qty ?? 0),
        price: Number(r.price ?? 0),
        // expiry might be returned as string e.g. "2025-12-31"
        expiry: r.expiry ?? null,
      }));

      setMedicines(normalized);
      // also persist to localStorage for compatibility with older code expecting it
      try {
        localStorage.setItem("inventory", JSON.stringify(normalized));
      } catch (e) {
        // ignore storage errors
      }
    } catch (err) {
      console.error("Supabase inventory load failed, fallback to localStorage:", err);
      const storedInventory = JSON.parse(localStorage.getItem("inventory") || "[]");
      setMedicines(storedInventory);
    }
  };

  useEffect(() => {
    loadMedicines();

    // subscribe to realtime inventory changes so billing updates live
    try {
      const channel = supabase
        .channel("public:inventory")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "inventory" },
          (payload) => {
            // payload.eventType: INSERT | UPDATE | DELETE
            const rec = payload.new ?? payload.old;
            setMedicines((prev) => {
              if (payload.eventType === "INSERT") {
                return [ { ...rec, qty: Number(rec.qty ?? 0), price: Number(rec.price ?? 0) }, ...prev ];
              } else if (payload.eventType === "UPDATE") {
                return prev.map((m) => (m.id === rec.id ? { ...rec, qty: Number(rec.qty ?? 0), price: Number(rec.price ?? 0) } : m));
              } else if (payload.eventType === "DELETE") {
                return prev.filter((m) => m.id !== rec.id);
              }
              return prev;
            });
            // also keep localStorage in sync
            try {
              const updated = (prev) => {
                if (payload.eventType === "INSERT") return [rec, ...prev];
                if (payload.eventType === "UPDATE") return prev.map((m) => (m.id === rec.id ? rec : m));
                if (payload.eventType === "DELETE") return prev.filter((m) => m.id !== rec.id);
                return prev;
              };
              // use current medicines value to build new array then store
              setTimeout(() => {
                try {
                  const cur = JSON.parse(localStorage.getItem("inventory") || "[]");
                  const newLocal = updated(cur);
                  localStorage.setItem("inventory", JSON.stringify(newLocal));
                } catch (e) {}
              }, 0);
            } catch (e) {}
          }
        );

      channel.subscribe();
      realtimeChannelRef.current = channel;
    } catch (e) {
      console.warn("Realtime subscription failed:", e);
    }

    return () => {
      // cleanup realtime subscription
      try {
        if (realtimeChannelRef.current) {
          supabase.removeChannel(realtimeChannelRef.current);
          realtimeChannelRef.current = null;
        }
      } catch (e) {
        // older supabase clients may differ; ignore cleanup errors
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Load bill number (first missing positive integer) ----------
  const computeNextBillNo = async () => {
    try {
      const { data, error } = await supabase
        .from("bills")
        .select("bill_no")
        .order("bill_no", { ascending: true });

      if (error) throw error;

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

  // ---------- LocalStorage listener (for compatibility with other pages) ----------
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
      if (!daysToRefill) newErrors.daysToRefill = "Days to refill is required.";
      else if (Number(daysToRefill) <= 0) newErrors.daysToRefill = "Enter a valid number greater than 0.";
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
      const { data: billsData, error: billsErr } = await supabase
        .from("bills")
        .select("bill_no")
        .order("bill_no", { ascending: true });

      if (billsErr) throw billsErr;
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

      // 1) Reduce stock in Supabase per item (safe: never negative)
      // We'll update each item individually (you could create a function to do a single SQL txn, but Supabase JS updates per-row).
      const updatePromises = newBill.items.map(async (sold) => {
        // fetch current qty to compute new qty (to avoid race)
        const { data: currentRows, error: fetchErr } = await supabase
          .from("inventory")
          .select("qty")
          .eq("id", sold.id)
          .limit(1)
          .single();

        if (fetchErr) {
          // if fetch failed just try to still perform an update using GREATEST in SQL (fallback)
          // NOTE: Supabase client doesn't let you run raw SQL easily here; so we'll attempt to update with current knowledge in local state
          const localItem = medicines.find((m) => m.id === sold.id);
          const curQty = localItem ? Number(localItem.qty || 0) : 0;
          const newQtyLocal = Math.max(curQty - sold.qty, 0);
          return supabase.from("inventory").update({ qty: newQtyLocal }).eq("id", sold.id);
        } else {
          const curQty = Number(currentRows.qty ?? 0);
          const newQty = Math.max(curQty - sold.qty, 0);
          return supabase.from("inventory").update({ qty: newQty }).eq("id", sold.id);
        }
      });

      await Promise.all(updatePromises);

      // 2) Insert bill into Supabase bills table if generateBill is true
      if (generateBill) {
        const { data: inserted, error: insertErr } = await supabase
          .from("bills")
          .insert([{ ...newBill }])
          .select()
          .single();

        if (insertErr) throw insertErr;

        // mirror inserted bill into localStorage for compatibility
        try {
          const existingBills = JSON.parse(localStorage.getItem("bills") || "[]");
          const localCopy = {
            id: inserted.id,
            billNo: inserted.bill_no,
            date: new Date(inserted.created_at).toLocaleString(),
            total: Number(inserted.total).toFixed(2),
            paymentMode: inserted.payment_mode,
            customerName: inserted.customer_name,
            mobile: inserted.mobile,
            daysToRefill: inserted.days_to_refill,
            items: inserted.items,
          };
          localStorage.setItem("bills", JSON.stringify([localCopy, ...existingBills]));
        } catch (e) {
          console.warn("Failed to write bills to localStorage (non-fatal).", e);
        }
      } else {
        // If not saving to Receipts, still keep local bills array for UX parity
        try {
          const existingBills = JSON.parse(localStorage.getItem("bills") || "[]");
          const localCopy = {
            id: Date.now(),
            billNo: nextAvailable,
            date: new Date().toLocaleString(),
            total: Number(newBill.total).toFixed(2),
            paymentMode: newBill.payment_mode,
            customerName: newBill.customer_name,
            mobile: newBill.mobile,
            daysToRefill: newBill.days_to_refill,
            items: newBill.items,
          };
          localStorage.setItem("bills", JSON.stringify([localCopy, ...existingBills]));
        } catch (e) {}
      }

      alert(
        generateBill
          ? "✅ Bill saved to Receipts and stock updated!"
          : "✅ Bill generated successfully (not saved to Receipts)."
      );

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
                      {med.expiry ? new Date(med.expiry).toLocaleDateString() : "-"}
                    </td>
                    <td className="py-2 px-3 border-b">{med.qty}</td>
                    <td className="py-2 px-3 border-b">{Number(med.price).toFixed(2)}</td>
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
                    <td className="py-2 px-3 border-b text-right">{Number(item.price).toFixed(2)}</td>
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
