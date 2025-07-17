'use client'
import { useState } from 'react';
import { FiDownload, FiLoader } from 'react-icons/fi';
import { convertPdfToCsv, usePdfWorker } from '../converter/pdfToCsv';
import { convertPdfToHtml } from '../converter/pdfToHtml';
import { convertCsvToXlsx } from '../converter/csvToXlsx';
import { convertCsvToJson } from '../converter/csvToJson';
import { convertJsonToCsv } from '../converter/jsonToCsv';
import { convertTxtToCsv } from '../converter/txtToCsv';
import { convertTxtToJson } from '../converter/txtToJson';
import { convertTxtToPdf } from '../converter/txtToPdf';
import { convertCsvToTxt } from '../converter/csvToTxt';
import { convertCsvToPdf } from '../converter/csvToPdf';
import { convertJsonToTxt } from '../converter/jsonToTxt';
import { convertHtmlToTxt } from '../converter/htmlToTxt';
import { convertHtmlToCsv } from '../converter/htmlToCsv';
import { convertPdfToTxt } from '../converter/pdfToTxt';
import { convertPdfToXlsx } from '../converter/pdfToXlsx';
import FileUploader from './FileUploader';
import React from 'react';
import Image from 'next/image';

const conversionMap: Record<string, string[]> = {
  TXT: ['PDF', 'DOC', 'CSV', 'HTML', 'RTF', 'XML', 'JSON'],
  CSV: ['XLSX', 'PDF', 'TXT', 'JSON', 'XML', 'HTML'],
  PDF: ['DOC', 'TXT', 'CSV', 'XLSX', 'HTML', 'JPG/PNG'],
  'DOC/DOCX': ['PDF', 'TXT', 'HTML', 'RTF', 'ODT'],
  'XLS/XLSX': ['CSV', 'PDF', 'TXT', 'HTML', 'ODS'],
  HTML: ['PDF', 'DOC', 'TXT', 'CSV'],
  'JSON/XML': ['CSV', 'XLSX', 'TXT', 'PDF'],
  RTF: ['DOC', 'PDF', 'TXT'],
};

const conversionFunctions: Record<string, (file: File, pageSize?: string) => Promise<string | Blob>> = {
  'PDF-CSV': convertPdfToCsv,
  'PDF-HTML': convertPdfToHtml,
  'PDF-TXT': convertPdfToTxt,
  'PDF-XLSX': convertPdfToXlsx,
  'CSV-XLSX': convertCsvToXlsx,
  'CSV-JSON': convertCsvToJson,
  'CSV-TXT': convertCsvToTxt,
  'CSV-PDF': convertCsvToPdf,
  'TXT-CSV': convertTxtToCsv,
  'TXT-JSON': convertTxtToJson,
  'TXT-PDF': convertTxtToPdf,
  'JSON-CSV': convertJsonToCsv,
  'JSON-TXT': convertJsonToTxt,
  'HTML-TXT': convertHtmlToTxt,
  'HTML-CSV': convertHtmlToCsv,
};

const PAGE_SIZES = [
  { label: 'A4', value: 'a4' },
  { label: 'Letter', value: 'letter' },
  { label: 'Legal', value: 'legal' },
];

function Preview({ result, outputType }: { result: string | Blob | null, outputType: string }) {
  if (!result) return null;
  if (outputType === 'TXT' || outputType === 'CSV') {
    return <pre className="bg-gray-100 rounded p-4 overflow-x-auto max-h-64 whitespace-pre-wrap">{typeof result === 'string' ? result.slice(0, 5000) : 'Preview not available for large files.'}</pre>;
  }
  if (outputType === 'JSON') {
    let json = '';
    try {
      json = typeof result === 'string' ? JSON.stringify(JSON.parse(result), null, 2) : '';
    } catch {
      json = typeof result === 'string' ? result : '';
    }
    return <pre className="bg-gray-100 rounded p-4 overflow-x-auto max-h-64 whitespace-pre-wrap text-green-700">{json.slice(0, 5000)}</pre>;
  }
  if (outputType === 'HTML') {
    return (
      <div className="bg-gray-50 rounded p-2 max-h-64 overflow-auto border">
        <iframe
          srcDoc={typeof result === 'string' ? result : ''}
          title="HTML Preview"
          className="w-full h-48 border-none"
          sandbox="allow-same-origin"
        />
      </div>
    );
  }
  if (outputType === 'XLSX') {
    // XLSX preview: show as table (first 10 rows)
    return <div className="bg-gray-100 rounded p-4 text-sm text-gray-700">XLSX file ready. Download to view.</div>;
  }
  if (outputType === 'PNG' || outputType === 'JPG' || outputType === 'JPEG') {
    // Show image preview if result is a Blob (single image)
    if (result instanceof Blob) {
      const url = URL.createObjectURL(result);
      return (
        <div className="relative w-full h-48">
          <Image
            src={url}
            alt="Preview"
            fill
            className="object-contain rounded shadow"
            onLoad={() => URL.revokeObjectURL(url)}
          />
        </div>
      );
    }
    return <div className="text-gray-500">Image(s) ready. Download to view all.</div>;
  }
  return null;
}

