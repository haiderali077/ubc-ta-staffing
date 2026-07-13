import React, { useState, useEffect } from "react";
import {
  submitTAApplication,
  getAvailableCourses,
  checkDeadlineStatus,
} from "../../api/applicationApi";
import { getCurrentUser } from "../../api/profileApi";
import type {
  TAApplicationRequest,
  Course,
  ApplicationType,
} from "../../types/application";
import type { StudentProfile } from "../../types/profile";
import { validateProfileCompletion } from "../../utils/profileValidation";

import CoursePreferencesSection from "./sections/CoursePreferencesSection";
import DomainAreasSection from "./sections/DomainAreasSection";
import NotesSection from "./sections/NotesSection";

const defaultApplicationType: ApplicationType = "UTA";

const TAApplicationForm: React.FC = () => {
  // localStorage key for auto-saving draft data
  // Note: This data is automatically cleared when user logs out (see AuthContext.tsx)
  const FORM_STORAGE_KEY = "ta_application_draft";

  const [courses, setCourses] = useState<Course[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [deadlineInfo, setDeadlineInfo] = useState<string>("");
  const [form, setForm] = useState<TAApplicationRequest>({
    coursePreferences: [],
    domainAreas: [],
    applicationType: defaultApplicationType,
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Load saved form data on component mount
    const savedFormData = localStorage.getItem(FORM_STORAGE_KEY);
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData);
        setForm((prevForm) => ({
          ...prevForm,
          ...parsedData,
        }));
      } catch (error) {
        console.error("Failed to parse saved form data:", error);
        // Clear invalid data
        localStorage.removeItem(FORM_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    setDataLoading(true);

    const fetchData = async () => {
      try {
        const [coursesRes, deadlineStatus] = await Promise.all([
          getAvailableCourses(),
          checkDeadlineStatus(),
        ]);
        setCourses(coursesRes);

        // Check deadline status and set warning/error if needed
        if (deadlineStatus.isPassed) {
          setDeadlinePassed(true);
          setError(
            `🚫 Application Deadline Passed\n\n${deadlineStatus.message}`
          );
          setDataLoading(false);
          return; // Don't load user data if deadline has passed
        } else if (deadlineStatus.deadlineFormatted) {
          // Show deadline info but don't block the form
          setDeadlineInfo(deadlineStatus.message);
          console.log("ℹ️ Deadline info:", deadlineStatus.message);
        }

        const userResponse = await getCurrentUser();

        const completeProfileResponse = await fetch(
          `http://localhost:8000/api/users/${userResponse.user.user_id}/complete-profile`,
          {
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!completeProfileResponse.ok) {
          throw new Error("Failed to load complete profile data");
        }

        const completeProfileData = await completeProfileResponse.json();
        console.log(
          "TAApplicationForm - complete-profile response:",
          completeProfileData
        );

        setCurrentUser(completeProfileData.user);
        setProfile(completeProfileData.profile);

        // Set application type from profile if available
        if (completeProfileData.profile?.application_type) {
          setForm((prev) => ({
            ...prev,
            applicationType:
              completeProfileData.profile.application_type ||
              defaultApplicationType,
          }));
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load required data");
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-save form data to localStorage whenever form changes
  useEffect(() => {
    if (
      form.coursePreferences.length > 0 ||
      form.domainAreas.length > 0 ||
      form.notes
    ) {
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(form));
    }
  }, [form]);

  const handleChange = (field: keyof TAApplicationRequest, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    const courseIds = form.coursePreferences
      .map((c) => c.course_id)
      .filter((id) => id);

    // Only validate if courses are available and some are selected
    if (courses.length > 0 && courseIds.length > 0) {
      // Check for duplicates and invalid selections
      if (
        new Set(courseIds).size !== courseIds.length ||
        courseIds.includes(0)
      ) {
        newErrors.coursePreferences = "Please select unique courses only.";
      }
      // Check maximum limit
      if (courseIds.length > 3) {
        newErrors.coursePreferences = "Please select at most 3 courses.";
      }
    }

    // Validate domain areas - now flexible (0-5 areas)
    if (form.domainAreas.length > 5) {
      newErrors.domainAreas = "Please select at most 5 domain areas.";
    } else if (
      form.domainAreas.some((area: string) => !area.trim() || area.length > 50)
    ) {
      newErrors.domainAreas = "Each domain area must be 1-50 characters long.";
    }
    // Domain areas are now optional - no minimum requirement

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setErrors({});

    // Check if data is still loading
    if (dataLoading) {
      setError("Data is still loading. Please wait a moment and try again.");
      return;
    }

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Validate profile completeness before submission
    const profileValidation = validateProfileCompletion(profile, currentUser);

    // Add debugging to see what data we actually have
    console.log("🔍 Debug validation data:");
    console.log("Current user:", currentUser);
    console.log("Profile:", profile);
    console.log("Form data:", form);
    console.log("Validation result:", profileValidation);

    if (!profileValidation.isValid) {
      console.error("❌ Profile validation failed:", profileValidation.message);
      setError(profileValidation.message);
      return;
    }

    if (!profile) {
      setError("Profile not loaded. Please try again.");
      return;
    }

    setLoading(true);
    try {
      // Parse and clean the weekly_availability JSON string
      let weeklyAvailability = "";
      try {
        if (profile.weekly_availability) {
          // If it's already a string, try to parse and re-stringify to ensure valid JSON
          const parsed = JSON.parse(profile.weekly_availability);
          weeklyAvailability = JSON.stringify(parsed);
        }
      } catch (parseError) {
        console.warn(
          "Failed to parse weekly_availability, using empty string:",
          parseError
        );
        weeklyAvailability = "";
      }

      const submissionData = {
        ...form,
        applicationType: form.applicationType || defaultApplicationType, // Ensure applicationType is always included
        technical_skills: profile.technical_skills ?? "",
        relevant_coursework: profile.relevant_coursework ?? "",
        overall_gpa: profile.overall_gpa ?? undefined,
        expected_graduation: profile.expected_graduation
          ? String(profile.expected_graduation)
          : "",
        weekly_availability: weeklyAvailability,
        teaching_experience: profile.teaching_experience ?? "",
      };

      console.log(
        "📤 Submitting application with data:",
        JSON.stringify(submissionData, null, 2)
      );
      console.log(
        "🌐 API endpoint:",
        `${
          import.meta.env.VITE_API_URL || "http://localhost:8000"
        }/api/applications`
      );

      await submitTAApplication(submissionData);

      // Clear saved draft since submission was successful
      localStorage.removeItem(FORM_STORAGE_KEY);

      setSuccess(true);
      setForm({
        coursePreferences: [],
        domainAreas: [],
        applicationType: defaultApplicationType,
        notes: "",
      });
      setErrors({});
    } catch (err: any) {
      // Enhanced error handling with more debugging
      console.error("Full submission error:", err);
      console.error("Error type:", typeof err);
      console.error("Error message:", err?.message);
      console.error("Error validation errors:", err?.validationErrors);
      console.error("Error type field:", err?.type);
      console.error("Error deadline info:", err?.deadlineFormatted);

      if (err?.validationErrors) {
        // Handle validation errors from backend
        setErrors(err.validationErrors);
        setError("Please fix the validation errors below.");
      } else if (err?.type === "deadline_error") {
        // Special handling for deadline errors with enhanced formatting
        const deadlineInfo = err.deadlineFormatted
          ? ` (Deadline was: ${err.deadlineFormatted})`
          : "";
        setError(
          `🚫 Application Deadline Passed\n\n${err.message}${deadlineInfo}`
        );
      } else if (err?.message) {
        // Handle other specific error messages
        if (err.message.includes("deadline")) {
          // Fallback for deadline-related errors
          setError(`⏰ ${err.message}`);
        } else {
          setError(err.message);
        }
      } else if (typeof err === "string") {
        setError(err);
      } else {
        setError("Failed to submit application. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Loading State */}
        {dataLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              Loading application form...
            </span>
          </div>
        )}

        {/* Deadline Info Banner */}
        {deadlineInfo && !deadlinePassed && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-4">
            <div className="flex">
              <div className="text-blue-600 dark:text-blue-400 mr-3">ℹ️</div>
              <div className="text-blue-800 dark:text-blue-200">
                <div className="font-medium">Application Deadline</div>
                <div className="text-sm mt-1">{deadlineInfo}</div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Application Progress</span>
              <span>
                {Math.round(
                  (((courses.length === 0 || form.coursePreferences.length > 0
                    ? 1
                    : 0) +
                    (form.domainAreas.length > 0 ? 1 : 0)) /
                    2) *
                    100
                )}
                % Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    (((courses.length === 0 || form.coursePreferences.length > 0
                      ? 1
                      : 0) +
                      (form.domainAreas.length > 0 ? 1 : 0)) /
                      2) *
                    100
                  }%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Main form content when not loading */}
        {!dataLoading && (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Course Preferences Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">1</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Course Preferences
                </h2>
              </div>
              <CoursePreferencesSection
                courses={courses}
                value={form.coursePreferences}
                onChange={(val) => handleChange("coursePreferences", val)}
                error={errors.coursePreferences}
              />
            </div>

            {/* Domain Areas Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">2</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Domain Areas
                </h2>
              </div>
              <DomainAreasSection
                value={form.domainAreas}
                onChange={(val) => handleChange("domainAreas", val)}
                error={errors.domainAreas}
              />
            </div>

            {/* Availability Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">3</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Application Details
                </h2>
              </div>
              <div className="space-y-6">
                <NotesSection
                  value={form.notes || ""}
                  onChange={(val) => handleChange("notes", val)}
                />
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div
                className={`border rounded-md p-4 ${
                  error.includes("Deadline Passed") ||
                  error.includes("deadline")
                    ? "bg-red-100 border-red-300"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex">
                  <div
                    className={`mr-3 ${
                      error.includes("Deadline Passed") ||
                      error.includes("deadline")
                        ? "text-red-600 text-lg"
                        : "text-red-400"
                    }`}
                  >
                    {error.includes("Deadline Passed") ||
                    error.includes("deadline")
                      ? "🚫"
                      : "❌"}
                  </div>
                  <div
                    className={`${
                      error.includes("Deadline Passed") ||
                      error.includes("deadline")
                        ? "text-red-900"
                        : "text-red-800"
                    }`}
                  >
                    {error.includes("Deadline Passed") ? (
                      <div>
                        <div className="font-semibold text-lg mb-2">
                          Application Deadline Has Passed
                        </div>
                        <div className="whitespace-pre-line text-sm leading-relaxed">
                          {error.replace(
                            "🚫 Application Deadline Passed\n\n",
                            ""
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={
                          error.includes("deadline") ? "font-medium" : ""
                        }
                      >
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="text-green-400 mr-3">✅</div>
                  <div>
                    <h3 className="text-green-800 font-medium">
                      Application Submitted Successfully!
                    </h3>
                    <p className="text-green-700 text-sm mt-1">
                      Your TA application has been received and is under review.
                      You will be notified of any updates.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Ready to Submit?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Please review your application before submitting.
                  </p>
                </div>
                <button
                  type="submit"
                  className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md transition-colors duration-200 ${
                    deadlinePassed
                      ? "text-gray-500 bg-gray-300 cursor-not-allowed"
                      : "text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={loading || dataLoading || deadlinePassed}
                  title={
                    deadlinePassed
                      ? "Application deadline has passed"
                      : "Submit your TA application"
                  }
                >
                  {loading || dataLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
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
                      {dataLoading ? "Loading..." : "Submitting..."}
                    </>
                  ) : (
                    <>
                      <span className="mr-2">📝</span>
                      Submit Application
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default TAApplicationForm;
