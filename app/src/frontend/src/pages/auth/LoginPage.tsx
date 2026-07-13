import React, { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { DarkModeToggle } from "../../components/ui/DarkModeToggle";
import { ArrowLeft } from "lucide-react";

const getDefaultRoute = (role: string) => {
  switch (role) {
    case "student":
      return "/dashboard";
    case "instructor":
      return "/dashboard";
    case "admin":
      return "/admin-dashboard";
    case "ta_coordinator":
      return "/academic-terms";
    default:
      return "/dashboard";
  }
};

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-lg text-gray-900 dark:text-white">Loading...</div>
      </div>
    );
  }

  // Redirect if already authenticated
  if (isAuthenticated && user) {
    const from = location.state?.from?.pathname || getDefaultRoute(user.role);
    return <Navigate to={from} replace />;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await login(formData.email, formData.password);
    if (!result.success) {
      setError(result.error || "Login failed");
      setLoading(false);
    }
    // Navigation will be handled by the Navigate component above
  };

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with back button and theme toggle */}
      <div className="fixed top-4 left-4 right-4 z-10 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <DarkModeToggle showLabel={false} />
      </div>
      
      <div
        className="max-w-4xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden flex"
        style={{ minHeight: "calc(100vh - 200px)" }}
      >
        <div className="flex-1 p-6 flex items-center">
          <div className="max-w-sm mx-auto w-full">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  Welcome to AllocAid
                </h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Please sign in with your email and password.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <div className="text-red-800 dark:text-red-200 text-sm">{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-cyan-400 focus:border-primary-500 dark:focus:border-cyan-400 transition-colors duration-150"
                    placeholder="example@student.ubc.ca"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-cyan-400 focus:border-primary-500 dark:focus:border-cyan-400 transition-colors duration-150 pr-10"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute inset-y-0 right-2 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        // Eye-off SVG
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.403-3.22 1.125-4.575M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.364-2.364A9.956 9.956 0 0021.9 12c0 5.523-4.477 10-10 10a9.956 9.956 0 01-4.364-.964M3 3l18 18"
                          />
                        </svg>
                      ) : (
                        // Eye SVG
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.364 0a9.956 9.956 0 01-1.414 2.828A9.956 9.956 0 0112 21a9.956 9.956 0 01-7.95-6.172A9.956 9.956 0 013.636 12a9.956 9.956 0 011.414-2.828A9.956 9.956 0 0112 3a9.956 9.956 0 017.95 6.172A9.956 9.956 0 0120.364 12z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 dark:bg-cyan-500 hover:bg-primary-600 dark:hover:bg-cyan-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-primary-500 dark:focus:ring-cyan-400 transition-colors duration-150"
                >
                  {loading ? "Signing In..." : "Sign In"}
                </button>
              </form>

              <div>
                <Link
                  to="/forgot-password"
                  className="text-primary-500 dark:text-cyan-400 hover:text-primary-600 dark:hover:text-cyan-300 text-sm font-medium transition-colors duration-150"
                >
                  Forgot Password
                </Link>
              </div>

              <div className="text-center">
                <span className="text-gray-600 dark:text-gray-300 text-sm">
                  New to AllocAid?{" "}
                  <Link
                    to="/register"
                    className="text-primary-500 dark:text-cyan-400 hover:text-primary-600 dark:hover:text-cyan-300 font-medium transition-colors duration-150"
                  >
                    Create an account
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:block lg:w-1/2 relative">
          <img
            src="/src/assets/images/arts_building.png"
            alt="UBC Okanagan Campus"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};
