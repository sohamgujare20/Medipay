require('dotenv').config();
const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medipay';

const baseMedicines = [
  "Paracetamol", "Ibuprofen", "Aspirin", "Amoxicillin", "Cetirizine", "Loratadine", "Omeprazole", "Azithromycin", "Ciprofloxacin", "Metformin",
  "Pantoprazole", "Ranitidine", "Amlodipine", "Losartan", "Atorvastatin", "Lisinopril", "Metoprolol", "Simvastatin", "Rosuvastatin", "Levothyroxine",
  "Gabapentin", "Sertraline", "Alprazolam", "Fluoxetine", "Citalopram", "Escitalopram", "Clonazepam", "Lorazepam", "Diazepam", "Tramadol",
  "Oxycodone", "Hydrocodone", "Codeine", "Morphine", "Fentanyl", "Methadone", "Buprenorphine", "Naloxone", "Suboxone", "Naltrexone",
  "Epinephrine", "Montelukast", "Fluticasone", "Salbutamol", "Albuterol", "Prednisone", "Dexamethasone", "Hydrocortisone", "Clindamycin", "Doxycycline"
];

const formulations = ["Tablet", "Capsule", "Syrup", "Injection", "Ointment", "Drops"];
const dosages = ["10mg", "20mg", "50mg", "100mg", "250mg", "500mg"];
const companies = ["Cipla", "Sun Pharma", "Abbott", "Dr. Reddy's", "Lupin", "GSK", "Pfizer", "Novartis", "Sanofi", "Alkem", "Torrent", "Intas"];

const getSizes = (form) => {
  switch(form) {
    case "Tablet":
    case "Capsule": return ["10 Strip", "15 Strip", "30 Bottle", "100 Bottle"];
    case "Syrup": return ["60ml Bottle", "100ml Bottle", "200ml Bottle"];
    case "Injection": return ["1ml Ampoule", "2ml Ampoule", "5ml Vial", "10ml Vial"];
    case "Ointment": return ["10g Tube", "15g Tube", "30g Tube", "50g Tube"];
    case "Drops": return ["5ml Bottle", "10ml Bottle", "15ml Bottle"];
    default: return ["Standard"];
  }
}

const generateMedicines = (count) => {
  const meds = [];
  for (let i = 0; i < count; i++) {
    const base = baseMedicines[Math.floor(Math.random() * baseMedicines.length)];
    const form = formulations[Math.floor(Math.random() * formulations.length)];
    const dose = dosages[Math.floor(Math.random() * dosages.length)];
    const companyName = companies[Math.floor(Math.random() * companies.length)];
    
    const sizesForForm = getSizes(form);
    const size = sizesForForm[Math.floor(Math.random() * sizesForForm.length)];
    
    const name = `${base} ${dose} ${form}`;
    const batch = `B${Math.floor(Math.random() * 90000 + 10000).toString()}`;
    const price = Number((Math.random() * 500 + 10).toFixed(2));
    const qty = Math.floor(Math.random() * 500) + 10;
    
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + Math.floor(Math.random() * 36) - 1);

    const category = form === "Tablet" ? "Tablets" : form === "Capsule" ? "Capsules" : form === "Syrup" ? "Syrup" : "Others";
    
    meds.push({ name, category, batch, price, qty, expiry, companyName, size });
  }
  return meds;
};

const seedDB = async () => {
  try {
    console.log(`Connecting to: ${mongoURI}`);
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB.');

    console.log('Clearing existing inventory...');
    await Inventory.deleteMany({});

    console.log('Generating exactly 500 medicines...');
    const medicinesToInsert = generateMedicines(500);

    console.log('Inserting medicines into database...');
    await Inventory.insertMany(medicinesToInsert);

    console.log('Successfully seeded 500 medicines into your inventory!');
  } catch (err) {
    console.error('--- SEEDING ERROR ---');
    console.error(err.message);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

seedDB();
