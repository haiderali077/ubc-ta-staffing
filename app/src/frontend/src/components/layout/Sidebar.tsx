import React from "react";
import { Logo } from "./Logo";
import { Navigation } from "./Navigation";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "../../context/AuthContext";
// import { Link } from "react-router-dom";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, setOpen }) => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <>
      {/* Toggle Button */}
      <button
        className={`fixed top-4 left-4 z-50 p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-md transition-transform ${
          open ? "translate-x-0" : "translate-x-0"
        }`}
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close sidebar" : "Open sidebar"}
        style={{ display: open ? "none" : "block" }}
      >
        {/* Hamburger icon */}
        <svg
          className="h-6 w-6 text-gray-700 dark:text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-sm flex flex-col z-50 transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Collapse button */}
        <button
          className="absolute top-4 right-[-2.25rem] z-50 p-2 rounded-r-md bg-white dark:bg-gray-800 border border-l-0 border-gray-200 dark:border-gray-600 shadow-md"
          onClick={() => setOpen(false)}
          aria-label="Collapse sidebar"
          style={{ display: open ? "block" : "none" }}
        >
          {/* Left arrow icon */}
          <svg
            className="h-5 w-5 text-gray-700 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        {/* Logo Section */}
        <div className="flex items-center justify-center h-20 border-b border-gray-100 dark:border-gray-700">
          <Logo size="large" />
        </div>
        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-6 px-4">
          <Navigation vertical />
        </nav>
        {/* User Actions */}
        <div className="px-4 py-6 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-3">
          {isAuthenticated ? (
            <>
              <UserMenu />
              <ThemeToggle />
              <button
                onClick={() => logout()}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors duration-150 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16,17 21,12 16,7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Logout
              </button>
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
};
