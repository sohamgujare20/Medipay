require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Inventory = require('./models/Inventory');
const Bill = require('./models/Bill');
const Notification = require('./models/Notification');
const Receipt = require('./models/Receipt');
const Analytics = require('./models/Analytics');
const MessagingService = require('./services/MessagingService');


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
    const bills = await Bill.find()
      .populate('items')
      .sort({ createdAt: -1 });
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

    // Step 1: Create the Bill Header
    const newBill = new Bill({ ...billData, items: [] });
    const savedBill = await newBill.save();

    const receiptIds = [];

    // Step 2: Process each item
    for (const item of items) {
      if (!item.name || !item.qty) continue;
      let qtyToDeduct = item.qty;

      // Find all batches for this medicine name, sorted by expiry ascending
      const batches = await Inventory.find({ name: item.name }).sort({ expiry: 1 });

      for (let b of batches) {
        if (qtyToDeduct <= 0) break;
        
        if (b.qty > 0) {
          const deduct = Math.min(b.qty, qtyToDeduct);
          b.qty -= deduct;
          qtyToDeduct -= deduct;
          await b.save();

          // Create Receipt record
          const receipt = new Receipt({
            billId: savedBill._id,
            inventoryId: b._id,
            name: b.name,
            category: b.category || "Others",
            batch: b.batch,
            companyName: b.companyName,
            size: b.size,
            qty: deduct,
            price: b.price || item.price,
            totalPrice: deduct * (b.price || item.price),
            date: savedBill.createdAt
          });
          const savedReceipt = await receipt.save();
          receiptIds.push(savedReceipt._id);

          // Update Analytics Performance
          await Analytics.findOneAndUpdate(
            { inventoryId: b._id },
            { 
              $inc: { totalUnitsSold: deduct, totalRevenue: deduct * (b.price || item.price) },
              $set: { lastSold: new Date(), medicineName: b.name, category: b.category || "Others" },
              $setOnInsert: { performanceScore: 0 }
            },
            { upsert: true, new: true }
          );
        }
      }

      // Handle Out of Stock case (log it as a receipt too but maybe with a flag or specific mark)
      if (qtyToDeduct > 0) {
        const receipt = new Receipt({
          billId: savedBill._id,
          inventoryId: new mongoose.Types.ObjectId(), // dummy or specific ID
          name: item.name,
          category: "Unknown",
          batch: "OUT_OF_STOCK",
          qty: qtyToDeduct,
          price: item.price,
          totalPrice: qtyToDeduct * item.price,
          date: savedBill.createdAt
        });
        const savedReceipt = await receipt.save();
        receiptIds.push(savedReceipt._id);
      }
    }

    // Step 3: Link items back to Bill
    savedBill.items = receiptIds;
    await savedBill.save();

    // Cancel old reminders for the same mobile
    if (savedBill.mobile) {
      await Bill.updateMany(
        { mobile: savedBill.mobile, _id: { $ne: savedBill._id } },
        { $set: { "metadata.reminders_cancelled": true } }
      );
    }

    // --- NEW: Conditional Notification Storage ---
    if (savedBill.days_to_refill) {
      await Notification.create({
        text: `Refill tracking STARTED for ${savedBill.customer_name} (Bill #${savedBill.bill_no})`,
        type: 'system',
        completed: false
      });
      console.log(`[SYSTEM] Refill notification ACTIVATED for ${savedBill.customer_name}`);
    }

    res.status(201).json(savedBill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Analytics Endpoints ---
app.get('/api/analytics', async (req, res) => {
  try {
    const stats = await Analytics.find().sort({ totalRevenue: -1 });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics/receipts', async (req, res) => {
  try {
    const receipts = await Receipt.find().sort({ createdAt: -1 });
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// --- Notifications Endpoints ---
app.get('/api/notifications', async (req, res) => {
  try {
    const items = await Notification.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const newItem = new Notification(req.body);
    const saved = await newItem.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/notifications/:id', async (req, res) => {
  try {
    const updated = await Notification.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const del = await Notification.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ error: "Not found" });
    res.json(del);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
        const sms = await MessagingService.sendRefillReminder(bill.customer_name, bill.mobile, bill.days_to_refill, false, bill.bill_no);
        await Bill.findByIdAndUpdate(bill._id, { $set: { "metadata.sms_1day_before": true } });
        await Notification.create({ 
          text: `Auto-SMS Sent: Refill due tomorrow for ${bill.customer_name} 📱`, 
          message: sms.message,
          type: 'message',
          completed: true 
        });
      }
      
      // 1 Day After (+1 day) logic
      if (diffDays <= -1 && diffDays > -2 && !md.sms_1day_after) {
        const sms = await MessagingService.sendRefillReminder(bill.customer_name, bill.mobile, bill.days_to_refill, true, bill.bill_no);
        await Bill.findByIdAndUpdate(bill._id, { $set: { "metadata.sms_1day_after": true } });
        await Notification.create({ 
          text: `Auto-SMS Alert: Refill OVERDUE for ${bill.customer_name} 📞`, 
          message: sms.message,
          type: 'message',
          completed: true 
        });
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
