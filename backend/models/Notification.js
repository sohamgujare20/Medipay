const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  text: { type: String, required: true },
  message: { type: String }, // Store the actual SMS/WhatsApp content
  type: { type: String, enum: ['system', 'message'], default: 'system' },
  completed: { type: Boolean, default: false },
  dueDate: { type: Date }
}, { timestamps: true });

// Transform output to match Supabase response format (_id -> id)
notificationSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.created_at = ret.createdAt;
    delete ret._id;
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
