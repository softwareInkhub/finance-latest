import React from 'react';
import { 
  RiMoneyDollarCircleLine, 
  RiBankLine, 
  RiPriceTag3Line, 
  RiFileList3Line,
  RiArrowUpLine,
  RiArrowDownLine,
  RiArrowUpSLine,
  RiArrowDownSLine
} from 'react-icons/ri';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'indigo';
  trend?: {
    value: number;
    direction: 'up' | 'down';
    period: string;
  };
  tooltip?: string;
  onClick?: () => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  tooltip,
  onClick
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'bg-blue-100 text-blue-600',
      border: 'border-blue-200',
      hover: 'hover:bg-blue-100',
      text: 'text-blue-900'
    },
    green: {
      bg: 'bg-green-50',
      icon: 'bg-green-100 text-green-600',
      border: 'border-green-200',
      hover: 'hover:bg-green-100',
      text: 'text-green-900'
    },
    red: {
      bg: 'bg-red-50',
      icon: 'bg-red-100 text-red-600',
      border: 'border-red-200',
      hover: 'hover:bg-red-100',
      text: 'text-red-900'
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'bg-purple-100 text-purple-600',
      border: 'border-purple-200',
      hover: 'hover:bg-purple-100',
      text: 'text-purple-900'
    },
    orange: {
      bg: 'bg-orange-50',
      icon: 'bg-orange-100 text-orange-600',
      border: 'border-orange-200',
      hover: 'hover:bg-orange-100',
      text: 'text-orange-900'
    },
    indigo: {
      bg: 'bg-indigo-50',
      icon: 'bg-indigo-100 text-indigo-600',
      border: 'border-indigo-200',
      hover: 'hover:bg-indigo-100',
      text: 'text-indigo-900'
    }
  };

  const classes = colorClasses[color];

  return (
    <div
      className={`
        relative bg-white rounded-xl border ${classes.border} p-6 shadow-sm
        transition-all duration-200 hover:shadow-md hover:scale-[1.02]
        ${onClick ? 'cursor-pointer' : ''}
        ${classes.hover}
      `}
      onClick={onClick}
      title={tooltip}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${classes.icon}`}>
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">{title}</h3>
              <p className={`text-2xl font-bold ${classes.text}`}>
                {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
              </p>
            </div>
          </div>
          
          {trend && (
            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-1 text-sm ${
                trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.direction === 'up' ? (
                  <RiArrowUpLine className="w-4 h-4" />
                ) : (
                  <RiArrowDownLine className="w-4 h-4" />
                )}
                <span className="font-medium">{Math.abs(trend.value)}%</span>
              </div>
              <span className="text-xs text-gray-500">vs {trend.period}</span>
            </div>
          )}
        </div>
      </div>

      {/* Hover effect overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent to-white/5 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
    </div>
  );
};

interface SummaryCardsProps {
  data: {
    totalTransactions: number;
    totalCredit: number;
    totalDebit: number;
    balance: number;
    totalBanks: number;
    totalTags: number;
  };
  onCardClick?: (cardType: string) => void;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ data, onCardClick }) => {
  const cards = [
    {
      title: 'Total Transactions',
      value: data.totalTransactions,
      icon: <RiFileList3Line size={24} />,
      color: 'blue' as const,
      tooltip: `Total number of transactions: ${data.totalTransactions.toLocaleString()}`,
      onClick: () => onCardClick?.('transactions')
    },
    {
      title: 'Total Credit',
      value: `₹${data.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: <RiArrowUpSLine size={24} />,
      color: 'green' as const,
      trend: { value: 12.5, direction: 'up' as const, period: 'last month' },
      tooltip: `Total credit amount: ₹${data.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      onClick: () => onCardClick?.('credit')
    },
    {
      title: 'Total Debit',
      value: `₹${data.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              icon: <RiArrowDownSLine size={24} />,
      color: 'red' as const,
      trend: { value: 8.3, direction: 'down' as const, period: 'last month' },
      tooltip: `Total debit amount: ₹${data.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      onClick: () => onCardClick?.('debit')
    },
    {
      title: 'Balance',
      value: `₹${data.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: <RiMoneyDollarCircleLine size={24} />,
      color: data.balance >= 0 ? 'green' as const : 'red' as const,
      trend: { value: 15.2, direction: 'up' as const, period: 'last month' },
      tooltip: `Current balance: ₹${data.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      onClick: () => onCardClick?.('balance')
    },
    {
      title: 'Total Banks',
      value: data.totalBanks,
      icon: <RiBankLine size={24} />,
      color: 'purple' as const,
      tooltip: `Connected banks: ${data.totalBanks}`,
      onClick: () => onCardClick?.('banks')
    },
    {
      title: 'Total Tags',
      value: data.totalTags,
      icon: <RiPriceTag3Line size={24} />,
      color: 'indigo' as const,
      tooltip: `Active tags: ${data.totalTags}`,
      onClick: () => onCardClick?.('tags')
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
      {cards.map((card, index) => (
        <SummaryCard
          key={index}
          title={card.title}
          value={card.value}
          icon={card.icon}
          color={card.color}
          trend={card.trend}
          tooltip={card.tooltip}
          onClick={card.onClick}
        />
      ))}
    </div>
  );
};

export default SummaryCards;

