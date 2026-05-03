import React, { useState, useRef, useCallback, useEffect } from "react";
import { 
  Camera, Sparkles, Eye, Loader2, CheckCircle2,
  RefreshCw, X, PackagePlus, ShoppingBag, AlertCircle,
  Upload, FileSpreadsheet, FileText, ChevronDown, ChevronUp, Zap, Pill, ArrowRight,
  ImagePlus, Search, Type, Trash2
} from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';

export default function AIAgents() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [newStock, setNewStock] = useState("");
  const [inputMode, setInputMode] = useState("camera"); // "camera" | "upload" | "text"
  const [searchText, setSearchText] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [savedToInventory, setSavedToInventory] = useState({}); // { [id]: true }
  const [savingId, setSavingId] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [showHistoryDetailModal, setShowHistoryDetailModal] = useState(false);
  const [historyMedicineDetail, setHistoryMedicineDetail] = useState(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const fileInputRef = useRef(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    setIsCapturing(true); setResults(null); setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { toast.error("Camera access denied."); setIsCapturing(false); }
  };

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  }, []);

  const fetchHistory = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${apiUrl}/import-history`);
      if (res.ok) setImportHistory(await res.json());
    } catch (err) { console.error('Failed to fetch history', err); }
  };

  const deleteHistory = async (id, sourceName) => {
    if (!window.confirm(`Are you sure you want to delete "${sourceName}" and remove its medicines from the inventory?`)) return;
    try {
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${apiUrl}/import-history/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Deleted import record and reverted ${data.deletedCount} medicines!`);
      fetchHistory();
    } catch (err) {
      toast.error('Failed to delete history');
    }
  };

  useEffect(() => {
    fetchHistory();
    return () => stopCamera();
  }, [stopCamera]);

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL("image/png");
      setCapturedImage(imageData);
      stopCamera();
      analyzeImage(imageData);
    }
  };

  const analyzeImage = async (imageData) => {
    setAnalyzing(true);
    setResults(null);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${apiUrl}/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'AI analysis failed'); setAnalyzing(false); return; }
      
      const medicines = (data.medicines || []).map((m, idx) => ({
        id: idx + 1,
        name: m.name || 'Unknown Medicine',
        usage: m.usage || 'No information available',
        dosage: m.dosage || 'Consult your doctor',
        sideEffects: m.sideEffects || 'Consult pharmacist',
        alternatives: m.alternatives || [],
      }));
      
      setResults(medicines);
      toast.success(`AI identified ${medicines.length} medicine(s)!`);
    } catch (err) {
      toast.error('Failed to connect to AI service');
      console.error(err);
    }
    setAnalyzing(false);
  };

  const saveToInventory = async (item) => {
    setSavingId(item.id);
    try {
      let sourceName = 'AI Camera Capture';
      let sourceType = 'ai-camera';
      if (inputMode === 'upload') {
        sourceName = 'AI Image Upload';
        sourceType = 'ai-upload';
      } else if (inputMode === 'text') {
        sourceName = `AI Text Search: ${searchText}`;
        sourceType = 'ai-text';
      }

      const inventoryData = {
        name: item.name,
        category: 'General',
        batch: `AI-${Date.now()}`,
        companyName: '',
        size: '',
        price: 0,
        qty: 0,
        expiry: null,
        sourceName,
        sourceType
      };
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${apiUrl}/inventory/ai-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inventoryData)
      });
      if (!res.ok) { toast.error('Failed to save to inventory'); setSavingId(null); return; }
      setSavedToInventory(prev => ({ ...prev, [item.id]: true }));
      toast.success(`${item.name} recorded in inventory!`);
      fetchHistory(); // Refresh history
    } catch (err) {
      toast.error('Failed to connect to server');
    }
    setSavingId(null);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setUploadedImage(dataUrl);
      setCapturedImage(dataUrl);
      analyzeImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleTextSearch = async () => {
    if (!searchText.trim()) return;
    setAnalyzing(true); setResults(null); setCapturedImage(null);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${apiUrl}/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: searchText.trim() })
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'AI analysis failed'); setAnalyzing(false); return; }
      const medicines = (data.medicines || []).map((m, idx) => ({
        id: idx + 1, name: m.name || 'Unknown', usage: m.usage || '', dosage: m.dosage || '',
        sideEffects: m.sideEffects || '', alternatives: m.alternatives || [],
      }));
      setResults(medicines);
      toast.success(`AI found ${medicines.length} result(s)!`);
    } catch (err) { toast.error('Failed to connect to AI service'); }
    setAnalyzing(false);
  };

  const resetAll = () => {
    setCapturedImage(null); setResults(null); setUploadedImage(null);
    setSearchText(""); setSavedToInventory({});
  };

  const handleAddToCart = (item) => {
    if (window.confirm(`Add ${item.name} to cart?`)) toast.success(`Successfully added ${item.name} to cart!`);
  };

  const handleAddStock = (medicine) => { setSelectedMedicine(medicine); setNewStock(medicine.stock); setShowStockModal(true); };

  const saveStock = () => {
    setResults(results.map(r => r.id === selectedMedicine.id ? { ...r, stock: parseInt(newStock) } : r));
    setShowStockModal(false);
    toast.success(`Stock updated for ${selectedMedicine.name}`);
  };
  const viewHistoryMedicineDetail = async (m) => {
    // If the history record already has the snapshot data (batch, qty, etc.), show it immediately
    if (m && m.batch && m.qty !== undefined) {
      setHistoryMedicineDetail(m);
      setShowHistoryDetailModal(true);
      return;
    }

    // Fallback: Fetch live data for older history records that don't have snapshots
    const name = typeof m === 'string' ? m : m.name;
    setFetchingDetail(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${apiUrl}/inventory/medicine?name=${encodeURIComponent(name)}`);
      if (res.ok) {
        setHistoryMedicineDetail(await res.json());
        setShowHistoryDetailModal(true);
      } else {
        const err = await res.json();
        toast.error(err.error || "Could not find details for this medicine");
      }
    } catch (err) {
      toast.error("Failed to fetch medicine details");
    }
    setFetchingDetail(false);
  };

  // --- Import handlers ---
  const handleFileDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleFileSelect = (file) => {
    const validExts = ['.xlsx', '.xls', '.csv', '.pdf'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExts.includes(ext)) { toast.error("Please upload .xlsx, .xls, .csv, or .pdf files only"); return; }
    setSelectedFile(file);
    setImportResult(null);
    setShowAllDetails(false);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true); setImportResult(null);
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${apiUrl}/inventory/import`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Import failed'); setImporting(false); return; }
      setImportResult(data);
      toast.success(`Successfully imported ${data.imported} medicines!`);
      fetchHistory();
    } catch (err) { toast.error('Failed to connect to server'); }
    setImporting(false);
  };

  const resetImport = () => { setSelectedFile(null); setImportResult(null); setShowAllDetails(false); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload size={40} className="text-slate-400" />;
    return selectedFile.name.endsWith('.pdf') 
      ? <FileText size={40} className="text-red-500" /> 
      : <FileSpreadsheet size={40} className="text-emerald-500" />;
  };

  const visibleDetails = importResult?.details ? (showAllDetails ? importResult.details : importResult.details.slice(0, 8)) : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 p-4">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm animate-fade-in space-y-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl flex items-center justify-center text-white shadow-xl">
            <Eye size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">AI Integrated Vision</h1>
            <p className="text-slate-500 font-medium italic">Advanced medicine recognition & inventory sync</p>
          </div>
        </div>
        {/* Input Mode Tabs */}
        <div className="flex gap-3 flex-wrap">
          {[
            {key:'camera',icon:<Camera size={18}/>,label:'Live Camera'},
            {key:'upload',icon:<ImagePlus size={18}/>,label:'Upload Image'},
            {key:'text',icon:<Type size={18}/>,label:'Text Search'},
            {key:'history',icon:<CheckCircle2 size={18}/>,label:'Import History'}
          ].map(t=>(
            <button key={t.key} onClick={()=>{setInputMode(t.key);resetAll();}} className={`px-5 py-3 rounded-2xl font-bold flex items-center gap-2 text-sm transition-all ${inputMode===t.key?'bg-teal-600 text-white shadow-lg shadow-teal-600/20':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t.icon}{t.label}</button>
          ))}
        </div>
      </div>

      {/* ========== FILE IMPORT SECTION ========== */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden animate-fade-in">
        {/* Section Header */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <Upload size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Import Inventory File</h2>
            <p className="text-teal-100 text-sm font-medium">Upload Excel or PDF to bulk-add medicines</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Drop Zone */}
          {!importResult && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => !selectedFile && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer
                ${dragOver ? 'border-teal-500 bg-teal-50/50 scale-[1.01]' : selectedFile ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50 hover:border-teal-400 hover:bg-teal-50/30'}`}
            >
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
              
              <div className="flex flex-col items-center gap-4">
                {getFileIcon()}
                {selectedFile ? (
                  <>
                    <div>
                      <p className="text-lg font-bold text-slate-800">{selectedFile.name}</p>
                      <p className="text-sm text-slate-400 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <div className="flex gap-3 mt-2">
                      <button onClick={(e) => { e.stopPropagation(); handleImport(); }}
                        disabled={importing}
                        className="px-8 py-3 bg-teal-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 disabled:opacity-50">
                        {importing ? <><Loader2 size={18} className="animate-spin" /> Importing...</> : <><Upload size={18} /> Import Now</>}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); resetImport(); }}
                        className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">
                        Change File
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-slate-600">Drop your file here or click to browse</p>
                    <p className="text-sm text-slate-400">Supports <span className="font-bold text-teal-600">.xlsx</span>, <span className="font-bold text-teal-600">.xls</span>, <span className="font-bold text-teal-600">.csv</span>, <span className="font-bold text-teal-600">.pdf</span></p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="space-y-5 animate-fade-up">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Rows</p>
                  <p className="text-3xl font-black text-slate-800">{importResult.total}</p>
                </div>
                <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">Imported</p>
                  <p className="text-3xl font-black text-emerald-600">{importResult.imported}</p>
                </div>
                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                  <p className="text-[10px] font-black text-amber-500 uppercase mb-1">Skipped</p>
                  <p className="text-3xl font-black text-amber-600">{importResult.skipped}</p>
                </div>
              </div>

              {/* Detected Columns */}
              <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100">
                <p className="text-[10px] font-black text-teal-600 uppercase mb-2">Columns Detected & Mapped</p>
                <div className="flex flex-wrap gap-2">
                  {importResult.columnsDetected.map(col => (
                    <span key={col} className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-full text-xs font-bold">{col}</span>
                  ))}
                </div>
              </div>

              {/* Per-row Status Table */}
              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-extrabold text-slate-700">Import Details</p>
                  <span className="text-xs text-slate-400">{importResult.details.length} rows</span>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left px-5 py-2.5 text-[10px] font-black text-slate-400 uppercase">Row</th>
                        <th className="text-left px-5 py-2.5 text-[10px] font-black text-slate-400 uppercase">Medicine Name</th>
                        <th className="text-left px-5 py-2.5 text-[10px] font-black text-slate-400 uppercase">Status</th>
                        <th className="text-left px-5 py-2.5 text-[10px] font-black text-slate-400 uppercase">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDetails.map((d, i) => (
                        <tr key={i} className={`border-t border-slate-50 ${d.status === 'skipped' ? 'bg-amber-50/40' : 'hover:bg-teal-50/30'} transition-colors`}>
                          <td className="px-5 py-3 text-slate-500 font-mono text-xs">{d.row}</td>
                          <td className="px-5 py-3 font-bold text-slate-700">
                            {d.status === 'imported' ? (
                              <button onClick={() => viewHistoryMedicineDetail(d.name)} className="text-teal-600 hover:text-teal-700 hover:underline text-left transition-all">
                                {d.name}
                              </button>
                            ) : (
                              d.name || <span className="text-slate-300 italic">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {d.status === 'imported' 
                              ? <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs"><CheckCircle2 size={14} /> Imported</span>
                              : <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-xs"><AlertCircle size={14} /> Skipped</span>}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-400">{d.reason || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importResult.details.length > 8 && (
                  <button onClick={() => setShowAllDetails(!showAllDetails)}
                    className="w-full py-3 bg-slate-50 text-sm font-bold text-teal-600 flex items-center justify-center gap-1 hover:bg-teal-50 transition-all border-t border-slate-100">
                    {showAllDetails ? <><ChevronUp size={16} /> Show Less</> : <><ChevronDown size={16} /> Show All {importResult.details.length} Rows</>}
                  </button>
                )}
              </div>

              {/* Import Another */}
              <button onClick={resetImport}
                className="w-full py-4 bg-white border-2 border-teal-600 text-teal-600 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-teal-50 transition-all uppercase tracking-widest text-sm">
                <RefreshCw size={18} /> Import Another File
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========== AI SCANNER SECTION ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[600px]">
        {/* Input Pane - Mode Aware */}
        <div className="bg-slate-900 rounded-[3rem] relative overflow-hidden border-[6px] border-white shadow-2xl flex items-center justify-center">
          {/* CAMERA MODE */}
          {inputMode === 'camera' && (
            <>{isCapturing ? (
              <div className="w-full h-full relative">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none"><div className="absolute inset-0 border border-teal-400/50 flex items-center justify-center"><div className="w-64 h-64 border-2 border-teal-400/80 rounded-3xl animate-pulse"></div></div></div>
                <div className="absolute inset-x-0 bottom-10 flex justify-center">
                  <button onClick={captureFrame} className="w-24 h-24 bg-white rounded-full p-2 shadow-2xl hover:scale-105 transition-transform active:scale-90 border-8 border-white/20"><div className="w-full h-full bg-teal-600 rounded-full flex items-center justify-center text-white"><Camera size={32} /></div></button>
                </div>
              </div>
            ) : capturedImage ? (
              <div className="w-full h-full relative"><img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                {analyzing && <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white"><Loader2 size={56} className="animate-spin text-teal-400 mb-4" /><p className="font-bold text-xl uppercase tracking-widest animate-pulse">AI Analyzing...</p></div>}
              </div>
            ) : (
              <div className="text-center p-16 space-y-6">
                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto"><Camera size={40} className="text-slate-600" /></div>
                <p className="text-slate-400 font-medium max-w-[250px]">Point camera at medicine</p>
                <button onClick={startCamera} className="px-8 py-4 bg-teal-600 text-white rounded-2xl font-bold flex items-center gap-2 mx-auto hover:bg-teal-700 transition-all shadow-lg"><Camera size={20} /> Start Camera</button>
              </div>
            )}</>
          )}
          {/* UPLOAD MODE */}
          {inputMode === 'upload' && (
            <>{capturedImage ? (
              <div className="w-full h-full relative"><img src={capturedImage} alt="Uploaded" className="w-full h-full object-cover" />
                {analyzing && <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white"><Loader2 size={56} className="animate-spin text-teal-400 mb-4" /><p className="font-bold text-xl uppercase tracking-widest animate-pulse">AI Analyzing...</p></div>}
              </div>
            ) : (
              <div className="text-center p-16 space-y-6">
                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto"><ImagePlus size={40} className="text-slate-600" /></div>
                <p className="text-slate-400 font-medium max-w-[280px]">Upload a photo of medicine packaging for AI analysis</p>
                <label className="px-8 py-4 bg-teal-600 text-white rounded-2xl font-bold flex items-center gap-2 mx-auto hover:bg-teal-700 transition-all shadow-lg cursor-pointer w-fit"><ImagePlus size={20} /> Choose Image<input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></label>
              </div>
            )}</>
          )}
          {/* TEXT MODE */}
          {inputMode === 'text' && (
            <div className="text-center p-10 space-y-6 w-full">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto"><Search size={36} className="text-teal-500" /></div>
              <p className="text-slate-400 font-medium">Type a medicine name to get AI-powered details & alternatives</p>
              <div className="flex gap-3 max-w-md mx-auto">
                <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTextSearch()} placeholder="e.g. Paracetamol, Amoxicillin..." className="flex-1 px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold placeholder:text-slate-500 focus:border-teal-500 outline-none transition-colors" />
                <button onClick={handleTextSearch} disabled={analyzing || !searchText.trim()} className="px-6 py-4 bg-teal-600 text-white rounded-2xl font-bold hover:bg-teal-700 transition-all shadow-lg disabled:opacity-50"><Search size={20} /></button>
              </div>
              {analyzing && <div className="flex items-center justify-center gap-3 text-teal-400"><Loader2 size={20} className="animate-spin" /><span className="font-bold animate-pulse">DeepSeek is thinking...</span></div>}
            </div>
          )}
          {/* HISTORY MODE */}
          {inputMode === 'history' && (
            <div className="w-full h-full bg-slate-800 p-6 overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><CheckCircle2 className="text-teal-400" /> Recent Imports</h3>
              {importHistory.length === 0 ? (
                <p className="text-slate-400 text-center mt-10">No import history found.</p>
              ) : (
                <div className="space-y-4">
                  {importHistory.map(h => (
                    <div key={h._id} className="bg-slate-700 rounded-2xl overflow-hidden border border-slate-600">
                      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-600 transition-colors" onClick={() => setExpandedHistory(expandedHistory === h._id ? null : h._id)}>
                        <div>
                          <p className="font-bold text-white text-lg">{h.sourceName}</p>
                          <p className="text-xs text-slate-400 mt-1">{new Date(h.importedAt).toLocaleString()} • {h.sourceType.toUpperCase()}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-bold text-emerald-400">{h.importedCount} Imported</p>
                            <p className="text-xs text-slate-400">{h.totalCount} Total</p>
                          </div>
                          {expandedHistory === h._id ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                        </div>
                      </div>
                      {expandedHistory === h._id && (
                        <div className="bg-slate-800 p-4 border-t border-slate-600">
                          <div className="flex justify-between items-center mb-4">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Included Medicines</p>
                            <button onClick={() => deleteHistory(h._id, h.sourceName)} className="text-red-400 hover:text-red-300 flex items-center gap-1 text-xs font-bold transition-colors">
                              <Trash2 size={14} /> Revert & Delete Import
                            </button>
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                              <thead><tr><th className="pb-2">Medicine Name</th><th className="pb-2">Status</th></tr></thead>
                            <tbody>
                              {h.medicines.map((m, idx) => (
                                <tr key={idx} className="border-t border-slate-700 hover:bg-slate-700/50 transition-colors">
                                  <td className="py-2">
                                    <button 
                                      onClick={() => m.status === 'imported' && viewHistoryMedicineDetail(m)}
                                      className={`text-left font-bold transition-all ${m.status === 'imported' ? 'text-teal-400 hover:text-teal-300 hover:underline cursor-pointer' : 'text-slate-500 cursor-default'}`}
                                    >
                                      {m.name}
                                    </button>
                                  </td>
                                  <td className="py-2">
                                    {m.status === 'imported' ? <span className="text-emerald-400 text-xs font-bold">Imported</span> : <span className="text-amber-400 text-xs font-bold">Skipped</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Results Pane */}
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col">
          <div className="bg-slate-50/50 p-8 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-3">
              <Sparkles className="text-teal-600" /> Neural Insights
            </h2>
            {results && <span className="bg-teal-100 text-teal-700 px-4 py-1.5 rounded-full text-xs font-black uppercase">{results.length} Identified</span>}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {!results && !analyzing ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 space-y-4">
                <ShoppingBag size={80} />
                <p className="text-lg font-bold">Awaiting Data Capture</p>
              </div>
            ) : analyzing ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-teal-200 rounded-full"></div>
                    <Loader2 size={80} className="animate-spin text-teal-500 absolute inset-0" />
                  </div>
                  <p className="font-bold text-slate-500 animate-pulse">AI is analyzing your medicine...</p>
                  <p className="text-xs text-slate-400">This may take a few seconds</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-fade-in pb-10">
                {results.map((item) => (
                  <div key={item.id} className="rounded-[2rem] border border-slate-100 bg-white overflow-hidden hover:shadow-2xl hover:shadow-teal-600/5 transition-all group">
                    {/* Medicine Header */}
                    <div className="p-6 space-y-4">
                      <div className="flex gap-5">
                        {capturedImage && <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-100 flex-shrink-0 shadow-sm relative"><img src={capturedImage} className="w-full h-full object-cover" alt="" /></div>}
                        <div className="flex-1">
                          <h3 className="text-xl font-black text-slate-800 tracking-tight mb-1">{item.name}</h3>
                          <div className="flex items-center gap-2 mb-3">
                            <Zap size={12} className="text-teal-600" />
                            <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">AI Identified</span>
                          </div>
                        </div>
                      </div>

                      {/* Info Grid */}
                      <div className="space-y-3">
                        <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100">
                          <p className="text-[10px] font-black text-teal-600 uppercase mb-1.5">Usage & Purpose</p>
                          <p className="text-sm text-slate-600 leading-relaxed font-medium">{item.usage}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                            <p className="text-[10px] font-black text-blue-600 uppercase mb-1.5">Dosage</p>
                            <p className="text-sm text-slate-700 font-bold">{item.dosage}</p>
                          </div>
                          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                            <p className="text-[10px] font-black text-amber-600 uppercase mb-1.5">Side Effects</p>
                            <p className="text-sm text-slate-700 font-medium">{item.sideEffects}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Alternatives Section */}
                    {item.alternatives && item.alternatives.length > 0 && (
                      <div className="border-t border-slate-100 bg-slate-50/30 p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Pill size={16} className="text-indigo-500" />
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Alternative Medicines</p>
                          <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-[10px] font-black">{item.alternatives.length}</span>
                        </div>
                        <div className="space-y-2">
                          {item.alternatives.map((alt, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all">
                              <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                <ArrowRight size={14} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{alt.name}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{alt.reason}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Save to Inventory Button */}
                    <div className="p-4 border-t border-slate-100">
                      {savedToInventory[item.id] ? (
                        <div className="w-full py-3.5 bg-emerald-50 text-emerald-600 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm">
                          <CheckCircle2 size={18} /> Recorded in Inventory
                        </div>
                      ) : (
                        <button
                          onClick={() => saveToInventory(item)}
                          disabled={savingId === item.id}
                          className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-teal-600 transition-all shadow-lg shadow-slate-900/10 text-sm disabled:opacity-50">
                          {savingId === item.id ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : <><PackagePlus size={18} /> Save to Inventory</>}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {results && (
            <div className="p-8 bg-slate-50/50 border-t border-slate-100">
              <button onClick={resetAll} className="w-full py-4 bg-white border-2 border-teal-600 text-teal-600 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-teal-50 transition-all uppercase tracking-widest text-sm"><RefreshCw size={20} /> New Search</button>
            </div>
          )}
        </div>
      </div>

      {/* Stock Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-lg z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-fade-up">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center"><PackagePlus /></div>
              <h3 className="text-2xl font-bold text-slate-800">Manual Stock Entry</h3>
            </div>
            <p className="text-slate-500 mb-6 font-medium text-sm">Update current inventory levels for <span className="text-slate-800 font-bold">{selectedMedicine.name}</span> instantly.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2">Total Units in Stock</label>
                <input type="number" value={newStock} onChange={(e) => setNewStock(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xl focus:border-teal-500 outline-none transition-colors" />
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowStockModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                <button onClick={saveStock} className="flex-2 px-10 py-4 bg-teal-600 text-white rounded-2xl font-bold shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition-all">Update Stock</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* History Medicine Detail Modal */}
      {showHistoryDetailModal && historyMedicineDetail && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-800 p-8 text-white flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Pill size={24} className="text-teal-300" />
                  <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80 text-teal-100">Inventory Record</span>
                </div>
                <h3 className="text-3xl font-black tracking-tight">{historyMedicineDetail.name}</h3>
                <p className="text-teal-100/70 text-sm font-medium mt-1">Batch: {historyMedicineDetail.batch}</p>
              </div>
              <button onClick={() => setShowHistoryDetailModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Company / Manufacturer</p>
                  <p className="text-lg font-bold text-slate-800">{historyMedicineDetail.companyName || <span className="italic text-slate-300">Not Mentioned</span>}</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category</p>
                  <p className="text-lg font-bold text-slate-800">{historyMedicineDetail.category}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-5 bg-teal-50 rounded-2xl border border-teal-100 text-center">
                  <p className="text-[9px] font-black text-teal-600 uppercase mb-1">Current Stock</p>
                  <p className="text-2xl font-black text-teal-700">{historyMedicineDetail.qty} <span className="text-sm font-bold">units</span></p>
                </div>
                <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                  <p className="text-[9px] font-black text-indigo-600 uppercase mb-1">Unit Price</p>
                  <p className="text-2xl font-black text-indigo-700">₹{historyMedicineDetail.price}</p>
                </div>
                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                  <p className="text-[9px] font-black text-amber-600 uppercase mb-1">Pack Size</p>
                  <p className="text-xl font-black text-amber-700">{historyMedicineDetail.size || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-900 rounded-2xl text-white">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <AlertCircle size={20} className="text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Expiration Date</p>
                  <p className="text-lg font-bold">
                    {historyMedicineDetail.expiry 
                      ? new Date(historyMedicineDetail.expiry).toLocaleDateString('en-IN', {day:'2-digit', month:'long', year:'numeric'})
                      : <span className="text-slate-500 italic">No Expiry Data</span>}
                  </p>
                </div>
                <div className="text-right border-l border-white/10 pl-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Registered On</p>
                  <p className="text-sm font-bold opacity-80">{new Date(historyMedicineDetail.created_at || historyMedicineDetail.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Inventory Tracking Source */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <ShoppingBag size={16} className="text-slate-400" />
                   <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Entry Source</span>
                </div>
                <span className="text-xs font-black text-slate-700 bg-white px-3 py-1 rounded-full border border-slate-200">
                  {historyMedicineDetail.sourceType || 'Bulk Import'}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setShowHistoryDetailModal(false)}
                className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all shadow-sm"
              >
                Close Details
              </button>
              <button 
                onClick={() => { setShowHistoryDetailModal(false); setInputMode('text'); setSearchText(historyMedicineDetail.name); handleTextSearch(); }}
                className="flex-1 py-4 bg-teal-600 text-white rounded-2xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2"
              >
                <Sparkles size={18} /> Ask AI for Usage
              </button>
            </div>
          </div>
        </div>
      )}

      {fetchingDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center">
          <div className="bg-white p-6 rounded-3xl shadow-xl flex items-center gap-4">
            <Loader2 className="animate-spin text-teal-600" size={24} />
            <span className="font-bold text-slate-700 uppercase tracking-widest text-xs">Fetching Inventory Data...</span>
          </div>
        </div>
      )}
    </div>
  );
}
