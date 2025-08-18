/**
 * Date utility functions for consistent dd/mm/yyyy formatting across the application
 */

/**
 * Normalizes any date string to dd/mm/yyyy format
 * Supports multiple input formats: dd/mm/yyyy, dd-mm-yyyy, dd/mm/yy, dd-mm-yy, yyyy-mm-dd, yyyy/mm/dd
 */
export function normalizeDateToDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  
  // First, try to parse any date format and convert to dd/mm/yyyy
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1970) {
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  } catch {
    // Continue to regex parsing if Date constructor fails
  }
  
  // Try to extract from common formats
  // Match dd/mm/yyyy, dd-mm-yyyy, dd/mm/yy, dd-mm-yy
  const match = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (match) {
    let [, dd, mm, yyyy] = match;
    if (yyyy.length === 2) yyyy = '20' + yyyy;
    // Pad day and month
    if (dd.length === 1) dd = '0' + dd;
    if (mm.length === 1) mm = '0' + mm;
    return `${dd}/${mm}/${yyyy}`;
  }
  
  // Try ISO format (yyyy-mm-dd)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    const paddedDd = dd.length === 1 ? '0' + dd : dd;
    const paddedMm = mm.length === 1 ? '0' + mm : mm;
    return `${paddedDd}/${paddedMm}/${yyyy}`;
  }
  
  // Try yyyy/mm/dd format
  const slashMatch = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    const [, yyyy, mm, dd] = slashMatch;
    const paddedDd = dd.length === 1 ? '0' + dd : dd;
    const paddedMm = mm.length === 1 ? '0' + mm : mm;
    return `${paddedDd}/${paddedMm}/${yyyy}`;
  }
  
  // If all else fails, return the original string
  return dateStr;
}

/**
 * Parses any date string and returns a Date object
 * Supports multiple input formats: dd/mm/yyyy, dd-mm-yyyy, dd/mm/yy, dd-mm-yy, yyyy-mm-dd, yyyy/mm/dd
 */
export function parseDate(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') return new Date('1970-01-01');

  // Regex to match dd/mm/yyyy or dd-mm-yyyy (and yy)
  const match = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);

  if (match) {
    const day = match[1];
    const month = match[2];
    let year = match[3];

    if (year.length === 2) {
      year = '20' + year;
    }

    // Create date, note that the month is 0-indexed in JavaScript's Date constructor.
    // For DD/MM/YYYY format (common in UK/India), assume first is day, second is month
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  }
  
  // Try ISO format (yyyy-mm-dd)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  }
  
  // Try yyyy/mm/dd format
  const slashMatch = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    const [, year, month, day] = slashMatch;
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  }
  
  // Fallback for ISO date strings or other formats recognized by new Date()
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d;
  }

  // Return a default date for invalid formats
  return new Date('1970-01-01');
}

/**
 * Converts dd/mm/yyyy format to yyyy-mm-dd for date comparison
 */
export function convertDDMMYYYYToYYYYMMDD(dateStr: string): string {
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  }
  return dateStr;
}

/**
 * Validates if a string is in dd/mm/yyyy format
 */
export function isValidDDMMYYYY(dateStr: string): boolean {
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;
  
  const [, dd, mm, yyyy] = match;
  const day = parseInt(dd, 10);
  const month = parseInt(mm, 10);
  const year = parseInt(yyyy, 10);
  
  // Basic validation
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  
  // Check for valid days in each month
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDays = month === 2 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) 
    ? 29 
    : daysInMonth[month - 1];
  
  return day <= maxDays;
}

/**
 * Converts any date string to ISO format (YYYY-MM-DD)
 * Supports multiple input formats: dd/mm/yyyy, dd-mm-yyyy, dd/mm/yy, dd-mm-yy, yyyy-mm-dd, yyyy/mm/dd
 * IMPORTANT: For ambiguous dates (where both day and month are <= 12), assumes DD/MM/YYYY format
 */
