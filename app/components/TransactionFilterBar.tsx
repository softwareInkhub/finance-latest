import React from 'react';
import { FiDownload } from 'react-icons/fi';

type SortOrderType = 'asc' | 'desc' | 'tagged' | 'untagged';

interface TransactionFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  dateRange: { from: string; to: string };
  onDateRangeChange: (range: { from: string; to: string }) => void;
  onDownload: () => void;
  downloadDisabled?: boolean;
  searchField?: string;
  onSearchFieldChange?: (v: string) => void;
  searchFieldOptions?: string[];
  sortOrder?: SortOrderType;
  onSortOrderChange?: (order: SortOrderType) => void;
  sortOrderOptions?: { value: SortOrderType; label: string }[];
}

const TransactionFilterBar: React.FC<TransactionFilterBarProps> = ({
  search,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  onDownload,
  downloadDisabled,
  searchField,
  onSearchFieldChange,
  searchFieldOptions,
  sortOrder = 'desc',
  onSortOrderChange,
  sortOrderOptions,
}) => (
  <div className="bg-white rounded-lg shadow-sm p-2 mb-4 flex items-center justify-between gap-2 w-1/2">
    {/* Left side - Search and filters */}
    <div className="flex items-center gap-3 flex-1">
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search..."
        className="border px-3 py-2 rounded text-sm flex-1 min-w-0"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
      />
      
      {/* Search Field Dropdown */}
      {searchFieldOptions && onSearchFieldChange && (
        <select
          value={searchField}
          onChange={e => onSearchFieldChange(e.target.value)}
          className="border px-3 py-2 rounded text-sm w-24"
        >
          {searchFieldOptions.map(opt => (
            <option key={opt} value={opt}>{opt === 'all' ? 'All' : opt}</option>
          ))}
        </select>
      )}
      
      {/* Sort Order Dropdown */}
      {onSortOrderChange && (
        <select
          value={sortOrder}
          onChange={e => onSortOrderChange(e.target.value as SortOrderType)}
          className="border px-3 py-2 rounded text-sm w-28"
        >
          {(typeof sortOrderOptions !== 'undefined' ? sortOrderOptions : [
            { value: 'desc', label: 'Latest First' },
            { value: 'asc', label: 'Oldest First' },
          ]).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
      
      {/* Date Range Inputs */}
      <input
        type="date"
        className="border px-3 py-2 rounded text-sm w-28"
        value={dateRange.from}
        onChange={e => onDateRangeChange({ ...dateRange, from: e.target.value })}
        placeholder="From"
      />
      <input
        type="date"
        className="border px-3 py-2 rounded text-sm w-28"
        value={dateRange.to}
        onChange={e => onDateRangeChange({ ...dateRange, to: e.target.value })}
        placeholder="To"
      />
    </div>
    
    {/* Right side - Download button */}
    <div className="flex items-center">
      <button
        className="flex items-center justify-center bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white rounded shadow px-2 py-1 text-xs h-7 w-7"
        onClick={onDownload}
        disabled={downloadDisabled}
        title="Download"
      >
        <FiDownload size={14} />
      </button>
    </div>
  </div>
);

export default TransactionFilterBar; 