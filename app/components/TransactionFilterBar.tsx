import React from 'react';
import { FiDownload, FiSearch, FiCalendar } from 'react-icons/fi';

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
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 flex items-center justify-between gap-4 w-full">
    {/* Left side - Search and filters */}
    <div className="flex items-center gap-4 flex-1 flex-wrap">
      {/* Search Input with Icon */}
      <div className="relative flex-1 min-w-[200px]">
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search..."
          className="border border-gray-300 px-3 py-2 pl-10 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>
      
      {/* Search Field Dropdown */}
      {searchFieldOptions && onSearchFieldChange && (
        <div className="relative">
          <select
            value={searchField}
            onChange={e => onSearchFieldChange(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded-lg text-sm min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            {searchFieldOptions.map(opt => (
              <option key={opt} value={opt}>{opt === 'all' ? 'All Fields' : opt}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="border border-gray-300 px-3 py-2 rounded-lg text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            {(typeof sortOrderOptions !== 'undefined' ? sortOrderOptions : [
              { value: 'desc', label: 'Latest First' },
              { value: 'asc', label: 'Oldest First' },
            ]).map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}
      
      {/* Date Range Inputs */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="date"
            className="border border-gray-300 px-3 py-2 pl-10 rounded-lg text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={dateRange.from}
            onChange={e => onDateRangeChange({ ...dateRange, from: e.target.value })}
            placeholder="From"
          />
        </div>
        <span className="text-gray-400">to</span>
        <div className="relative">
          <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="date"
            className="border border-gray-300 px-3 py-2 pl-10 rounded-lg text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={dateRange.to}
            onChange={e => onDateRangeChange({ ...dateRange, to: e.target.value })}
            placeholder="To"
          />
        </div>
      </div>
    </div>
    
    {/* Right side - Download button */}
    <div className="flex items-center">
      <button
        className="flex items-center justify-center bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white rounded-lg shadow-sm px-4 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onDownload}
        disabled={downloadDisabled}
        title="Download"
      >
        <FiDownload size={16} className="mr-2" />
        Download
      </button>
    </div>
  </div>
);

export default TransactionFilterBar; 