import type { TAApplicationRequest } from "../types/application";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const fetchConfig = {
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include" as const,
};

// Submit a new TA application
export const submitTAApplication = async (data: TAApplicationRequest) => {
  console.log("API: Submitting application data:", data);

  const response = await fetch(`${API_BASE_URL}/api/applications`, {
    ...fetchConfig,
    method: "POST",
    body: JSON.stringify(data),
  });

  console.log("API: Response status:", response.status);
  console.log("API: Response ok:", response.ok);

  if (!response.ok) {
    try {
      const errorData = await response.json();
      console.error("API: Error response data:", errorData);

      // Create an error object that preserves validation errors and other error types
      const error = new Error(
        errorData.error || errorData.message || "Failed to submit application"
      );

      // Preserve validation errors
      if (errorData.validationErrors) {
        (error as any).validationErrors = errorData.validationErrors;
      }

      // Preserve error type for special handling (e.g., deadline errors)
      if (errorData.type) {
        (error as any).type = errorData.type;
      }

      // Preserve additional error context
      if (errorData.deadline) {
        (error as any).deadline = errorData.deadline;
      }
      if (errorData.deadlineFormatted) {
        (error as any).deadlineFormatted = errorData.deadlineFormatted;
      }

      throw error;
    } catch (parseError) {
      // Only fall back to generic message if we can't parse JSON at all
      if (parseError instanceof SyntaxError) {
        console.error(
          "API: Failed to parse error response as JSON:",
          parseError
        );
        throw new Error(
          `Failed to submit application (HTTP ${response.status})`
        );
      } else {
        // Re-throw the custom error we created above
        throw parseError;
      }
    }
  }

  const result = await response.json();
  console.log("API: Success response:", result);
  return result;
};

// Get the logged-in user's applications
export const getMyApplications = async () => {
  const response = await fetch(`${API_BASE_URL}/api/applications/my`, {
    ...fetchConfig,
    method: "GET",
  });
  if (!response.ok) throw new Error("Failed to fetch applications");
  return response.json();
};

// Check TA application deadline status
export const checkDeadlineStatus = async () => {
  const response = await fetch(`${API_BASE_URL}/api/deadline-status`, {
    ...fetchConfig,
    method: "GET",
  });
  if (!response.ok) throw new Error("Failed to check deadline status");
  return response.json();
};

// Get available domain areas
export const getDomainAreas = async () => {
  const response = await fetch(`${API_BASE_URL}/api/domain-areas`, {
    ...fetchConfig,
    method: "GET",
  });
  if (!response.ok) throw new Error("Failed to fetch domain areas");
  const data = await response.json();
  return data.domainAreas || [];
};

// Get available courses
export const getAvailableCourses = async () => {
  const response = await fetch(`${API_BASE_URL}/api/courses-available`, {
    ...fetchConfig,
    method: "GET",
  });
  if (!response.ok) throw new Error("Failed to fetch courses");
  return response.json();
};

// Get available terms for student profile
export const getAvailableTerms = async () => {
  const response = await fetch(`${API_BASE_URL}/api/terms-available`, {
    ...fetchConfig,
    method: "GET",
  });
  if (!response.ok) throw new Error("Failed to fetch terms");
  return response.json();
};
