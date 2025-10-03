import { useCallback } from 'react';
import { useGlobalTabs, GlobalTab } from '../contexts/GlobalTabContext';
import { 
  RiDashboardLine, 
  RiBankLine, 
  RiFileTextLine, 
  RiPieChartLine, 
  RiPriceTag3Line,
  RiAccountPinCircleLine,
  RiFileListLine,
  RiSettingsLine,
  RiFolderLine,
  RiGitMergeLine
} from 'react-icons/ri';

// Import your real page components
import DashboardPage from '../dashboard/page';
import BanksPage from '../banks/page';
import ReportsPage from '../reports/page';
import FilesPage from '../files/page';
import TagsPage from '../tags/page';
import TransactionsPage from '../transactions/page';
import EntityFilesPage from '../components/EntityFilesPage';
import EntitiesPage from '../entities/page';
import FileMatchingPage from '../file-matching/page';

export const useTabManager = () => {
  const { addTab, setActiveTab, closeTab } = useGlobalTabs();

  const getIconForType = useCallback((type: GlobalTab['type']) => {
    switch (type) {
      case 'dashboard':
        return <RiDashboardLine className="w-4 h-4" />;
      case 'entities':
        return <RiFolderLine className="w-4 h-4" />;
      case 'banks':
        return <RiBankLine className="w-4 h-4" />;
      case 'transactions':
        return <RiFileTextLine className="w-4 h-4" />;
      case 'reports':
        return <RiPieChartLine className="w-4 h-4" />;
      case 'files':
        return <RiFileListLine className="w-4 h-4" />;
      case 'tags':
        return <RiPriceTag3Line className="w-4 h-4" />;
      case 'accounts':
        return <RiAccountPinCircleLine className="w-4 h-4" />;
      case 'statements':
        return <RiFileTextLine className="w-4 h-4" />;
      case 'file-matching':
        return <RiGitMergeLine className="w-4 h-4" />;
      default:
        return <RiSettingsLine className="w-4 h-4" />;
    }
  }, []);

  const openTab = useCallback((tab: Omit<GlobalTab, 'icon'>) => {
    const tabWithIcon: GlobalTab = {
      ...tab,
      icon: getIconForType(tab.type),
      closable: tab.closable !== false
    };
    addTab(tabWithIcon);
  }, [addTab, getIconForType]);

  const openDashboard = useCallback(() => {
    openTab({
      id: 'dashboard',
      title: 'Dashboard',
      type: 'dashboard',
      component: <DashboardPage />
    });
  }, [openTab]);

  const openEntities = useCallback(() => {
    openTab({
      id: 'entities',
      title: 'Entities',
      type: 'entities',
      component: <EntitiesPage />
    });
  }, [openTab]);

  const openTransactions = useCallback(() => {
    openTab({
      id: 'transactions',
      title: 'Transactions',
      type: 'transactions',
      component: <TransactionsPage />
    });
  }, [openTab]);

  const openReports = useCallback(() => {
    openTab({
      id: 'reports',
      title: 'Reports',
      type: 'reports',
      component: <ReportsPage />
    });
  }, [openTab]);

  const openFiles = useCallback(() => {
    openTab({
      id: 'files',
      title: 'Files',
      type: 'files',
      component: <FilesPage />
    });
  }, [openTab]);

  const openBanks = useCallback(() => {
    openTab({
      id: 'banks',
      title: 'Banks',
      type: 'banks',
      component: <BanksPage />
    });
  }, [openTab]);

  const openTags = useCallback(() => {
    openTab({
      id: 'tags',
      title: 'Tags',
      type: 'tags',
      component: <TagsPage />
    });
  }, [openTab]);

  const openFileMatching = useCallback(() => {
    openTab({
      id: 'file-matching',
      title: 'File Matching',
      type: 'file-matching',
      component: <FileMatchingPage />
    });
  }, [openTab]);

  const openAccounts = useCallback(() => {
    openTab({
      id: 'accounts',
      title: 'Accounts',
      type: 'accounts',
      component: (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Accounts</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            View and manage all your bank accounts and their details.
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-center text-gray-500">
              Account management is available through the Banks section. 
              Click on any bank to view and manage its accounts.
            </p>
          </div>
        </div>
      )
    });
  }, [openTab]);

  const openStatements = useCallback(() => {
    openTab({
      id: 'statements',
      title: 'Statements',
      type: 'statements',
      component: (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Statements</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            View and download your bank statements and financial documents.
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-center text-gray-500">
              Statement management is available through the Files section. 
              Upload and manage your bank statements there.
            </p>
          </div>
        </div>
      )
    });
  }, [openTab]);

  const openBankTab = useCallback((bankId: string, bankName: string, section: 'overview' | 'accounts' | 'statements' | 'files' | 'transactions') => {
    const tabId = `${bankId}-${section}`;
    const title = `${bankName} - ${section.charAt(0).toUpperCase() + section.slice(1)}`;
    
    openTab({
      id: tabId,
      title,
      type: 'banks',
      component: <div>{title} Content</div>,
      data: { bankId, section }
    });
  }, [openTab]);

  const openAccountTab = useCallback((accountId: string, accountName: string) => {
    const tabId = `account-${accountId}`;
    
    openTab({
      id: tabId,
      title: accountName,
      type: 'accounts',
      component: <div>{accountName} Account Content</div>,
      data: { accountId }
    });
  }, [openTab]);

  const openTransactionTab = useCallback((transactionId: string, transactionTitle: string) => {
    const tabId = `transaction-${transactionId}`;
    
    openTab({
      id: tabId,
      title: transactionTitle,
      type: 'transactions',
      component: <div>{transactionTitle} Transaction Details</div>,
      data: { transactionId }
    });
  }, [openTab]);

  const openEntityTab = useCallback((entityId: string, entityName: string) => {
    const tabId = `entity-${entityId}`;
    
    openTab({
      id: tabId,
      title: entityName,
      type: 'files',
      component: <EntityFilesPage entityId={entityId} entityName={entityName} />,
      data: { entityId, entityName }
    });
  }, [openTab]);

  return {
    openTab,
    openDashboard,
    openEntities,
    openTransactions,
    openReports,
    openFiles,
    openBanks,
    openTags,
    openFileMatching,
    openAccounts,
    openStatements,
    openBankTab,
    openAccountTab,
    openTransactionTab,
    openEntityTab,
    setActiveTab,
    closeTab
  };
};
