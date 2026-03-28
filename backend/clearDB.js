require('dotenv').config();
const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');
const Bill = require('./models/Bill');
const Reminder = require('./models/Reminder');

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medipay';

const clearDB = async () => {
  try {
    console.log(`Connecting to: ${mongoURI}`);
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB for Cleanup');

    console.log('Clearing all dummy inventory, bills, and reminders...');
    const delInv = await Inventory.deleteMany({});
    const delBills = await Bill.deleteMany({});
    const delReminders = await Reminder.deleteMany({});

    console.log(`Successfully deleted ${delInv.deletedCount} inventories.`);
    console.log(`Successfully deleted ${delBills.deletedCount} bills.`);
    console.log(`Successfully deleted ${delReminders.deletedCount} reminders.`);
    console.log('Database is now completely clean and ready for real data!');

  } catch (err) {
    console.error('--- CLEANUP ERROR ---');
    console.error(err.message);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

clearDB();
