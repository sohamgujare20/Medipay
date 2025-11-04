import React, { useState } from "react";
import { Upload, Loader2, PlusCircle } from "lucide-react";

export default function OCR() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  // Handle file select (drag or normal input)
  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

  // Simulate OCR processing with dummy JSON
  const handleExtractText = () => {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }
    setLoading(true);
    setResults([]);
    // simulate async API call
    setTimeout(() => {
      setResults([
        { name: "Paracetamol 500mg", qty: 1 },
        { name: "Cough Syrup XYZ", qty: 1 },
        { name: "Vitamin C Tablets", qty: 2 },
      ]);
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[var(--hp-primary)]">
        Prescription OCR
      </h1>

      {/* Drag and drop box */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition 
        ${isDragging ? "border-[var(--hp-primary)] bg-teal-50" : "border-gray-300"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFileSelect(e.dataTransfer.files[0]);
        }}
        onClick={() => document.getElementById("fileInput").click()}
      >
        {selectedFile ? (
          <div className="text-gray-700">
            <Upload className="inline-block w-6 h-6 text-[var(--hp-primary)] mr-2" />
            <span className="font-medium">{selectedFile.name}</span>
          </div>
        ) : (
          <div className="text-gray-500">
            <Upload className="inline-block w-6 h-6 text-gray-400 mr-2" />
            Drag & Drop prescription image here <br /> or click to select
          </div>
        )}
        <input
          type="file"
          id="fileInput"
          className="hidden"
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files[0])}
        />
      </div>

      {/* Extract Button */}
      <button
        onClick={handleExtractText}
        disabled={!selectedFile || loading}
        className={`px-4 py-2 rounded-lg text-white font-medium transition 
          ${selectedFile && !loading
            ? "bg-[var(--hp-primary)] hover:bg-teal-700"
            : "bg-gray-300 cursor-not-allowed"}`}
      >
        {loading ? "Processing..." : "Extract Text"}
      </button>

      {/* Loading Spinner */}
      {loading && (
        <div className="flex items-center gap-2 text-[var(--hp-primary)] font-medium">
          <Loader2 className="w-5 h-5 animate-spin" />
          Processing prescription...
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <div className="overflow-x-auto bg-[var(--hp-surface)] border rounded-lg shadow-sm">
          <table className="min-w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 border-b font-medium text-gray-700">
                  Medicine Name
                </th>
                <th className="py-2 px-4 border-b font-medium text-gray-700">
                  Quantity
                </th>
                <th className="py-2 px-4 border-b font-medium text-gray-700 text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{item.name}</td>
                  <td className="py-2 px-4 border-b">{item.qty}</td>
                  <td className="py-2 px-4 border-b text-center">
                    <button
                      className="flex items-center gap-1 mx-auto px-3 py-1 bg-[var(--hp-primary)] text-white rounded hover:bg-teal-700 transition"
                      onClick={() => alert(`Added ${item.name} to cart`)}
                    >
                      <PlusCircle size={16} />
                      Add to Cart
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
