'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { RiMenuLine } from 'react-icons/ri';

interface ChildSidebarProps {
  title: string;
  subtitle?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  width: number;
  onWidthChange: (width: number) => void;
  children: React.ReactNode;
  className?: string;
  showResizeHandle?: boolean;
  minWidth?: number;
  maxWidth?: number;
}

export default function ChildSidebar({
  title,
  subtitle,
  isCollapsed,
  onToggleCollapse,
  width,
  onWidthChange,
  children,
  className = '',
  showResizeHandle = true,
  minWidth = 200,
  maxWidth = 600
}: ChildSidebarProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  // Drag to resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setStartX(e.clientX);
    setStartWidth(width);
    setIsResizing(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    // Calculate the difference from the start position
    const deltaX = e.clientX - startX;
    const newWidth = startWidth + deltaX;
    
    // Only update if within bounds
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      onWidthChange(newWidth);
    }
  }, [isResizing, startX, startWidth, minWidth, maxWidth, onWidthChange]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <aside 
      data-sidebar={title.toLowerCase()}
      className={`${isCollapsed ? 'w-16' : ''} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${!isResizing ? 'transition-all duration-200 ease-out' : ''} relative ${className}`}
      style={{ width: isCollapsed ? '64px' : `${width}px` }}
    >
      {/* Collapse Button at Edge - Center */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-4 top-1/2 -translate-y-1/2 z-30 p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
        title={isCollapsed ? 'Expand' : 'Collapse'}
      >
        <RiMenuLine size={14} className="text-gray-600 dark:text-gray-300" />
      </button>

      {/* Resize Handle */}
      {!isCollapsed && showResizeHandle && (
        <div
          className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-500 hover:opacity-30 transition-all duration-200 z-20"
          onMouseDown={handleMouseDown}
          title="Drag to resize sidebar"
        />
      )}

      {/* Header */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mr-2">{title}</h2>
              {subtitle && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 pr-4">
        {children}
      </div>
    </aside>
  );
}

