import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Transaction } from '../../types/transaction';

interface AnalyticsData {
  totalAmount: number;
  totalCredit: number;
  totalDebit: number;
  totalTransactions: number;
  totalBanks: number;
  totalAccounts: number;
  transactions: Transaction[];
  lastUpdated: string;
}

interface AnalyticsState {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  data: null,
  loading: false,
  error: null,
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setAnalyticsData: (state, action: PayloadAction<AnalyticsData>) => {
      state.data = action.payload;
      state.loading = false;
      state.error = null;
    },
    setAnalyticsLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setAnalyticsError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearAnalyticsData: (state) => {
      state.data = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setAnalyticsData,
  setAnalyticsLoading,
  setAnalyticsError,
  clearAnalyticsData,
} = analyticsSlice.actions;

export default analyticsSlice.reducer;



