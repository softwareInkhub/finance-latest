import { RiFolder3Line, RiTimeLine, RiStarLine, RiDeleteBin6Line, RiCloudLine } from 'react-icons/ri';

interface FileSidebarProps {
  selected: string;
  onSelect: (section: string) => void;
  storageUsed?: number;
  storageTotal?: number;
}

const sections = [
  { key: 'all', label: 'All Files', icon: RiFolder3Line },
  { key: 'recent', label: 'Recent', icon: RiTimeLine },
  { key: 'starred', label: 'Starred', icon: RiStarLine },
  { key: 'bin', label: 'Bin', icon: RiDeleteBin6Line },
];

export default function FileSidebar({ selected, onSelect, storageUsed = 0, storageTotal = 15 * 1024 * 1024 * 1024 }: FileSidebarProps) {
  // storageTotal default: 15GB
  const usedMB = Math.round(storageUsed / (1024 * 1024));
  const totalMB = Math.round(storageTotal / (1024 * 1024));
  const percent = Math.min(100, Math.round((storageUsed / storageTotal) * 100));

  return (
    <aside className="w-56 bg-white/70 border-r border-blue-100 h-full flex flex-col py-6 px-2 gap-2">
      <button
        className="w-full flex items-center gap-2 px-4 py-2 mb-4 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition"
        onClick={() => onSelect('new')}
      >
        <RiFolder3Line className="text-lg" />
        New
      </button>
      <nav className="flex flex-col gap-1 flex-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = selected === section.key;
          return (
            <button
              key={section.key}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-blue-100 text-blue-700 shadow'
                  : 'text-gray-700 hover:bg-blue-50'
              }`}
              onClick={() => onSelect(section.key)}
            >
              <Icon className="text-xl" />
              <span>{section.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="mt-6 px-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <RiCloudLine />
          <span>Storage</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
          <div
            className="h-2 bg-blue-400 rounded-full"
            style={{ width: percent + '%' }}
          ></div>
        </div>
        <div className="text-xs text-gray-500">{usedMB} MB of {totalMB} MB used</div>
      </div>
    </aside>
  );
} 