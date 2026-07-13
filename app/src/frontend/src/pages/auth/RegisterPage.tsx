import React, { useState } from "react";
import { Link } from "react-router-dom";
import Toast from "../../components/layout/Toast";
import { DarkModeToggle } from "../../components/ui/DarkModeToggle";
import { ArrowLeft } from "lucide-react";

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    studentNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type?: "success" | "error" | "info";
  } | null>(null);

  // Helper for student number validation
  const isValidStudentNumber = (value: string) => /^\d{8}$/.test(value);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    // Only allow digits for studentNumber
    if (name === "studentNumber") {
      if (value === "" || /^\d{0,8}$/.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidStudentNumber(formData.studentNumber)) {
      setToast({
        message: "Student Number must be exactly 8 digits.",
        type: "error",
      });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setToast({ message: "Passwords do not match", type: "error" });
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          studentNumber: formData.studentNumber,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          // Handle validation errors
          const errorMessage = data.details
            .map(
              (err: { field: string; message: string }) =>
                `${err.field}: ${err.message}`
            )
            .join("\n");
          setToast({ message: errorMessage, type: "error" });
        } else {
          setToast({
            message: data.error || "Registration failed",
            type: "error",
          });
        }
        return;
      }

      // Registration successful
      setToast({
        message: "Registration successful!",
        type: "success",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (error) {
      console.error("Registration error:", error);
      setToast({
        message: "An error occurred during registration. Please try again.",
        type: "error",
      });
    }
  };

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
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
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-sm mx-auto">
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Create Your Student Account
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Join AllocAid to apply for TA positions as a student
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Note: Instructor and TA Coordinator accounts are created by
                    administrators
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="firstName"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        First Name
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="lastName"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Last Name
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150"
                      placeholder="john.doe@student.ubc.ca"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="studentNumber"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Student Number
                    </label>
                    <input
                      id="studentNumber"
                      name="studentNumber"
                      type="text"
                      required
                      maxLength={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150"
                      placeholder="12345678"
                      value={formData.studentNumber}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150 pr-10"
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={handleInputChange}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
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

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150 pr-10"
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={
                          showConfirmPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showConfirmPassword ? (
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
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
                  >
                    Create Account
                  </button>
                </form>

                <div className="text-center">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="text-primary-500 hover:text-primary-600 font-medium transition-colors duration-150"
                    >
                      Sign in
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
    </>
  );
};
