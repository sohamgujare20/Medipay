const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', required: true },
  inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  batch: { type: String, required: true },
  companyName: { type: String },
  size: { type: String },
  qty: { type: Number, required: true },
  price: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

// Transform output to match Supabase response format (_id -> id)
receiptSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.created_at = ret.createdAt;
    delete ret._id;
  }
});

module.exports = mongoose.model('Receipt', receiptSchema);
