const mongoose = require('mongoose');

const authenticationSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Cashier' },
  lastLogin: { type: Date },
  status: { type: String, default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Authentication', authenticationSchema);