export function convertToISOFormat(dateStr: string): string {
  if (!dateStr) return '';
  
  // Skip the Date constructor approach as it can misinterpret DD/MM/YYYY as MM/DD/YYYY
  // Go directly to regex parsing for consistent DD/MM/YYYY handling
  
  // Try to extract from common formats
  // Match dd/mm/yyyy, dd-mm-yyyy, dd/mm/yy, dd-mm-yy
  const match = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (match) {
    const [, first, second, yyyy] = match;
    const fullYear = yyyy.length === 2 ? '20' + yyyy : yyyy;
    
    // For DD/MM/YYYY format (common in UK/India), assume first is day, second is month
    // This handles cases like 12/03/2025 (12th March) correctly
    // IMPORTANT: For ambiguous dates where both parts are <= 12, we assume DD/MM/YYYY
    const firstNum = parseInt(first, 10);
    const secondNum = parseInt(second, 10);
    
    let day, month;
    if (firstNum <= 12 && secondNum <= 12) {
      // Ambiguous case: both could be day or month
      // Assume DD/MM/YYYY format for Indian/UK dates
      day = first;
      month = second;
    } else if (firstNum <= 31 && secondNum <= 12) {
      // First is day (1-31), second is month (1-12)
      day = first;
      month = second;
    } else if (firstNum <= 12 && secondNum <= 31) {
      // First is month (1-12), second is day (1-31)
      day = second;
      month = first;
    } else {
      // Default to DD/MM/YYYY for consistency
      day = first;
      month = second;
    }
    
    const paddedDd = day.length === 1 ? '0' + day : day;
    const paddedMm = month.length === 1 ? '0' + month : month;
    return `${fullYear}-${paddedMm}-${paddedDd}`;
  }
  
  // Try ISO format (yyyy-mm-dd) - already in correct format
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    const paddedDd = dd.length === 1 ? '0' + dd : dd;
    const paddedMm = mm.length === 1 ? '0' + mm : mm;
    return `${yyyy}-${paddedMm}-${paddedDd}`;
  }
  
  // Try yyyy/mm/dd format
  const slashMatch = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    const [, yyyy, mm, dd] = slashMatch;
    const paddedDd = dd.length === 1 ? '0' + dd : dd;
    const paddedMm = mm.length === 1 ? '0' + mm : mm;
    return `${yyyy}-${paddedMm}-${paddedDd}`;
  }
  
  // If all else fails, return the original string
  return dateStr;
}

/**
 * Formats an ISO date string (YYYY-MM-DD) to display format (DD/MM/YYYY)
 */
export function formatDisplayDate(isoDateStr: string): string {
  if (!isoDateStr) return '';
  
  try {
    const date = new Date(isoDateStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-GB"); // gives DD/MM/YYYY
    }
  } catch {
    // Fallback to manual parsing
  }
  
  // Manual parsing for ISO format
  const match = isoDateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, yyyy, mm, dd] = match;
    return `${dd}/${mm}/${yyyy}`;
  }
  
  // If not ISO format, try to convert and then format
  const isoDate = convertToISOFormat(isoDateStr);
  if (isoDate !== isoDateStr) {
    return formatDisplayDate(isoDate);
  }
  
  return isoDateStr;
}

/**
 * Fixes incorrectly formatted dates that were stored as MM/DD/YYYY instead of DD/MM/YYYY
 * This function should be used to migrate existing data
 */
export function fixIncorrectDateFormat(dateStr: string): string {
  if (!dateStr) return '';
  
  // Check if this looks like a date that might be incorrectly formatted
  const match = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return dateStr;
  
  const [, first, second, year] = match;
  const firstNum = parseInt(first, 10);
  const secondNum = parseInt(second, 10);
  
  // If both parts are <= 12, it's ambiguous and might be incorrectly stored
  if (firstNum <= 12 && secondNum <= 12) {
    // Assume it was stored as MM/DD/YYYY but should be DD/MM/YYYY
    // So we need to swap them
    const paddedFirst = first.length === 1 ? '0' + first : first;
    const paddedSecond = second.length === 1 ? '0' + second : second;
    return `${paddedSecond}/${paddedFirst}/${year}`;
  }
  
  return dateStr;
}

/**
 * Converts a date string that might be incorrectly formatted to the correct ISO format
 * This is a combination of fixing the format and converting to ISO
 */
export function fixAndConvertToISO(dateStr: string): string {
  const fixedDate = fixIncorrectDateFormat(dateStr);
  return convertToISOFormat(fixedDate);
}

/**
 * Formats a date string for CSV export in DD/MM/YYYY format
 * This function ensures dates are consistently formatted as DD/MM/YYYY for CSV downloads
 */
export function formatDateForCSV(dateStr: string): string {
  if (!dateStr) return '';
  
  // First try to convert to ISO format, then format as DD/MM/YYYY
  const isoDate = fixAndConvertToISO(dateStr);
  if (isoDate) {
    const date = new Date(isoDate);
    if (!isNaN(date.getTime())) {
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  }
  
  // Fallback to normalize function
  return normalizeDateToDDMMYYYY(dateStr);
}
