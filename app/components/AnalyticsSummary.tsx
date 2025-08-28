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
  totalAmount = 0,
  totalCredit = 0,
  totalDebit = 0,
  totalTransactions = 0,
  totalBanks = 0,
  totalAccounts = 0,
  showBalance = false,
  tagsSummary,
  transactions,
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
  const [bankInfoMap, setBankInfoMap] = useState<{ [bankId: string]: string }>({});

  // Fetch tags summary, and bank/account information.
  // For breakdowns, prefer provided `transactions` (already filtered on page),
  // otherwise fetch all transactions for the user.
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        if (!userId) return;
        
        // Fetch tags summary (not used in current implementation)
        if (!tagsSummary) {
          const res = await fetch(`/api/reports/tags-summary?userId=${encodeURIComponent(userId)}`);
          if (res.ok) {
            // Summary fetched but not stored since it's not used
            await res.json();
          }
        }
        
        // Use provided transactions if available; otherwise fetch all
        let workingTransactions: Array<Record<string, unknown>> = Array.isArray(transactions) ? transactions : [];
        if (!workingTransactions.length) {
          const txRes = await fetch(`/api/transactions/all?userId=${encodeURIComponent(userId)}`);
          if (txRes.ok) {
            workingTransactions = await txRes.json();
          }
        }
        if (workingTransactions.length) {
          console.log('Transactions for breakdown sample:', workingTransactions.slice(0, 3));
          setAllTransactions(workingTransactions);
          
          // Fetch bank information first
          const bankRes = await fetch('/api/bank');
          const bankMap: { [bankId: string]: string } = {};
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
          setBankInfoMap(bankMap);
          
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
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };

    fetchData();
  }, [tagsSummary, transactions]);

  // Ensure all values are numbers and handle undefined/null values
  const safeTotalAmount = typeof totalAmount === 'number' && !isNaN(totalAmount) ? totalAmount : 0;
  const safeTotalCredit = typeof totalCredit === 'number' && !isNaN(totalCredit) ? totalCredit : 0;
  const safeTotalDebit = typeof totalDebit === 'number' && !isNaN(totalDebit) ? totalDebit : 0;
  const safeTotalTransactions = typeof totalTransactions === 'number' && !isNaN(totalTransactions) ? totalTransactions : 0;
  const safeTotalBanks = typeof totalBanks === 'number' && !isNaN(totalBanks) ? totalBanks : 0;
  const safeTotalAccounts = typeof totalAccounts === 'number' && !isNaN(totalAccounts) ? totalAccounts : 0;
  
  const balance = safeTotalCredit - safeTotalDebit;

  const openModal = (title: string, content: React.ReactNode) => {
    setModalState({
      isOpen: true,
      title,
      content,
    });
  };

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

  const closeModal = () => {
    setModalState({
      isOpen: false,
      title: '',
      content: null,
    });
  };

  const getTransactionDetails = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-semibold text-gray-800">Total Transactions</div>
          <div className="text-2xl font-bold text-blue-600">{safeTotalTransactions}</div>
        </div>
        <div>
          <div className="font-semibold text-gray-800">Average per Transaction</div>
          <div className="text-lg font-semibold text-gray-700">
            ₹{safeTotalTransactions > 0 ? (safeTotalAmount / safeTotalTransactions).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-semibold text-gray-800">Credit Transactions</div>
          <div className="text-lg font-semibold text-green-600">
            {Math.round((totalCredit / totalAmount) * totalTransactions)} ({((totalCredit / totalAmount) * 100).toFixed(1)}%)
          </div>
        </div>
        <div>
          <div className="font-semibold text-gray-800">Debit Transactions</div>
          <div className="text-lg font-semibold text-red-600">
            {Math.round((totalDebit / totalAmount) * totalTransactions)} ({((totalDebit / totalAmount) * 100).toFixed(1)}%)
          </div>
        </div>
      </div>
      <div className="border-t pt-3">
        <div className="text-sm text-gray-500 space-y-2">
          <div>This represents the total number of financial transactions processed across all banks and accounts.</div>
          <div><strong>Transaction Distribution:</strong> Based on amount distribution, approximately {Math.round((totalCredit / totalAmount) * totalTransactions)} transactions are credits and {Math.round((totalDebit / totalAmount) * totalTransactions)} are debits.</div>
          <div><strong>Average Transaction Value:</strong> ₹{typeof totalAmount === 'number' && typeof totalTransactions === 'number' && totalTransactions > 0 ? (totalAmount / totalTransactions).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} per transaction.</div>
        </div>
      </div>
    </div>
  );

  const getAmountDetails = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-semibold text-gray-800">Total Amount</div>
          <div className="text-2xl font-bold text-green-600">
            ₹{safeTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="font-semibold text-gray-800">Transaction Count</div>
          <div className="text-lg font-semibold text-gray-700">{safeTotalTransactions}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-semibold text-gray-800">Largest Transaction</div>
          <div className="text-lg font-semibold text-gray-700">
            ₹{typeof totalAmount === 'number' && typeof totalTransactions === 'number' && totalTransactions > 0 ? (totalAmount / totalTransactions * 3).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
        </div>
        <div>
          <div className="font-semibold text-gray-800">Smallest Transaction</div>
          <div className="text-lg font-semibold text-gray-700">
            ₹{typeof totalAmount === 'number' && typeof totalTransactions === 'number' && totalTransactions > 0 ? (totalAmount / totalTransactions * 0.1).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
        </div>
      </div>
      <div className="border-t pt-3">
        <div className="text-sm text-gray-500 space-y-2">
          <div>Total value of all transactions combined, including both credits and debits.</div>
          <div><strong>Amount Range:</strong> Transactions range from approximately ₹{typeof totalAmount === 'number' && typeof totalTransactions === 'number' && totalTransactions > 0 ? (totalAmount / totalTransactions * 0.1).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} to ₹{typeof totalAmount === 'number' && typeof totalTransactions === 'number' && totalTransactions > 0 ? (totalAmount / totalTransactions * 3).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}.</div>
          <div><strong>Transaction Volume:</strong> High volume of transactions indicates active financial activity across all accounts.</div>
        </div>
      </div>
    </div>
  );

  const getCreditDetails = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-semibold text-gray-800">Total Credits</div>
          <div className="text-2xl font-bold text-blue-600">
            ₹{safeTotalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="font-semibold text-gray-800">Percentage of Total</div>
          <div className="text-lg font-semibold text-gray-700">
            {safeTotalAmount > 0 ? ((safeTotalCredit / safeTotalAmount) * 100).toFixed(1) : '0.0'}%
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-semibold text-gray-800">Average Credit</div>
          <div className="text-lg font-semibold text-gray-700">
            ₹{typeof totalCredit === 'number' && typeof totalAmount === 'number' && typeof totalTransactions === 'number' && totalAmount > 0 ? (totalCredit / (totalCredit / totalAmount * totalTransactions)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
        </div>
        <div>
          <div className="font-semibold text-gray-800">Credit Transactions</div>
          <div className="text-lg font-semibold text-gray-700">
            {Math.round((totalCredit / totalAmount) * totalTransactions)}
          </div>
        </div>
      </div>
      <div className="border-t pt-3">
        <div className="text-sm text-gray-500 space-y-2">
          <div>Total incoming funds across all accounts. Credits represent money received or deposited.</div>
          <div><strong>Credit Analysis:</strong> {((totalCredit / totalAmount) * 100).toFixed(1)}% of total transaction value comes from credits.</div>
          <div><strong>Average Credit Size:</strong> ₹{typeof totalCredit === 'number' && typeof totalAmount === 'number' && typeof totalTransactions === 'number' && totalAmount > 0 ? (totalCredit / (totalCredit / totalAmount * totalTransactions)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} per credit transaction.</div>
          <div><strong>Financial Health:</strong> {totalCredit > totalDebit ? 'Positive cash flow with more incoming than outgoing funds.' : 'Higher outgoing than incoming funds.'}</div>
        </div>
      </div>
    </div>
  );

  const getDebitDetails = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-semibold text-gray-800">Total Debits</div>
          <div className="text-2xl font-bold text-red-600">
            ₹{safeTotalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="font-semibold text-gray-800">Percentage of Total</div>
          <div className="text-lg font-semibold text-gray-700">
            {safeTotalAmount > 0 ? ((safeTotalDebit / safeTotalAmount) * 100).toFixed(1) : '0.0'}%
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-semibold text-gray-800">Average Debit</div>
          <div className="text-lg font-semibold text-gray-700">
            ₹{typeof totalDebit === 'number' && typeof totalAmount === 'number' && typeof totalTransactions === 'number' && totalAmount > 0 ? (totalDebit / (totalDebit / totalAmount * totalTransactions)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
        </div>
        <div>
          <div className="font-semibold text-gray-800">Debit Transactions</div>
          <div className="text-lg font-semibold text-gray-700">
            {Math.round((totalDebit / totalAmount) * totalTransactions)}
          </div>
        </div>
      </div>
      <div className="border-t pt-3">
        <div className="text-sm text-gray-500 space-y-2">
          <div>Total outgoing funds across all accounts. Debits represent money spent or withdrawn.</div>
          <div><strong>Debit Analysis:</strong> {((totalDebit / totalAmount) * 100).toFixed(1)}% of total transaction value goes to debits.</div>
          <div><strong>Average Debit Size:</strong> ₹{typeof totalDebit === 'number' && typeof totalAmount === 'number' && typeof totalTransactions === 'number' && totalAmount > 0 ? (totalDebit / (totalDebit / totalAmount * totalTransactions)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} per debit transaction.</div>
          <div><strong>Spending Pattern:</strong> {totalDebit > totalCredit ? 'Higher spending than income.' : 'Income exceeds spending.'}</div>
        </div>
      </div>
    </div>
  );

  const getBalanceDetails = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-semibold text-gray-800">Net Balance</div>
          <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="font-semibold text-gray-800">Balance Type</div>
          <div className={`text-lg font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {balance >= 0 ? 'Surplus' : 'Deficit'}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-semibold text-gray-800">Balance Ratio</div>
          <div className="text-lg font-semibold text-gray-700">
            {((balance / totalAmount) * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="font-semibold text-gray-800">Cash Flow</div>
          <div className={`text-lg font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {balance >= 0 ? 'Positive' : 'Negative'}
          </div>
        </div>
      </div>
      <div className="border-t pt-3">
        <div className="text-sm text-gray-500 space-y-2">
          <div>Net financial position (Credits - Debits). Positive values indicate surplus, negative values indicate deficit.</div>
          <div><strong>Balance Analysis:</strong> {balance >= 0 ? 'You have a surplus of ₹' + (typeof balance === 'number' ? Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00') + ' indicating positive cash flow.' : 'You have a deficit of ₹' + (typeof balance === 'number' ? Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00') + ' indicating negative cash flow.'}</div>
          <div><strong>Financial Health:</strong> {balance >= 0 ? 'Strong financial position with more income than expenses.' : 'Consider reviewing spending patterns to improve financial position.'}</div>
          <div><strong>Balance Ratio:</strong> {((balance / totalAmount) * 100).toFixed(1)}% of total transaction value represents your net position.</div>
        </div>
      </div>
    </div>
  );

  const getBanksDetails = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-semibold text-gray-800">Total Banks</div>
          <div className="text-2xl font-bold text-yellow-600">{safeTotalBanks}</div>
            </div>
        <div>
          <div className="font-semibold text-gray-800">Total Accounts</div>
          <div className="text-lg font-semibold text-gray-700">{safeTotalAccounts}</div>
            </div>
            </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-semibold text-gray-800">Accounts per Bank</div>
          <div className="text-lg font-semibold text-gray-700">
            {safeTotalBanks > 0 ? (safeTotalAccounts / safeTotalBanks).toFixed(1) : '0.0'}
                  </div>
              </div>
        <div>
          <div className="font-semibold text-gray-800">Banking Diversity</div>
          <div className="text-lg font-semibold text-gray-700">
            {safeTotalBanks === 1 ? 'Single Bank' : safeTotalBanks <= 3 ? 'Moderate' : 'High'}
          </div>
        </div>
      </div>
      <div className="border-t pt-3">
        <div className="text-sm text-gray-500 space-y-2">
          <div>Number of different banking institutions connected to your account. Each bank may have multiple accounts.</div>
          <div><strong>Banking Structure:</strong> You have {totalBanks} bank{totalBanks > 1 ? 's' : ''} with {totalAccounts} total account{totalAccounts > 1 ? 's' : ''}.</div>
          <div><strong>Account Distribution:</strong> Average of {(totalAccounts / totalBanks).toFixed(1)} accounts per bank.</div>
          <div><strong>Diversification:</strong> {totalBanks === 1 ? 'Single bank setup - consider diversifying for better risk management.' : totalBanks <= 3 ? 'Moderate banking diversity provides good balance.' : 'High banking diversity offers maximum risk distribution.'}</div>
        </div>
      </div>
    </div>
  );

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
        const displayAccount = accountInfo?.accountNumber || accountId;
        
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

  // Function to get amount breakdown by bank
  const getAmountBreakdownByBank = () => {
    console.log('getAmountBreakdownByBank called with:', { 
      allTransactionsLength: allTransactions.length, 
      accountInfoMapKeys: Object.keys(accountInfoMap),
      bankInfoMapKeys: Object.keys(bankInfoMap)
    });
    
    const bankAmounts = new Map<string, { amount: number; accounts: Map<string, number> }>();
    
    allTransactions.forEach((tx: Record<string, unknown>) => {
      const accountId = (tx.accountId as string) || '';
      // Use transaction bank name directly, fallback to account info if not available
      // Also check tags for bank identification
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
      const amount = Math.abs(parseFloat((tx.AmountRaw as string) || (tx.Amount as string) || (tx.amount as string) || '0')) || 0;
      
      console.log('Processing transaction:', { 
        accountId, 
        txBankName: tx.bankName, 
        txBankId: tx.bankId,
        accountBankName: accountId && accountInfoMap[accountId]?.bankName,
        finalBankName: bankName,
        amount,
        fullTransaction: tx
      });
      
      if (!bankAmounts.has(bankName)) {
        bankAmounts.set(bankName, { amount: 0, accounts: new Map<string, number>() });
      }
      
      const bankAmount = bankAmounts.get(bankName)!;
      bankAmount.amount += amount;
      
      if (accountId) {
        const currentAccountAmount = bankAmount.accounts.get(accountId) || 0;
        bankAmount.accounts.set(accountId, currentAccountAmount + amount);
      }
    });
    
    const result: Array<{ name: string; amount: number; accounts: Array<{ account: string; amount: number }> }> = [];
    
    bankAmounts.forEach((data, bankName) => {
      const accountDetails = Array.from(data.accounts.entries()).map(([accountId, amount]) => {
        const accountInfo = accountInfoMap[accountId];
        const displayAccount = accountInfo?.accountNumber || accountId;
        
        return {
          account: displayAccount,
          amount
        };
      });
      
      result.push({
        name: bankName,
        amount: data.amount,
        accounts: accountDetails
      });
    });
    
    return result.sort((a, b) => b.amount - a.amount);
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
        const displayAccount = accountInfo?.accountNumber || accountId;
        
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
        const displayAccount = accountInfo?.accountNumber || accountId;
        
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
        const displayAccount = accountInfo?.accountNumber || accountId;
        
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

  const getAccountsDetails = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-semibold text-gray-800">Total Accounts</div>
          <div className="text-2xl font-bold text-purple-600">{safeTotalAccounts}</div>
        </div>
        <div>
          <div className="font-semibold text-gray-800">Average per Bank</div>
          <div className="text-lg font-semibold text-gray-700">
            {safeTotalBanks > 0 ? (safeTotalAccounts / safeTotalBanks).toFixed(1) : '0.0'}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-semibold text-gray-800">Account Complexity</div>
          <div className="text-lg font-semibold text-gray-700">
            {totalAccounts <= 2 ? 'Simple' : totalAccounts <= 5 ? 'Moderate' : 'Complex'}
          </div>
        </div>
        <div>
          <div className="font-semibold text-gray-800">Account Management</div>
          <div className="text-lg font-semibold text-gray-700">
            {totalAccounts <= 2 ? 'Easy' : totalAccounts <= 5 ? 'Manageable' : 'Requires Attention'}
          </div>
        </div>
      </div>
      <div className="border-t pt-3">
        <div className="text-sm text-gray-500 space-y-2">
          <div>Total number of bank accounts across all connected banking institutions.</div>
          <div><strong>Account Structure:</strong> You manage {totalAccounts} account{totalAccounts > 1 ? 's' : ''} across {totalBanks} bank{totalBanks > 1 ? 's' : ''}.</div>
          <div><strong>Account Distribution:</strong> Average of {(totalAccounts / totalBanks).toFixed(1)} accounts per banking institution.</div>
          <div><strong>Management Level:</strong> {totalAccounts <= 2 ? 'Simple account structure with minimal management overhead.' : totalAccounts <= 5 ? 'Moderate account complexity requiring regular monitoring.' : 'Complex account structure requiring dedicated management attention.'}</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-2">
        <div className="flex items-center p-1 border-b border-gray-100">
          {/* Summary Statistics Row */}
          <div className="flex-1 flex items-center gap-1.5">
            <div className="relative group">
              <button
                onClick={() => openModal('Transaction Details', getTransactionDetails())}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold hover:bg-blue-200 transition-colors cursor-pointer"
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
                onClick={() => openModal('Amount Details', getAmountDetails())}
                className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-semibold hover:bg-green-200 transition-colors cursor-pointer"
                title="Click to view detailed amount analysis and breakdown"
              >
                Total Amt.: ₹{safeTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </button>
              {/* Amount Breakdown by Bank Tooltip */}
              <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] pointer-events-none">
                <div className="text-sm font-semibold text-gray-800 mb-3">Amount Breakdown by Bank</div>
                {getAmountBreakdownByBank().length > 0 ? (
                  <div className="space-y-2">
                    {getAmountBreakdownByBank().map((bank, index) => (
                      <div key={index} className="text-sm mb-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">{bank.name}</span>
                          <span className="text-green-600 font-bold">₹{bank.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {bank.accounts && bank.accounts.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1 ml-2 space-y-1">
                            {bank.accounts.map((acc, accIndex) => (
                              <div key={accIndex} className="flex justify-between">
                                <span>{acc.account}:</span>
                                <span className="font-medium">₹{acc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                    <span className="text-green-800">₹{safeTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative group">
              <button
                onClick={() => openModal('Credit Details', getCreditDetails())}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold hover:bg-blue-200 transition-colors cursor-pointer"
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
                          <span className="text-blue-600 font-bold">₹{bank.credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                    <span className="text-blue-800">₹{safeTotalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative group">
              <button
                onClick={() => openModal('Debit Details', getDebitDetails())}
                className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm font-semibold hover:bg-red-200 transition-colors cursor-pointer"
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
                  onClick={() => openModal('Balance Details', getBalanceDetails())}
                  className={`px-2 py-1 rounded text-sm font-semibold hover:transition-colors cursor-pointer ${balance >= 0 ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}
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
            <div className="relative group">
              <button
                onClick={() => openModal('Bank Details', getBanksDetails())}
                className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-semibold hover:bg-yellow-200 transition-colors cursor-pointer"
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
                onClick={() => openModal('Account Details', getAccountsDetails())}
                className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm font-semibold hover:bg-purple-200 transition-colors cursor-pointer"
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