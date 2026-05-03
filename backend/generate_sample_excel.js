const XLSX = require('xlsx');
const path = require('path');

const medicines = [
  { name: "Paracetamol 500mg Tablet", category: "Tablets", batch: "B10234", companyName: "Cipla", size: "10 Strip", price: 35.50, qty: 200, expiry: "2027-06-15" },
  { name: "Amoxicillin 250mg Capsule", category: "Capsules", batch: "B10235", companyName: "Abbott", size: "15 Strip", price: 120.00, qty: 150, expiry: "2027-03-20" },
  { name: "Cetirizine 10mg Tablet", category: "Tablets", batch: "B10236", companyName: "Sun Pharma", size: "10 Strip", price: 45.00, qty: 300, expiry: "2028-01-10" },
  { name: "Omeprazole 20mg Capsule", category: "Capsules", batch: "B10237", companyName: "Dr. Reddy's", size: "15 Strip", price: 85.00, qty: 180, expiry: "2027-09-25" },
  { name: "Azithromycin 500mg Tablet", category: "Tablets", batch: "B10238", companyName: "Lupin", size: "3 Strip", price: 95.00, qty: 100, expiry: "2027-12-01" },
  { name: "Metformin 500mg Tablet", category: "Tablets", batch: "B10239", companyName: "GSK", size: "30 Bottle", price: 55.00, qty: 250, expiry: "2028-05-18" },
  { name: "Pantoprazole 40mg Tablet", category: "Tablets", batch: "B10240", companyName: "Torrent", size: "15 Strip", price: 110.00, qty: 90, expiry: "2027-08-30" },
  { name: "Ibuprofen 400mg Tablet", category: "Tablets", batch: "B10241", companyName: "Pfizer", size: "10 Strip", price: 40.00, qty: 175, expiry: "2027-11-12" },
  { name: "Cough Syrup DX", category: "Syrup", batch: "B10242", companyName: "Cipla", size: "100ml Bottle", price: 75.00, qty: 60, expiry: "2027-04-05" },
  { name: "Salbutamol 100mcg Inhaler", category: "Others", batch: "B10243", companyName: "GSK", size: "200 Doses", price: 220.00, qty: 40, expiry: "2028-02-28" },
  { name: "Doxycycline 100mg Capsule", category: "Capsules", batch: "B10244", companyName: "Abbott", size: "10 Strip", price: 130.00, qty: 85, expiry: "2027-07-14" },
  { name: "Amlodipine 5mg Tablet", category: "Tablets", batch: "B10245", companyName: "Novartis", size: "30 Bottle", price: 65.00, qty: 200, expiry: "2028-03-22" },
  { name: "Losartan 50mg Tablet", category: "Tablets", batch: "B10246", companyName: "Sanofi", size: "15 Strip", price: 90.00, qty: 160, expiry: "2027-10-08" },
  { name: "Atorvastatin 10mg Tablet", category: "Tablets", batch: "B10247", companyName: "Alkem", size: "10 Strip", price: 70.00, qty: 140, expiry: "2028-06-01" },
  { name: "Clindamycin 300mg Capsule", category: "Capsules", batch: "B10248", companyName: "Intas", size: "10 Strip", price: 185.00, qty: 55, expiry: "2027-05-20" },
  { name: "Montelukast 10mg Tablet", category: "Tablets", batch: "B10249", companyName: "Sun Pharma", size: "15 Strip", price: 145.00, qty: 110, expiry: "2028-04-15" },
  { name: "Betadine Ointment", category: "Others", batch: "B10250", companyName: "Abbott", size: "15g Tube", price: 60.00, qty: 75, expiry: "2028-08-10" },
  { name: "Ciprofloxacin 500mg Tablet", category: "Tablets", batch: "B10251", companyName: "Cipla", size: "10 Strip", price: 98.00, qty: 130, expiry: "2027-12-25" },
  { name: "Ranitidine 150mg Tablet", category: "Tablets", batch: "B10252", companyName: "Dr. Reddy's", size: "30 Bottle", price: 42.00, qty: 220, expiry: "2027-09-01" },
  { name: "Vitamin D3 60K IU Capsule", category: "Capsules", batch: "B10253", companyName: "Abbott", size: "4 Strip", price: 160.00, qty: 95, expiry: "2028-07-30" },
];

const ws = XLSX.utils.json_to_sheet(medicines);

// Auto-size columns
const colWidths = Object.keys(medicines[0]).map(key => ({
  wch: Math.max(key.length, ...medicines.map(m => String(m[key]).length)) + 2
}));
ws['!cols'] = colWidths;

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Medicines");

const outputPath = path.join(__dirname, '..', 'sample_medicines.xlsx');
XLSX.writeFile(wb, outputPath);
console.log(`✅ Sample Excel file created at: ${outputPath}`);
console.log(`   Contains ${medicines.length} medicines with columns: ${Object.keys(medicines[0]).join(', ')}`);
