require('dotenv').config();
const mongoose = require('mongoose');
const Authentication = require('./models/Authentication');

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medipay';

async function seedUser() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing to avoid duplicates if re-running
    await Authentication.deleteMany({ username: 'cashier' });

    const cashier = new Authentication({
      username: 'cashier',
      password: '1234', // Simply 1234 as requested
      role: 'Cashier',
      status: 'Active'
    });

    await cashier.save();
    console.log('✅ Cashier user created successfully!');
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedUser();
