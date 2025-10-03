'use client';

import React, { useState, useRef } from 'react';
import { FiUpload, FiDownload, FiFileText, FiCheckCircle, FiXCircle, FiAlertCircle, FiBarChart, FiTrendingUp } from 'react-icons/fi';

interface CSVData {
  headers: string[];
  rows: string[][];
  fileName: string;
}

interface MatchResult {
  inputRow: string[];
  outputRow: string[] | null;
  isMatch: boolean;
  matchType: 'exact' | 'partial' | 'no-match';
  differences: string[];
}

export default function FileMatchingPage() {
  const [inputFile, setInputFile] = useState<CSVData | null>(null);
  const [outputFile, setOutputFile] = useState<CSVData | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const inputFileRef = useRef<HTMLInputElement>(null);
  const outputFileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (file: File): Promise<CSVData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length === 0) {
            reject(new Error('File is empty'));
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const rows = lines.slice(1).map(line => 
            line.split(',').map(cell => cell.trim().replace(/"/g, ''))
          );

          resolve({
            headers,
            rows,
            fileName: file.name
          });
        } catch {
          reject(new Error('Failed to parse CSV file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (file: File, type: 'input' | 'output') => {
    try {
      setError(null);
      const csvData = await parseCSV(file);
      
      if (type === 'input') {
        setInputFile(csvData);
      } else {
        setOutputFile(csvData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    }
  };

  const findMatchingRows = (inputData: CSVData, outputData: CSVData): MatchResult[] => {
    const results: MatchResult[] = [];
    
    // Use first few columns as matching criteria (Date, Amount, Description)
    const matchColumns = inputData.headers.slice(0, Math.min(3, inputData.headers.length));
    
    for (const inputRow of inputData.rows) {
      let bestMatch: { row: string[]; score: number } | null = null;
      let matchType: 'exact' | 'partial' | 'no-match' = 'no-match';
      let differences: string[] = [];

      // Find best matching row in output data
      for (const outputRow of outputData.rows) {
        let matchScore = 0;
        const rowDifferences: string[] = [];

        // Compare each matching column
        for (let i = 0; i < matchColumns.length; i++) {
          const inputValue = inputRow[i] || '';
          const outputValue = outputRow[i] || '';
          
          if (inputValue.toLowerCase() === outputValue.toLowerCase()) {
            matchScore += 1;
          } else if (inputValue.toLowerCase().includes(outputValue.toLowerCase()) || 
                     outputValue.toLowerCase().includes(inputValue.toLowerCase())) {
            matchScore += 0.5;
            rowDifferences.push(`${matchColumns[i]}: "${inputValue}" vs "${outputValue}"`);
          } else {
            rowDifferences.push(`${matchColumns[i]}: "${inputValue}" vs "${outputValue}"`);
          }
        }

        // Update best match if this is better
        if (matchScore > (bestMatch?.score || 0)) {
          bestMatch = { row: outputRow, score: matchScore };
          differences = rowDifferences;
        }
      }

      // Determine match type
      if (bestMatch) {
        if (bestMatch.score === matchColumns.length) {
          matchType = 'exact';
        } else if (bestMatch.score > 0) {
          matchType = 'partial';
        }
      }

      results.push({
        inputRow,
        outputRow: bestMatch?.row || null,
        isMatch: matchType !== 'no-match',
        matchType,
        differences
      });
    }

    return results;
  };

  const handleCompare = async () => {
    if (!inputFile || !outputFile) {
      setError('Please upload both input and output files');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const results = findMatchingRows(inputFile, outputFile);
      setMatchResults(results);
    } catch {
      setError('Failed to compare files');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResults = () => {
    if (matchResults.length === 0) return;

    const csvContent = [
      ['Input Row', 'Output Row', 'Match Type', 'Is Match', 'Differences'].join(','),
      ...matchResults.map(result => [
        `"${result.inputRow.join(',')}"`,
        `"${result.outputRow?.join(',') || 'No Match'}"`,
        result.matchType,
        result.isMatch ? 'Yes' : 'No',
        `"${result.differences.join('; ')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `file-matching-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getMatchIcon = (matchType: string) => {
    switch (matchType) {
      case 'exact':
        return <FiCheckCircle className="w-5 h-5 text-green-500" />;
      case 'partial':
        return <FiAlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <FiXCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getMatchColor = (matchType: string) => {
    switch (matchType) {
      case 'exact':
        return 'bg-green-50 border-green-200';
      case 'partial':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-red-50 border-red-200';
    }
  };

  return (
    <>
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.4s ease-out;
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      <div className="w-full h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
        <div className="max-w-6xl mx-auto p-4">
        {/* Header Section */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl mb-3 shadow-md">
            <FiBarChart className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-2">
            File Matching
          </h1>
          <p className="text-sm text-gray-600 max-w-xl mx-auto">
            Compare and match CSV files to find differences and similarities
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* File Upload Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Input File */}
          <div className="group animate-slideIn">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                  <FiFileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Input File</h3>
                  <p className="text-xs text-gray-500">Super Bank CSV</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 group-hover:scale-[1.02]">
                  <input
                    ref={inputFileRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'input');
                    }}
                    className="hidden"
                  />
                  <button
                    onClick={() => inputFileRef.current?.click()}
                    className="flex flex-col items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300">
                      <FiUpload className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-sm">Upload Input File</span>
                    <span className="text-xs text-gray-500">CSV files only</span>
                  </button>
                </div>
                
                {inputFile && (
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 animate-fadeIn">
                    <div className="flex items-center gap-2 mb-1">
                      <FiFileText className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-blue-900 text-sm">{inputFile.fileName}</span>
                    </div>
                    <div className="text-xs text-blue-700 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <FiTrendingUp className="w-3 h-3" />
                        {inputFile.rows.length} rows
                      </span>
                      <span className="flex items-center gap-1">
                        <FiBarChart className="w-3 h-3" />
                        {inputFile.headers.length} columns
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Output File */}
          <div className="group animate-slideIn" style={{ animationDelay: '0.2s' }}>
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
                  <FiFileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Output File</h3>
                  <p className="text-xs text-gray-500">To Compare</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-green-400 hover:bg-green-50/50 transition-all duration-300 group-hover:scale-[1.02]">
                  <input
                    ref={outputFileRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'output');
                    }}
                    className="hidden"
                  />
                  <button
                    onClick={() => outputFileRef.current?.click()}
                    className="flex flex-col items-center gap-2 text-gray-600 hover:text-green-600 transition-colors"
                  >
                    <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-green-200 rounded-xl flex items-center justify-center group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300">
                      <FiUpload className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-sm">Upload Output File</span>
                    <span className="text-xs text-gray-500">CSV files only</span>
                  </button>
                </div>
                
                {outputFile && (
                  <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200 animate-fadeIn">
                    <div className="flex items-center gap-2 mb-1">
                      <FiFileText className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-green-900 text-sm">{outputFile.fileName}</span>
                    </div>
                    <div className="text-xs text-green-700 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <FiTrendingUp className="w-3 h-3" />
                        {outputFile.rows.length} rows
                      </span>
                      <span className="flex items-center gap-1">
                        <FiBarChart className="w-3 h-3" />
                        {outputFile.headers.length} columns
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Compare Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={handleCompare}
            disabled={!inputFile || !outputFile || isProcessing}
            className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white rounded-xl font-semibold text-base hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:hover:scale-100 disabled:hover:shadow-md flex items-center gap-2 shadow-md"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="relative z-10">Analyzing...</span>
              </>
            ) : (
              <>
                <FiCheckCircle className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Compare Files</span>
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {matchResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-fadeIn">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                    <FiBarChart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Comparison Results</h3>
                    <p className="text-sm text-gray-600">Analysis completed successfully</p>
                  </div>
                </div>
                <button
                  onClick={downloadResults}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 shadow-md flex items-center gap-2 text-sm font-semibold"
                >
                  <FiDownload className="w-4 h-4" />
                  Download
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-md">
                    <FiCheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {matchResults.filter(r => r.matchType === 'exact').length}
                  </div>
                  <div className="text-xs font-semibold text-green-700">Exact Matches</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200 hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-md">
                    <FiAlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-600 mb-1">
                    {matchResults.filter(r => r.matchType === 'partial').length}
                  </div>
                  <div className="text-xs font-semibold text-yellow-700">Partial Matches</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200 hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-md">
                    <FiXCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-red-600 mb-1">
                    {matchResults.filter(r => r.matchType === 'no-match').length}
                  </div>
                  <div className="text-xs font-semibold text-red-700">No Matches</div>
                </div>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {matchResults.map((result, index) => (
                <div key={index} className={`p-4 border-b border-gray-100 hover:bg-gray-50/50 transition-all duration-200 ${getMatchColor(result.matchType)}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${
                        result.matchType === 'exact' ? 'bg-green-100' :
                        result.matchType === 'partial' ? 'bg-yellow-100' :
                        'bg-red-100'
                      }`}>
                        {getMatchIcon(result.matchType)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-gray-900">
                          Row {index + 1}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                          result.matchType === 'exact' ? 'bg-green-100 text-green-800' :
                          result.matchType === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {result.matchType.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Input Data
                          </div>
                          <div className="text-gray-600 font-mono text-xs bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                            {result.inputRow.join(', ')}
                          </div>
                        </div>
                        
                        <div>
                          <div className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Output Data
                          </div>
                          <div className="text-gray-600 font-mono text-xs bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                            {result.outputRow ? result.outputRow.join(', ') : 'No match found'}
                          </div>
                        </div>
                      </div>
                      
                      {result.differences.length > 0 && (
                        <div className="mt-3">
                          <div className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                            <FiAlertCircle className="w-3 h-3 text-orange-500" />
                            Differences
                          </div>
                          <div className="text-xs text-gray-600 bg-orange-50 p-2 rounded-lg border border-orange-200">
                            {result.differences.join('; ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
}
