require('dotenv').config();
const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medipay';

const lowStockMedicines = [
  { name: "Paracetamol 500mg Tablet", category: "Tablets", batch: "B10001", companyName: "Cipla", size: "10 Strip", price: 25.50, qty: 2, expiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) },
  { name: "Amoxicillin 250mg Capsule", category: "Capsules", batch: "B10002", companyName: "Sun Pharma", size: "15 Strip", price: 85.00, qty: 3, expiry: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000) },
  { name: "Cetirizine 10mg Tablet", category: "Tablets", batch: "B10003", companyName: "Dr. Reddy's", size: "10 Strip", price: 32.00, qty: 1, expiry: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000) },
  { name: "Omeprazole 20mg Capsule", category: "Capsules", batch: "B10004", companyName: "Abbott", size: "15 Strip", price: 110.00, qty: 4, expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
  { name: "Azithromycin 500mg Tablet", category: "Tablets", batch: "B10005", companyName: "Lupin", size: "10 Strip", price: 195.00, qty: 2, expiry: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000) },
  { name: "Metformin 500mg Tablet", category: "Tablets", batch: "B10006", companyName: "GSK", size: "30 Bottle", price: 55.00, qty: 5, expiry: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000) },
  { name: "Ibuprofen 100mg Syrup", category: "Syrup", batch: "B10007", companyName: "Pfizer", size: "100ml Bottle", price: 72.00, qty: 1, expiry: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000) },
  { name: "Pantoprazole 40mg Tablet", category: "Tablets", batch: "B10008", companyName: "Torrent", size: "15 Strip", price: 140.00, qty: 3, expiry: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000) },
  { name: "Dexamethasone 4mg Injection", category: "Others", batch: "B10009", companyName: "Sanofi", size: "2ml Ampoule", price: 28.00, qty: 2, expiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
  { name: "Fluticasone 50mg Drops", category: "Others", batch: "B10010", companyName: "Novartis", size: "10ml Bottle", price: 210.00, qty: 4, expiry: new Date(Date.now() + 250 * 24 * 60 * 60 * 1000) },
  { name: "Ciprofloxacin 250mg Tablet", category: "Tablets", batch: "B10011", companyName: "Alkem", size: "10 Strip", price: 65.00, qty: 1, expiry: new Date(Date.now() + 170 * 24 * 60 * 60 * 1000) },
  { name: "Salbutamol 100mg Syrup", category: "Syrup", batch: "B10012", companyName: "Cipla", size: "60ml Bottle", price: 45.00, qty: 3, expiry: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000) },
  { name: "Clindamycin 100mg Ointment", category: "Others", batch: "B10013", companyName: "Abbott", size: "15g Tube", price: 88.00, qty: 2, expiry: new Date(Date.now() + 110 * 24 * 60 * 60 * 1000) },
  { name: "Losartan 50mg Tablet", category: "Tablets", batch: "B10014", companyName: "Intas", size: "30 Bottle", price: 120.00, qty: 5, expiry: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000) },
  { name: "Hydrocortisone 10mg Ointment", category: "Others", batch: "B10015", companyName: "Sun Pharma", size: "30g Tube", price: 55.00, qty: 1, expiry: new Date(Date.now() + 130 * 24 * 60 * 60 * 1000) },
];

const addLowStock = async () => {
  try {
    console.log(`Connecting to: ${mongoURI}`);
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB.');

    console.log('Adding 15 low-stock medicines (qty <= 5)...');
    await Inventory.insertMany(lowStockMedicines);

    const totalCount = await Inventory.countDocuments();
    const lowCount = await Inventory.countDocuments({ qty: { $lte: 5 } });
    console.log(`Done! Total inventory: ${totalCount}, Low stock items: ${lowCount}`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

addLowStock();