function Modal({ open, onClose, children }: { open: boolean, onClose: () => void, children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blur bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative modal-fade">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}

export default function Converter() {
  const [inputType, setInputType] = useState('');
  const [outputType, setOutputType] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | Blob | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pageSize, setPageSize] = useState('a4');

  // Initialize PDF worker
  usePdfWorker();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
  };

  const handleConvert = async () => {
    if (!selectedFile || !inputType || !outputType) return;
    setIsConverting(true);
    setError(null);
    try {
      const key = `${inputType}-${outputType}`;
      const fn = conversionFunctions[key];
      if (fn) {
        const res = fn.length === 2 ? await fn(selectedFile, pageSize) : await fn(selectedFile);
        setResult(res);
      } else {
        setError('This conversion is not implemented yet.');
      }
    } catch (err) {
      setError('Failed to convert file. Please try again.');
      console.error(err);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    let blob: Blob;
    const filename = `converted.${outputType.toLowerCase()}`;
    if (result instanceof Blob) {
      blob = result;
    } else {
      blob = new Blob([result], { type: 'text/plain' });
      if (outputType === 'CSV') blob = new Blob([result], { type: 'text/csv' });
      if (outputType === 'JSON') blob = new Blob([result], { type: 'application/json' });
      if (outputType === 'PDF') blob = new Blob([result], { type: 'application/pdf' });
      if (outputType === 'XLSX') blob = new Blob([result], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      if (outputType === 'HTML') blob = new Blob([result], { type: 'text/html' });
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="card-glass shadow-lg p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">File Converter</h1>
          <p className="text-gray-600">Select file types and convert your files easily</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
          <div>
            <label className="block text-sm font-medium mb-1">Input Type</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={inputType}
              onChange={e => {
                setInputType(e.target.value);
                setOutputType('');
                setSelectedFile(null);
                setResult(null);
                setError(null);
              }}
            >
              <option value="">Select</option>
              {Object.keys(conversionMap).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Output Type</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={outputType}
              onChange={e => setOutputType(e.target.value)}
              disabled={!inputType}
            >
              <option value="">Select</option>
              {inputType && conversionMap[inputType].map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Page Size</label>
            <select
              className="border rounded px-3 py-2 w-40"
              value={pageSize}
              onChange={e => setPageSize(e.target.value)}
            >
              {PAGE_SIZES.map(size => (
                <option key={size.value} value={size.value}>{size.label}</option>
              ))}
            </select>
          </div>
        </div>
        {inputType && outputType && (
          <FileUploader onFileSelect={handleFileSelect} acceptedFileTypes={'.' + inputType.toLowerCase().replace(/\/.*/, '')} />
        )}
        {selectedFile && (
          <div className="flex justify-center">
            <button
              onClick={handleConvert}
              className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              disabled={isConverting}
            >
              {isConverting ? <FiLoader className="animate-spin" /> : null}
              <span>{isConverting ? 'Converting...' : 'Convert'}</span>
            </button>
          </div>
        )}
        {error && (
          <div className="text-red-500 text-center text-sm">
            {error}
          </div>
        )}
        {result && !isConverting && (
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setPreviewOpen(true)}
              className="flex items-center space-x-2 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <span>Preview</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              <FiDownload />
              <span>Download</span>
            </button>
          </div>
        )}
        <Modal open={previewOpen} onClose={() => setPreviewOpen(false)}>
          <h2 className="text-xl font-bold mb-4">Preview</h2>
          <Preview result={result} outputType={outputType} />
        </Modal>
      </div>
    </div>
  );
} 