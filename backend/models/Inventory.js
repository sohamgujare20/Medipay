const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  batch: { type: String, required: true },
  price: { type: Number, required: true },
  qty: { type: Number, required: true },
  expiry: { type: Date }
}, { timestamps: true });

// Transform output to match Supabase response format (_id -> id)
inventorySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.created_at = ret.createdAt;
    delete ret._id;
  }
});

module.exports = mongoose.model('Inventory', inventorySchema);
