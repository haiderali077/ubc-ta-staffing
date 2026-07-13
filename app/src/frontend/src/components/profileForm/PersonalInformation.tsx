"use client";
import React, { useState } from "react";

const PROGRAM_OPTIONS = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Other (Please Specify)",
];

interface PersonalInformationProps {
  fullName: string;
  setFullName: (value: string) => void;
  studentNumber: string;
  email: string;
  setEmail: (value: string) => void;
  program: string;
  setProgram: (value: string) => void;
  programOther: string;
  setProgramOther: (value: string) => void;
  onInputChange: () => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onSave: () => Promise<void>;
}

export function PersonalInformationSection({
  fullName,
  setFullName,
  studentNumber,
  email,
  setEmail: _setEmail, // Unused since email is read-only
  program,
  setProgram,
  programOther,
  setProgramOther,
  onInputChange,
  saveStatus,
  onSave,
}: PersonalInformationProps) {
  const [validationErrors, setValidationErrors] = useState({
    fullName: false,
    program: false,
    programOther: false,
  });

  const handleBlur = () => {
    setValidationErrors({
      fullName: !fullName,
      program: !program,
      programOther:
        program === "Other (Please Specify)" && programOther.length > 20,
    });
  };

  const handleSave = async () => {
    const errors = {
      fullName: !fullName,
      program: !program,
      programOther:
        program === "Other (Please Specify)" && programOther.length > 20,
    };
    setValidationErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    if (program === "Other (Please Specify)") {
      setProgram(programOther);
    }
    await onSave();
  };

  const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setProgram(value);
    setValidationErrors((prev) => ({
      ...prev,
      program: false,
      programOther:
        value === "Other (Please Specify)" ? prev.programOther : false,
    }));
    onInputChange();
  };

  const handleProgramOtherChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProgramOther(value);
    if (value.length <= 20) {
      setValidationErrors((prev) => ({
        ...prev,
        programOther: false,
      }));
    }
    onInputChange();
  };

  const getSaveButtonClass = (status: string) => {
    const baseClass =
      "h-[40px] px-[16px] rounded-[6px] text-[14px] font-[500] transition-all duration-200 shadow-sm";
    switch (status) {
      case "saving":
        return `${baseClass} bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 cursor-not-allowed border border-blue-200 dark:border-blue-700`;
      case "saved":
        return `${baseClass} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-900/40`;
      case "error":
        return `${baseClass} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/40`;
      default:
        return `${baseClass} bg-[#002145] dark:bg-blue-600 text-white hover:bg-[#001A36] dark:hover:bg-blue-700 border border-[#002145] dark:border-blue-600 hover:shadow-md`;
    }
  };

  const getSaveButtonText = (status: string) => {
    switch (status) {
      case "saving":
        return "Saving...";
      case "saved":
        return "Saved!";
      case "error":
        return "Error";
      default:
        return "Save Section";
    }
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-[16px] border border-[#E5E7EB] dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200">
      <header className="p-[24px] border-b border-[#E5E7EB] dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-t-[16px]">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2 className="text-[20px] font-[600] text-[#1F2937] dark:text-white">
              Personal Information
            </h2>
          </div>
        </div>
        <p className="text-[14px] text-[#6B7280] dark:text-gray-400 mt-1">
          Basic information about yourself for your TA application
        </p>
      </header>
      <div className="p-[24px] bg-white dark:bg-gray-800 space-y-[24px]">
        <div className="grid grid-cols-1 gap-[24px]">
          <div>
            <label
              htmlFor="fullName"
              className={`block text-[14px] font-[500] ${
                validationErrors.fullName ? "text-[#EF4444] dark:text-red-400" : "text-[#374151] dark:text-gray-300"
              } mb-[8px] flex items-center gap-2`}
            >
              <span>Full Name *</span>
              {fullName && !validationErrors.fullName && (
                <svg
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </label>
            <div className="relative">
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (e.target.value)
                    setValidationErrors((prev) => ({
                      ...prev,
                      fullName: false,
                    }));
                  onInputChange();
                }}
                onBlur={handleBlur}
                placeholder="Enter your full name"
                className={`w-full h-[50px] px-[16px] border ${
                  validationErrors.fullName
                    ? "border-[#EF4444] bg-[#FEF2F2] dark:bg-red-900/20 dark:border-red-500 focus:ring-red-500"
                    : fullName
                    ? "border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-500 focus:ring-green-500"
                    : "border-[#D1D5DB] dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-[#002145] dark:focus:ring-blue-400"
                } rounded-[8px] text-[16px] text-[#1F2937] dark:text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200`}
              />
              {fullName && !validationErrors.fullName && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg
                    className="w-5 h-5 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </div>
            {validationErrors.fullName && (
              <p className="mt-1 text-[12px] text-[#EF4444] dark:text-red-400 flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Full name is required
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-[24px] max-lg:grid-cols-1">
          <div>
            <label
              htmlFor="studentId"
              className="flex text-[14px] font-[500] text-[#374151] dark:text-gray-300 mb-[8px] items-center gap-2"
            >
              <span>Student ID</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                Auto-filled
              </span>
            </label>
            <div className="relative">
              <input
                id="studentId"
                type="text"
                value={studentNumber}
                readOnly
                className="w-full h-[50px] px-[16px] border border-[#D1D5DB] dark:border-gray-600 rounded-[8px] text-[16px] text-[#1F2937] dark:text-gray-400 bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <label
              htmlFor="email"
              className="flex text-[14px] font-[500] text-[#374151] dark:text-gray-300 mb-[8px] items-center gap-2"
            >
              <span>Email Address</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                Auto-filled
              </span>
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                readOnly
                className="w-full h-[50px] px-[16px] pr-[40px] border border-[#D1D5DB] dark:border-gray-600 rounded-[8px] text-[16px] text-[#1F2937] dark:text-gray-400 bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div>
          <label
            htmlFor="program"
            className={`block text-[14px] font-[500] ${
              validationErrors.program ? "text-[#EF4444] dark:text-red-400" : "text-[#374151] dark:text-gray-300"
            } mb-[8px] flex items-center gap-2`}
          >
            <span>Program of Study *</span>
            {program && !validationErrors.program && (
              <svg
                className="w-4 h-4 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </label>
          <div className="relative">
            <select
              id="program"
              value={program}
              onChange={handleProgramChange}
              onBlur={handleBlur}
              className={`w-full h-[50px] px-[16px] pr-[40px] border ${
                validationErrors.program
                  ? "border-[#EF4444] bg-[#FEF2F2] dark:bg-red-900/20 dark:border-red-500 focus:ring-red-500"
                  : program
                  ? "border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-500 focus:ring-green-500"
                  : "border-[#D1D5DB] dark:border-gray-600 focus:ring-[#002145] dark:focus:ring-blue-400"
              } rounded-[8px] text-[16px] bg-white dark:bg-gray-700 text-[#1F2937] dark:text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 appearance-none`}
            >
              <option value="">Select your program</option>
              {PROGRAM_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              {program && !validationErrors.program ? (
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              )}
            </div>
          </div>
          {validationErrors.program && (
            <p className="mt-1 text-[12px] text-[#EF4444] dark:text-red-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Please select a program of study
            </p>
          )}

          {program === "Other (Please Specify)" && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <label
                htmlFor="programOther"
                className={`block text-[14px] font-[500] ${
                  validationErrors.programOther
                    ? "text-[#EF4444] dark:text-red-400"
                    : "text-[#374151] dark:text-gray-300"
                } mb-[8px] flex items-center gap-2`}
              >
                <span>Please specify your program *</span>
                {programOther && !validationErrors.programOther && (
                  <svg
                    className="w-4 h-4 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </label>
              <div className="relative">
                <input
                  id="programOther"
                  type="text"
                  value={programOther}
                  onChange={handleProgramOtherChange}
                  onBlur={handleBlur}
                  placeholder="Enter your program name"
                  className={`w-full h-[50px] px-[16px] pr-[40px] border ${
                    validationErrors.programOther
                      ? "border-[#EF4444] bg-[#FEF2F2] dark:bg-red-900/20 dark:border-red-500 focus:ring-red-500"
                      : programOther
                      ? "border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-500 focus:ring-green-500"
                      : "border-[#D1D5DB] dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                  } rounded-[8px] text-[16px] bg-white dark:bg-gray-700 text-[#1F2937] dark:text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200`}
                />
                {programOther && !validationErrors.programOther && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </div>
              {validationErrors.programOther && (
                <p className="mt-1 text-[12px] text-[#EF4444] dark:text-red-400 flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Please specify your program
                </p>
              )}
            </div>
          )}
        </div>
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              Changes are saved automatically when you move to the next section
            </span>
          </div>
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className={`${getSaveButtonClass(
              saveStatus
            )} flex items-center gap-2 min-w-[120px] justify-center`}
          >
            {saveStatus === "saving" && (
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            {saveStatus === "saved" && (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            {saveStatus === "error" && (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {getSaveButtonText(saveStatus)}
          </button>
        </div>
      </div>
    </section>
  );
}
