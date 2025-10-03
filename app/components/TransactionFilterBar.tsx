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
  onRefresh?: () => void;
  refreshDisabled?: boolean;
  onOpenHeader?: () => void;
  onDownloadTransactions?: () => void;
  downloadTransactionsDisabled?: boolean;
  searchField?: string;
  onSearchFieldChange?: (v: string) => void;
  searchFieldOptions?: string[];
  sortOrder?: SortOrderType;
  onSortOrderChange?: (order: SortOrderType) => void;
  sortOrderOptions?: { value: SortOrderType; label: string }[];
  selectedCount?: number;
  onDeselectAll?: () => void;
  /** Optional: show available data date span like "01/01/2023 – 31/12/2023" */
  availableDateSpanText?: string;
}

const TransactionFilterBar: React.FC<TransactionFilterBarProps> = ({
  search,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  onDownload,
  downloadDisabled,
  onRefresh,
  refreshDisabled,
  onOpenHeader,
  onDownloadTransactions,
  downloadTransactionsDisabled,
  searchField,
  onSearchFieldChange,
  searchFieldOptions,
  sortOrder = 'desc',
  onSortOrderChange,
  sortOrderOptions,
  selectedCount = 0,
  onDeselectAll,
  availableDateSpanText,
}) => {
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [tempFrom, setTempFrom] = React.useState<string>(dateRange.from || '');
  const [tempTo, setTempTo] = React.useState<string>(dateRange.to || '');
  const datePopoverRef = React.useRef<HTMLDivElement | null>(null);
  const [showFromCalendar, setShowFromCalendar] = React.useState(false);
  const [showToCalendar, setShowToCalendar] = React.useState(false);

  // Helpers to convert between dd/mm/yyyy and yyyy-mm-dd
  const formatYmdToDdMmYyyy = (ymd: string): string => {
    if (!ymd) return '';
    const parts = ymd.split('-');
    if (parts.length !== 3) return '';
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
  };
  
  const parseDdMmYyyyToYmd = (dmy: string): string => {
    const m = dmy.match(/^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/);
    if (!m) return '';
    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const yyyy = parseInt(m[3], 10);
    const date = new Date(yyyy, mm - 1, dd);
    if (
      date.getFullYear() !== yyyy ||
      date.getMonth() !== mm - 1 ||
      date.getDate() !== dd
    )
      return '';
    const mmStr = String(mm).padStart(2, '0');
    const ddStr = String(dd).padStart(2, '0');
    return `${yyyy}-${mmStr}-${ddStr}`;
  };

  // Display states for dd/mm/yyyy
  const [displayFrom, setDisplayFrom] = React.useState<string>(formatYmdToDdMmYyyy(dateRange.from));
  const [displayTo, setDisplayTo] = React.useState<string>(formatYmdToDdMmYyyy(dateRange.to));

  React.useEffect(() => {
    setTempFrom(dateRange.from || '');
    setTempTo(dateRange.to || '');
    setDisplayFrom(formatYmdToDdMmYyyy(dateRange.from));
    setDisplayTo(formatYmdToDdMmYyyy(dateRange.to));
  }, [dateRange.from, dateRange.to]);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!datePopoverRef.current) return;
      if (e.target instanceof Node && datePopoverRef.current.contains(e.target)) return;
      setShowDatePicker(false);
      setShowFromCalendar(false);
      setShowToCalendar(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Year navigation for months list
  const initialYear = new Date().getFullYear();
  const [monthListYear, setMonthListYear] = React.useState<number>(initialYear);

  const months = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => new Date(monthListYear, i, 1));
  }, [monthListYear]);

  const toYmd = (dt: Date) => {
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  const setRangeToMonth = (d: Date) => {
    const y = d.getFullYear();
    const m = d.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const fromYmd = toYmd(first);
    const toYmdStr = toYmd(last);
    setTempFrom(fromYmd);
    setTempTo(toYmdStr);
    setDisplayFrom(formatYmdToDdMmYyyy(fromYmd));
    setDisplayTo(formatYmdToDdMmYyyy(toYmdStr));
  };

  const applyDateRange = () => {
    onDateRangeChange({ from: tempFrom, to: tempTo });
    setShowDatePicker(false);
    setShowFromCalendar(false);
    setShowToCalendar(false);
  };

  const clearDateRange = () => {
    setTempFrom('');
    setTempTo('');
    setDisplayFrom('');
    setDisplayTo('');
    onDateRangeChange({ from: '', to: '' });
    setShowDatePicker(false);
    setShowFromCalendar(false);
    setShowToCalendar(false);
  };

  const todayRange = () => {
    const today = new Date();
    const ymd = toYmd(today);
    setTempFrom(ymd);
    setTempTo(ymd);
    setDisplayFrom(formatYmdToDdMmYyyy(ymd));
    setDisplayTo(formatYmdToDdMmYyyy(ymd));
  };

  return (
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
      
        {/* Date Range Button + Popover */}
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDatePicker(v => !v)}
            className="flex items-center gap-2 border border-gray-300 px-2 py-0.5 rounded text-sm bg-white hover:bg-gray-50"
            title="Select a date range"
          >
            <FiCalendar size={14} />
            <span>Select Date Range</span>
            {availableDateSpanText ? (
                <span className="ml-2 text-xs text-gray-800 font-semibold">{availableDateSpanText}</span>
            ) : (
              (dateRange.from || dateRange.to) && (
                <span className="ml-2 text-xs text-gray-800 font-semibold">
                  {formatYmdToDdMmYyyy(dateRange.from) || '…'} to {formatYmdToDdMmYyyy(dateRange.to) || '…'}
                </span>
              )
            )}
          </button>

          {(dateRange.from || dateRange.to) && (
            <button
              type="button"
              onClick={() => onDateRangeChange({ from: '', to: '' })}
              className="text-xs text-gray-500 hover:text-red-600 underline"
              title="Clear selected date range"
            >
              Clear
            </button>
          )}

          {/* Available date span now sits inside the button */}

          {showDatePicker && (
            <div ref={datePopoverRef} className="absolute top-full right-0 z-50 mt-3 bg-white border border-gray-200 rounded shadow-lg p-2 w-[590px] max-h-[70vh] overflow-auto">
              <div className="flex">
                {/* Months list */}
                <div className="w-40 border-r pr-2 mr-2">
                  <div className="flex items-center justify-between mb-1 px-1">
                    <button className="px-1 py-0.5 text-xs border rounded" onClick={() => setMonthListYear(y => y - 1)}>{'<'}</button>
                    <div className="text-xs font-medium">{monthListYear}</div>
                    <button className="px-1 py-0.5 text-xs border rounded" onClick={() => setMonthListYear(y => y + 1)}>{'>'}</button>
                  </div>
                  <div className="text-xs text-gray-500 mb-1 px-1">Months</div>
                  <div>
                    {months.map((m) => (
                      <button
                        key={`${m.getFullYear()}-${m.getMonth()}`}
                        className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 text-sm"
                        onClick={() => setRangeToMonth(m)}
                      >
                        {m.toLocaleString('en-GB', { month: 'long' })} {m.getFullYear()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date inputs and calendars */}
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="relative">
                      <div className="text-xs text-gray-500 mb-1">From</div>
          <input
                        type="text"
                        inputMode="numeric"
                        placeholder="dd/mm/yyyy"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm pr-7"
                        value={displayFrom}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDisplayFrom(v);
                          const ymd = parseDdMmYyyyToYmd(v);
                          if (ymd) setTempFrom(ymd);
                        }}
                      />
                      <button
                        type="button"
                        className="absolute right-2 bottom-1.5 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowFromCalendar(v => !v)}
                        title="Open calendar"
                      >
                        <FiCalendar size={14} />
                      </button>
        </div>
        <div className="relative">
                      <div className="text-xs text-gray-500 mb-1">To</div>
          <input
                        type="text"
                        inputMode="numeric"
                        placeholder="dd/mm/yyyy"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm pr-7"
                        value={displayTo}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDisplayTo(v);
                          const ymd = parseDdMmYyyyToYmd(v);
                          if (ymd) setTempTo(ymd);
                        }}
                      />
                      <button
                        type="button"
                        className="absolute right-2 bottom-1.5 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowToCalendar(v => !v)}
                        title="Open calendar"
                      >
                        <FiCalendar size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Calendars positioned within the container */}
                  {(showFromCalendar || showToCalendar) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        {showFromCalendar && (
                          <div className="bg-white border border-gray-300 rounded shadow-lg p-2 w-full">
                            <div className="flex items-center justify-between mb-2">
                              <button 
                                className="p-1 hover:bg-gray-100 rounded" 
                                onClick={() => {
                                  const base = tempFrom ? new Date(tempFrom) : new Date();
                                  const [year, month] = [base.getFullYear(), base.getMonth()];
                                  if (month === 0) {
                                    const newDate = new Date(year - 1, 11, 1);
                                    const ymd = toYmd(newDate);
                                    setTempFrom(ymd);
                                    setDisplayFrom(formatYmdToDdMmYyyy(ymd));
                                  } else {
                                    const newDate = new Date(year, month - 1, 1);
                                    const ymd = toYmd(newDate);
                                    setTempFrom(ymd);
                                    setDisplayFrom(formatYmdToDdMmYyyy(ymd));
                                  }
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                              <div className="font-medium text-sm">
                                {tempFrom ? new Date(tempFrom).toLocaleString('en-GB', { month: 'long', year: 'numeric' }) : new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })}
                              </div>
                              <button 
                                className="p-1 hover:bg-gray-100 rounded" 
                                onClick={() => {
                                  const base = tempFrom ? new Date(tempFrom) : new Date();
                                  const [year, month] = [base.getFullYear(), base.getMonth()];
                                  if (month === 11) {
                                    const newDate = new Date(year + 1, 0, 1);
                                    const ymd = toYmd(newDate);
                                    setTempFrom(ymd);
                                    setDisplayFrom(formatYmdToDdMmYyyy(ymd));
                                  } else {
                                    const newDate = new Date(year, month + 1, 1);
                                    const ymd = toYmd(newDate);
                                    setTempFrom(ymd);
                                    setDisplayFrom(formatYmdToDdMmYyyy(ymd));
                                  }
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-7 gap-1 mb-1">
                              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(day => (
                                <div key={day} className="text-center text-xs text-gray-500 font-medium py-1">
                                  {day}
                                </div>
                              ))}
                            </div>
                            
                            <div className="grid grid-cols-7 gap-1">
                              {(() => {
                                const base = tempFrom ? new Date(tempFrom) : new Date();
                                const year = base.getFullYear();
                                const month = base.getMonth();
                                const firstDay = new Date(year, month, 1);
                                const startWeekday = firstDay.getDay();
                                const daysInMonth = new Date(year, month + 1, 0).getDate();
                                
                                const weeks: Array<Array<number | null>> = [];
                                let day = 1;
                                for (let w = 0; w < 6; w++) {
                                  const week: Array<number | null> = [];
                                  for (let d = 0; d < 7; d++) {
                                    if ((w === 0 && d < startWeekday) || day > daysInMonth) {
                                      week.push(null);
                                    } else {
                                      week.push(day++);
                                    }
                                  }
                                  weeks.push(week);
                                }
                                
                                return weeks.map((week, weekIndex) => (
                                  <React.Fragment key={weekIndex}>
                                    {week.map((day, dayIndex) => (
                                      <div key={dayIndex} className="text-center">
                                        {day ? (
                                          <button 
                                            className={`w-7 h-7 text-xs rounded hover:bg-blue-100 flex items-center justify-center ${
                                              tempFrom === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                : 'text-gray-700'
                                            }`}
                                            onClick={() => {
                                              const mm = String(month + 1).padStart(2, '0');
                                              const dd = String(day).padStart(2, '0');
                                              const ymd = `${year}-${mm}-${dd}`;
                                              setTempFrom(ymd);
                                              setDisplayFrom(formatYmdToDdMmYyyy(ymd));
                                              setShowFromCalendar(false);
                                            }}
                                          >
                                            {day}
                                          </button>
                                        ) : (
                                          <div className="w-7 h-7" />
                                        )}
                                      </div>
                                    ))}
                                  </React.Fragment>
                                ));
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        {showToCalendar && (
                          <div className="bg-white border border-gray-300 rounded shadow-lg p-2 w-full">
                            <div className="flex items-center justify-between mb-2">
                              <button 
                                className="p-1 hover:bg-gray-100 rounded" 
                                onClick={() => {
                                  const base = tempTo ? new Date(tempTo) : new Date();
                                  const [year, month] = [base.getFullYear(), base.getMonth()];
                                  if (month === 0) {
                                    const newDate = new Date(year - 1, 11, 1);
                                    const ymd = toYmd(newDate);
                                    setTempTo(ymd);
                                    setDisplayTo(formatYmdToDdMmYyyy(ymd));
                                  } else {
                                    const newDate = new Date(year, month - 1, 1);
                                    const ymd = toYmd(newDate);
                                    setTempTo(ymd);
                                    setDisplayTo(formatYmdToDdMmYyyy(ymd));
                                  }
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                              <div className="font-medium text-sm">
                                {tempTo ? new Date(tempTo).toLocaleString('en-GB', { month: 'long', year: 'numeric' }) : new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })}
                              </div>
                              <button 
                                className="p-1 hover:bg-gray-100 rounded" 
                                onClick={() => {
                                  const base = tempTo ? new Date(tempTo) : new Date();
                                  const [year, month] = [base.getFullYear(), base.getMonth()];
                                  if (month === 11) {
                                    const newDate = new Date(year + 1, 0, 1);
                                    const ymd = toYmd(newDate);
                                    setTempTo(ymd);
                                    setDisplayTo(formatYmdToDdMmYyyy(ymd));
                                  } else {
                                    const newDate = new Date(year, month + 1, 1);
                                    const ymd = toYmd(newDate);
                                    setTempTo(ymd);
                                    setDisplayTo(formatYmdToDdMmYyyy(ymd));
                                  }
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-7 gap-1 mb-1">
                              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(day => (
                                <div key={day} className="text-center text-xs text-gray-500 font-medium py-1">
                                  {day}
                                </div>
                              ))}
                            </div>
                            
                            <div className="grid grid-cols-7 gap-1">
                              {(() => {
                                const base = tempTo ? new Date(tempTo) : new Date();
                                const year = base.getFullYear();
                                const month = base.getMonth();
                                const firstDay = new Date(year, month, 1);
                                const startWeekday = firstDay.getDay();
                                const daysInMonth = new Date(year, month + 1, 0).getDate();
                                
                                const weeks: Array<Array<number | null>> = [];
                                let day = 1;
                                for (let w = 0; w < 6; w++) {
                                  const week: Array<number | null> = [];
                                  for (let d = 0; d < 7; d++) {
                                    if ((w === 0 && d < startWeekday) || day > daysInMonth) {
                                      week.push(null);
                                    } else {
                                      week.push(day++);
                                    }
                                  }
                                  weeks.push(week);
                                }
                                
                                return weeks.map((week, weekIndex) => (
                                  <React.Fragment key={weekIndex}>
                                    {week.map((day, dayIndex) => (
                                      <div key={dayIndex} className="text-center">
                                        {day ? (
                                          <button 
                                            className={`w-7 h-7 text-xs rounded hover:bg-blue-100 flex items-center justify-center ${
                                              tempTo === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                : 'text-gray-700'
                                            }`}
                                            onClick={() => {
                                              const mm = String(month + 1).padStart(2, '0');
                                              const dd = String(day).padStart(2, '0');
                                              const ymd = `${year}-${mm}-${dd}`;
                                              setTempTo(ymd);
                                              setDisplayTo(formatYmdToDdMmYyyy(ymd));
                                              setShowToCalendar(false);
                                            }}
                                          >
                                            {day}
                                          </button>
                                        ) : (
                                          <div className="w-7 h-7" />
                                        )}
                                      </div>
                                    ))}
                                  </React.Fragment>
                                ));
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <button className="text-blue-600 text-xs hover:underline" onClick={todayRange}>Today</button>
                  <button className="text-gray-600 text-xs hover:underline" onClick={clearDateRange}>Clear</button>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-2 py-1 text-xs border rounded hover:bg-gray-50" onClick={() => { setShowDatePicker(false); setShowFromCalendar(false); setShowToCalendar(false); }}>Cancel</button>
                  <button className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700" onClick={applyDateRange}>Apply</button>
                </div>
              </div>
            </div>
          )}
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
        

      {onRefresh && (
        <button
          className="px-3 py-0.5 rounded bg-green-600 hover:bg-green-700 shadow-lg flex items-center justify-center text-white text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed gap-1"
          onClick={onRefresh}
          disabled={refreshDisabled}
          title="Refresh transactions data"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      )}

      {onOpenHeader && (
        <button
          className="px-3 py-0.5 rounded bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center text-white text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed gap-1"
          onClick={onOpenHeader}
          title="Configure custom column headers for the transaction table"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
        >
          <span>Header</span>
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

      {onDownloadTransactions && (
        <button
          className="px-3 py-0.5 rounded bg-purple-600 hover:bg-purple-700 shadow-lg flex items-center justify-center text-white text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed gap-1"
          onClick={onDownloadTransactions}
          disabled={downloadTransactionsDisabled}
          title="Download transactions with or without tags"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
        >
          <FiDownload size={14} />
          <span>Download</span>
        </button>
      )}
    </div>
  </div>
);
};

export default TransactionFilterBar; 