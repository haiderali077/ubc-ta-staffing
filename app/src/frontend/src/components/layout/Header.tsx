import React from "react";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { Navigation } from "./Navigation";
import { UserMenu } from "./UserMenu";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/auth";

export const Header: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <header
      className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50"
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center justify-between min-h-14 sm:min-h-16">
        {/* Logo/Brand Section */}
        <div className="flex-shrink-0 mr-3 sm:mr-6">
          <Link to="/" className="block" aria-label="AllocAid Home">
            <Logo size="small" />
          </Link>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 flex justify-center mx-2 sm:mx-4 overflow-hidden">
          <Navigation />
        </div>

        {/* User Actions Section */}
        <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <div className="flex gap-2">
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-3 py-2 text-xs sm:text-sm font-medium border border-primary-500 rounded-md bg-transparent text-primary-500 transition-all duration-150 hover:bg-primary-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-3 py-2 text-xs sm:text-sm font-medium border border-primary-500 rounded-md bg-primary-500 text-white transition-all duration-150 hover:bg-primary-600 hover:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Register
              </Link>
            </div>
          )}


        </div>
      </div>
    </header>
  );
};


