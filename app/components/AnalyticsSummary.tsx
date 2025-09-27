import React, { useState, useEffect } from 'react';

interface AnalyticsSummaryProps {
  totalAmount: number;
  totalCredit: number;
  totalDebit: number;
  totalTransactions: number;
  totalBanks: number;
  totalAccounts: number;
  showBalance?: boolean;
  tagsSummary?: Record<string, unknown>; // Add tagsSummary prop
  transactions?: Array<Record<string, unknown>>; // Use provided rows for breakdowns when available
  dateRange?: { from: string; to: string }; // Add dateRange prop for opening balance calculation
  allTransactions?: Array<Record<string, unknown>>; // All transactions for opening balance calculation
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {children}
        </div>
      </div>
    </div>
  );
};

const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({
  totalCredit = 0,
  totalDebit = 0,
  totalTransactions = 0,
  totalBanks = 0,
  totalAccounts = 0,
  showBalance = false,
  tagsSummary,
  transactions,
  dateRange,
  allTransactions: allTransactionsProp,
}) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
  }>({
    isOpen: false,
    title: '',
    content: null,
  });

  // Removed unused localTagsSummary state
  const [allTransactions, setAllTransactions] = useState<Record<string, unknown>[]>([]);
  const [accountInfoMap, setAccountInfoMap] = useState<{ [accountId: string]: { accountName: string; accountNumber: string; bankName?: string } }>({});
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  // Fetch tags summary, and bank/account information.
  // For breakdowns, prefer provided `transactions` (already filtered on page),
  // otherwise fetch all transactions for the user.
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        if (!userId) {
          console.log('No userId found, skipping data fetch');
          setIsLoadingAccounts(false);
          return;
        }
        
        // Fetch tags summary (not used in current implementation)
        if (!tagsSummary) {
          try {
            const res = await fetch(`/api/reports/tags-summary?userId=${encodeURIComponent(userId)}`);
            if (res.ok) {
              // Summary fetched but not stored since it's not used
              await res.json();
            } else {
              console.warn('Tags summary API returned non-OK status:', res.status);
            }
          } catch (error) {
            console.warn('Failed to fetch tags summary:', error);
            // If this fails, likely AWS credentials are missing, so skip other API calls
            setIsLoadingAccounts(false);
            return;
          }
        }
        
        // Use provided transactions if available; otherwise fetch all
        let workingTransactions: Array<Record<string, unknown>> = Array.isArray(transactions) ? transactions : [];
        if (!workingTransactions.length) {
          try {
            const txRes = await fetch(`/api/transactions/all?userId=${encodeURIComponent(userId)}`);
            if (txRes.ok) {
              workingTransactions = await txRes.json();
            } else {
              console.warn('Transactions API returned non-OK status:', txRes.status);
            }
          } catch (error) {
            console.warn('Failed to fetch transactions:', error);
            // If this fails, likely AWS credentials are missing, so skip other API calls
            setIsLoadingAccounts(false);
            return;
          }
        }
        if (workingTransactions.length > 0) {
          console.log('Transactions for breakdown sample:', workingTransactions.slice(0, 3));
          setAllTransactions(workingTransactions);
          setIsLoadingAccounts(true);
          
          // Fetch bank information first
          const bankMap: { [bankId: string]: string } = {};
          try {
            const userId = localStorage.getItem('userId');
            if (!userId) {
              console.error('User ID not found');
              return;
            }
            
            const bankRes = await fetch(`/api/bank?userId=${userId}`);
            if (bankRes.ok) {
              const banks = await bankRes.json();
              console.log('Fetched banks:', banks);
              banks.forEach((bank: Record<string, unknown>) => {
                if (bank.id && bank.bankName) {
                  bankMap[bank.id as string] = bank.bankName as string;
                }
              });
              console.log('Bank map:', bankMap);
            }
          } catch (error) {
            console.warn('Failed to fetch banks:', error);
          }
          
          // Fetch account information for all unique accounts
          const uniqueAccountIds = [...new Set(workingTransactions.map((tx: Record<string, unknown>) => tx.accountId as string).filter(Boolean))];
          const accountMap: { [accountId: string]: { accountName: string; accountNumber: string; bankName?: string } } = {};
          
          for (const accountId of uniqueAccountIds) {
            if (accountId && typeof accountId === 'string') {
              try {
                const accountRes = await fetch(`/api/account?accountId=${accountId}`);
                if (accountRes.ok) {
                  const account = await accountRes.json() as Record<string, unknown>;
                  if (account) {
                    // Get bank name from bankId using the bank map
                    const bankName = account.bankId ? bankMap[account.bankId as string] || 'Unknown Bank' : 'Unknown Bank';
                    console.log('Account data:', { accountId, account, bankId: account.bankId, bankName, bankMap });
                    accountMap[accountId] = {
                      accountName: (account.accountHolderName as string) || 'N/A',
                      accountNumber: (account.accountNumber as string) || 'N/A',
                      bankName: bankName
                    };
                  }
                }
              } catch (error) {
                console.warn(`Failed to fetch account info for ${accountId}:`, error);
              }
            }
          }
          
          setAccountInfoMap(accountMap);
          setIsLoadingAccounts(false);
        } else {
          // No transactions to process
          setIsLoadingAccounts(false);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        setIsLoadingAccounts(false);
      }
    };

    fetchData();
  }, [tagsSummary, transactions]);

  // Ensure all values are numbers and handle undefined/null values
  const safeTotalCredit = typeof totalCredit === 'number' && !isNaN(totalCredit) ? totalCredit : 0;
  const safeTotalDebit = typeof totalDebit === 'number' && !isNaN(totalDebit) ? totalDebit : 0;
  const safeTotalTransactions = typeof totalTransactions === 'number' && !isNaN(totalTransactions) ? totalTransactions : 0;
  const safeTotalBanks = typeof totalBanks === 'number' && !isNaN(totalBanks) ? totalBanks : 0;
  const safeTotalAccounts = typeof totalAccounts === 'number' && !isNaN(totalAccounts) ? totalAccounts : 0;
  
  const balance = safeTotalCredit - safeTotalDebit;

  // Robust extractor for Dr/Cr when multiple columns exist
  const extractCrDr = (tx: Record<string, unknown>, rawAmount: number): 'CR' | 'DR' | '' => {
    const candidates = [
      tx['Dr./Cr.'], tx['Dr/Cr'], tx['DR/CR'], tx['dr/cr'],
      tx['Type'], tx['type'], tx['Dr / Cr'], tx['Dr / Cr_1'],
      tx['DR / CR'], tx['DR / CR_1']
    ]
      .map(v => (v ?? '').toString().trim().toUpperCase())
      .filter(v => v.length > 0);

    if (candidates.length === 0) return '';

    // If there is a conflict, prefer the value that matches the numeric sign
    const first = candidates[0];
    if (candidates.some(v => v !== first)) {
      const signMatchesCR = rawAmount > 0 && candidates.includes('CR');
      const signMatchesDR = rawAmount < 0 && candidates.includes('DR');
      if (signMatchesCR && !signMatchesDR) return 'CR';
      if (signMatchesDR && !signMatchesCR) return 'DR';
      // fallback to last non-empty when still ambiguous
      return candidates[candidates.length - 1] as 'CR' | 'DR';
    }
    return first as 'CR' | 'DR';
  };


  // Helper function to get date field from transaction
  const getDateField = (tx: Record<string, unknown>): string | undefined => {
    if ('Date' in tx) return 'Date';
    if ('Transaction Date' in tx) return 'Transaction Date';
    const key = Object.keys(tx).find(k => k.toLowerCase() === 'date' || k.toLowerCase() === 'transaction date');
    if (key) return key;
    return Object.keys(tx).find(k => k.toLowerCase().includes('date'));
  };

  // Helper function to parse dates consistently
  const parseDate = (dateStr: string): Date => {
    if (!dateStr || typeof dateStr !== 'string') return new Date('1970-01-01');
    
    // Match dd/mm/yyyy, dd-mm-yyyy, dd/mm/yy, dd-mm-yy
    const match = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (match) {
      const day = match[1];
      const month = match[2];
      let year = match[3];
      if (year.length === 2) year = '20' + year;
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
    
    // Fallback for ISO or other formats
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    return new Date('1970-01-01');
  };

  // Core opening and closing balance calculation using the documented approach
  const openingClosing = React.useMemo(() => {
    if (!Array.isArray(allTransactionsProp) || !dateRange?.from || !dateRange?.to) {
      return { opening: 0, closing: balance };
    }
    
    const fromD = parseDate(dateRange.from);
    const toD = parseDate(dateRange.to);
    let opening = 0;
    let periodSum = 0;
    
    for (const tx of allTransactionsProp as Array<Record<string, unknown>>) {
      const dateKey = getDateField(tx) as string | undefined;
      if (!dateKey) continue;
      
      const d = parseDate(String(tx[dateKey] || ''));
      const rawAmount = parseFloat((tx['AmountRaw'] as string) || (tx['Amount'] as string) || (tx['amount'] as string) || '0') || 0;
      const crdr = extractCrDr(tx, rawAmount);
      const signed = crdr === 'CR' ? Math.abs(rawAmount) : crdr === 'DR' ? -Math.abs(rawAmount) : rawAmount;
      
      if (d < fromD) {
        opening += signed;
      } else if (d >= fromD && d <= toD) {
        periodSum += signed;
      }
    }
    
    return { opening, closing: opening + periodSum };
  }, [allTransactionsProp, dateRange, balance]);

  // Calculate individual bank opening balances (actual opening balance for each bank)
  const getOpeningBalanceByBank = React.useMemo(() => {
    if (!Array.isArray(allTransactionsProp) || allTransactionsProp.length === 0) {
      return [];
    }

    // Use dateRange.from if available, otherwise find the earliest transaction date
    let fromD: Date;
    if (dateRange?.from) {
      fromD = parseDate(dateRange.from);
    } else {
      const dates: Date[] = [];
      for (const tx of allTransactionsProp as Array<Record<string, unknown>>) {
        const dateKey = getDateField(tx) as string | undefined;
        if (dateKey) {
          const d = parseDate(String(tx[dateKey] || ''));
          if (d.getTime() > 0) dates.push(d);
        }
      }
      fromD = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
    }
    
    const bankBalances = new Map<string, { balance: number; accounts: Map<string, { balance: number; count: number }> }>();
    
    // Calculate opening balance for each bank (sum of all transactions before the period)
    for (const tx of allTransactionsProp as Array<Record<string, unknown>>) {
      const dateKey = getDateField(tx) as string | undefined;
      if (!dateKey) continue;
      
      const d = parseDate(String(tx[dateKey] || ''));
      if (d >= fromD) continue; // Skip transactions in or after the period
      
      const rawAmount = parseFloat((tx['AmountRaw'] as string) || (tx['Amount'] as string) || (tx['amount'] as string) || '0') || 0;
      const crdr = extractCrDr(tx, rawAmount);
      const signed = crdr === 'CR' ? Math.abs(rawAmount) : crdr === 'DR' ? -Math.abs(rawAmount) : rawAmount;
      
      const bankName = (tx.bankName as string) || 'Unknown Bank';
      const accountId = (tx.accountId as string) || 'Unknown Account';

      if (!bankBalances.has(bankName)) {
        bankBalances.set(bankName, { balance: 0, accounts: new Map() });
      }

      const bankData = bankBalances.get(bankName)!;
      bankData.balance += signed;

      if (!bankData.accounts.has(accountId)) {
        bankData.accounts.set(accountId, { balance: 0, count: 0 });
      }

      const accountData = bankData.accounts.get(accountId)!;
      accountData.balance += signed;
      accountData.count += 1;
    }

    return Array.from(bankBalances.entries()).map(([name, data]) => ({
      name,
      balance: data.balance, // This is the actual opening balance for this bank
      accounts: Array.from(data.accounts.entries()).map(([accountId, accountData]) => ({
        account: accountInfoMap[accountId]?.accountNumber || `****${accountId.slice(-4)}`,
        balance: accountData.balance, // This is the actual opening balance for this account
        count: accountData.count
      }))
    }));
  }, [allTransactionsProp, dateRange, accountInfoMap]);

  // Calculate individual bank closing balances (opening balance + current period transactions)
  const getClosingBalanceByBank = React.useMemo(() => {
    if (!Array.isArray(allTransactionsProp) || allTransactionsProp.length === 0) {
      return [];
    }

    // Use dateRange if available, otherwise use all transactions
    let fromD: Date, toD: Date;
    if (dateRange?.from && dateRange?.to) {
      fromD = parseDate(dateRange.from);
      toD = parseDate(dateRange.to);
    } else {
      const dates: Date[] = [];
      for (const tx of allTransactionsProp as Array<Record<string, unknown>>) {
        const dateKey = getDateField(tx) as string | undefined;
        if (dateKey) {
          const d = parseDate(String(tx[dateKey] || ''));
          if (d.getTime() > 0) dates.push(d);
        }
      }
      if (dates.length > 0) {
        fromD = new Date(Math.min(...dates.map(d => d.getTime())));
        toD = new Date(Math.max(...dates.map(d => d.getTime())));
      } else {
        fromD = new Date();
        toD = new Date();
      }
    }
    
    const bankBalances = new Map<string, { 
      openingBalance: number; 
      currentPeriodBalance: number; 
      closingBalance: number;
      accounts: Map<string, { 
        openingBalance: number; 
        currentPeriodBalance: number; 
        closingBalance: number; 
        count: number 
      }> 
    }>();
    
    // First pass: Calculate opening balances (transactions before the period)
    for (const tx of allTransactionsProp as Array<Record<string, unknown>>) {
      const dateKey = getDateField(tx) as string | undefined;
      if (!dateKey) continue;
      
      const d = parseDate(String(tx[dateKey] || ''));
      if (d >= fromD) continue; // Skip transactions in or after the period
      
      const rawAmount = parseFloat((tx['AmountRaw'] as string) || (tx['Amount'] as string) || (tx['amount'] as string) || '0') || 0;
      const crdr = extractCrDr(tx, rawAmount);
      const signed = crdr === 'CR' ? Math.abs(rawAmount) : crdr === 'DR' ? -Math.abs(rawAmount) : rawAmount;
      
      const bankName = (tx.bankName as string) || 'Unknown Bank';
      const accountId = (tx.accountId as string) || 'Unknown Account';

      if (!bankBalances.has(bankName)) {
        bankBalances.set(bankName, { 
          openingBalance: 0, 
          currentPeriodBalance: 0, 
          closingBalance: 0,
          accounts: new Map() 
        });
      }

      const bankData = bankBalances.get(bankName)!;
      bankData.openingBalance += signed;

      if (!bankData.accounts.has(accountId)) {
        bankData.accounts.set(accountId, { 
          openingBalance: 0, 
          currentPeriodBalance: 0, 
          closingBalance: 0, 
          count: 0 
        });
      }

      const accountData = bankData.accounts.get(accountId)!;
      accountData.openingBalance += signed;
    }
    
    // Second pass: Calculate current period balances (transactions within the period)
    for (const tx of allTransactionsProp as Array<Record<string, unknown>>) {
      const dateKey = getDateField(tx) as string | undefined;
      if (!dateKey) continue;
      
      const d = parseDate(String(tx[dateKey] || ''));
      if (d < fromD || d > toD) continue; // Skip transactions outside the period
      
      const rawAmount = parseFloat((tx['AmountRaw'] as string) || (tx['Amount'] as string) || (tx['amount'] as string) || '0') || 0;
      const crdr = extractCrDr(tx, rawAmount);
      const signed = crdr === 'CR' ? Math.abs(rawAmount) : crdr === 'DR' ? -Math.abs(rawAmount) : rawAmount;
      
      const bankName = (tx.bankName as string) || 'Unknown Bank';
      const accountId = (tx.accountId as string) || 'Unknown Account';

      if (!bankBalances.has(bankName)) {
        bankBalances.set(bankName, { 
          openingBalance: 0, 
          currentPeriodBalance: 0, 
          closingBalance: 0,
          accounts: new Map() 
        });
      }

      const bankData = bankBalances.get(bankName)!;
      bankData.currentPeriodBalance += signed;

      if (!bankData.accounts.has(accountId)) {
        bankData.accounts.set(accountId, { 
          openingBalance: 0, 
          currentPeriodBalance: 0, 
          closingBalance: 0, 
          count: 0 
        });
      }

      const accountData = bankData.accounts.get(accountId)!;
      accountData.currentPeriodBalance += signed;
      accountData.count += 1;
    }
    
    // Calculate closing balances (opening + current period)
    bankBalances.forEach((bankData) => {
      bankData.closingBalance = bankData.openingBalance + bankData.currentPeriodBalance;
      bankData.accounts.forEach((accountData) => {
        accountData.closingBalance = accountData.openingBalance + accountData.currentPeriodBalance;
      });
    });

    return Array.from(bankBalances.entries()).map(([name, data]) => ({
      name,
      balance: data.closingBalance, // This is the actual closing balance for this bank
      accounts: Array.from(data.accounts.entries()).map(([accountId, accountData]) => ({
        account: accountInfoMap[accountId]?.accountNumber || `****${accountId.slice(-4)}`,
        balance: accountData.closingBalance, // This is the actual closing balance for this account
        count: accountData.count
      }))
    }));
  }, [allTransactionsProp, dateRange, accountInfoMap]);

  // Calculate opening balance (closing balance of previous month)
  const calculateOpeningBalance = (): number => {
    return openingClosing.opening;
  };

  // Calculate closing balance (opening balance + current period transactions)
  const calculateClosingBalance = (): number => {
    return openingClosing.closing;
  };

  const openingBalance = calculateOpeningBalance();
  const closingBalance = calculateClosingBalance();


  const closeModal = () => {
    setModalState({
      isOpen: false,
      title: '',
      content: null,
    });
  };













  // Function to get transaction counts by bank
  const getTransactionCountsByBank = () => {
    const bankCounts = new Map<string, { count: number; accounts: Map<string, number> }>();
    
    // Count from actual transaction data for accurate totals
    allTransactions.forEach((tx: Record<string, unknown>) => {
      const accountId = (tx.accountId as string) || '';
      let bankName = (tx.bankName as string) || (accountId && accountInfoMap[accountId]?.bankName) || 'Unknown Bank';
      
      // If bank name is still unknown, try to extract from tags
      if (bankName === 'Unknown Bank' && tx.tags && Array.isArray(tx.tags)) {
        const tagNames = (tx.tags as Array<Record<string, unknown>>).map((tag: Record<string, unknown>) => {
          if (typeof tag === 'string') return tag;
          return (tag.name as string) || '';
        }).join(' ').toLowerCase();
        if (tagNames.includes('hdfc')) {
          bankName = 'HDFC';
        } else if (tagNames.includes('kotak')) {
          bankName = 'Kotak';
        } else if (tagNames.includes('yesb')) {
          bankName = 'YESB';
        }
      }
      
      if (!bankCounts.has(bankName)) {
        bankCounts.set(bankName, { count: 0, accounts: new Map<string, number>() });
      }
      
      const bankCount = bankCounts.get(bankName)!;
      bankCount.count += 1;
      
      if (accountId) {
        const currentAccountCount = bankCount.accounts.get(accountId) || 0;
        bankCount.accounts.set(accountId, currentAccountCount + 1);
      }
    });
    
    // Convert to the format we need for display with actual account numbers
    const result: Array<{ name: string; count: number; accounts: Array<{ account: string; count: number }> }> = [];
    
    bankCounts.forEach((data, bankName) => {
      const accountDetails = Array.from(data.accounts.entries()).map(([accountId, count]) => {
        // Get actual account number from accountInfoMap
        const accountInfo = accountInfoMap[accountId];
        const displayAccount = isLoadingAccounts ? 'Loading...' : 
          (accountInfo?.accountNumber || 
          (accountId ? `****${accountId.slice(-4)}` : 'N/A'));
        
        return {
          account: displayAccount,
          count
        };
      });
      
      result.push({
        name: bankName,
        count: data.count,
        accounts: accountDetails
      });
    });
    
    return result.sort((a, b) => b.count - a.count);
  };



  // Function to get credit breakdown by bank
  const getCreditBreakdownByBank = () => {
    const bankCredits = new Map<string, { credit: number; accounts: Map<string, number> }>();
    
    allTransactions.forEach((tx: Record<string, unknown>) => {
      const accountId = (tx.accountId as string) || '';
      let bankName = (tx.bankName as string) || (accountId && accountInfoMap[accountId]?.bankName) || 'Unknown Bank';
      
      // If bank name is still unknown, try to extract from tags
      if (bankName === 'Unknown Bank' && tx.tags && Array.isArray(tx.tags)) {
        const tagNames = (tx.tags as Array<Record<string, unknown>>).map((tag: Record<string, unknown>) => {
          if (typeof tag === 'string') return tag;
          return (tag.name as string) || '';
        }).join(' ').toLowerCase();
        if (tagNames.includes('hdfc')) {
          bankName = 'HDFC';
        } else if (tagNames.includes('kotak')) {
          bankName = 'Kotak';
        } else if (tagNames.includes('yesb')) {
          bankName = 'YESB';
        }
      }
      const amount = parseFloat((tx.AmountRaw as string) || (tx.Amount as string) || (tx.amount as string) || '0') || 0;
      
      // Check if it's a credit transaction
      const crdrField = (tx['Dr./Cr.'] || tx['Dr/Cr'] || tx['DR/CR'] || tx['dr/cr'] || tx['Type'] || tx['type'] || tx['Dr / Cr'] || tx['Dr / Cr_1'] || tx['DR / CR'] || tx['DR / CR_1'] || '').toString().trim().toUpperCase();
      const isCredit = crdrField === 'CR' || (amount > 0 && crdrField !== 'DR');
      
      if (isCredit) {
        if (!bankCredits.has(bankName)) {
          bankCredits.set(bankName, { credit: 0, accounts: new Map<string, number>() });
        }
        
        const bankCredit = bankCredits.get(bankName)!;
        bankCredit.credit += Math.abs(amount);
        
        if (accountId) {
          const currentAccountCredit = bankCredit.accounts.get(accountId) || 0;
          bankCredit.accounts.set(accountId, currentAccountCredit + Math.abs(amount));
        }
      }
    });
    
    const result: Array<{ name: string; credit: number; accounts: Array<{ account: string; credit: number }> }> = [];
    
    bankCredits.forEach((data, bankName) => {
      const accountDetails = Array.from(data.accounts.entries()).map(([accountId, credit]) => {
        const accountInfo = accountInfoMap[accountId];
        const displayAccount = isLoadingAccounts ? 'Loading...' : 
          (accountInfo?.accountNumber || 
          (accountId ? `****${accountId.slice(-4)}` : 'N/A'));
        
        return {
          account: displayAccount,
          credit
        };
      });
      
      result.push({
        name: bankName,
        credit: data.credit,
        accounts: accountDetails
      });
    });
    
    return result.sort((a, b) => b.credit - a.credit);
  };

  // Function to get debit breakdown by bank
  const getDebitBreakdownByBank = () => {
    const bankDebits = new Map<string, { debit: number; accounts: Map<string, number> }>();
    
    allTransactions.forEach((tx: Record<string, unknown>) => {
      const accountId = (tx.accountId as string) || '';
      let bankName = (tx.bankName as string) || (accountId && accountInfoMap[accountId]?.bankName) || 'Unknown Bank';
      
      // If bank name is still unknown, try to extract from tags
      if (bankName === 'Unknown Bank' && tx.tags && Array.isArray(tx.tags)) {
        const tagNames = (tx.tags as Array<Record<string, unknown>>).map((tag: Record<string, unknown>) => {
          if (typeof tag === 'string') return tag;
          return (tag.name as string) || '';
        }).join(' ').toLowerCase();
        if (tagNames.includes('hdfc')) {
          bankName = 'HDFC';
        } else if (tagNames.includes('kotak')) {
          bankName = 'Kotak';
        } else if (tagNames.includes('yesb')) {
          bankName = 'YESB';
        }
      }
      const amount = parseFloat((tx.AmountRaw as string) || (tx.Amount as string) || (tx.amount as string) || '0') || 0;
      
      // Check if it's a debit transaction
      const crdrField = (tx['Dr./Cr.'] || tx['Dr/Cr'] || tx['DR/CR'] || tx['dr/cr'] || tx['Type'] || tx['type'] || tx['Dr / Cr'] || tx['Dr / Cr_1'] || tx['DR / CR'] || tx['DR / CR_1'] || '').toString().trim().toUpperCase();
      const isDebit = crdrField === 'DR' || (amount < 0 && crdrField !== 'CR');
      
      if (isDebit) {
        if (!bankDebits.has(bankName)) {
          bankDebits.set(bankName, { debit: 0, accounts: new Map<string, number>() });
        }
        
        const bankDebit = bankDebits.get(bankName)!;
        bankDebit.debit += Math.abs(amount);
        
        if (accountId) {
          const currentAccountDebit = bankDebit.accounts.get(accountId) || 0;
          bankDebit.accounts.set(accountId, currentAccountDebit + Math.abs(amount));
        }
      }
    });
    
    const result: Array<{ name: string; debit: number; accounts: Array<{ account: string; debit: number }> }> = [];
    
    bankDebits.forEach((data, bankName) => {
      const accountDetails = Array.from(data.accounts.entries()).map(([accountId, debit]) => {
        const accountInfo = accountInfoMap[accountId];
        const displayAccount = isLoadingAccounts ? 'Loading...' : 
          (accountInfo?.accountNumber || 
          (accountId ? `****${accountId.slice(-4)}` : 'N/A'));
        
        return {
          account: displayAccount,
          debit
        };
      });
      
      result.push({
        name: bankName,
        debit: data.debit,
        accounts: accountDetails
      });
    });
    
    return result.sort((a, b) => b.debit - a.debit);
  };

  // Function to get balance breakdown by bank
  const getBalanceBreakdownByBank = () => {
    const bankBalances = new Map<string, { balance: number; accounts: Map<string, number> }>();
    
    allTransactions.forEach((tx: Record<string, unknown>) => {
      const accountId = (tx.accountId as string) || '';
      let bankName = (tx.bankName as string) || (accountId && accountInfoMap[accountId]?.bankName) || 'Unknown Bank';
      
      // If bank name is still unknown, try to extract from tags
      if (bankName === 'Unknown Bank' && tx.tags && Array.isArray(tx.tags)) {
        const tagNames = (tx.tags as Array<Record<string, unknown>>).map((tag: Record<string, unknown>) => {
          if (typeof tag === 'string') return tag;
          return (tag.name as string) || '';
        }).join(' ').toLowerCase();
        if (tagNames.includes('hdfc')) {
          bankName = 'HDFC';
        } else if (tagNames.includes('kotak')) {
          bankName = 'Kotak';
        } else if (tagNames.includes('yesb')) {
          bankName = 'YESB';
        }
      }
      // Determine signed amount using Dr/Cr where available
      const rawAmount = parseFloat((tx.AmountRaw as string) || (tx.Amount as string) || (tx.amount as string) || '0') || 0;
      const crdrField = extractCrDr(tx, rawAmount);
      let amount = rawAmount;
      if (crdrField === 'CR') {
        amount = Math.abs(rawAmount);
      } else if (crdrField === 'DR') {
        amount = -Math.abs(rawAmount);
      }
      
      if (!bankBalances.has(bankName)) {
        bankBalances.set(bankName, { balance: 0, accounts: new Map<string, number>() });
      }
      
      const bankBalance = bankBalances.get(bankName)!;
      bankBalance.balance += amount; // signed value
      
      if (accountId) {
        const currentAccountBalance = bankBalance.accounts.get(accountId) || 0;
        bankBalance.accounts.set(accountId, currentAccountBalance + amount);
      }
    });
    
    const result: Array<{ name: string; balance: number; accounts: Array<{ account: string; balance: number }> }> = [];
    
    bankBalances.forEach((data, bankName) => {
      const accountDetails = Array.from(data.accounts.entries()).map(([accountId, balance]) => {
        const accountInfo = accountInfoMap[accountId];
        // Show account number if available, otherwise show a masked version of the UUID
        const displayAccount = isLoadingAccounts ? 'Loading...' : 
          (accountInfo?.accountNumber || 
          (accountId ? `****${accountId.slice(-4)}` : 'N/A'));
        
        return {
          account: displayAccount,
          balance
        };
      });
      
      result.push({
        name: bankName,
        balance: data.balance,
        accounts: accountDetails
      });
    });
    
    return result.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  };



  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4">
        <div className="flex items-center p-2 border-b border-gray-100">
          {/* Compact Summary Statistics Row */}
          <div className="flex-1 flex items-center gap-2">
            <div className="relative group">
              <button
                className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg"
                title="Click to view detailed transaction statistics and analysis"
              >
                Total Tranx: {safeTotalTransactions}
              </button>
              {/* Transaction Count by Bank Tooltip */}
              <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none">
                <div className="text-sm font-semibold text-gray-800 mb-3">Transaction Count by Bank</div>
                {getTransactionCountsByBank().length > 0 ? (
                  <div className="space-y-2">
                    {getTransactionCountsByBank().map((bank, index) => (
                      <div key={index} className="text-sm mb-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">{bank.name}</span>
                          <span className="text-blue-600 font-bold">{bank.count} transactions</span>
                        </div>
                        {bank.accounts && bank.accounts.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1 ml-2 space-y-1">
                            {bank.accounts.map((acc, accIndex) => (
                              <div key={accIndex} className="flex justify-between">
                                <span>{acc.account}:</span>
                                <span className="font-medium">{acc.count} transactions</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No bank data available</div>
                )}
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-gray-800">Total</span>
                    <span className="text-blue-800">{safeTotalTransactions} transactions</span>
                  </div>
                </div>
          </div>
        </div>

            <div className="relative group">
              <button
                className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg"
                title="Click to view detailed credit transaction analysis"
              >
                Cr.: ₹{safeTotalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </button>
              {/* Credit Breakdown by Bank Tooltip */}
              <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none">
                <div className="text-sm font-semibold text-gray-800 mb-3">Credit Breakdown by Bank</div>
                {getCreditBreakdownByBank().length > 0 ? (
                  <div className="space-y-2">
                    {getCreditBreakdownByBank().map((bank, index) => (
                      <div key={index} className="text-sm mb-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">{bank.name}</span>
                          <span className="text-green-600 font-bold">₹{bank.credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {bank.accounts && bank.accounts.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1 ml-2 space-y-1">
                            {bank.accounts.map((acc, accIndex) => (
                              <div key={accIndex} className="flex justify-between">
                                <span>{acc.account}:</span>
                                <span className="font-medium">₹{acc.credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No bank data available</div>
                )}
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-gray-800">Total</span>
                    <span className="text-green-800">₹{safeTotalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
          </div>
        </div>
            <div className="relative group">
              <button
                className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg text-sm font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg"
                title="Click to view detailed debit transaction analysis"
              >
                Dr.: ₹{safeTotalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </button>
              {/* Debit Breakdown by Bank Tooltip */}
              <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none">
                <div className="text-sm font-semibold text-gray-800 mb-3">Debit Breakdown by Bank</div>
                {getDebitBreakdownByBank().length > 0 ? (
                  <div className="space-y-2">
                    {getDebitBreakdownByBank().map((bank, index) => (
                      <div key={index} className="text-sm mb-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">{bank.name}</span>
                          <span className="text-red-600 font-bold">₹{bank.debit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {bank.accounts && bank.accounts.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1 ml-2 space-y-1">
                            {bank.accounts.map((acc, accIndex) => (
                              <div key={accIndex} className="flex justify-between">
                                <span>{acc.account}:</span>
                                <span className="font-medium">₹{acc.debit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No bank data available</div>
                )}
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-gray-800">Total</span>
                    <span className="text-red-800">₹{safeTotalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
          </div>
        </div>
        {showBalance && (
              <div className="relative group">
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold hover:transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700`}
                  title="Click to view detailed balance analysis and financial health"
                >
                  Bal.: ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </button>
                {/* Balance Breakdown by Bank Tooltip */}
                <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none">
                  <div className="text-sm font-semibold text-gray-800 mb-3">Balance Breakdown by Bank</div>
                  {getBalanceBreakdownByBank().length > 0 ? (
                    <div className="space-y-2">
                      {getBalanceBreakdownByBank().map((bank, index) => (
                        <div key={index} className="text-sm mb-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700 font-medium">{bank.name}</span>
                            <span className={`font-bold ${bank.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{bank.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          {bank.accounts && bank.accounts.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1 ml-2 space-y-1">
                              {bank.accounts.map((acc, accIndex) => (
                                <div key={accIndex} className="flex justify-between">
                                  <span>{acc.account}:</span>
                                  <span className={`font-medium ${acc.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ₹{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No bank data available</div>
                  )}
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-gray-800">Total</span>
                      <span className={`${balance >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                        ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Opening Balance Chip */}
            {allTransactionsProp && allTransactionsProp.length > 0 && (
              <div className="relative group">
                <button
                  className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg"
                  title="Opening balance from previous month"
                >
                  Opening: ₹{openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </button>
                  {/* Opening Balance Tooltip */}
                 <div className="absolute top-full left-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none">
                   <div className="text-sm font-semibold text-gray-800 mb-3">Opening Balance Breakdown</div>
                   <div className="text-sm text-gray-600 mb-2">
                     Balance from all transactions before the current period.
                   </div>
                   <div className="text-sm text-gray-600 mb-2">
                     <strong>Period:</strong> Before {dateRange?.from ? new Date(dateRange.from).toLocaleDateString('en-IN') : 'current view'}
                   </div>
                   
                   {/* Opening Balance by Bank */}
                   <div className="mt-3 pt-2 border-t border-gray-200">
                     <div className="text-xs text-gray-500 mb-2">Individual Bank Opening Balances:</div>
                     {getOpeningBalanceByBank.length > 0 ? (
                       <div className="space-y-2">
                         {getOpeningBalanceByBank.map((bank, index) => (
                           <div key={index} className="text-sm">
                             <div className="flex justify-between items-center">
                               <span className="text-gray-700 font-medium">{bank.name}</span>
                               <span className={`font-bold ${bank.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                 ₹{bank.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                               </span>
                             </div>
                             {bank.accounts && bank.accounts.length > 0 && (
                               <div className="text-xs text-gray-500 mt-1 ml-2 space-y-1">
                                 {bank.accounts.map((acc, accIndex) => (
                                   <div key={accIndex} className="flex justify-between">
                                     <span>{acc.account} ({acc.count} txns)</span>
                                     <span className={`${acc.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                       ₹{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                     </span>
                                   </div>
                                 ))}
                               </div>
                             )}
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="text-sm text-gray-500">No opening balance data</div>
                     )}
                     <div className="mt-3 pt-2 border-t border-gray-200">
                       <div className="flex justify-between items-center text-sm font-semibold">
                         <span className="text-gray-800">Total Opening Balance</span>
                         <span className={`${openingBalance >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                           ₹{openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </span>
                       </div>
                     </div>
                   </div>
                 </div>
              </div>
            )}
            {/* Closing Balance Chip */}
            {allTransactionsProp && allTransactionsProp.length > 0 && (
              <div className="relative group">
                <button
                  className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-sm font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg"
                  title="Closing balance including current period transactions"
                >
                  Closing: ₹{closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </button>
                  {/* Closing Balance Tooltip */}
                 <div className="absolute top-full left-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none">
                   <div className="text-sm font-semibold text-gray-800 mb-3">Closing Balance Breakdown</div>
                   

                   {/* Individual Bank Closing Balances */}
                   <div className="mt-3 pt-2">
                     <div className="text-xs text-gray-500 mb-2">Individual Bank Closing Balances:</div>
                     {getClosingBalanceByBank.length > 0 ? (
                       <div className="space-y-2">
                         {getClosingBalanceByBank.map((bank, index) => (
                           <div key={index} className="text-sm">
                             <div className="flex justify-between items-center">
                               <span className="text-gray-700 font-medium">{bank.name}</span>
                               <span className={`font-bold ${bank.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                 ₹{bank.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                               </span>
                             </div>
                             {bank.accounts && bank.accounts.length > 0 && (
                               <div className="text-xs text-gray-500 mt-1 ml-2 space-y-1">
                                 {bank.accounts.map((acc, accIndex) => (
                                   <div key={accIndex} className="flex justify-between">
                                     <span>{acc.account} ({acc.count} txns)</span>
                                     <span className={`${acc.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                       ₹{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                     </span>
                                   </div>
                                 ))}
                               </div>
                             )}
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="text-sm text-gray-500">No current period data</div>
                     )}
                   </div>

                   <div className="mt-3 pt-2 border-t border-gray-200">
                     <div className="flex justify-between items-center text-sm font-semibold">
                       <span className="text-gray-800">Final Closing Balance</span>
                       <span className={`${closingBalance >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                         ₹{closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                       </span>
                     </div>
                   </div>
                 </div>
              </div>
            )}
            <div className="relative group">
              <button
                className="px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg text-sm font-semibold hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg"
                title="Click to view detailed bank information and distribution"
              >
                Total Banks: {safeTotalBanks}
              </button>
              {/* Bank List Tooltip */}
              <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none">
                <div className="text-sm font-semibold text-gray-800 mb-3">Connected Banks</div>
                {getTransactionCountsByBank().length > 0 ? (
                  <div className="space-y-2">
                    {getTransactionCountsByBank().map((bank, index) => (
                      <div key={index} className="text-sm mb-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">{bank.name}</span>
                          <span className="text-yellow-600 font-bold">{bank.accounts.length} accounts</span>
                        </div>
                        {bank.accounts && bank.accounts.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1 ml-2 space-y-1">
                            {bank.accounts.map((acc, accIndex) => (
                              <div key={accIndex} className="flex justify-between">
                                <span>{acc.account}:</span>
                                <span className="font-medium">{acc.count} transactions</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No bank data available</div>
                )}
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-gray-800">Total</span>
                    <span className="text-yellow-800">{safeTotalBanks} banks</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative group">
              <button
                className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:from-purple-600 hover:to-purple-700 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg"
                title="Click to view detailed account information and management insights"
              >
                Total Acc.: {safeTotalAccounts}
              </button>
              {/* Account List Tooltip */}
              <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none">
                <div className="text-sm font-semibold text-gray-800 mb-3">Account Details</div>
                {getTransactionCountsByBank().length > 0 ? (
                  <div className="space-y-2">
                    {getTransactionCountsByBank().map((bank, index) => (
                      <div key={index} className="text-sm mb-2">
                        <div className="text-gray-700 font-medium mb-1">{bank.name}</div>
                        {bank.accounts && bank.accounts.length > 0 && (
                          <div className="text-xs text-gray-500 ml-2 space-y-1">
                            {bank.accounts.map((acc, accIndex) => (
                              <div key={accIndex} className="flex justify-between">
                                <span>{acc.account}:</span>
                                <span className="font-medium">{acc.count} transactions</span>
                              </div>
                            ))}
          </div>
        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No account data available</div>
                )}
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-gray-800">Total</span>
                    <span className="text-purple-800">{safeTotalAccounts} accounts</span>
                  </div>
                </div>
          </div>
        </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
      >
        {modalState.content}
      </Modal>
    </>
  );
};

export default AnalyticsSummary; 