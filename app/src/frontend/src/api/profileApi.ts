import type { StudentProfile } from "../types/profile";

interface Term {
  term_id?: number;
  name: string;
  start_date: string;
  end_date: string;
  status: "active" | "inactive" | "upcoming";
  created_at?: string;
  updated_at?: string;
}

const API_BASE_URL =
  (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api";

const fetchConfig = {
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include" as const,
};

// --- Profile ---
export const getProfile = async (userId: number) => {
  const response = await fetch(`${API_BASE_URL}/profile/${userId}`, {
    ...fetchConfig,
    method: "GET",
  });
  if (!response.ok) throw new Error("Failed to fetch profile");
  return response.json();
};

export const updateProfile = async (
  userId: number,
  data: Partial<StudentProfile>
) => {
  const response = await fetch(`${API_BASE_URL}/profile/${userId}`, {
    ...fetchConfig,
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update profile");
  return response.json();
};

export const patchProfile = async (
  userId: number,
  data: Partial<StudentProfile>
) => {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/profile`, {
    ...fetchConfig,
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to patch profile");
  return response.json();
};

export const getProfileStatus = async (userId: number) => {
  const response = await fetch(
    `${API_BASE_URL}/users/${userId}/profile/status`,
    {
      ...fetchConfig,
      method: "GET",
    }
  );
  if (!response.ok) throw new Error("Failed to fetch profile status");
  return response.json();
};

export const submitProfile = async (userId: number) => {
  const response = await fetch(
    `${API_BASE_URL}/users/${userId}/profile/submit`,
    {
      ...fetchConfig,
      method: "POST",
    }
  );
  if (!response.ok) throw new Error("Failed to submit profile");
  return response.json();
};

export const saveProfileDraft = async (
  userId: number,
  data: Partial<StudentProfile>
) => {
  const response = await fetch(
    `${API_BASE_URL}/users/${userId}/profile/draft`,
    {
      ...fetchConfig,
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error("Failed to save profile draft");
  return response.json();
};

export const validateProfile = async (
  userId: number,
  data: Partial<StudentProfile>
) => {
  const response = await fetch(
    `${API_BASE_URL}/users/${userId}/profile/validate`,
    {
      ...fetchConfig,
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error("Failed to validate profile");
  return response.json();
};

// --- Experience ---
export const getExperience = async (userId: number) => {
  const response = await fetch(
    `${API_BASE_URL}/ta/users/${userId}/experience`,
    {
      ...fetchConfig,
      method: "GET",
    }
  );
  if (!response.ok) throw new Error("Failed to fetch experience");
  return response.json();
};

export const updateExperience = async (userId: number, data: any) => {
  const response = await fetch(
    `${API_BASE_URL}/ta/users/${userId}/experience`,
    {
      ...fetchConfig,
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error("Failed to update experience");
  return response.json();
};

// --- Course Preferences ---
export const getCoursePreferences = async (userId: number) => {
  const response = await fetch(
    `${API_BASE_URL}/profile/${userId}/course-preferences`,
    {
      ...fetchConfig,
      method: "GET",
    }
  );
  if (!response.ok) throw new Error("Failed to fetch course preferences");
  return response.json();
};

export const updateCoursePreferences = async (userId: number, data: any) => {
  const response = await fetch(
    `${API_BASE_URL}/profile/${userId}/course-preferences`,
    {
      ...fetchConfig,
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error("Failed to update course preferences");
  return response.json();
};

// --- Availability ---
export const getAvailability = async (userId: number) => {
  const response = await fetch(
    `${API_BASE_URL}/ta/users/${userId}/availability`,
    {
      ...fetchConfig,
      method: "GET",
    }
  );
  if (!response.ok) throw new Error("Failed to fetch availability");
  return response.json();
};

export const updateAvailability = async (userId: number, data: any) => {
  const response = await fetch(
    `${API_BASE_URL}/ta/users/${userId}/availability`,
    {
      ...fetchConfig,
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error("Failed to update availability");
  return response.json();
};

// --- Courses ---
export const getCourses = async () => {
  const response = await fetch(`${API_BASE_URL}/courses`, {
    ...fetchConfig,
    method: "GET",
  });
  if (!response.ok) throw new Error("Failed to fetch courses");
  return response.json();
};

export const getCurrentUser = async () => {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/auth/me`,
    {
      credentials: "include",
    }
  );
  if (!response.ok) throw new Error("Not authenticated");
  return response.json();
};

export const getTerms = async (): Promise<Term[]> => {
  const response = await fetch(`${API_BASE_URL}/terms/active`, {
    ...fetchConfig,
    method: "GET",
  });
  if (!response.ok) throw new Error("Failed to fetch terms");
  return response.json();
};
