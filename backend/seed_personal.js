require('dotenv').config();
const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');
const Bill = require('./models/Bill');
const Receipt = require('./models/Receipt');
const Analytics = require('./models/Analytics');
const Notification = require('./models/Notification');

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medipay';

const famousIndians = [
  "Virat Kohli", "M.S. Dhoni", "Amitabh Bachchan", "Shah Rukh Khan", 
  "Mary Kom", "Neeraj Chopra", "Sachin Tendulkar", "Deepika Padukone",
  "Priyanka Chopra", "A.R. Rahman", "Ratan Tata", "P.V. Sindhu"
];

const medicineNames = [
  "Crosin 500mg", "Combiflam", "Vicks Action 500", "Strepsils Orange", 
  "Digene Syrup", "Omez 20mg", "Dolo 650", "Pan-D", "Allegra 120mg", "Zifi 200"
];

const categories = ["Tablets", "Syrup", "Capsules", "Supplements", "Injections"];

const companies = ["Cipla", "Abbott", "Sun Pharma", "Lupin", "Dr. Reddy's", "Zydus"];
const sizes = ["10 Tablets", "15 Tablets", "100ml Syrup", "200ml Syrup", "15g Ointment", "Captab 10s"];

const seedDB = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB for Personalized Seeding');

    // Clear all
    await Inventory.deleteMany({});
    await Bill.deleteMany({});
    await Receipt.deleteMany({});
    await Analytics.deleteMany({});
    await Notification.deleteMany({});

    console.log('Generating medicines with ALERT scenarios...');
    const meds = [];
    for (let i = 0; i < 40; i++) {
        const isLowStock = i < 5; // 5 items with low stock
        const isNearExpiry = i >= 5 && i < 10; // 5 items near expiry
        
        let qty = Math.floor(Math.random() * 50) + 20;
        if (isLowStock) qty = Math.floor(Math.random() * 4) + 1;

        let expiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year away
        if (isNearExpiry) {
            expiry = new Date();
            expiry.setDate(expiry.getDate() + Math.floor(Math.random() * 20) + 5); // 5-25 days away
        }

        meds.push({
            name: medicineNames[i % medicineNames.length],
            companyName: companies[i % companies.length],
            size: sizes[i % sizes.length],
            category: categories[Math.floor(Math.random() * categories.length)],
            batch: `IN-${Math.floor(Math.random() * 9000) + 1000}`,
            price: Number((Math.random() * 150 + 10).toFixed(2)),
            qty: qty,
            expiry: expiry
        });
    }
    const savedInventory = await Inventory.insertMany(meds);
    console.log('Seeded Inventory with alerts.');

    console.log('Generating Famous Indian Customer bills...');
    for (let i = 0; i < famousIndians.length; i++) {
        const customerName = famousIndians[i];
        const daysToRefill = (i % 3 === 0) ? 30 : null; // Only some have refill days
        
        const billDate = new Date();
        // Spread dates: some 29 days ago (refill due tomorrow), some 31 days ago (refill was yesterday)
        if (i === 0) billDate.setDate(billDate.getDate() - 29); // Virat: Refill due tomorrow
        else if (i === 1) billDate.setDate(billDate.getDate() - 31); // Dhoni: Refill was yesterday
        else billDate.setDate(billDate.getDate() - Math.floor(Math.random() * 15));

        const bill = new Bill({
            bill_no: 2000 + i,
            total: 0,
            payment_mode: i % 2 === 0 ? "UPI" : "Cash",
            customer_name: customerName,
            mobile: `9${Math.floor(Math.random() * 900000000) + 100000000}`,
            days_to_refill: daysToRefill,
            items: [],
            createdAt: billDate
        });
        const savedBill = await bill.save();
        
        // If refill day is provided, create initial notification (as per user request)
        if (daysToRefill) {
            await new Notification({
                text: `Refill tracking activated for ${customerName} (Bill #${savedBill.bill_no}). Schedule: 30 days.`,
                type: 'system',
                createdAt: billDate
            }).save();
        }

        let billTotal = 0;
        const receiptIds = [];
        const itemCount = 2;

        for (let j = 0; j < itemCount; j++) {
            const inv = savedInventory[Math.floor(Math.random() * savedInventory.length)];
            const qty = Math.floor(Math.random() * 2) + 1;
            const subtotal = qty * inv.price;
            
            const receipt = new Receipt({
                billId: savedBill._id,
                inventoryId: inv._id,
                name: inv.name,
                category: inv.category,
                batch: inv.batch,
                companyName: inv.companyName,
                size: inv.size,
                qty: qty,
                price: inv.price,
                totalPrice: subtotal,
                date: billDate
            });
            const savedReceipt = await receipt.save();
            receiptIds.push(savedReceipt._id);
            billTotal += subtotal;

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
    
    console.log('SUCCESS: Indian personalization seed complete!');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

seedDB();
