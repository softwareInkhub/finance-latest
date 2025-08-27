import React from 'react';
import { FiSearch, FiCalendar, FiDownload } from 'react-icons/fi';

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
  selectedCount?: number;
  onDeselectAll?: () => void;
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
  selectedCount = 0,
  onDeselectAll,
}) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 mb-2 flex items-center justify-between gap-2 w-full">
    {/* Left side - Search and filters */}
    <div className="flex items-center gap-2 flex-1 flex-wrap">
      {/* Search Input with Icon */}
      <div className="relative w-48">
        <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
        <input
          type="text"
          placeholder="Search..."
          className="border border-gray-300 px-2 py-0.5 pl-8 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          title="Search transactions by description, reference number, or any other field"
        />
      </div>
      
      {/* Search Field Dropdown */}
      {searchFieldOptions && onSearchFieldChange && (
        <div className="relative">
          <select
            value={searchField}
            onChange={e => onSearchFieldChange(e.target.value)}
            className="border border-gray-300 px-2 py-0.5 rounded text-sm min-w-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            title="Select which field to search in"
          >
            {searchFieldOptions.map(opt => (
              <option key={opt} value={opt}>{opt === 'all' ? 'All Fields' : opt}</option>
            ))}
          </select>
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}
      
      {/* Sort Order Dropdown */}
      {onSortOrderChange && (
        <div className="relative">
          <select
            value={sortOrder}
            onChange={e => onSortOrderChange(e.target.value as SortOrderType)}
            className="border border-gray-300 px-2 py-0.5 rounded text-sm min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            title="Sort transactions by date or other criteria"
          >
            {(typeof sortOrderOptions !== 'undefined' ? sortOrderOptions : [
              { value: 'desc', label: 'Latest First' },
              { value: 'asc', label: 'Oldest First' },
            ]).map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}
      
      {/* Date Range Inputs */}
      <div className="flex items-center gap-1">
        <div className="relative">
          <FiCalendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
          <input
            type="date"
            className="border border-gray-300 px-2 py-0.5 pl-7 rounded text-sm min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={dateRange.from}
            onChange={e => onDateRangeChange({ ...dateRange, from: e.target.value })}
            placeholder="From"
            title="Select start date for filtering transactions"
          />
        </div>
        <span className="text-gray-400 text-xs">to</span>
        <div className="relative">
          <FiCalendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
          <input
            type="date"
            className="border border-gray-300 px-2 py-0.5 pl-7 rounded text-sm min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={dateRange.to}
            onChange={e => onDateRangeChange({ ...dateRange, to: e.target.value })}
            placeholder="To"
            title="Select end date for filtering transactions"
          />
        </div>
      </div>
    </div>
    
    {/* Right side - Selection actions and Report button */}
    <div className="flex items-center gap-2">
      {/* Deselect All button */}
      {selectedCount > 0 && onDeselectAll && (
        <button
          className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors border border-gray-300"
          onClick={onDeselectAll}
          title="Deselect all transactions"
        >
          Deselect All
        </button>
      )}
      

      <button
        className="px-3 py-0.5 rounded bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center text-white text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed gap-1"
        onClick={onDownload}
        disabled={downloadDisabled}
        title="Generate and download a comprehensive transaction report"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
      >
        <FiDownload size={14} />
        <span>Report</span>
      </button>
    </div>
  </div>
);

export default TransactionFilterBar; 