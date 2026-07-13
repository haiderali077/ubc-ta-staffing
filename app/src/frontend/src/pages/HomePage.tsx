import React from "react";
import { Link } from "react-router-dom";
import UBCOStock from "../assets/images/UBCOStock.png";
import { DarkModeToggle } from "../components/ui/DarkModeToggle";
import { Logo } from "../components/layout/Logo";

export const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 font-inter overflow-x-hidden">
      {/* Header Navigation */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Logo size="large" className="mr-3" />
              <h2 className="text-xl font-clash font-bold text-primary-blue dark:text-cyan-400">
                
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <DarkModeToggle showLabel={false} />
              <Link
                to="/login"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-blue dark:hover:text-cyan-400 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-primary-blue dark:bg-cyan-500 hover:bg-blue-600 dark:hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-white dark:bg-gray-900 pt-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
            {/* Left Content */}
            <div className="space-y-8 animate-fade-in-up">
              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-clash font-bold text-slate-900 dark:text-white leading-tight">
                TA Hiring,{" "}
                <span className="bg-gradient-to-r from-primary-blue via-blue-500 to-cyan-400 bg-clip-text text-transparent">
                  Reimagined.
                </span>
              </h1>
              <p
                className="text-xl lg:text-2xl text-slate-600 dark:text-gray-300 leading-relaxed max-w-lg animate-fade-in-up"
                style={{ animationDelay: "0.2s" }}
              >
                AllocAid simplifies TA applications, requests, and allocations
                for university departments — combining clarity, speed, and
                control into a single platform.
              </p>
              <div
                className="flex flex-col sm:flex-row gap-4 animate-fade-in-up"
                style={{ animationDelay: "0.4s" }}
              >
                <Link
                  to="/register"
                  className="group px-8 py-4 bg-gradient-to-r from-primary-blue to-cyan-400 text-white rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                  Get Started
                  <svg
                    className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-4 border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-gray-300 hover:text-primary-blue dark:hover:text-cyan-400 hover:border-primary-blue/30 dark:hover:border-cyan-400/30 hover:bg-primary-blue/5 dark:hover:bg-cyan-400/10 font-semibold text-lg transition-all duration-200 rounded-xl flex items-center justify-center"
                >
                  Login
                </Link>
                <a
                  href="#learn-more"
                  className="px-8 py-4 text-slate-700 dark:text-gray-300 hover:text-primary-blue dark:hover:text-cyan-400 font-semibold text-lg transition-colors flex items-center justify-center"
                >
                  Learn more
                </a>
              </div>
              <div
                className="animate-fade-in"
                style={{ animationDelay: "0.6s" }}
              >
                <p className="text-slate-500 dark:text-gray-400 text-sm font-medium">
                  Trusted by UBC Computer Science Department
                </p>
              </div>
            </div>
            {/* Right Image */}
            <div
              className="relative lg:h-[600px] animate-slide-in-right"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="relative h-full rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={UBCOStock}
                  alt="UBC Campus with Cherry Blossoms"
                  className="w-full h-full object-cover rounded-2xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-100 rounded-full opacity-60 blur-xl"></div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-pink-100 rounded-full opacity-40 blur-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-gray-900 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-clash font-bold text-slate-900 dark:text-white mb-6">
              Built for every role
            </h2>
            <p className="text-xl text-slate-600 dark:text-gray-300 max-w-2xl mx-auto">
              Streamlined workflows designed specifically for students,
              instructors, and administrators.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            {/* Students */}
            <div className="border-t border-slate-200 dark:border-gray-700 py-12 group hover:bg-slate-50/50 dark:hover:bg-gray-800/50 transition-colors duration-300">
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-blue to-cyan-400 text-white rounded-lg flex items-center justify-center shadow-lg">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-clash font-semibold text-slate-900 dark:text-white mb-3">
                    For Students
                  </h3>
                  <p className="text-lg text-slate-600 dark:text-gray-300 leading-relaxed">
                    Apply to TA roles with ranked preferences and track your
                    status. Get real-time updates on your applications and
                    manage your academic workload efficiently.
                  </p>
                </div>
              </div>
            </div>
            {/* Instructors */}
            <div className="border-t border-slate-200 dark:border-gray-700 py-12 group hover:bg-slate-50/50 dark:hover:bg-gray-800/50 transition-colors duration-300">
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-lg flex items-center justify-center shadow-lg">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-clash font-semibold text-slate-900 dark:text-white mb-3">
                    For Instructors
                  </h3>
                  <p className="text-lg text-slate-600 dark:text-gray-300 leading-relaxed">
                    Submit TA needs and review matched applicants in one view.
                    Streamline your hiring process with intelligent matching and
                    comprehensive candidate profiles.
                  </p>
                </div>
              </div>
            </div>
            {/* TA Coordinators */}
            <div className="border-t border-slate-200 dark:border-gray-700 py-12 group hover:bg-slate-50/50 dark:hover:bg-gray-800/50 transition-colors duration-300">
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg flex items-center justify-center shadow-lg">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-clash font-semibold text-slate-900 dark:text-white mb-3">
                    For TA Coordinators
                  </h3>
                  <p className="text-lg text-slate-600 dark:text-gray-300 leading-relaxed">
                    Manage academic terms, course offerings, and instructor assignments.
                    Oversee the complete TA allocation workflow with comprehensive tools.
                  </p>
                </div>
              </div>
            </div>
            {/* Admins */}
            <div className="border-t border-slate-200 dark:border-gray-700 py-12 group hover:bg-slate-50/50 dark:hover:bg-gray-800/50 transition-colors duration-300">
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-lg flex items-center justify-center shadow-lg">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-clash font-semibold text-slate-900 dark:text-white mb-3">
                    For System Administrators
                  </h3>
                  <p className="text-lg text-slate-600 dark:text-gray-300 leading-relaxed">
                    Manage user accounts, system settings, and monitor system usage.
                    Maintain security and oversee configuration across the platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-900 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(0,33,69,0.3) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        ></div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-clash font-bold text-slate-900 dark:text-white mb-6">
              How it works
            </h2>
            <p className="text-xl text-slate-600 dark:text-gray-300 max-w-3xl mx-auto">
              A streamlined process that connects all stakeholders in the TA
              allocation workflow.
            </p>
          </div>
          <div className="max-w-4xl mx-auto space-y-16">
            {/* Step 1 */}
            <div className="flex items-start space-x-8">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-blue to-cyan-400 text-white rounded-full flex items-center justify-center font-clash font-bold text-xl shadow-lg">
                  01
                </div>
              </div>
              <div className="flex-1 pt-2">
                <h3 className="text-2xl font-clash font-semibold text-slate-900 dark:text-white mb-4">
                  Students Apply
                </h3>
                <p className="text-lg text-slate-600 dark:text-gray-300 leading-relaxed">
                  Submit applications with course preferences, qualifications,
                  and availability through an intuitive interface.
                </p>
              </div>
            </div>
            {/* Step 2 */}
            <div className="flex items-start space-x-8">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full flex items-center justify-center font-clash font-bold text-xl shadow-lg">
                  02
                </div>
              </div>
              <div className="flex-1 pt-2">
                <h3 className="text-2xl font-clash font-semibold text-slate-900 dark:text-white mb-4">
                  Instructors Submit Needs
                </h3>
                <p className="text-lg text-slate-600 dark:text-gray-300 leading-relaxed">
                  Request TAs for courses with specific requirements, including
                  skills needed, time commitments, and course details.
                </p>
              </div>
            </div>
            {/* Step 3 */}
            <div className="flex items-start space-x-8">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center font-clash font-bold text-xl shadow-lg">
                  03
                </div>
              </div>
              <div className="flex-1 pt-2">
                <h3 className="text-2xl font-clash font-semibold text-slate-900 dark:text-white mb-4">
                  TA Coordinators Allocate
                </h3>
                <p className="text-lg text-slate-600 dark:text-gray-300 leading-relaxed">
                  Review applications, manage assignments, and generate comprehensive
                  reports for payroll and records.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-ubc-blue via-primary-blue to-cyan-400 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/20 to-transparent pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-clash font-bold text-white mb-6">
            Built for UBC.{" "}
            <span className="text-cyan-200">Ready for any department.</span>
          </h2>
          <p className="text-xl text-cyan-100 dark:text-cyan-200 mb-10 max-w-2xl mx-auto">
            Try AllocAid today and experience a better way to manage TA hiring.
          </p>
          <Link
            to="/register"
            className="group px-8 py-4 bg-white text-ubc-blue hover:bg-slate-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center"
          >
            Learn More
            <svg
              className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
};
