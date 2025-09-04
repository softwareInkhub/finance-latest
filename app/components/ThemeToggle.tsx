'use client';

import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { RiSunLine, RiMoonLine } from 'react-icons/ri';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-10 w-20 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-gray-900 shadow-lg transform transition-transform duration-300 ${
          theme === 'dark' ? 'translate-x-10' : 'translate-x-1'
        }`}
      >
        {theme === 'light' ? (
          <RiSunLine className="h-5 w-5 text-yellow-500" />
        ) : (
          <RiMoonLine className="h-5 w-5 text-blue-400" />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;
