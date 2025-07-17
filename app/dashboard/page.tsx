import { RiBankLine, RiAccountPinCircleLine, RiFileList3Line, RiTimeLine } from 'react-icons/ri';

export default function DashboardPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-blue-900">Dashboard</h1>
      
      {/* File Migration Banner removed */}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {/* Total Banks */}
        <div className="relative bg-white/70 backdrop-blur-lg p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-blue-100 transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl group overflow-hidden">
          <div className="absolute top-4 right-4 opacity-5 text-blue-500 text-5xl sm:text-6xl pointer-events-none select-none rotate-12">
            <RiBankLine />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-blue-100 p-2 sm:p-3 rounded-full text-blue-600 text-xl sm:text-2xl shadow group-hover:bg-blue-200 transition-colors duration-200">
              <RiBankLine className="animate-pulse" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Total Banks</h2>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-3 sm:mt-4">0</p>
        </div>
        {/* Total Accounts */}
        <div className="relative bg-white/70 backdrop-blur-lg p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-green-100 transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl group overflow-hidden">
          <div className="absolute top-4 right-4 opacity-5 text-green-500 text-5xl sm:text-6xl pointer-events-none select-none -rotate-12">
            <RiAccountPinCircleLine />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-green-100 p-2 sm:p-3 rounded-full text-green-600 text-xl sm:text-2xl shadow group-hover:bg-green-200 transition-colors duration-200">
              <RiAccountPinCircleLine className="animate-pulse" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Total Accounts</h2>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-3 sm:mt-4">0</p>
        </div>
        {/* Total Statements */}
        <div className="relative bg-white/70 backdrop-blur-lg p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-purple-100 transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl group overflow-hidden">
          <div className="absolute top-4 right-4 opacity-5 text-purple-500 text-5xl sm:text-6xl pointer-events-none select-none rotate-6">
            <RiFileList3Line />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-purple-100 p-2 sm:p-3 rounded-full text-purple-600 text-xl sm:text-2xl shadow group-hover:bg-purple-200 transition-colors duration-200">
              <RiFileList3Line className="animate-pulse" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Total Statements</h2>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-3 sm:mt-4">0</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/70 backdrop-blur-lg p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-gray-100">
        <div className="flex items-center gap-2 sm:gap-3 mb-4">
          <div className="bg-gray-200 p-2 sm:p-3 rounded-full text-gray-500 text-xl sm:text-2xl">
            <RiTimeLine />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-800">Recent Activity</h2>
        </div>
        <div className="text-gray-500 text-center py-6 sm:py-8">
          No recent activity
        </div>
      </div>
    </div>
  );
} 