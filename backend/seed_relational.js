require('dotenv').config();
const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');
const Bill = require('./models/Bill');
const Receipt = require('./models/Receipt');
const Analytics = require('./models/Analytics');
const Notification = require('./models/Notification');

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medipay';

const medicineNames = [
  "Paracetamol", "Ibuprofen", "Aspirin", "Amoxicillin", "Cetirizine", "Loratadine", "Omeprazole", "Azithromycin"
];
const categories = ["Tablets", "Syrup", "Capsules", "Supplements", "Injections"];

const seedDB = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB for Relational Seeding');

    // Clear all
    await Inventory.deleteMany({});
    await Bill.deleteMany({});
    await Receipt.deleteMany({});
    await Analytics.deleteMany({});
    await Notification.deleteMany({});

    console.log('Generating 50 medicines...');
    const meds = [];
    for (let i = 0; i < 50; i++) {
        meds.push({
            name: medicineNames[i % medicineNames.length] + (i >= medicineNames.length ? ` ${Math.floor(i / medicineNames.length) + 1}` : ""),
            category: categories[Math.floor(Math.random() * categories.length)],
            batch: `B${Math.floor(Math.random() * 9000) + 1000}`,
            price: Number((Math.random() * 200 + 20).toFixed(2)),
            qty: 100,
            expiry: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)
        });
    }
    const savedInventory = await Inventory.insertMany(meds);
    console.log('Seeded Inventory.');

    console.log('Generating 20 bills & receipts...');
    for (let i = 0; i < 20; i++) {
        const billDate = new Date();
        billDate.setDate(billDate.getDate() - Math.floor(Math.random() * 10)); // spread over last 10 days
        
        const bill = new Bill({
            bill_no: 1000 + i,
            total: 0,
            payment_mode: i % 2 === 0 ? "Cash" : "UPI",
            customer_name: `Customer ${i + 1}`,
            mobile: `98765432${i.toString().padStart(2, '0')}`,
            days_to_refill: 30,
            items: [],
            createdAt: billDate
        });
        const savedBill = await bill.save();
        
        let billTotal = 0;
        const receiptIds = [];
        
        // Add 2-3 items per bill
        const itemCount = Math.floor(Math.random() * 2) + 2;
        for (let j = 0; j < itemCount; j++) {
            const inv = savedInventory[Math.floor(Math.random() * savedInventory.length)];
            const qty = Math.floor(Math.random() * 5) + 1;
            const price = inv.price;
            const subtotal = qty * price;
            
            const receipt = new Receipt({
                billId: savedBill._id,
                inventoryId: inv._id,
                name: inv.name,
                category: inv.category,
                batch: inv.batch,
                qty: qty,
                price: price,
                totalPrice: subtotal,
                date: billDate
            });
            const savedReceipt = await receipt.save();
            receiptIds.push(savedReceipt._id);
            billTotal += subtotal;

            // Update Analytics
            await Analytics.findOneAndUpdate(
                { inventoryId: inv._id },
                { 
                    $inc: { totalUnitsSold: qty, totalRevenue: subtotal },
                    $set: { lastSold: billDate, medicineName: inv.name, category: inv.category },
                    $setOnInsert: { performanceScore: 0 }
                },
                { upsert: true }
            );
        }
        
        savedBill.items = receiptIds;
        savedBill.total = billTotal;
        await savedBill.save();
    }
    console.log('Seeded Bills, Receipts, and Analytics.');

    console.log('SUCCESS: Relational database is ready!');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

seedDB();
