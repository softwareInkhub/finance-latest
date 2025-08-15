import React, { useState } from 'react';

interface AnalyticsSummaryProps {
  totalAmount: number;
  totalCredit: number;
  totalDebit: number;
  totalTransactions: number;
  totalBanks: number;
  totalAccounts: number;
  showBalance?: boolean;
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
            <button
              onClick={() => openModal('Transaction Details', getTransactionDetails())}
              className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold hover:bg-blue-200 transition-colors cursor-pointer"
            >
              Total Tranx: {safeTotalTransactions}
            </button>
            <button
              onClick={() => openModal('Amount Details', getAmountDetails())}
              className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-semibold hover:bg-green-200 transition-colors cursor-pointer"
            >
              Total Amt.: ₹{safeTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </button>
            <button
              onClick={() => openModal('Credit Details', getCreditDetails())}
              className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold hover:bg-blue-200 transition-colors cursor-pointer"
            >
              Cr.: ₹{safeTotalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </button>
            <button
              onClick={() => openModal('Debit Details', getDebitDetails())}
              className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm font-semibold hover:bg-red-200 transition-colors cursor-pointer"
            >
              Dr.: ₹{safeTotalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </button>
            {showBalance && (
              <button
                onClick={() => openModal('Balance Details', getBalanceDetails())}
                className={`px-2 py-1 rounded text-sm font-semibold hover:transition-colors cursor-pointer ${balance >= 0 ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}
              >
                Bal.: ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </button>
            )}
            <button
              onClick={() => openModal('Bank Details', getBanksDetails())}
              className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-semibold hover:bg-yellow-200 transition-colors cursor-pointer"
            >
              Total Banks: {safeTotalBanks}
            </button>
            <button
              onClick={() => openModal('Account Details', getAccountsDetails())}
              className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm font-semibold hover:bg-purple-200 transition-colors cursor-pointer"
            >
              Total Acc.: {safeTotalAccounts}
            </button>
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