import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import Papa from 'papaparse';

interface TransactionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string | null;
  transactionData: Record<string, string | Tag[] | undefined>[];
  fileName?: string;
  accountNumber?: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

const TransactionPreviewModal: React.FC<TransactionPreviewModalProps> = ({ isOpen, onClose, transactionId, transactionData, fileName, accountNumber }) => {
  const [data, setData] = useState<Record<string, string | Tag[] | undefined>[]>([]);
  const [filteredData, setFilteredData] = useState<Record<string, string | Tag[] | undefined>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setSearch('');
    setSelectedRows(new Set());
    setSelectAll(false);
    setSelectedTagId('');
    // Fetch all tags
    fetch('/api/tags')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setAllTags(data); else setAllTags([]); })
      .catch(() => setAllTags([]))
      .finally(() => setLoading(false));
  }, [isOpen, transactionData]);

  // After fetching allTags, normalize tags in data
  useEffect(() => {
    if (!isOpen || allTags.length === 0) return;
    setData(transactionData.map(obj => {
      const tags = Array.isArray(obj.tags) ? obj.tags : [];
      const mappedTags = tags.map((tag: Tag | string) => {
        if (typeof tag === 'string') {
          return allTags.find(t => t.id === tag) || { id: tag, name: tag, color: '#60a5fa' };
        }
        if (!tag.name || !tag.color) {
          const found = allTags.find(t => t.id === tag.id);
          return found ? found : { ...tag, color: '#60a5fa' };
        }
        return tag;
      });
      return { ...obj, tags: mappedTags };
    }));
  }, [allTags, isOpen, transactionData]);

  useEffect(() => {
    if (!data.length) return;
    let rows = data;
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      rows = rows.filter(row => Object.values(row).some(cell => String(cell).toLowerCase().includes(s)));
    }
    setFilteredData(rows);
  }, [data, search]);

  useEffect(() => {
    if (!filteredData.length) return;
    if (selectAll) {
      setSelectedRows(new Set(filteredData.map((_, i) => i)));
    } else {
      setSelectedRows(new Set());
    }
  }, [selectAll, filteredData.length, filteredData]);

  const handleRowSelect = (idx: number) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setSelectedRows(newSet);
    setSelectAll(newSet.size === filteredData.length);
  };

  const handleSelectAll = () => {
    setSelectAll(!selectAll);
  };

  const handleCopy = () => {
    if (!filteredData.length) return;
    const rows = Array.from(selectedRows).map(i => filteredData[i]);
    const csv = Papa.unparse(rows);
    navigator.clipboard.writeText(csv);
  };

  const handleDelete = () => {
    if (!filteredData.length) return;
    const toDelete = new Set(selectedRows);
    const newRows = filteredData.filter((_, i) => !toDelete.has(i));
    setData(newRows);
    setSelectedRows(new Set());
    setSelectAll(false);
  };

  const handleAddTag = () => {
    if (!selectedTagId || !filteredData.length) return;
    const tagObj = allTags.find(t => t.id === selectedTagId);
    if (!tagObj) return;
    const newRows = data.map((row, i) => {
      if (selectedRows.has(i)) {
        const tags = Array.isArray(row.tags) ? [...row.tags] : [];
        if (!tags.some((t: Tag) => t.id === tagObj.id)) tags.push(tagObj);
        return { ...row, tags };
      }
      return row;
    });
    setData(newRows);
    setSelectedTagId('');
  };

  const handleRemoveTag = (rowIdx: number, tagIdToRemove: string) => {
    const newRows = data.map((row, i) => {
      if (i === rowIdx) {
        return { ...row, tags: Array.isArray(row.tags) ? row.tags.filter((t: Tag) => t.id !== tagIdToRemove) : [] };
      }
      return row;
    });
    setData(newRows);
  };

  const handleSave = async () => {
    if (!data.length) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Convert tags to IDs for storage
      const dataWithTagIds: Array<{ id: string; tags: string[]; [key: string]: unknown }> = data.map((row: Record<string, unknown>) => ({
        ...row,
        id: row.id as string,
        tags: Array.isArray(row.tags) ? (row.tags as Tag[]).map((tag: Tag) => tag.id) : [],
      }));
      // Get bankName and accountNumber from the first row data
      const bankName = (dataWithTagIds[0] as Record<string, unknown>)?.bankName;
      if (!bankName) {
        throw new Error('Bank name not found in transaction data');
      }
      const accountNumberFromData = (dataWithTagIds[0] as Record<string, unknown>)?.accountNumber;
      const finalAccountNumber = accountNumber || accountNumberFromData;
      // Prepare bulk update payload
      const bulkUpdates = dataWithTagIds
        .filter(row => typeof row.id === 'string' && row.id)
        .map(row => ({
          transactionId: row.id as string,
          transactionData: row,
          tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
          bankName,
          accountNumber: finalAccountNumber
        }));
      const res = await fetch('/api/transaction/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: bulkUpdates })
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to save transactions');
      }
      type BulkResult = { transactionId: string; success: boolean; error?: string };
      const failed: BulkResult[] = result.results ? (result.results as BulkResult[]).filter((r) => !r.success) : [];
      if (failed.length > 0) {
        setSaveError(`${failed.length} transaction(s) failed to save. Please retry.`);
        // Optionally, you could store failed for retry logic
      } else {
        setSaveError(null);
        alert('All transactions saved successfully!');
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save transactions');
    } finally {
      setSaving(false);
    }
  };

  const headers = data.length ? Object.keys(data[0]).filter(h => h !== 'tags') : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transaction Preview">
      {fileName && (
        <div className="mb-4 text-gray-700 font-semibold text-lg">{fileName}</div>
      )}
      <div className="flex flex-wrap gap-2 mb-2 items-center">
        <input
          type="text"
          placeholder="Search..."
          className="border px-2 py-1 rounded"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {selectedRows.size > 0 && (
          <div className="flex gap-2 items-center bg-gray-100 px-2 py-1 rounded">
            <span>{selectedRows.size} selected</span>
            <select
              className="border px-1 py-0.5 rounded text-xs"
              value={selectedTagId}
              onChange={e => setSelectedTagId(e.target.value)}
            >
              <option value="">Add tag...</option>
              {allTags.map(tag => (
                <option key={tag.id} value={tag.id} style={{ background: tag.color, color: '#222' }}>{tag.name}</option>
              ))}
            </select>
            <button className="px-2 py-1 bg-green-600 text-white rounded text-xs" onClick={handleAddTag}>Add Tag</button>
            <button className="px-2 py-1 bg-blue-600 text-white rounded text-xs" onClick={handleCopy}>Copy</button>
            <button className="px-2 py-1 bg-red-600 text-white rounded text-xs" onClick={handleDelete}>Delete</button>
          </div>
        )}
      </div>
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <>
          {filteredData.length > 0 ? (
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="min-w-full border text-sm">
                <thead className="sticky top-0 bg-white z-10">
                  <tr>
                    <th className="border px-2 py-1 bg-gray-50">
                      <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                    </th>
                    {headers.map((header, colIdx) => (
                      <th key={colIdx} className="border px-2 py-1 font-bold bg-gray-100">{header}</th>
                    ))}
                    <th className="border px-2 py-1 font-bold bg-gray-100">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, i) => {
                    // Neutral row background (no CR/DR colors)
                    const rowClass = selectedRows.has(i) ? 'bg-blue-50' : (i % 2 === 0 ? 'bg-white' : 'bg-gray-50');

                    return (
                      <tr key={i} className={rowClass}>
                        <td className="border px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(i)}
                            onChange={() => handleRowSelect(i)}
                          />
                        </td>
                        {headers.map((header, j) => (
                          <td key={j} className="border px-2 py-1 whitespace-nowrap text-gray-900 dark:text-gray-100">
                            {String(row[header])}
                          </td>
                        ))}
                        <td className="border px-2 py-1 whitespace-nowrap">
                          {Array.isArray(row.tags) && row.tags.length > 0 ? row.tags.map((tag: Tag, tagIdx: number) => (
                            <span key={tag.id + '-' + tagIdx} className="inline-block text-xs px-2 py-0.5 rounded mr-1 mb-1" style={{ background: tag.color, color: '#222' }}>
                              {tag.name}
                              <button
                                type="button"
                                className="ml-1 text-red-500 hover:text-red-700 font-bold focus:outline-none"
                                title="Remove tag"
                                onClick={e => { e.stopPropagation(); handleRemoveTag(i, tag.id); }}
                              >
                                ×
                              </button>
                            </span>
                          )) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-500">
              No data to display.
            </div>
          )}
          <div className="flex justify-end mt-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={handleSave}
              disabled={saving || !transactionId}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            {saveError && <span className="text-red-600 ml-4">{saveError}</span>}
          </div>
        </>
      )}
    </Modal>
  );
};

export default TransactionPreviewModal;
