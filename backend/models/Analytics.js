const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  medicineName: { type: String, required: true },
  category: { type: String, required: true },
  totalUnitsSold: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  lastSold: { type: Date, default: null },
  performanceScore: { type: Number, default: 0 }, // can be revenue * units sold for example
}, { timestamps: true });

// Transform output to match Supabase response format (_id -> id)
analyticsSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.created_at = ret.createdAt;
    delete ret._id;
  }
});

module.exports = mongoose.model('Analytics', analyticsSchema);
