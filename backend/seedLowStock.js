require('dotenv').config();
const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medipay';

const seedLowStock = async () => {
  try {
    console.log(`Connecting to: ${mongoURI}`);
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB. Pushing low stock alerts...');

    const lowStockMeds = [
      {
        name: "Insulin Glargine Pen",
        category: "Injections",
        batch: "B90112",
        price: 850.50,
        qty: 3,  // LOW STOCK
        expiry: new Date(new Date().setDate(new Date().getDate() + 15)) // Expires in 15 days
      },
      {
        name: "EpiPen Auto-Injector",
        category: "Injections",
        batch: "B92334",
        price: 3200.00,
        qty: 1,  // CRITICAL LOW STOCK
        expiry: new Date(new Date().setMonth(new Date().getMonth() + 4))
      },
      {
        name: "Asthma Inhaler (Salbutamol)",
        category: "Supplements",
        batch: "B44321",
        price: 450.00,
        qty: 4,  // LOW STOCK
        expiry: new Date(new Date().setDate(new Date().getDate() + 5)) // Expires in 5 days
      },
      {
        name: "Covid Test Kit",
        category: "Others",
        batch: "B10011",
        price: 250.00,
        qty: 8,  // LOW STOCK
        expiry: new Date(new Date().setMonth(new Date().getMonth() + 1))
      },
      {
        name: "High-Dose Vitamin D3 (60K IU)",
        category: "Supplements",
        batch: "B55543",
        price: 150.00,
        qty: 2,  // CRITICAL LOW STOCK
        expiry: new Date(new Date().setDate(new Date().getDate() + 60))
      }
    ];

    await Inventory.insertMany(lowStockMeds);
    console.log('Successfully inserted 5 low-stock alert medicines into your inventory!');
  } catch (err) {
    console.error('--- SEEDING ERROR ---');
    console.error(err.message);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

seedLowStock();
