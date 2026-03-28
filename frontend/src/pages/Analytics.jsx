import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const salesData = [
  { day: "Mon", sales: 1250 },
  { day: "Tue", sales: 980 },
  { day: "Wed", sales: 1450 },
  { day: "Thu", sales: 1620 },
  { day: "Fri", sales: 1890 },
  { day: "Sat", sales: 2120 },
  { day: "Sun", sales: 950 },
];

const topMedicines = [
  { name: "Paracetamol", sales: 650 },
  { name: "Amoxicillin", sales: 420 },
  { name: "Cough Syrup", sales: 380 },
  { name: "Vitamin D3", sales: 310 },
  { name: "Ibuprofen", sales: 280 },
];

const categorySplit = [
  { name: "Tablets", value: 45 },
  { name: "Capsules", value: 20 },
  { name: "Syrups", value: 15 },
  { name: "Supplements", value: 10 },
  { name: "Others", value: 10 },
];

const COLORS = ["#0f766e", "#0369a1", "#f59e0b", "#ef4444", "#6366f1"];

export default function Analytics() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6 text-[var(--hp-primary)]">
        Analytics
      </h1>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-5 bg-[var(--hp-surface)] rounded-xl shadow-md border hover:shadow-lg transition-shadow">
          <p className="text-gray-500 text-sm">Total Sales</p>
          <h2 className="text-3xl font-bold text-[var(--hp-primary)] mt-2">
            ₹ 10,520
          </h2>
        </div>

        <div className="p-5 bg-[var(--hp-surface)] rounded-xl shadow-md border hover:shadow-lg transition-shadow">
          <p className="text-gray-500 text-sm">Top Medicine</p>
          <h2 className="text-2xl font-semibold text-[var(--hp-accent)] mt-2">
            Paracetamol 500mg
          </h2>
        </div>

        <div className="p-5 bg-[var(--hp-surface)] rounded-xl shadow-md border hover:shadow-lg transition-shadow">
          <p className="text-gray-500 text-sm">Alerts</p>
          <h2 className="text-3xl font-bold text-[var(--hp-warning)] mt-2">
            5
          </h2>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="bg-[var(--hp-surface)] p-4 rounded-lg shadow border col-span-1 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">
            Sales Trend (Last 7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#0f766e"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="bg-[var(--hp-surface)] p-4 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">
            Top 5 Medicines
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topMedicines}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sales" fill="#0369a1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-[var(--hp-surface)] p-4 rounded-lg shadow border lg:col-span-3">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">
            Sales by Category
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categorySplit}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={120}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {categorySplit.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

