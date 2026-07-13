import type { StudentProfile } from "../types/profile";
import { validateProfileCompletion } from "../utils/profileValidation";

// Test with a complete profile that should pass validation
export function testValidationWithCompleteProfile() {
  const completeUser = {
    name: "John Doe",
    email: "john.doe@student.ubc.ca",
    major: "Computer Science",
    student_number: "12345678",
  };

  const completeProfile: StudentProfile = {
    user_id: 1,
    overall_gpa: 3.5,
    expected_graduation: new Date("2025-05-01"),
    relevant_coursework: "CPSC 110, CPSC 210, CPSC 221",
    technical_skills: "Python, Java, JavaScript",
    teaching_experience: "TA for CPSC 110 in previous semester",
  };

  const result = validateProfileCompletion(completeProfile, completeUser);

  console.log("✅ Complete profile validation result:", result);

  if (!result.isValid) {
    console.error(
      "❌ Complete profile should be valid but failed:",
      result.missingFields
    );
  } else {
    console.log("✅ Complete profile passed validation as expected");
  }

  return result;
}

// Test with an incomplete profile that should fail validation
export function testValidationWithIncompleteProfile() {
  const incompleteUser = {
    name: "Jane Smith",
    email: "jane.smith@student.ubc.ca",
    major: "", // Missing major
    student_number: "87654321",
  };

  const incompleteProfile: StudentProfile = {
    user_id: 2,
    overall_gpa: 0, // Missing GPA (0 should be considered missing)
    expected_graduation: undefined, // Missing graduation date
    relevant_coursework: "", // Empty coursework
    technical_skills: "Python", // Has skills
    teaching_experience: undefined, // Missing experience
  };

  const result = validateProfileCompletion(incompleteProfile, incompleteUser);

  console.log("🔍 Incomplete profile validation result:", result);

  if (result.isValid) {
    console.error("❌ Incomplete profile should fail validation but passed");
  } else {
    console.log("✅ Incomplete profile failed validation as expected");
    console.log("Missing fields:", result.missingFields);
  }

  return result;
}

// Test with prefilled readonly fields (like those auto-filled from user account)
export function testValidationWithPrefilledFields() {
  const userWithPrefilledData = {
    name: "Alex Chen",
    email: "alex.chen@student.ubc.ca",
    major: "Mathematics", // Pre-filled from account
    student_number: "11223344", // Pre-filled, readonly
  };

  const profileWithMostFieldsFilled: StudentProfile = {
    user_id: 3,
    overall_gpa: 3.8,
    expected_graduation: new Date("2024-12-01"),
    relevant_coursework: "MATH 200, MATH 221, CPSC 110",
    technical_skills: "R, Python, MATLAB",
    teaching_experience: "Math tutor for 2 years",
  };

  const result = validateProfileCompletion(
    profileWithMostFieldsFilled,
    userWithPrefilledData
  );

  console.log("🏷️ Prefilled fields validation result:", result);

  if (!result.isValid) {
    console.error(
      "❌ Profile with prefilled fields should be valid but failed:",
      result.missingFields
    );
  } else {
    console.log(
      "✅ Profile with prefilled fields passed validation as expected"
    );
  }

  return result;
}

// Test edge cases with null and undefined values
export function testValidationWithNullValues() {
  const userWithNulls = {
    name: null as any,
    email: "test@student.ubc.ca",
    major: "Computer Science",
    student_number: null as any,
  };

  const profileWithNulls: StudentProfile = {
    user_id: 4,
    overall_gpa: null as any,
    expected_graduation: null as any,
    relevant_coursework: null as any,
    technical_skills: "   ", // Whitespace only
    teaching_experience: "", // Empty string
  };

  const result = validateProfileCompletion(profileWithNulls, userWithNulls);

  console.log("🔍 Null values validation result:", result);
  console.log(
    "Expected missing fields: Name, Student Number, GPA, Expected Graduation, Relevant Coursework, Technical Skills, Previous TA Experience"
  );
  console.log("Actual missing fields:", result.missingFields);

  return result;
}

// Run all tests
export function runProfileValidationTests() {
  console.log("🧪 Running Profile Validation Tests...\n");

  try {
    testValidationWithCompleteProfile();
    console.log("");

    testValidationWithIncompleteProfile();
    console.log("");

    testValidationWithPrefilledFields();
    console.log("");

    testValidationWithNullValues();
    console.log("");

    console.log("✅ All profile validation tests completed!");
  } catch (error) {
    console.error("❌ Error running validation tests:", error);
  }
}

// Export for use in other files if needed
export { validateProfileCompletion };
