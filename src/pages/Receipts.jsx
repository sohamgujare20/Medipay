import React, { useState } from "react";
import { toast, Toaster } from "react-hot-toast";

const CustomerBill = () => {
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [bill, setBill] = useState([]); // No sample data
  const [promotion, setPromotion] = useState(false);
  const [history, setHistory] = useState([]);

  const totalAmount = bill.reduce((sum, item) => sum + item.qty * item.price, 0);

  const handleChange = (e) => {
    setCustomer({ ...customer, [e.target.name]: e.target.value });
  };

  const sendSMS = () => {
    if (!customer.phone) {
      toast.error("Please enter a phone number!");
      return;
    }
    toast.success("SMS feature coming soon!");
  };

  const sendPDF = () => {
    if (!customer.phone && !customer.email) {
      toast.error("Please enter phone or email!");
      return;
    }
    toast.success("PDF feature coming soon!");
  };

  return (
    <div className="p-6">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-bold mb-4">Customer Bill & Follow-up</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* ===== Left Panel ===== */}
        <div className="md:col-span-2 bg-white p-4 rounded shadow">
          <div className="mb-4">
            <input
              type="text"
              name="name"
              placeholder="Customer Name"
              value={customer.name}
              onChange={handleChange}
              className="border p-2 w-full mb-2 rounded"
            />
            <input
              type="text"
              name="phone"
              placeholder="Phone Number"
              value={customer.phone}
              onChange={handleChange}
              className="border p-2 w-full mb-2 rounded"
            />
            <input
              type="email"
              name="email"
              placeholder="Email (optional)"
              value={customer.email}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          <h2 className="text-xl font-semibold mb-2">Bill Summary</h2>
          <table className="w-full border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Medicine</th>
                <th className="border p-2">Batch</th>
                <th className="border p-2">Expiry</th>
                <th className="border p-2">Qty</th>
                <th className="border p-2">Price</th>
                <th className="border p-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {bill.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="border p-4 text-center text-gray-500"
                  >
                    No items in bill.
                  </td>
                </tr>
              ) : (
                bill.map((item, index) => (
                  <tr key={index} className="text-center">
                    <td className="border p-2">{item.name}</td>
                    <td className="border p-2">{item.batch}</td>
                    <td className="border p-2">{item.expiry}</td>
                    <td className="border p-2">{item.qty}</td>
                    <td className="border p-2">₹{item.price}</td>
                    <td className="border p-2">₹{item.qty * item.price}</td>
                  </tr>
                ))
              )}
              <tr className="font-bold text-right">
                <td colSpan="5" className="border p-2">
                  Total
                </td>
                <td className="border p-2">₹{bill.length === 0 ? 0 : totalAmount}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ===== Right Panel ===== */}
        <div className="bg-white p-4 rounded shadow flex flex-col gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={promotion}
              onChange={() => setPromotion(!promotion)}
              className="accent-blue-500"
            />
            Include promotion/reminder for next visit
          </label>

          <button
            onClick={sendSMS}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
          >
            Send SMS
          </button>
          <button
            onClick={sendPDF}
            className="bg-green-500 hover:bg-green-600 text-white p-2 rounded"
          >
            Send PDF
          </button>

          <h2 className="text-lg font-semibold mt-4">Recent History</h2>
          <ul className="space-y-2">
            {history.length === 0 && (
              <li className="text-gray-500">No recent bills</li>
            )}
            {history.map((entry) => (
              <li
                key={entry.id}
                className="flex justify-between items-center border p-2 rounded"
              >
                <span>
                  [{entry.type}] ₹{entry.total} - {entry.date}
                </span>
                <button
                  onClick={() => toast("Resend feature coming soon!")}
                  className="text-sm text-blue-500 hover:underline"
                >
                  Resend
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CustomerBill;
