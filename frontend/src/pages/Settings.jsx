import React, { useState } from "react";

export default function Settings() {
  const [storeInfo, setStoreInfo] = useState({
    name: "MediPay Pharmacy",
    phone: "9876543210",
    address: "123 Main Street, Pune, MH",
    gst: "27ABCDE1234F1Z5",
  });

  const [users, setUsers] = useState([
    { id: 1, name: "John Doe", role: "Admin" },
    { id: 2, name: "Jane Smith", role: "Cashier" },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", role: "", password: "" });

  // handle store form updates
  const handleStoreChange = (e) => {
    setStoreInfo({ ...storeInfo, [e.target.name]: e.target.value });
  };

  const handleStoreSave = (e) => {
    e.preventDefault();
    alert("✅ Store info updated!");
  };

  // handle adding new user
  const handleAddUser = (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.role || !newUser.password) {
      alert("Please fill in all fields!");
      return;
    }
    setUsers([...users, { id: Date.now(), name: newUser.name, role: newUser.role }]);
    setNewUser({ name: "", role: "", password: "" });
    setShowModal(false);
  };

  const handleDeleteUser = (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      setUsers(users.filter((u) => u.id !== id));
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-[var(--hp-primary)]">
        Settings
      </h1>

      {/* ===== Store Info Section ===== */}
      <div className="bg-[var(--hp-surface)] p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">
          Store Information
        </h2>
        <form onSubmit={handleStoreSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Store Name</label>
            <input
              type="text"
              name="name"
              value={storeInfo.name}
              onChange={handleStoreChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-[var(--hp-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="text"
              name="phone"
              value={storeInfo.phone}
              onChange={handleStoreChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-[var(--hp-primary)]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Address</label>
            <textarea
              name="address"
              value={storeInfo.address}
              onChange={handleStoreChange}
              rows={2}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-[var(--hp-primary)]"
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">GST No.</label>
            <input
              type="text"
              name="gst"
              value={storeInfo.gst}
              onChange={handleStoreChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-[var(--hp-primary)]"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="bg-[var(--hp-primary)] text-white px-4 py-2 rounded hover:bg-teal-700 transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* ===== Users Section ===== */}
      <div className="bg-[var(--hp-surface)] p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Users</h2>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[var(--hp-primary)] text-white px-4 py-2 rounded hover:bg-teal-700 transition"
          >
            + Add User
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left py-2 px-4 border-b">Name</th>
                <th className="text-left py-2 px-4 border-b">Role</th>
                <th className="text-center py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{user.name}</td>
                  <td className="py-2 px-4 border-b">{user.role}</td>
                  <td className="py-2 px-4 border-b text-center">
                    <button className="text-blue-600 hover:underline mr-3">
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="3" className="py-4 text-center text-gray-500">
                    No users available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Add User Modal ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New User</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-[var(--hp-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-[var(--hp-primary)]"
                >
                  <option value="">Select role</option>
                  <option value="Admin">Admin</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-[var(--hp-primary)]"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--hp-primary)] text-white rounded hover:bg-teal-700 transition"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
