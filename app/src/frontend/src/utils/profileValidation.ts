import type { StudentProfile } from "../types/profile";

interface User {
  name?: string;
  email?: string;
  major?: string;
  student_number?: string;
}

interface ValidationResult {
  isValid: boolean;
  message: string;
  missingFields: string[];
}

/**
 * Validates that a profile is complete for TA application submission
 * Uses strict checks to avoid false positives with prefilled fields
 */
export function validateProfileCompletion(
  profile: StudentProfile | null,
  user: User | null
): ValidationResult {
  if (!profile || !user) {
    return {
      isValid: false,
      message:
        "Profile information is not available. Please refresh the page and try again.",
      missingFields: [],
    };
  }

  const missingFields: string[] = [];

  // Check required fields from user (using strict checks for empty/null/undefined)
  if (
    user.name === "" ||
    user.name === null ||
    user.name === undefined ||
    !user.name?.trim()
  ) {
    missingFields.push("Name");
  }

  if (
    user.email === "" ||
    user.email === null ||
    user.email === undefined ||
    !user.email?.trim()
  ) {
    missingFields.push("Email");
  }

  if (
    user.major === "" ||
    user.major === null ||
    user.major === undefined ||
    !user.major?.trim()
  ) {
    missingFields.push("Major");
  }

  if (
    user.student_number === "" ||
    user.student_number === null ||
    user.student_number === undefined ||
    !user.student_number?.trim()
  ) {
    missingFields.push("Student Number");
  }

  // Check required fields from profile (using strict checks)
  if (
    profile.overall_gpa === null ||
    profile.overall_gpa === undefined ||
    profile.overall_gpa <= 0
  ) {
    missingFields.push("GPA");
  }

  if (
    profile.expected_graduation === null ||
    profile.expected_graduation === undefined
  ) {
    missingFields.push("Expected Graduation");
  }

  if (
    profile.relevant_coursework === "" ||
    profile.relevant_coursework === null ||
    profile.relevant_coursework === undefined ||
    !profile.relevant_coursework?.trim()
  ) {
    missingFields.push("Relevant Coursework");
  }

  if (
    profile.technical_skills === "" ||
    profile.technical_skills === null ||
    profile.technical_skills === undefined ||
    !profile.technical_skills?.trim()
  ) {
    missingFields.push("Technical Skills");
  }

  if (
    profile.teaching_experience === "" ||
    profile.teaching_experience === null ||
    profile.teaching_experience === undefined ||
    !profile.teaching_experience?.trim()
  ) {
    missingFields.push("Previous TA Experience");
  }

  const isValid = missingFields.length === 0;

  let message = "";
  if (!isValid) {
    message = `Please complete your profile before submitting your TA application. The following required fields are missing: ${missingFields.join(
      ", "
    )}. You can update your profile by visiting the Profile page.`;
  }

  return {
    isValid,
    message,
    missingFields,
  };
}
