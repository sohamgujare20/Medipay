const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  id: { type: String }, // might refer to inventory id
  name: { type: String },
  batch: { type: String },
  qty: { type: Number },
  price: { type: Number }
}, { _id: false });

const billSchema = new mongoose.Schema({
  bill_no: { type: Number, required: true },
  total: { type: Number, required: true },
  payment_mode: { type: String, required: true },
  customer_name: { type: String, default: "Guest" },
  mobile: { type: String },
  days_to_refill: { type: Number },
  items: [itemSchema],
  metadata: { type: Object, default: {} }
}, { timestamps: true });

// Transform output to match Supabase response format (_id -> id)
billSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.created_at = ret.createdAt;
    delete ret._id;
  }
});

module.exports = mongoose.model('Bill', billSchema);
