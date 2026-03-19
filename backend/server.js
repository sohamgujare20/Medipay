require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Inventory = require('./models/Inventory');
const Bill = require('./models/Bill');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medipay';
mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// --- Inventory Endpoints ---

// Get all inventory
app.get('/api/inventory', async (req, res) => {
  try {
    const items = await Inventory.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add medicine
app.post('/api/inventory', async (req, res) => {
  try {
    const newItem = new Inventory(req.body);
    const saved = await newItem.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update medicine
app.put('/api/inventory/:id', async (req, res) => {
  try {
    const updated = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete medicine
app.delete('/api/inventory/:id', async (req, res) => {
  if (req.params.id === 'expired') {
    try {
      const today = new Date();
      today.setHours(0,0,0,0);
      const result = await Inventory.deleteMany({ expiry: { $lt: today } });
      return res.json({ success: true, deletedCount: result.deletedCount });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  try {
    const del = await Inventory.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ error: "Not found" });
    res.json(del);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Bills Endpoints ---

// Send Mock SMS Receipt
app.post('/api/bills/sms', async (req, res) => {
  try {
    const { customer_name, mobile, bill_no, items, total } = req.body;
    
    console.log(`\n===========================================`);
    console.log(`[SMS RECEIPT] Sending to ${mobile}...`);
    console.log(`Dear ${customer_name || 'Customer'}, your Bill #${bill_no} for ₹${total} has been generated.`);
    console.log(`Items purchased:`);
    if (items && items.length) {
      items.forEach(item => {
        console.log(` - ${item.name} (${item.qty} x ₹${item.price})`);
      });
    }
    console.log(`Thank you for visiting MediStore!`);
    console.log(`===========================================\n`);

    res.json({ success: true, message: "SMS sent successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all bills
app.get('/api/bills', async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate/Create a Bill AND reduce inventory
app.post('/api/bills', async (req, res) => {
  try {
    const { items, ...billData } = req.body;
    
    // Auto-generate Bill No if not exactly specified
    if (!billData.bill_no) {
      const lastBill = await Bill.findOne().sort({ bill_no: -1 });
      billData.bill_no = lastBill && lastBill.bill_no ? lastBill.bill_no + 1 : 1;
    }

    const actualDeductedItems = [];

    // Reduce inventory stringently using FEFO (First-Expired-First-Out)
    for (const item of items) {
      if (!item.name || !item.qty) continue;
      let qtyToDeduct = item.qty;

      // Find all batches for this medicine name, sorted by expiry ascending (nearest expiry first)
      // null expiries come last ideally, but ascending date puts oldest dates first.
      const batches = await Inventory.find({ name: item.name }).sort({ expiry: 1 });

      for (let b of batches) {
        if (qtyToDeduct <= 0) break;
        
        if (b.qty > 0) {
          const deduct = Math.min(b.qty, qtyToDeduct);
          b.qty -= deduct;
          qtyToDeduct -= deduct;
          await b.save();

          // Push the EXACT batch that was deducted to the receipt
          actualDeductedItems.push({
            id: b._id.toString(),
            name: b.name,
            batch: b.batch,
            qty: deduct,
            price: b.price || item.price
          });
        }
      }

      // If there's leftover qtyToDeduct (insufficient stock), log it anyway to balance the total
      if (qtyToDeduct > 0) {
        actualDeductedItems.push({
          ...item,
          qty: qtyToDeduct,
          batch: "OUT_OF_STOCK"
        });
      }
    }

    const newBill = new Bill({ ...billData, items: actualDeductedItems });
    const savedBill = await newBill.save();

    // Cancel old reminders for the same mobile when a new bill is created early
    if (savedBill.mobile) {
      await Bill.updateMany(
        { 
          mobile: savedBill.mobile, 
          _id: { $ne: savedBill._id } 
        },
        { 
          $set: { "metadata.reminders_cancelled": true } 
        }
      );
    }

    res.status(201).json(savedBill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update Bill Metadata (for reminders)
app.put('/api/bills/:id/metadata', async (req, res) => {
  try {
    const { metadata } = req.body;
    const updated = await Bill.findByIdAndUpdate(
      req.params.id, 
      { metadata }, 
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Bill
app.delete('/api/bills/:id', async (req, res) => {
  try {
    const del = await Bill.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ error: "Not found" });
    res.json(del);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Automated Reminders Cron Simulation ---
// Runs every 1 minute to check for bills that need reminders
setInterval(async () => {
  try {
    const bills = await Bill.find({ 
      days_to_refill: { $exists: true, $ne: null },
      "metadata.reminders_cancelled": { $ne: true }
    });
    
    const now = new Date();
    
    for (const bill of bills) {
      const createdAt = new Date(bill.createdAt || bill.created_at || now);
      if(isNaN(createdAt.getTime())) continue;

      const refillDate = new Date(createdAt);
      refillDate.setDate(refillDate.getDate() + bill.days_to_refill);
      
      const diffMs = refillDate - now;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      
      const md = bill.metadata || {};
      
      // 1 Day Before (-1 day) logic
      if (diffDays <= 1 && diffDays > 0 && !md.sms_1day_before) {
        console.log(`\n[AUTO-SMS] 📢 REMINDER SENT TO ${bill.mobile}: Dear ${bill.customer_name}, your refill for Bill #${bill.bill_no} is due tomorrow! We are waiting for you at MediStore.\n`);
        await Bill.findByIdAndUpdate(bill._id, { $set: { "metadata.sms_1day_before": true } });
      }
      
      // 1 Day After (+1 day) logic
      if (diffDays <= -1 && diffDays > -2 && !md.sms_1day_after) {
        console.log(`\n[AUTO-SMS] 📢 REMINDER SENT TO ${bill.mobile}: Dear ${bill.customer_name}, your refill for Bill #${bill.bill_no} was due yesterday. Please visit MediStore soon!\n`);
        await Bill.findByIdAndUpdate(bill._id, { $set: { "metadata.sms_1day_after": true } });
      }
    }
  } catch(err) {
    console.error("Cron simulation error:", err.message);
  }
}, 60 * 1000);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
