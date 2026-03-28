// src/api.js
const API_URL = "http://localhost:5000/api";

export const api = {
  inventory: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/inventory`);
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
    create: async (data) => {
      const res = await fetch(`${API_URL}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create inventory");
      return res.json();
    },
    update: async (id, data) => {
      const res = await fetch(`${API_URL}/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to update inventory");
      return res.json();
    },
    delete: async (id) => {
      const res = await fetch(`${API_URL}/inventory/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete inventory");
      return res.json();
    },
    deleteExpired: async () => {
      const res = await fetch(`${API_URL}/inventory/expired`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete expired inventory");
      return res.json();
    }
  },
  bills: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/bills`);
      if (!res.ok) throw new Error("Failed to fetch bills");
      return res.json();
    },
    create: async (data) => {
      const res = await fetch(`${API_URL}/bills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create bill");
      return res.json();
    },
    updateMetadata: async (id, metadata) => {
      const res = await fetch(`${API_URL}/bills/${id}/metadata`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata })
      });
      if (!res.ok) throw new Error("Failed to update bill metadata");
      return res.json();
    },
    delete: async (id) => {
      const res = await fetch(`${API_URL}/bills/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete bill");
      return res.json();
    },
    sendSms: async (data) => {
      const res = await fetch(`${API_URL}/bills/sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to send sms");
      return res.json();
    }
  },
  reminders: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/reminders`);
      if (!res.ok) throw new Error("Failed to fetch reminders");
      return res.json();
    },
    create: async (data) => {
      const res = await fetch(`${API_URL}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create reminder");
      return res.json();
    },
    update: async (id, data) => {
      const res = await fetch(`${API_URL}/reminders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to update reminder");
      return res.json();
    },
    delete: async (id) => {
      const res = await fetch(`${API_URL}/reminders/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete reminder");
      return res.json();
    }
  }
};
