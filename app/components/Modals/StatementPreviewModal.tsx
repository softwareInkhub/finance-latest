import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import {  FiColumns } from 'react-icons/fi';

interface StatementPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  s3FileUrl: string | null;
  statementId: string | null;
  bankId: string | null;
  accountId: string | null;
  accountNumber?: string;
  fileName?: string;
}

interface Bank {
  id: string;
  bankName: string;
}

const SlicedPreviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  data: string[][];
  onSave: (duplicateCheckFields: string[], previewData: string[][]) => void;
  saving: boolean;
  saveError: string | null;
  startRow: number;
}> = ({ isOpen, onClose, data, onSave, saving, saveError }) => {
  const [selectedFields, setSelectedFields] = React.useState<string[]>(() =>
    data.length > 0 ? data[0].slice(0, 3) : [] // default: first 3 fields
  );
  useEffect(() => {
    if (data.length > 0) setSelectedFields(data[0].slice(0, 3));
  }, [data]);

  // Delimit state and logic
  const [delimitDialogOpen, setDelimitDialogOpen] = useState(false);
  const [delimitColIdx, setDelimitColIdx] = useState<number | null>(null);
  const [delimiter, setDelimiter] = useState<string>(' ');
  const [newColNames, setNewColNames] = useState<string[]>(['Date', 'Time']);
  const [delimitPreview, setDelimitPreview] = useState<string[][] | null>(null);
  const [delimitError, setDelimitError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<string[][]>(data);

  const handleDelimitPreview = () => {
    setDelimitError(null);
    if (delimitColIdx === null || !delimiter) {
      setDelimitError('Select a column and delimiter.');
      return;
    }
    const header = [...previewData[0]];
    const rows = previewData.slice(1);
    const newRows = rows.map(row => {
      const cell = row[delimitColIdx] || '';
      let parts: string[];
      if (delimiter === '\\s+' || (delimiter.startsWith('/') && delimiter.endsWith('/'))) {
        let regex: RegExp;
        if (delimiter === '\\s+') {
          regex = /\s+/;
        } else {
          regex = new RegExp(delimiter.slice(1, -1));
        }
        parts = cell.split(regex);
      } else {
        parts = cell.split(delimiter);
      }
      const newParts = newColNames.map((_, i) => parts[i] || '');
      const newRow = [...row];
      newRow.splice(delimitColIdx, 1, ...newParts);
      return newRow;
    });
    const newHeader = [...header];
    newHeader.splice(delimitColIdx, 1, ...newColNames);
    setDelimitPreview([newHeader, ...newRows]);
  };

  const handleDelimitSave = () => {
    if (!delimitPreview) return;
    setPreviewData(delimitPreview);
    setDelimitDialogOpen(false);
    setDelimitPreview(null);
    setDelimitColIdx(null);
    setNewColNames(['Date', 'Time']);
    setDelimiter(' ');
  };

  return (
  <Modal isOpen={isOpen} onClose={onClose} title="Sliced Transactions Preview">
      <div className="mb-2">
        <div className="font-semibold mb-1">Select fields to check for duplicate transaction:</div>
        <div className="flex flex-wrap gap-2 mb-2">
          {previewData.length > 0 && previewData[0].map((header, idx) => (
            <label key={header + '-' + idx} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFields.includes(header + '-' + idx)}
                onChange={e => {
                  setSelectedFields(fields =>
                    e.target.checked
                      ? [...fields, header + '-' + idx]
                      : fields.filter(f => f !== header + '-' + idx)
                  );
                }}
              />
              {header}
            </label>
          ))}
        </div>
        <button
          className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs mb-2"
          onClick={() => setDelimitDialogOpen(true)}
          disabled={previewData.length === 0}
          title="Delimit a column (e.g., split date/time)"
        >
          <FiColumns /> Delimit Column
        </button>
      </div>
    <div className="overflow-x-auto max-h-[70vh]">
      <table className="min-w-full border text-sm bg-blue-50">
          {previewData.length > 0 && (
            <thead>
              <tr>
                {previewData[0].map((cell, j) => (
                  <th key={j} className="border px-2 py-1 font-bold bg-gray-100">{cell}</th>
                ))}
              </tr>
            </thead>
          )}
        <tbody>
            {previewData.slice(1).map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="border px-2 py-1 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="flex justify-end mt-4 space-x-2">
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          onClick={() => onSave(selectedFields, previewData)}
          disabled={saving || selectedFields.length === 0}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      <button
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        onClick={onClose}
        disabled={saving}
      >
        Cancel
      </button>
    </div>
    {saveError && <div className="text-red-600 mt-2">{saveError}</div>}
      {/* Delimit Dialog */}
      {delimitDialogOpen && (
        <Modal isOpen={delimitDialogOpen} onClose={() => setDelimitDialogOpen(false)} title="Delimit Column" maxWidthClass="max-w-sm">
          <div className="mb-2">
            <label className="block mb-1 font-medium text-sm">Select column to delimit:</label>
            <select
              className="w-full border rounded px-2 py-1 mb-2"
              value={delimitColIdx ?? ''}
              onChange={e => setDelimitColIdx(Number(e.target.value))}
            >
              <option value="" disabled>Select column</option>
              {previewData[0].map((col, idx) => (
                <option key={col + idx} value={idx}>{col}</option>
              ))}
            </select>
            <label className="block mb-1 font-medium text-sm">Delimiter:</label>
            <input
              className="w-full border rounded px-2 py-1 mb-2"
              value={delimiter}
              onChange={e => setDelimiter(e.target.value)}
              placeholder="e.g. space, /, -"
            />
            <label className="block mb-1 font-medium text-sm">New column names (comma separated):</label>
            <input
              className="w-full border rounded px-2 py-1 mb-2"
              value={newColNames.join(',')}
              onChange={e => setNewColNames(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="e.g. Date,Time"
            />
            <button
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
              onClick={handleDelimitPreview}
              type="button"
            >Preview</button>
            {delimitError && <div className="text-red-600 mt-1 text-xs">{delimitError}</div>}
          </div>
          {delimitPreview && (
            <div className="overflow-x-auto max-h-40 border rounded mb-2">
              <table className="min-w-full border text-xs">
                <tbody>
                  {delimitPreview.slice(0, 6).map((row, i) => (
                    <tr key={i}>{row.map((cell, j) => <td key={j} className="border px-2 py-1">{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
              <div className="text-xs text-gray-500">Previewing first 5 rows.</div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
              onClick={handleDelimitSave}
              disabled={!delimitPreview}
            >Save</button>
            <button
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs"
              onClick={() => setDelimitDialogOpen(false)}
            >Cancel</button>
          </div>
        </Modal>
      )}
  </Modal>
);
};

const StatementPreviewModal: React.FC<StatementPreviewModalProps> = ({ isOpen, onClose, s3FileUrl, statementId, bankId, accountId, accountNumber, fileName }) => {
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [headerRow, setHeaderRow] = useState<number | null>(null);
  const [startRow, setStartRow] = useState<number | null>(null);
  const [endRow, setEndRow] = useState<number | null>(null);
  const [showSliceModal, setShowSliceModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectionStep, setSelectionStep] = useState<'header' | 'transactions'>('header');
  const [bankName, setBankName] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [duplicateCheckFields, setDuplicateCheckFields] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen || !statementId) return;
    setLoading(true);
    setError(null);
    setHeaderRow(null);
    setStartRow(null);
    setEndRow(null);
    setShowSliceModal(false);
    setSelectionStep('header');

    const userId = localStorage.getItem("userId") || "";
    if (!userId) {
      setError('User not found');
      setLoading(false);
      return;
    }

    // Use the new BRMH Drive download API
    fetch(`/api/files/download?userId=${userId}&fileId=${statementId}`)
      .then(res => res.json())
      .then((result) => {
        if (result.error) throw new Error(result.error);
        if (!result.downloadUrl) throw new Error('No download URL received');
        
        // Fetch the actual file content from the S3 URL
        return fetch(result.downloadUrl);
      })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
        return res.text();
      })
      .then((csvText) => {
        const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
        
        if (parsed.errors.length) throw new Error('Failed to parse CSV');
        setData(parsed.data as string[][]);
      })
      .catch(err => {
        console.error('Preview error:', err);
        setError('Failed to load file preview: ' + err.message);
      })
      .finally(() => setLoading(false));
  }, [isOpen, statementId]);

  useEffect(() => {
    if (!bankId) return;
    fetch(`/api/bank`)
      .then(res => res.json())
      .then((banks) => {
        const bank = Array.isArray(banks) ? banks.find((b: Bank) => b.id === bankId) : null;
        setBankName(bank?.bankName || "");
      });
  }, [bankId]);

  useEffect(() => {
    if (!accountId) return;
    fetch(`/api/account?accountId=${accountId}`)
      .then(res => res.json())
      .then((account) => {
        setAccountName(account?.accountName || account?.accountHolderName || "");
      });
  }, [accountId]);

  const handleSlice = () => {
    setShowSliceModal(true);
    setSaveError(null);
  };

  const handleSave = async (fields?: string[], previewDataOverride?: string[][]) => {
    if (startRow === null || endRow === null || headerRow === null || !s3FileUrl || !statementId || !bankId || !accountId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const baseHeader = (previewDataOverride || data)[0];
      const filteredHeader = baseHeader;
      const filteredRows = (previewDataOverride || data).slice(1);
      const extraCols = ["accountId", "accountName", "accountNumber", "bankId", "bankName"];
      const header = [...filteredHeader, ...extraCols];
      const rows = filteredRows.map(row => [...row, accountId, accountName, accountNumber, bankId, bankName]);
      const finalSliced = [header, ...rows];
      const csv = Papa.unparse(finalSliced);
      const dupFields = (fields || duplicateCheckFields).map(f => {
        const dashIdx = f.lastIndexOf('-');
        return dashIdx !== -1 ? f.slice(0, dashIdx) : f;
      });
      const res = await fetch('/api/transaction/slice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statementId,
          bankId,
          accountId,
          csv,
          startRow,
          endRow,
          headerRow,
          fileName: fileName || '',
          s3FileUrl: s3FileUrl || '',
          userId: localStorage.getItem("userId") || "",
          bankName,
          accountName,
          accountNumber,
          duplicateCheckFields: dupFields,
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save transaction slice');
      }
      setShowSliceModal(false);
      setStartRow(null);
      setEndRow(null);
      setHeaderRow(null);
      setSelectionStep('header');
      setDuplicateCheckFields([]);
      toast.success('Transaction slice saved successfully!');
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save transaction slice');
    } finally {
      setSaving(false);
    }
  };

  const handleHeaderSelect = (rowNumber: number) => {
    setHeaderRow(rowNumber);
    setSelectionStep('transactions');
  };


  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Statement Preview">
        {selectionStep === 'header' && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Step 1: Select Header Row</h3>
            <p className="text-blue-600">Please select the row that contains your column headers.</p>
          </div>
        )}
        {selectionStep === 'transactions' && (
          <div className="mb-4 p-4 bg-green-50 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Step 2: Select Transaction Range</h3>
            <p className="text-green-600">Select the start and end rows for your transactions.</p>
            <div className="flex items-center gap-4 mt-2">
          <span className="inline-flex items-center gap-1 text-sm bg-blue-50 px-2 py-1 rounded">
            Start Row:
            <input
              type="number"
                  min={headerRow !== null ? headerRow + 1 : 1}
              max={data.length - 1}
              className="w-16 px-1 py-0.5 border rounded text-center outline-none focus:ring-2 focus:ring-blue-200"
              value={startRow !== null ? startRow : ''}
              placeholder="-"
              onChange={e => {
                const val = e.target.value;
                if (val === '') {
                  setStartRow(null);
                  setEndRow(null);
                } else {
                  const num = parseInt(val, 10);
                      if (!isNaN(num) && num > (headerRow || 0) && num <= data.length - 1) {
                    setStartRow(num);
                    if (endRow !== null && endRow < num) setEndRow(null);
                  }
                }
              }}
            />
          </span>
          <span className="inline-flex items-center gap-1 text-sm bg-yellow-50 px-2 py-1 rounded">
            End Row:
            <input
              type="number"
                  min={startRow !== null ? startRow + 1 : headerRow !== null ? headerRow + 2 : 2}
              max={data.length - 1}
              className="w-16 px-1 py-0.5 border rounded text-center outline-none focus:ring-2 focus:ring-yellow-200"
              value={endRow !== null ? endRow : ''}
              placeholder="-"
              onChange={e => {
                const val = e.target.value;
                if (val === '') {
                  setEndRow(null);
                } else {
                  const num = parseInt(val, 10);
                  if (
                    !isNaN(num) &&
                    startRow !== null &&
                    num > startRow &&
                    num <= data.length - 1
                  ) {
                    setEndRow(num);
                  }
                }
              }}
              disabled={startRow === null}
            />
          </span>
        </div>
          </div>
        )}
        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : data.length > 0 ? (
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="min-w-full border text-sm">
              <tbody>
                {data.map((row, i) => {
                  const rowNumber = i;
                  const isHeader = headerRow === rowNumber;
                  const isInSlice =
                    startRow !== null && endRow !== null && rowNumber >= startRow && rowNumber <= endRow;
                  const isStart = startRow !== null && rowNumber === startRow;
                  const isEnd = endRow !== null && rowNumber === endRow;
                  return (
                    <tr
                      key={i}
                      className={
                        isHeader
                          ? 'bg-purple-100 border-l-4 border-purple-500'
                          : isStart
                          ? 'bg-green-100 border-l-4 border-green-500'
                          : isEnd
                          ? 'bg-yellow-100 border-r-4 border-yellow-500'
                          : isInSlice
                          ? 'bg-blue-100'
                          : hoveredRow === rowNumber
                          ? 'bg-gray-100'
                          : ''
                      }
                      onMouseEnter={() => setHoveredRow(rowNumber)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      {row.map((cell, j) => (
                        <td key={j} className="border px-2 py-1 whitespace-nowrap relative">
                          {cell}
                          {/* Header selection */}
                          {selectionStep === 'header' && hoveredRow === rowNumber && j === 0 && (
                            <button
                              className="ml-2 px-2 py-1 bg-purple-500 text-white rounded text-xs"
                              onClick={() => handleHeaderSelect(rowNumber)}
                            >
                              Select as Header
                            </button>
                          )}
                          {/* Start/End badges */}
                          {isHeader && j === 0 && (
                            <span className="ml-2 px-2 py-1 bg-purple-500 text-white rounded text-xs">Header</span>
                          )}
                          {isStart && j === 0 && (
                            <span className="ml-2 px-2 py-1 bg-green-500 text-white rounded text-xs">Start</span>
                          )}
                          {isEnd && j === 0 && (
                            <span className="ml-2 px-2 py-1 bg-yellow-500 text-white rounded text-xs">End</span>
                          )}
                          {selectionStep === 'transactions' && hoveredRow === rowNumber && startRow === null && j === 0 && rowNumber > (headerRow || 0) && (
                            <button
                              className="ml-2 px-2 py-1 bg-green-500 text-white rounded text-xs"
                              onClick={() => setStartRow(rowNumber)}
                            >
                              Start
                            </button>
                          )}
                          {selectionStep === 'transactions' && hoveredRow === rowNumber && startRow !== null && endRow === null && rowNumber > startRow && j === 0 && (
                            <button
                              className="ml-2 px-2 py-1 bg-yellow-500 text-white rounded text-xs"
                              onClick={() => setEndRow(rowNumber)}
                            >
                              End
                            </button>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {selectionStep === 'transactions' && (
            <div className="flex justify-end mt-4">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={startRow === null || endRow === null}
                onClick={handleSlice}
              >
                Slice
              </button>
            </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500">No data to display.</div>
        )}
      </Modal>
      {showSliceModal && startRow !== null && endRow !== null && headerRow !== null && (
        <SlicedPreviewModal
          isOpen={showSliceModal}
          onClose={() => setShowSliceModal(false)}
          data={[data[headerRow], ...data.slice(startRow, endRow + 1)]}
          startRow={startRow}
          onSave={(fields, previewData) => { setDuplicateCheckFields(fields); handleSave(fields, previewData); }}
          saving={saving}
          saveError={saveError}
        />
      )}
    </>
  );
};

export default StatementPreviewModal; 