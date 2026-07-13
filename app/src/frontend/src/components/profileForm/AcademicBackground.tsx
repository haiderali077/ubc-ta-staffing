import { useState } from "react";
import type { ApplicationType } from "../../types/application";

interface AcademicBackgroundProps {
  yearOfStudy: string;
  setYearOfStudy: (value: string) => void;
  overallGpa: string;
  setOverallGpa: (value: string) => void;
  expectedGraduation: string;
  setExpectedGraduation: (value: string) => void;
  coursework: string;
  setCoursework: (value: string) => void;
  teachingExp: string;
  setTeachingExp: (value: string) => void;
  technicalSkills: string;
  setTechnicalSkills: (value: string) => void;
  applicationType: ApplicationType;
  setApplicationType: (value: ApplicationType) => void;
  onInputChange: () => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onSave: () => Promise<void>;
  onValidationError?: (message: string) => void;
}

export function AcademicBackgroundSection({
  yearOfStudy,
  setYearOfStudy,
  overallGpa,
  setOverallGpa,
  expectedGraduation,
  setExpectedGraduation,
  coursework,
  setCoursework,
  teachingExp,
  setTeachingExp,
  technicalSkills,
  setTechnicalSkills,
  applicationType,
  setApplicationType,
  onInputChange,
  saveStatus,
  onSave,
  onValidationError,
}: AcademicBackgroundProps) {
  const [validationErrors, setValidationErrors] = useState({
    overallGpa: false,
    overallGpaRange: false,
    expectedGraduation: false,
    expectedGraduationPast: false,
    yearOfStudy: false,
    yearOfStudyRange: false,
  });

  const validateGpa = (gpa: string) => {
    if (!gpa) return { required: true, range: false };
    const gpaValue = parseFloat(gpa);
    return {
      required: false,
      range: isNaN(gpaValue) || gpaValue < 0 || gpaValue > 4.33,
    };
  };

  const validateExpectedGraduation = (date: string) => {
    if (!date) return { required: true, past: false };
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for fair comparison
    return {
      required: false,
      past: selectedDate <= today,
    };
  };

  const validateYearOfStudy = (year: string) => {
    if ((applicationType as any) !== "Undergraduate") {
      return { required: false, range: false };
    }
    if (!year) return { required: true, range: false };
    const yearValue = parseInt(year);
    return {
      required: false,
      range: isNaN(yearValue) || yearValue < 0 || yearValue > 6,
    };
  };

  const handleBlur = () => {
    const gpaValidation = validateGpa(overallGpa);
    const graduationValidation = validateExpectedGraduation(expectedGraduation);
    const yearValidation = validateYearOfStudy(yearOfStudy);

    setValidationErrors({
      overallGpa: gpaValidation.required,
      overallGpaRange: gpaValidation.range,
      expectedGraduation: graduationValidation.required,
      expectedGraduationPast: graduationValidation.past,
      yearOfStudy: yearValidation.required,
      yearOfStudyRange: yearValidation.range,
    });
  };

  const handleSave = async () => {
    const gpaValidation = validateGpa(overallGpa);
    const graduationValidation = validateExpectedGraduation(expectedGraduation);
    const yearValidation = validateYearOfStudy(yearOfStudy);

    const errors = {
      overallGpa: gpaValidation.required,
      overallGpaRange: gpaValidation.range,
      expectedGraduation: graduationValidation.required,
      expectedGraduationPast: graduationValidation.past,
      yearOfStudy: yearValidation.required,
      yearOfStudyRange: yearValidation.range,
    };

    setValidationErrors(errors);

    // Check if any validation errors exist
    if (Object.values(errors).some((error) => error)) {
      // Call validation error callback for year of study
      if (
        errors.yearOfStudy &&
        (applicationType as any) === "Undergraduate" &&
        onValidationError
      ) {
        onValidationError(
          "Year of study is required for undergraduate students"
        );
      }
      return;
    }

    await onSave();
  };

  const getSaveButtonClass = (status: string) => {
    const baseClass =
      "h-[40px] px-[16px] rounded-[6px] text-[14px] font-[500] transition-all duration-200 shadow-sm";
    switch (status) {
      case "saving":
        return `${baseClass} bg-blue-100 text-blue-700 cursor-not-allowed border border-blue-200`;
      case "saved":
        return `${baseClass} bg-green-100 text-green-700 border border-green-200 hover:bg-green-200`;
      case "error":
        return `${baseClass} bg-red-100 text-red-700 border border-red-200 hover:bg-red-200`;
      default:
        return `${baseClass} bg-[#002145] text-white hover:bg-[#001A36] border border-[#002145] hover:shadow-md`;
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
      <header className="p-[24px] border-b border-[#E5E7EB] dark:border-gray-700 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-t-[16px]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-purple-600 dark:text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h2 className="text-[20px] font-[600] text-[#1F2937] dark:text-white">
            Academic Background
          </h2>
        </div>
        <p className="text-[14px] text-[#6B7280] dark:text-gray-400 mt-1">
          Provide details about your academic experience and qualifications
        </p>
      </header>
      <div className="p-[24px] bg-white dark:bg-gray-800 space-y-[24px]">
        <div className="grid grid-cols-2 gap-[24px] max-lg:grid-cols-1">
          <div>
            <label
              htmlFor="overallGpa"
              className={`block text-[14px] font-[500] ${
                validationErrors.overallGpa || validationErrors.overallGpaRange
                  ? "text-[#EF4444] dark:text-red-400 dark:text-red-400"
                  : "text-[#374151] dark:text-gray-300 dark:text-gray-300"
              } mb-[8px]`}
            >
              Overall GPA *
            </label>
            <input
              id="overallGpa"
              type="number"
              step="0.01"
              min="0"
              max="4.33"
              value={overallGpa}
              onChange={(e) => {
                setOverallGpa(e.target.value);
                if (e.target.value) {
                  const gpaValidation = validateGpa(e.target.value);
                  setValidationErrors((prev) => ({
                    ...prev,
                    overallGpa: gpaValidation.required,
                    overallGpaRange: gpaValidation.range,
                  }));
                }
                onInputChange();
              }}
              onBlur={handleBlur}
              placeholder="Enter your GPA (0-4.33)"
              className={`w-full h-[50px] px-[16px] border ${
                validationErrors.overallGpa || validationErrors.overallGpaRange
                  ? "border-[#EF4444] bg-[#FEF2F2]"
                  : "border-[#D1D5DB] dark:border-gray-600"
              } rounded-[8px] text-[16px] bg-white dark:bg-gray-700 text-[#1F2937] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#002145] dark:focus:ring-blue-400 focus:border-transparent`}
            />
            {validationErrors.overallGpa && (
              <p className="mt-1 text-[12px] text-[#EF4444] dark:text-red-400">GPA is required</p>
            )}
            {validationErrors.overallGpaRange && (
              <p className="mt-1 text-[12px] text-[#EF4444] dark:text-red-400">
                GPA must be between 0.00 and 4.33
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="expectedGraduation"
              className={`block text-[14px] font-[500] ${
                validationErrors.expectedGraduation ||
                validationErrors.expectedGraduationPast
                  ? "text-[#EF4444] dark:text-red-400"
                  : "text-[#374151] dark:text-gray-300"
              } mb-[8px]`}
            >
              Expected Graduation *
            </label>
            <input
              id="expectedGraduation"
              type="date"
              value={expectedGraduation}
              onChange={(e) => {
                setExpectedGraduation(e.target.value);
                if (e.target.value) {
                  const graduationValidation = validateExpectedGraduation(
                    e.target.value
                  );
                  setValidationErrors((prev) => ({
                    ...prev,
                    expectedGraduation: graduationValidation.required,
                    expectedGraduationPast: graduationValidation.past,
                  }));
                }
                onInputChange();
              }}
              onBlur={handleBlur}
              className={`w-full h-[50px] px-[16px] border ${
                validationErrors.expectedGraduation ||
                validationErrors.expectedGraduationPast
                  ? "border-[#EF4444] bg-[#FEF2F2]"
                  : "border-[#D1D5DB] dark:border-gray-600"
              } rounded-[8px] text-[16px] bg-white dark:bg-gray-700 text-[#1F2937] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#002145] dark:focus:ring-blue-400 focus:border-transparent`}
            />
            {validationErrors.expectedGraduation && (
              <p className="mt-1 text-[12px] text-[#EF4444] dark:text-red-400">
                Expected graduation is required
              </p>
            )}
            {validationErrors.expectedGraduationPast && (
              <p className="mt-1 text-[12px] text-[#EF4444] dark:text-red-400">
                Expected graduation date cannot be in the past
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="yearOfStudy"
              className={`block text-[14px] font-[500] ${
                validationErrors.yearOfStudy ||
                validationErrors.yearOfStudyRange
                  ? "text-[#EF4444] dark:text-red-400"
                  : "text-[#374151] dark:text-gray-300"
              } mb-[8px]`}
            >
              Year of Study *
            </label>
            <input
              id="yearOfStudy"
              type={
                (applicationType as any) === "Undergraduate" ? "number" : "text"
              }
              min="0"
              max="6"
              value={yearOfStudy}
              onChange={(e) => {
                setYearOfStudy(e.target.value);
                if (e.target.value) {
                  const yearValidation = validateYearOfStudy(e.target.value);
                  setValidationErrors((prev) => ({
                    ...prev,
                    yearOfStudy: yearValidation.required,
                    yearOfStudyRange: yearValidation.range,
                  }));
                }
                onInputChange();
              }}
              onBlur={handleBlur}
              placeholder={
                (applicationType as any) === "Undergraduate"
                  ? "Enter your year standing (0-6)"
                  : `Automatically set to ${applicationType}`
              }
              disabled={(applicationType as any) !== "Undergraduate"}
              className={`w-full h-[50px] px-[16px] border ${
                validationErrors.yearOfStudy ||
                validationErrors.yearOfStudyRange
                  ? "border-[#EF4444] bg-[#FEF2F2]"
                  : "border-[#D1D5DB] dark:border-gray-600"
              } rounded-[8px] text-[16px] bg-white dark:bg-gray-700 text-[#1F2937] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#002145] dark:focus:ring-blue-400 focus:border-transparent disabled:bg-gray-200 disabled:text-gray-500`}
            />
            {validationErrors.yearOfStudy && (
              <p className="mt-1 text-[12px] text-[#EF4444] dark:text-red-400">
                Year of study is required
              </p>
            )}
            {validationErrors.yearOfStudyRange && (
              <p className="mt-1 text-[12px] text-[#EF4444] dark:text-red-400">
                Year standing must be between 0 and 6
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="applicationType"
              className="block text-[14px] font-[500] text-[#374151] dark:text-gray-300 mb-[8px]"
            >
              Application Type *
            </label>
            <select
              id="applicationType"
              value={applicationType}
              onChange={(e) => {
                setApplicationType(e.target.value as ApplicationType);
                onInputChange();
              }}
              className="w-full h-[50px] px-[16px] border border-[#D1D5DB] dark:border-gray-600 rounded-[8px] text-[16px] bg-white dark:bg-gray-700 text-[#1F2937] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#002145] dark:focus:ring-blue-400 focus:border-transparent"
            >
              <option value="Undergraduate">Undergraduate TA (UTA)</option>
              <option value="Graduate">Graduate TA (GTA)</option>
              <option value="PhD">PhD TA</option>
            </select>
          </div>
        </div>
        <div>
          <label
            htmlFor="coursework"
            className="block text-[14px] font-[500] text-[#374151] dark:text-gray-300 mb-[8px]"
          >
            Relevant Coursework
          </label>
          <textarea
            id="coursework"
            value={coursework}
            onChange={(e) => setCoursework(e.target.value)}
            placeholder="List relevant courses that qualify you for TA positions"
            rows={4}
            className="w-full px-[16px] py-[12px] border border-[#D1D5DB] dark:border-gray-600 rounded-[8px] text-[16px] resize-none focus:outline-none focus:ring-2 focus:ring-[#002145] dark:focus:ring-blue-400 focus:border-transparent"
          />
        </div>
        <div>
          <label
            htmlFor="teachingExp"
            className="block text-[14px] font-[500] text-[#374151] dark:text-gray-300 mb-[8px]"
          >
            Teaching & Tutoring Experience
          </label>
          <textarea
            id="teachingExp"
            value={teachingExp}
            onChange={(e) => setTeachingExp(e.target.value)}
            placeholder="Describe your teaching, tutoring, or mentoring experience"
            rows={5}
            className="w-full px-[16px] py-[12px] border border-[#D1D5DB] dark:border-gray-600 rounded-[8px] text-[16px] resize-none focus:outline-none focus:ring-2 focus:ring-[#002145] dark:focus:ring-blue-400 focus:border-transparent"
          />
        </div>
        <div>
          <label
            htmlFor="technicalSkills"
            className="block text-[14px] font-[500] text-[#374151] dark:text-gray-300 mb-[8px]"
          >
            Technical Skills
          </label>
          <textarea
            id="technicalSkills"
            value={technicalSkills}
            onChange={(e) => setTechnicalSkills(e.target.value)}
            placeholder="List programming languages, software, and technical skills"
            rows={4}
            className="w-full px-[16px] py-[12px] border border-[#D1D5DB] dark:border-gray-600 rounded-[8px] text-[16px] resize-none focus:outline-none focus:ring-2 focus:ring-[#002145] dark:focus:ring-blue-400 focus:border-transparent"
          />
        </div>
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
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
              Academic information helps match you with suitable TA positions
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
