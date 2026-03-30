require('dotenv').config();
const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medipay';

const medicineNames = [
  "Paracetamol", "Ibuprofen", "Aspirin", "Amoxicillin", "Cetirizine", "Loratadine", "Omeprazole", "Azithromycin", "Ciprofloxacin", "Metformin",
  "Pantoprazole", "Ranitidine", "Amlodipine", "Losartan", "Atorvastatin", "Lisinopril", "Metoprolol", "Simvastatin", "Rosuvastatin", "Levothyroxine",
  "Gabapentin", "Sertraline", "Alprazolam", "Fluoxetine", "Citalopram", "Escitalopram", "Clonazepam", "Lorazepam", "Diazepam", "Tramadol",
  "Oxycodone", "Hydrocodone", "Codeine", "Morphine", "Fentanyl", "Methadone", "Buprenorphine", "Naloxone", "Suboxone", "Naltrexone",
  "Epinephrine", "Ketamine", "Propofol", "Midazolam", "Dexmedetomidine", "Thiopental", "Etomidate", "Isoflurane", "Sevoflurane", "Desflurane",
  "Nitrous Oxide", "Halothane", "Enflurane", "Methoxyflurane", "Ether", "Chloroform", "Cyclopropane", "Xenon", "Argon", "Krypton",
  "Neodymium", "Helium", "Neon", "Radon", "Oganesson", "Flerovium", "Livermorium", "Moscovium", "Tennessine", "Nihonium",
  "Copernicium", "Roentgenium", "Darmstadtium", "Meitnerium", "Hassium", "Bohrium", "Seaborgium", "Dubnium", "Jellium", "Rutherfordium"
];

const categories = ["Tablets", "Syrup", "Capsules", "Supplements", "Injections"];

const generateMedicines = (count) => {
  const meds = [];
  for (let i = 0; i < count; i++) {
    const name = medicineNames[i % medicineNames.length] + (i >= medicineNames.length ? ` ${Math.floor(i / medicineNames.length) + 1}` : "");
    const batch = `B${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const price = Number((Math.random() * 500 + 10).toFixed(2));
    const qty = Math.floor(Math.random() * 200) + 1;
    
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + Math.floor(Math.random() * 24) - 2); // mostly future, some expired

    const category = categories[Math.floor(Math.random() * categories.length)];

    meds.push({ name, category, batch, price, qty, expiry });
  }
  return meds;
};

const seedDB = async () => {
  try {
    console.log(`Connecting to: ${mongoURI}`);
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB for Seeding');

    console.log('Clearing existing inventory...');
    await Inventory.deleteMany({});

    console.log('Generating 100 medicines...');
    const medicinesToInsert = generateMedicines(100);

    console.log('Inserting medicines...');
    await Inventory.insertMany(medicinesToInsert);

    console.log('Successfully seeded 100 medicines into the database!');
  } catch (err) {
    console.log('--- SEEDING ERROR ---');
    console.log(err.message);
    if (err.reason) console.log('REASON:', err.reason);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

seedDB();
