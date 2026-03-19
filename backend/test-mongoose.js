const mongoose = require('mongoose');
const fs = require('fs');

async function test() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/medipay', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 2000
    });
    fs.writeFileSync('mongoose-err.txt', 'SUCCESS');
    process.exit(0);
  } catch (err) {
    fs.writeFileSync('mongoose-err.txt', err.message);
    process.exit(1);
  }
}

test();
