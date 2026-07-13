// Debug script to test profile validation in browser console
// Copy and paste this into the browser console when on the TA application page

function debugProfileValidation() {
  console.log("🧪 Testing Profile Validation Logic...\n");

  // Test 1: Complete valid profile
  const validUser = {
    name: "John Doe",
    email: "john.doe@student.ubc.ca",
    major: "Computer Science",
    student_number: "12345678",
  };

  const validProfile = {
    user_id: 1,
    overall_gpa: 3.5,
    expected_graduation: new Date("2025-05-01"),
    relevant_coursework: "CPSC 110, CPSC 210, CPSC 221",
    technical_skills: "Python, Java, JavaScript",
    teaching_experience: "TA for CPSC 110 in previous semester",
  };

  console.log("✅ Test 1: Valid complete profile");
  console.log("Profile:", validProfile);
  console.log("User:", validUser);

  // Test 2: Profile missing some fields
  const incompleteUser = {
    name: "Jane Smith",
    email: "jane.smith@student.ubc.ca",
    major: "", // Missing
    student_number: "87654321",
  };

  const incompleteProfile = {
    user_id: 2,
    overall_gpa: 0, // Invalid GPA
    expected_graduation: undefined,
    relevant_coursework: "",
    technical_skills: "Python",
    teaching_experience: undefined,
  };

  console.log("❌ Test 2: Incomplete profile");
  console.log("Profile:", incompleteProfile);
  console.log("User:", incompleteUser);
  console.log(
    "Expected missing: Major, GPA, Expected Graduation, Relevant Coursework, Previous TA Experience"
  );

  // Test 3: Check actual data from current page
  console.log("\n🔍 ACTUAL DATA FROM PAGE:");
  console.log("If TAApplicationForm is loaded, check React state:");

  // Try to access React component state if available
  if (
    window.React &&
    window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
  ) {
    console.log("React detected - checking for component state...");
  }

  console.log("\n📋 VALIDATION CHECKLIST:");
  console.log("Check that your user data has:");
  console.log("- name: string (not empty)");
  console.log("- email: string (not empty)");
  console.log("- major: string (not empty) [often prefilled from account]");
  console.log(
    "- student_number: string (not empty) [often prefilled from account]"
  );
  console.log("");
  console.log("Check that your profile data has:");
  console.log("- overall_gpa: number > 0");
  console.log("- expected_graduation: Date object");
  console.log("- relevant_coursework: string (not empty)");
  console.log("- technical_skills: string (not empty)");
  console.log("- teaching_experience: string (not empty)");

  console.log("\n🎯 To run actual validation:");
  console.log("1. Open browser console");
  console.log("2. Navigate to TA Application page");
  console.log("3. Fill out the form");
  console.log("4. Try to submit and check console for debug output");
}

// Instructions for debugging the actual issue
function debugCurrentPage() {
  console.log("🔍 DEBUGGING CURRENT PAGE DATA...\n");

  // Check if we're on the right page
  if (!window.location.pathname.includes("/apply")) {
    console.log("❌ Please navigate to the TA Application page first");
    return;
  }

  console.log("✅ On TA Application page");

  // Check for React DevTools
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log("✅ React DevTools detected");
    console.log("You can inspect component state in React DevTools");
  }

  // Look for form data in localStorage
  const draftData = localStorage.getItem("ta_application_draft");
  if (draftData) {
    console.log("📝 Found draft data in localStorage:");
    try {
      console.log(JSON.parse(draftData));
    } catch (e) {
      console.log("Error parsing draft data:", e);
    }
  }

  // Check for any validation errors in console
  console.log("\n🔍 Look for these debug messages in console when you submit:");
  console.log("- 'Debug validation data:'");
  console.log("- Current user object");
  console.log("- Profile object");
  console.log("- Validation result");

  console.log("\n💡 TIP: If you see 'Major' or 'Student Number' as missing,");
  console.log(
    "check that these fields exist in the user object with the correct names"
  );
}

// Make functions available globally for testing
if (typeof window !== "undefined") {
  window.debugProfileValidation = debugProfileValidation;
  window.debugCurrentPage = debugCurrentPage;

  console.log("🛠️ Debug functions loaded!");
  console.log("Run: debugProfileValidation() - to see test cases");
  console.log("Run: debugCurrentPage() - to debug current page");
}
