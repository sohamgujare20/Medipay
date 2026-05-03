const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const multer = require('multer');
const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

const Inventory = require('./models/Inventory');
const Bill = require('./models/Bill');
const Notification = require('./models/Notification');
const Receipt = require('./models/Receipt');
const Analytics = require('./models/Analytics');
const Authentication = require('./models/Authentication');
const ImportHistory = require('./models/ImportHistory');
const MessagingService = require('./services/MessagingService');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medipay';
mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// --- Auth Endpoints ---
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await Authentication.findOne({ username, password });
    
    if (user) {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      
      res.json({
        success: true,
        user: {
          id: user._id,
          username: user.username,
          role: user.role,
          lastLogin: user.lastLogin
        }
      });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AI Vision Analysis Endpoint ---

app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { image, text } = req.body;
    if (!image && !text) return res.status(400).json({ error: 'No image or text provided' });

    const apiKey = process.env.NVIDIA_API_KEY;
    const baseURL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';

    if (!apiKey) return res.status(500).json({ error: 'NVIDIA API key not configured' });

    // --- TEXT-BASED QUERY ---
    if (text && !image) {
      const textPrompt = `You are a pharmaceutical AI assistant. A pharmacist is searching for information about: "${text}"

Return ONLY valid JSON, no markdown, no code fences, no extra text, no thinking tags.

JSON format:
{
  "medicines": [
    {
      "name": "Full medicine name with dosage",
      "usage": "What this medicine is used for (2-3 sentences)",
      "dosage": "Recommended dosage instructions",
      "sideEffects": "Common side effects (brief)",
      "alternatives": [
        { "name": "Alternative medicine name", "reason": "Why this is a good alternative (1 sentence)" },
        { "name": "Alternative medicine 2", "reason": "Why this is a good alternative" }
      ]
    }
  ]
}

Provide detailed information about the medicine "${text}" and suggest 2-3 alternatives. If the name is ambiguous, provide the most likely match.`;

      const textResponse = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'meta/llama-4-maverick-17b-128e-instruct',
          messages: [{ role: 'user', content: textPrompt }],
          max_tokens: 2048,
          temperature: 0.3
        })
      });

      if (!textResponse.ok) return res.status(500).json({ error: 'AI service unavailable' });

      const textData = await textResponse.json();
      let content = textData.choices?.[0]?.message?.content || '';
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try {
        const parsed = JSON.parse(content);
        return res.json({ ...parsed, source: 'deepseek-text' });
      } catch {
        return res.json({
          medicines: [{ name: text, usage: content.substring(0, 300), dosage: 'Consult doctor', sideEffects: 'N/A', alternatives: [] }],
          source: 'deepseek-raw'
        });
      }
    }

    // --- IMAGE-BASED QUERY ---

    const prompt = `You are a pharmaceutical AI assistant. Analyze this medicine image and return a JSON response.

IMPORTANT: Return ONLY valid JSON, no markdown, no code fences, no extra text.

JSON format:
{
  "medicines": [
    {
      "name": "Medicine Name with dosage",
      "usage": "What this medicine is used for (2-3 sentences)",
      "dosage": "Recommended dosage instructions",
      "sideEffects": "Common side effects (brief)",
      "alternatives": [
        {
          "name": "Alternative medicine name",
          "reason": "Why this is a good alternative (1 sentence)"
        }
      ]
    }
  ]
}

Identify ALL medicines visible in the image. For each, provide 2-3 alternative medicines. If you cannot identify specific medicines, make your best educated guess based on packaging, color, and shape.`;

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta/llama-4-maverick-17b-128e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: image } }
            ]
          }
        ],
        max_tokens: 2048,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('NVIDIA API Error:', response.status, errText);
      
      // Fallback: try text-only DeepSeek model
      const fallbackResponse = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-ai/deepseek-r1',
          messages: [
            {
              role: 'user',
              content: `You are a pharmaceutical AI assistant. A pharmacist has captured an image of medicine packaging. Since I cannot show the image, please provide information about 2 common medicines typically found in Indian pharmacies.

Return ONLY valid JSON, no markdown, no code fences, no extra text, no thinking tags.

JSON format:
{
  "medicines": [
    {
      "name": "Medicine Name with dosage",
      "usage": "What this medicine is used for (2-3 sentences)",
      "dosage": "Recommended dosage",
      "sideEffects": "Common side effects",
      "alternatives": [
        { "name": "Alternative name", "reason": "Why it is alternative" },
        { "name": "Alternative name 2", "reason": "Why it is alternative" }
      ]
    }
  ]
}`
            }
          ],
          max_tokens: 2048,
          temperature: 0.3
        })
      });

      if (!fallbackResponse.ok) {
        return res.status(500).json({ error: 'AI service unavailable' });
      }

      const fallbackData = await fallbackResponse.json();
      let content = fallbackData.choices?.[0]?.message?.content || '';
      // Clean up thinking tags and markdown fences
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try {
        const parsed = JSON.parse(content);
        return res.json({ ...parsed, source: 'deepseek-fallback' });
      } catch {
        return res.json({
          medicines: [{
            name: 'Unable to parse AI response',
            usage: content.substring(0, 300),
            dosage: 'Consult doctor',
            sideEffects: 'N/A',
            alternatives: []
          }],
          source: 'deepseek-raw'
        });
      }
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';
    // Clean up
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const parsed = JSON.parse(content);
      res.json({ ...parsed, source: 'nvidia-vision' });
    } catch {
      res.json({
        medicines: [{
          name: 'AI Analysis Result',
          usage: content.substring(0, 500),
          dosage: 'See details above',
          sideEffects: 'Consult pharmacist',
          alternatives: []
        }],
        source: 'nvidia-raw'
      });
    }
  } catch (err) {
    console.error('AI Analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Inventory Endpoints ---

// Get all inventory
app.get('/api/inventory', async (req, res) => {
  try {
    const items = await Inventory.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get medicine by name (exact)
app.get('/api/inventory/medicine', async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: "Medicine name is required" });
    
    const escapedName = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const item = await Inventory.findOne({ 
      name: { $regex: new RegExp(`^\\s*${escapedName}\\s*$`, 'i') } 
    });
    
    if (!item) return res.status(404).json({ error: "Medicine not found in inventory" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
function getExactMatchQuery(doc) {
  const query = { name: { $regex: new RegExp(`^${doc.name}$`, 'i') } };
  const fields = ['category', 'batch', 'companyName', 'size', 'price', 'qty'];
  fields.forEach(f => {
    if (doc[f] !== undefined) query[f] = doc[f];
  });
  return query;
}

// Add medicine
app.post('/api/inventory', async (req, res) => {
  try {
    const existing = await Inventory.findOne(getExactMatchQuery(req.body));
    if (existing) {
      return res.status(400).json({ error: "Medicine already exists in inventory." });
    }

    const newItem = new Inventory(req.body);
    const saved = await newItem.save();

    // Log to history for manual additions
    const historyEntry = new ImportHistory({
      sourceName: 'Manual Entry',
      sourceType: 'ai-text',
      medicines: [{ 
        name: saved.name, 
        status: 'imported', 
        reason: 'Manually added',
        category: saved.category,
        batch: saved.batch,
        qty: saved.qty,
        price: saved.price,
        expiry: saved.expiry,
        size: saved.size,
        companyName: saved.companyName
      }],
      totalCount: 1,
      importedCount: 1
    });
    await historyEntry.save();

    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add medicine from AI and log history
app.post('/api/inventory/ai-save', async (req, res) => {
  try {
    const { sourceName, sourceType, ...inventoryData } = req.body;
    
    const existing = await Inventory.findOne(getExactMatchQuery(inventoryData));
    if (existing) {
      return res.status(400).json({ error: "Medicine already exists in inventory." });
    }

    const newItem = new Inventory(inventoryData);
    const saved = await newItem.save();

    // Log to history
    const historyEntry = new ImportHistory({
      sourceName: sourceName || 'AI Agent',
      sourceType: sourceType || 'ai-camera',
      medicines: [{ 
        name: saved.name, 
        status: 'imported', 
        reason: '',
        category: saved.category,
        batch: saved.batch,
        qty: saved.qty,
        price: saved.price,
        expiry: saved.expiry,
        size: saved.size,
        companyName: saved.companyName
      }],
      totalCount: 1,
      importedCount: 1
    });
    await historyEntry.save();

    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get import history
app.get('/api/import-history', async (req, res) => {
  try {
    const history = await ImportHistory.find().sort({ importedAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete import history and revert inventory
app.delete('/api/import-history/:id', async (req, res) => {
  try {
    const historyEntry = await ImportHistory.findById(req.params.id);
    if (!historyEntry) return res.status(404).json({ error: "History not found" });

    // Find all medicines that were successfully imported in this batch
    const importedMeds = historyEntry.medicines.filter(m => m.status === 'imported').map(m => m.name);
    
    // Delete those medicines from Inventory
    if (importedMeds.length > 0) {
      await Inventory.deleteMany({ name: { $in: importedMeds } });
    }

    // Delete the history record
    await ImportHistory.findByIdAndDelete(req.params.id);
    
    res.json({ success: true, deletedCount: importedMeds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update medicine
app.put('/api/inventory/:id', async (req, res) => {
  try {
    const updated = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete medicine
app.delete('/api/inventory/:id', async (req, res) => {
  if (req.params.id === 'expired') {
    try {
      const today = new Date();
      today.setHours(0,0,0,0);
      const result = await Inventory.deleteMany({ expiry: { $lt: today } });
      return res.json({ success: true, deletedCount: result.deletedCount });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  try {
    const del = await Inventory.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ error: "Not found" });
    res.json(del);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Inventory File Import Endpoint ---

const FIELD_ALIASES = {
  name: ['name', 'medicine', 'medicine name', 'medicinename', 'med name', 'drug', 'drug name', 'product', 'product name', 'item', 'item name', 'description'],
  category: ['category', 'cat', 'type', 'group', 'medicine type', 'drug type', 'class'],
  batch: ['batch', 'batch no', 'batchno', 'batch number', 'lot', 'lot no', 'lot number'],
  companyName: ['company', 'companyname', 'company name', 'manufacturer', 'mfg', 'brand', 'maker', 'mfr'],
  size: ['size', 'pack size', 'packsize', 'packaging', 'pack', 'unit size', 'quantity per pack'],
  price: ['price', 'mrp', 'cost', 'rate', 'unit price', 'unitprice', 'selling price', 'sp', 'amount'],
  qty: ['qty', 'quantity', 'stock', 'units', 'count', 'available', 'in stock', 'instock', 'no of units', 'nos'],
  expiry: ['expiry', 'exp', 'expiry date', 'expirydate', 'exp date', 'expdate', 'expires', 'best before', 'valid until', 'valid till']
};

function matchColumns(headers) {
  const mapping = {};
  const detected = [];
  for (const header of headers) {
    const normalized = String(header).toLowerCase().trim();
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.includes(normalized) && !mapping[field]) {
        mapping[field] = header;
        detected.push(field);
        break;
      }
    }
  }
  return { mapping, detected };
}

function parseValue(field, raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return undefined;
  const val = String(raw).trim();
  if (field === 'price' || field === 'qty') {
    const num = parseFloat(val.replace(/[^0-9.\-]/g, ''));
    return isNaN(num) ? undefined : (field === 'qty' ? Math.floor(num) : num);
  }
  if (field === 'expiry') {
    // Try various date formats
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
    // Try DD/MM/YYYY or DD-MM-YYYY
    const parts = val.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const attempt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (!isNaN(attempt.getTime())) return attempt;
    }
    return undefined;
  }
  return val;
}

function rowToInventory(row, mapping) {
  const doc = {};
  for (const [field, colName] of Object.entries(mapping)) {
    const parsed = parseValue(field, row[colName]);
    if (parsed !== undefined) doc[field] = parsed;
  }
  // Apply defaults
  if (!doc.category) doc.category = 'General';
  if (!doc.batch) doc.batch = `IMP-${Date.now()}`;
  if (!doc.companyName) doc.companyName = '';
  if (!doc.size) doc.size = '';
  if (doc.price === undefined) doc.price = 0;
  if (doc.qty === undefined) doc.qty = 0;
  return doc;
}

function parsePDFRows(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  // Try to detect a header line (first line with multiple delimited fields)
  let delimiter = '\t';
  if (lines[0].split('\t').length < 2) {
    delimiter = lines[0].includes('|') ? '|' : ',';
  }

  const headers = lines[0].split(delimiter).map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delimiter).map(c => c.trim());
    if (cells.length < 2) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] || ''; });
    rows.push(row);
  }
  return rows.length > 0 ? { headers, rows } : null;
}

app.post('/api/inventory/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = (req.file.originalname || '').toLowerCase();
    let headers = [];
    let dataRows = [];

    if (ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.csv')) {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (jsonData.length > 0) {
        headers = Object.keys(jsonData[0]);
        dataRows = jsonData;
      }
    } else if (ext.endsWith('.pdf')) {
      const pdfData = await pdfParse(req.file.buffer);
      const parsed = parsePDFRows(pdfData.text);
      if (parsed) {
        headers = parsed.headers;
        dataRows = parsed.rows;
      }
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Upload .xlsx, .xls, .csv, or .pdf' });
    }

    if (dataRows.length === 0) {
      return res.status(400).json({ error: 'No data rows found in the file' });
    }

    const { mapping, detected } = matchColumns(headers);

    if (!mapping.name) {
      return res.status(400).json({ 
        error: 'Could not find a "Name" / "Medicine" column in your file',
        headersFound: headers
      });
    }

    const details = [];
    const docsToInsert = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const doc = rowToInventory(row, mapping);
      
      if (!doc.name || String(doc.name).trim() === '') {
        details.push({ row: i + 1, name: null, status: 'skipped', reason: 'Missing medicine name' });
        continue;
      }

      // Check if duplicate in DB
      const existing = await Inventory.findOne(getExactMatchQuery(doc));
      if (existing) {
        details.push({ row: i + 1, name: doc.name, status: 'skipped', reason: 'Duplicate entry' });
        continue;
      }

      // Check if duplicate in the same file
      if (docsToInsert.some(d => 
        d.name.toLowerCase() === doc.name.toLowerCase() &&
        d.category === doc.category &&
        d.batch === doc.batch &&
        d.companyName === doc.companyName &&
        d.size === doc.size &&
        d.price === doc.price &&
        d.qty === doc.qty
      )) {
        details.push({ row: i + 1, name: doc.name, status: 'skipped', reason: 'Duplicate in file' });
        continue;
      }

      docsToInsert.push(doc);
      details.push({ 
        row: i + 1, 
        name: doc.name, 
        status: 'imported',
        category: doc.category,
        batch: doc.batch,
        qty: doc.qty,
        price: doc.price,
        expiry: doc.expiry,
        size: doc.size,
        companyName: doc.companyName
      });
    }

    if (docsToInsert.length > 0) {
      await Inventory.insertMany(docsToInsert);
    }

    // Save to Import History
    const historyEntry = new ImportHistory({
      sourceName: req.file.originalname,
      sourceType: 'file',
      medicines: details.map(d => ({
        name: d.name || 'Unknown',
        status: d.status,
        reason: d.reason || '',
        category: d.category,
        batch: d.batch,
        qty: d.qty,
        price: d.price,
        expiry: d.expiry,
        size: d.size,
        companyName: d.companyName
      })),
      totalCount: dataRows.length,
      importedCount: docsToInsert.length
    });
    await historyEntry.save();

    res.json({
      total: dataRows.length,
      imported: docsToInsert.length,
      skipped: dataRows.length - docsToInsert.length,
      columnsDetected: detected,
      allColumns: headers,
      details,
      historyId: historyEntry._id
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Payment Endpoints (Razorpay) ---

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: "Amount is required" });

    const options = {
      amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

app.post('/api/payment/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // Payment is verified
      res.json({ success: true, message: "Payment verified successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid Signature" });
    }
  } catch (error) {
    console.error("Razorpay Verify Error:", error);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

// --- Bills Endpoints ---

// Send Real SMS Receipt via Twilio
app.post('/api/bills/sms', async (req, res) => {
  try {
    const { customer_name, mobile, bill_no, items, total } = req.body;
    
    const result = await MessagingService.sendReceiptSMS(
      customer_name || 'Customer',
      mobile,
      bill_no,
      total,
      items
    );

    res.json({ success: true, message: "SMS sent successfully", sid: result.sid || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all bills
app.get('/api/bills', async (req, res) => {
  try {
    const bills = await Bill.find()
      .populate('items')
      .sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate/Create a Bill AND reduce inventory
app.post('/api/bills', async (req, res) => {
  try {
    const { items, ...billData } = req.body;
    
    // Auto-generate Bill No if not exactly specified
    if (!billData.bill_no) {
      const lastBill = await Bill.findOne().sort({ bill_no: -1 });
      billData.bill_no = lastBill && lastBill.bill_no ? lastBill.bill_no + 1 : 1;
    }

    // Step 1: Create the Bill Header
    const newBill = new Bill({ ...billData, items: [] });
    const savedBill = await newBill.save();

    const receiptIds = [];

    // Step 2: Process each item
    for (const item of items) {
      if (!item.id || !item.qty) continue;
      let qtyToDeduct = item.qty;

      const b = await Inventory.findById(item.id);

      if (b && b.qty > 0) {
        const deduct = Math.min(b.qty, qtyToDeduct);
        b.qty -= deduct;
        qtyToDeduct -= deduct;
        await b.save();

        // Create Receipt record
        const receipt = new Receipt({
          billId: savedBill._id,
          inventoryId: b._id,
          name: b.name,
          category: b.category || "Others",
          batch: b.batch,
          companyName: b.companyName,
          size: b.size,
          qty: deduct,
          price: b.price || item.price,
          totalPrice: deduct * (b.price || item.price),
          date: savedBill.createdAt
        });
        const savedReceipt = await receipt.save();
        receiptIds.push(savedReceipt._id);

        // Update Analytics Performance
        await Analytics.findOneAndUpdate(
          { inventoryId: b._id },
          { 
            $inc: { totalUnitsSold: deduct, totalRevenue: deduct * (b.price || item.price) },
            $set: { lastSold: new Date(), medicineName: b.name, category: b.category || "Others" },
            $setOnInsert: { performanceScore: 0 }
          },
          { upsert: true, new: true }
        );
      }

      // Handle Out of Stock case (log it as a receipt too but maybe with a flag or specific mark)
      if (qtyToDeduct > 0) {
        const receipt = new Receipt({
          billId: savedBill._id,
          inventoryId: new mongoose.Types.ObjectId(), // dummy or specific ID
          name: item.name,
          category: "Unknown",
          batch: "OUT_OF_STOCK",
          qty: qtyToDeduct,
          price: item.price,
          totalPrice: qtyToDeduct * item.price,
          date: savedBill.createdAt
        });
        const savedReceipt = await receipt.save();
        receiptIds.push(savedReceipt._id);
      }
    }

    // Step 3: Link items back to Bill
    savedBill.items = receiptIds;
    await savedBill.save();

    // Cancel old reminders for the same mobile
    if (savedBill.mobile) {
      await Bill.updateMany(
        { mobile: savedBill.mobile, _id: { $ne: savedBill._id } },
        { $set: { "metadata.reminders_cancelled": true } }
      );
    }

    // --- NEW: Conditional Notification Storage ---
    if (savedBill.days_to_refill) {
      await Notification.create({
        text: `Refill tracking STARTED for ${savedBill.customer_name} (Bill #${savedBill.bill_no})`,
        type: 'system',
        completed: false
      });
      console.log(`[SYSTEM] Refill notification ACTIVATED for ${savedBill.customer_name}`);
    }

    res.status(201).json(savedBill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Analytics Endpoints ---
app.get('/api/analytics', async (req, res) => {
  try {
    const stats = await Analytics.find().sort({ totalRevenue: -1 });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics/receipts', async (req, res) => {
  try {
    const receipts = await Receipt.find().sort({ createdAt: -1 });
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Bill Metadata (for reminders)
app.put('/api/bills/:id/metadata', async (req, res) => {
  try {
    const { metadata } = req.body;
    const updated = await Bill.findByIdAndUpdate(
      req.params.id, 
      { metadata }, 
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Bill
app.delete('/api/bills/:id', async (req, res) => {
  try {
    const del = await Bill.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ error: "Not found" });
    res.json(del);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Notifications Endpoints ---
app.get('/api/notifications', async (req, res) => {
  try {
    const items = await Notification.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const newItem = new Notification(req.body);
    const saved = await newItem.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/notifications/:id', async (req, res) => {
  try {
    const updated = await Notification.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const del = await Notification.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ error: "Not found" });
    res.json(del);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Runs every 1 minute to check for bills that need reminders
setInterval(async () => {
  try {
    const bills = await Bill.find({ 
      days_to_refill: { $exists: true, $ne: null },
      "metadata.reminders_cancelled": { $ne: true }
    });
    
    const now = new Date();
    
    for (const bill of bills) {
      const createdAt = new Date(bill.createdAt || bill.created_at || now);
      if(isNaN(createdAt.getTime())) continue;

      const refillDate = new Date(createdAt);
      refillDate.setDate(refillDate.getDate() + bill.days_to_refill);
      
      const diffMs = refillDate - now;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      
      const md = bill.metadata || {};
      
      // 3 Days Before System Alert
      if (diffDays <= 3 && diffDays > 2 && !md.alert_3days_before) {
        await Bill.findByIdAndUpdate(bill._id, { $set: { "metadata.alert_3days_before": true } });
        await Notification.create({ 
          text: `System Alert: Refill approaching in 3 days for ${bill.customer_name} 🕒`, 
          type: 'system',
          completed: false 
        });
      }

      // 1 Day Before (-1 day) logic
      if (diffDays <= 1 && diffDays > 0 && !md.sms_1day_before) {
        const sms = await MessagingService.sendRefillReminder(bill.customer_name, bill.mobile, bill.days_to_refill, false, bill.bill_no);
        await Bill.findByIdAndUpdate(bill._id, { $set: { "metadata.sms_1day_before": true } });
        await Notification.create({ 
          text: `Auto-SMS Sent: Refill due tomorrow for ${bill.customer_name} 📱`, 
          message: sms.message,
          type: 'message',
          completed: true 
        });
      }
      
      // 1 Day After (+1 day) logic
      if (diffDays <= -1 && diffDays > -2 && !md.sms_1day_after) {
        const sms = await MessagingService.sendRefillReminder(bill.customer_name, bill.mobile, bill.days_to_refill, true, bill.bill_no);
        await Bill.findByIdAndUpdate(bill._id, { $set: { "metadata.sms_1day_after": true } });
        await Notification.create({ 
          text: `Auto-SMS Alert: Refill OVERDUE for ${bill.customer_name} 📞`, 
          message: sms.message,
          type: 'message',
          completed: true 
        });
      }
    }
  } catch(err) {
    console.error("Cron simulation error:", err.message);
  }
}, 60 * 1000);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
