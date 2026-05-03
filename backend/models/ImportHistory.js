const mongoose = require('mongoose');

const importHistorySchema = new mongoose.Schema({
  sourceName: { type: String, required: true }, // filename or "AI Camera", "AI Upload", "AI Text: <query>"
  sourceType: { type: String, enum: ['file', 'ai-camera', 'ai-upload', 'ai-text'], required: true },
  medicines: [{
    name: { type: String, required: true },
    category: { type: String, default: 'General' },
    batch: { type: String },
    qty: { type: Number },
    price: { type: Number },
    expiry: { type: Date },
    size: { type: String },
    companyName: { type: String },
    status: { type: String, enum: ['imported', 'skipped'], default: 'imported' },
    reason: { type: String, default: '' }
  }],
  totalCount: { type: Number, default: 0 },
  importedCount: { type: Number, default: 0 },
  importedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ImportHistory', importHistorySchema);
