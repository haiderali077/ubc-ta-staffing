import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const UserMenu: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 px-3 py-2 bg-transparent border border-gray-200 dark:border-gray-600 rounded-md cursor-pointer transition-all duration-150 text-sm hover:border-primary-500 dark:hover:border-cyan-400 hover:bg-primary-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-cyan-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-7 h-7 rounded-full bg-primary-500 dark:bg-cyan-500 text-white flex items-center justify-center font-semibold text-xs">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">{user.name}</span>
        <svg 
          className={`transition-transform duration-150 text-gray-500 dark:text-gray-400 ${isOpen ? 'rotate-180' : ''}`}
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-1 right-0 min-w-60 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 z-50">
          <div className="py-2">
            <div className="font-semibold text-gray-800 dark:text-white mb-1">{user.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{user.email}</div>
            <div className="text-sm text-primary-500 dark:text-cyan-400 font-medium px-2 py-1 bg-primary-50 dark:bg-cyan-900/20 rounded inline-block">
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </div>
          </div>
          {/* Profile button for students */}
          {user.role === 'student' && (
            <button
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md transition-all duration-150 text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-cyan-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 mb-2"
              onClick={() => {
                navigate('/profile');
                setIsOpen(false);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 dark:text-gray-400">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-2.5 3.5-4 8-4s8 1.5 8 4" />
              </svg>
              Profile
            </button>
          )}
        </div>
      )}
    </div>
  );
}; 