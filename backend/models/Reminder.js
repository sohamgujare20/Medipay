const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  dueDate: { type: Date }
}, { timestamps: true });

// Transform output to match Supabase response format (_id -> id)
reminderSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.created_at = ret.createdAt;
    delete ret._id;
  }
});

module.exports = mongoose.model('Reminder', reminderSchema);
