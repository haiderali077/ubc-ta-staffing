"use client";
import { useState, useCallback, useEffect } from "react";
import { Header } from "../../components/layout/AppHeader";
import { PersonalInformationSection } from "../../components/profileForm/PersonalInformation";
import { AcademicBackgroundSection } from "../../components/profileForm/AcademicBackground";
import { AvailabilityPreferencesSection } from "../../components/profileForm/AvailabilityPreference";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../../context/AuthContext";
import TranscriptUpload from "../../components/fileUpload/TranscriptUpload";
import type { ApplicationType } from "../../types/application";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SaveStatusState {
  personalInfo: SaveStatus;
  academicBackground: SaveStatus;
  availability: SaveStatus;
}

export default function Profile() {
  const { user } = useAuth();
  const userId = user?.user_id;
  const [isLoading, setIsLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Personal Information
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [program, setProgram] = useState("");
  const [programOther, setProgramOther] = useState("");
  const [studentNumber, setStudentNumber] = useState("");

  // Academic Background
  const [overallGpa, setOverallGpa] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [expectedGraduation, setExpectedGraduation] = useState("");
  const [coursework, setCoursework] = useState("");
  const [teachingExp, setTeachingExp] = useState("");
  const [technicalSkills, setTechnicalSkills] = useState("");
  const [transcriptUrl, setTranscriptUrl] = useState<string | null>(null);

  const [applicationType, setApplicationType] =
    useState<ApplicationType>("Undergraduate");


  // Availability & Preferences
  const [availability, setAvailability] = useState("");
  const [maxHours, setMaxHours] = useState("");
  const [preferredTerm, setPreferredTerm] = useState("");

  // Profile status
  const [profileStatus, setProfileStatus] = useState("Incomplete");
  const [saveStatus, setSaveStatus] = useState<SaveStatusState>({
    personalInfo: "idle",
    academicBackground: "idle",
    availability: "idle",
  });

  const [showPreview, setShowPreview] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Only apply automatic detection if data hasn't been loaded yet
  useEffect(() => {
    // Don't auto-change year if we've already loaded data from the database
    if (isDataLoaded) return;

    if (applicationType === "Graduate" || applicationType === "PhD") {

      setYearOfStudy(applicationType);
    } else if (applicationType === "Undergraduate") {
      setYearOfStudy("");
    }
  }, [applicationType, isDataLoaded]);

  // Function to handle manual application type changes (after data is loaded)

  const handleApplicationTypeChange = useCallback(
    (newType: ApplicationType) => {
      setApplicationType(newType);

      // Only apply automatic detection for manual changes after data is loaded
      if (isDataLoaded) {
        if (newType === "Graduate" || newType === "PhD") {
          setYearOfStudy(newType);
        } else if (newType === "Undergraduate") {
          setYearOfStudy("");

        }
      }
    },
    [isDataLoaded]
  );

  // Load existing profile data
  useEffect(() => {
    if (!userId) return;
    const loadProfileData = async () => {
      setIsLoading(true);
      setBackendError(null);
      try {
        // Get complete profile data including user info
        const response = await fetch(
          `http://localhost:8000/api/users/${userId}/complete-profile`,
          {
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load profile data");
        }

        const data = await response.json();

        // Update user info
        if (data.user) {
          setFullName(data.user.name || "");
          setEmail(data.user.email || "");
          setProgram(data.user.major || "");
          setStudentNumber(data.user.student_number || "");
          console.log("Fetched user:", data.user);
          console.log("Student number state:", data.user.student_number);
        }

        // Update profile info
        if (data.profile) {
          setMaxHours(data.profile.max_hours_per_week?.toString() || "");
          setPreferredTerm(data.profile.preferred_term || "");
          setCoursework(data.profile.relevant_coursework || "");
          setTeachingExp(data.profile.teaching_experience || "");
          setTechnicalSkills(data.profile.technical_skills || "");
          setOverallGpa(data.profile.overall_gpa?.toString() || "");
          setAvailability(data.profile.weekly_availability || "");
          setTranscriptUrl(data.profile.transcript_url || null);

          // Set application type first
          const loadedApplicationType =
            data.profile.application_type || "Undergraduate";
          setApplicationType(loadedApplicationType);

          // Set year of study based on application type
          if (
            loadedApplicationType === "Graduate" ||
            loadedApplicationType === "PhD"
          ) {
            setYearOfStudy(loadedApplicationType);
          } else {
            setYearOfStudy(data.profile.year_of_study?.toString() || "");
          }

          // Format the expected graduation date for the date input
          if (data.profile.expected_graduation) {
            const date = new Date(data.profile.expected_graduation);
            const formattedDate = date.toISOString().split("T")[0];
            setExpectedGraduation(formattedDate);
          } else {
            setExpectedGraduation("");
          }
        }

        // Mark data as loaded AFTER setting all the profile data
        setIsDataLoaded(true);
      } catch (error) {
        console.error("Error loading profile data:", error);
        setBackendError(
          "Failed to connect to the backend server. Please make sure it is running on port 8000."
        );
      } finally {
        setIsLoading(false);
        // Note: setIsDataLoaded(true) is called after successful profile data loading above
      }
    };

    loadProfileData();
  }, [userId]);

  // Fetch real completion percentage from backend
  useEffect(() => {
    if (!userId) return;
    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/users/${userId}/profile/status`
        );
        if (response.ok) {
          const data = await response.json();
          setProfileStatus(data.status || "Incomplete");
        }
      } catch (e) {
        // fallback: do nothing
      }
    };
    fetchStatus();
  }, [userId]);

  // Navigation functions
  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    }
  }, []);

  const goToNextSection = useCallback(
    (currentSectionId: string) => {
      const sections = [
        "personal-information",
        "academic-background",
        "availability-preferences",
      ];
      const currentIndex = sections.indexOf(currentSectionId);

      if (currentIndex >= 0 && currentIndex < sections.length - 1) {
        const nextSectionId = sections[currentIndex + 1];
        setTimeout(() => {
          scrollToSection(nextSectionId);
        }, 1000); // Give time for save feedback
      }
    },
    [scrollToSection]
  );

  const saveAllSections = useCallback(async () => {
    if (!userId) return;

    // Validate year of study for undergraduate students
    if (
      applicationType === ("Undergraduate" as any) &&
      (!yearOfStudy || !yearOfStudy.trim())
    ) {
      toast.error("Year of study is required for undergraduate students");
      return;
    }

    setSaveStatus({
      personalInfo: "saving",
      academicBackground: "saving",
      availability: "saving",
    });

    toast.info("Saving all sections...");

    try {
      // Save personal info (user data)
      const userResponse = await fetch(
        `http://localhost:8000/api/users/${userId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: fullName,
            major:
              program === "Other (Please Specify)" ? programOther : program,
          }),
        }
      );

      if (!userResponse.ok) {
        throw new Error("Failed to update user info");
      }

      // Save profile data (academic + availability)
      const profileResponse = await fetch(
        `http://localhost:8000/api/users/${userId}/profile/draft`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            overall_gpa: parseFloat(overallGpa),
            year_of_study: yearOfStudy ? parseInt(yearOfStudy) : null,
            expected_graduation: expectedGraduation,
            relevant_coursework: coursework,
            teaching_experience: teachingExp,
            technical_skills: technicalSkills,
            application_type: applicationType,
            weekly_availability: availability,
            max_hours_per_week: maxHours ? parseInt(maxHours) : null,
            preferred_term: preferredTerm,
          }),
        }
      );

      if (!profileResponse.ok) {
        throw new Error("Failed to update profile");
      }

      setSaveStatus({
        personalInfo: "saved",
        academicBackground: "saved",
        availability: "saved",
      });

      toast.success("All sections saved successfully!");

      setTimeout(() => {
        setSaveStatus({
          personalInfo: "idle",
          academicBackground: "idle",
          availability: "idle",
        });
      }, 2000);
    } catch (error) {
      console.error("Error saving all sections:", error);
      toast.error("Failed to save some sections. Please try again.");
      setSaveStatus({
        personalInfo: "error",
        academicBackground: "error",
        availability: "error",
      });
      setTimeout(() => {
        setSaveStatus({
          personalInfo: "idle",
          academicBackground: "idle",
          availability: "idle",
        });
      }, 2000);
    }
  }, [
    userId,
    fullName,
    program,
    programOther,
    overallGpa,
    yearOfStudy,
    expectedGraduation,
    coursework,
    teachingExp,
    technicalSkills,
    applicationType,
    availability,
    maxHours,
    preferredTerm,
  ]);

  const savePersonalInfo = async () => {
    if (!userId) return;
    setSaveStatus((prev) => ({ ...prev, personalInfo: "saving" }));
    try {
      // Update user info
      const userResponse = await fetch(
        `http://localhost:8000/api/users/${userId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: fullName,
            major: program,
          }),
        }
      );

      if (!userResponse.ok) {
        throw new Error("Failed to update user info");
      }

      const userData = await userResponse.json();

      // Update local state with the response data
      setFullName(userData.name);
      setProgram(userData.major);

      setSaveStatus((prev) => ({ ...prev, personalInfo: "saved" }));
      toast.success("Personal information saved successfully!");
      goToNextSection("personal-information");
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, personalInfo: "idle" }));
      }, 2000);
    } catch (error) {
      console.error("Error saving personal info:", error);
      toast.error("Failed to save personal information. Please try again.");
      setSaveStatus((prev) => ({ ...prev, personalInfo: "error" }));
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, personalInfo: "idle" }));
      }, 2000);
    }
  };

  const saveAcademicBackground = async () => {
    setSaveStatus((prev) => ({ ...prev, academicBackground: "saving" }));

    // Validate year of study for undergraduate students
    if (
      applicationType === ("Undergraduate" as any) &&
      (!yearOfStudy || !yearOfStudy.trim())
    ) {
      setSaveStatus((prev) => ({ ...prev, academicBackground: "error" }));
      toast.error("Year of study is required for undergraduate students");
      return;
    }

    // Debug: Log what we're sending
    const requestData = {
      overall_gpa: parseFloat(overallGpa),
      year_of_study: yearOfStudy ? parseInt(yearOfStudy) : null,
      expected_graduation: expectedGraduation,
      relevant_coursework: coursework,
      teaching_experience: teachingExp,
      technical_skills: technicalSkills,
      application_type: applicationType,
    };
    console.log(
      "📤 Saving academic background with application_type:",
      applicationType
    );
    console.log("📤 Full request data:", requestData);

    try {
      const response = await fetch(
        `http://localhost:8000/api/users/${userId}/profile/draft`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update academic background");
      }

      const data = await response.json();
      console.log("📥 Server response:", data);
      console.log(
        "📥 Server returned application_type:",
        data.profile?.application_type
      );

      // Update local state with the response data
      if (data.profile) {
        setOverallGpa(data.profile.overall_gpa?.toString() || "");
        if (data.profile.expected_graduation) {
          const date = new Date(data.profile.expected_graduation);
          const formattedDate = date.toISOString().split("T")[0];
          setExpectedGraduation(formattedDate);
        }
        setCoursework(data.profile.relevant_coursework || "");
        setTeachingExp(data.profile.teaching_experience || "");
        setTechnicalSkills(data.profile.technical_skills || "");

        // Now let's check if the server saved our application type correctly
        if (
          data.profile.application_type &&
          data.profile.application_type !== applicationType
        ) {
          console.log("⚠️ Server returned different application_type!");
          console.log("   Frontend has:", applicationType);
          console.log("   Server returned:", data.profile.application_type);
        }
        // DON'T overwrite applicationType - keep the user's manual selection
        // setApplicationType(data.profile.application_type || "Undergraduate");
      }

      setSaveStatus((prev) => ({ ...prev, academicBackground: "saved" }));
      toast.success("Academic background saved successfully!");
      goToNextSection("academic-background");
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, academicBackground: "idle" }));
      }, 2000);
    } catch (error) {
      console.error("Error saving academic background:", error);
      toast.error("Failed to save academic background. Please try again.");
      setSaveStatus((prev) => ({ ...prev, academicBackground: "error" }));
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, academicBackground: "idle" }));
      }, 2000);
    }
  };

  const saveAvailability = async () => {
    setSaveStatus((prev) => ({ ...prev, availability: "saving" }));
    try {
      const response = await fetch(
        `http://localhost:8000/api/users/${userId}/profile/draft`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            weekly_availability: availability,
            max_hours_per_week: maxHours ? parseInt(maxHours) : null,
            preferred_term: preferredTerm,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save availability");
      }

      const data = await response.json();

      setAvailability(data.profile.weekly_availability);
      setMaxHours(data.profile.max_hours_per_week?.toString());
      setPreferredTerm(data.profile.preferred_term);

      setSaveStatus((prev) => ({ ...prev, availability: "saved" }));
      toast.success(
        "Availability preferences saved successfully! Profile completed!"
      );
      // Last section - show completion message instead of navigating
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, availability: "idle" }));
      }, 2000);
    } catch (error) {
      console.error("Error saving availability:", error);
      toast.error("Failed to save availability preferences. Please try again.");
      setSaveStatus((prev) => ({ ...prev, availability: "error" }));
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, availability: "idle" }));
      }, 2000);
    }
  };

  // Format availability grid for display
  const formatAvailability = (availabilityString: string) => {
    if (!availabilityString) return "Not specified";

    try {
      const grid = JSON.parse(availabilityString);
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      const hours = Array.from({ length: 10 }, (_, i) => `${8 + i}:00`);

      const dayUnavailability: { [key: string]: string[] } = {};

      for (let rowIdx = 0; rowIdx < hours.length; rowIdx++) {
        for (let colIdx = 0; colIdx < days.length; colIdx++) {
          if (grid[rowIdx] && grid[rowIdx][colIdx]) {
            const day = days[colIdx];
            if (!dayUnavailability[day]) {
              dayUnavailability[day] = [];
            }
            dayUnavailability[day].push(hours[rowIdx]);
          }
        }
      }

      if (Object.keys(dayUnavailability).length === 0) {
        return "No unavailability specified - Available all hours";
      }

      const formattedDays = Object.entries(dayUnavailability).map(
        ([day, times]) => {
          return `${day}: ${times.join(", ")} (unavailable)`;
        }
      );

      return formattedDays.join(" | ");
    } catch {
      return "Invalid availability data";
    }
  };

  // Preview modal content
  const PreviewModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full p-8 relative">
        <button
          onClick={() => setShowPreview(false)}
          className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Profile Preview</h2>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Personal Information
            </h3>
            <div className="text-sm text-gray-800 dark:text-gray-200">
              Full Name:{" "}
              {fullName || <span className="text-red-500 dark:text-red-400">Missing</span>}
            </div>
            <div className="text-sm text-gray-800 dark:text-gray-200">
              Email: {email || <span className="text-red-500 dark:text-red-400">Missing</span>}
            </div>
            <div className="text-sm text-gray-800 dark:text-gray-200">
              Program:{" "}
              {program === "Other (Please Specify)"
                ? programOther
                : program || <span className="text-red-500 dark:text-red-400">Missing</span>}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Academic Background
            </h3>
            <div className="text-sm text-gray-800 dark:text-gray-200">
              GPA: {overallGpa || <span className="text-red-500 dark:text-red-400">Missing</span>}
            </div>
            <div className="text-sm text-gray-800 dark:text-gray-200">
              Expected Graduation:{" "}
              {expectedGraduation || (
                <span className="text-red-500 dark:text-red-400">Missing</span>
              )}
            </div>
            <div className="text-sm text-gray-800 dark:text-gray-200">
              Year of Study:{" "}
              {yearOfStudy || <span className="text-red-500 dark:text-red-400">Missing</span>}
            </div>
            <div className="text-sm text-gray-800 dark:text-gray-200">
              Application Type: {applicationType}
            </div>
            <div className="text-sm text-gray-800 dark:text-gray-200">
              Coursework: {coursework}
            </div>
            <div className="text-sm text-gray-800 dark:text-gray-200">
              Teaching Exp: {teachingExp}
            </div>
            <div className="text-sm text-gray-800 dark:text-gray-200">
              Technical Skills: {technicalSkills}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Availability & Preferences
            </h3>
            <div className="text-sm text-gray-800 dark:text-gray-200">
              Weekly Unavailability: {formatAvailability(availability)}
            </div>
            <div className="text-sm text-gray-800 dark:text-gray-200">Max Hours: {maxHours}</div>
            <div className="text-sm text-gray-800 dark:text-gray-200">
              Preferred Term: {preferredTerm}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!userId) {
    return <div>Loading user information...</div>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#F8F9FA] dark:bg-gray-900 font-[Inter] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002145] dark:border-white mx-auto mb-4"></div>
          <p className="text-[#374151] dark:text-gray-300">Loading profile data...</p>
        </div>
      </div>
    );
  }

  if (backendError) {
    return (
      <div className="min-h-screen w-full bg-[#F8F9FA] dark:bg-gray-900 font-[Inter] flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-md">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
            Connection Error
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{backendError}</p>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>To fix this:</p>
            <ol className="list-decimal list-inside mt-2">
              <li>Make sure your backend server is running</li>
              <li>Check if it's running on port 8000</li>
              <li>Try refreshing the page</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 font-[Inter]">
      <ToastContainer position="top-right" autoClose={3000} />
      {showPreview && <PreviewModal />}
      <Header profileStatus={profileStatus} />
      <main className="flex gap-[32px] p-[76px] max-lg:flex-col max-lg:p-[24px]">
        {/* Main Content */}
        <div className="flex-1 space-y-[32px]">
          <div
            id="personal-information"
            className="bg-white dark:bg-gray-800 rounded-[16px] border border-[#E5E7EB] dark:border-gray-700 shadow-sm"
          >
            <PersonalInformationSection
              fullName={fullName}
              setFullName={setFullName}
              studentNumber={studentNumber}
              email={email}
              setEmail={setEmail}
              program={program}
              setProgram={setProgram}
              programOther={programOther}
              setProgramOther={setProgramOther}
              onInputChange={() => {}}
              saveStatus={saveStatus.personalInfo}
              onSave={savePersonalInfo}
            />
          </div>
          <div
            id="academic-background"
            className="bg-white dark:bg-gray-800 rounded-[16px] border border-[#E5E7EB] dark:border-gray-700 shadow-sm"
          >
            <AcademicBackgroundSection
              overallGpa={overallGpa}
              setOverallGpa={setOverallGpa}
              yearOfStudy={yearOfStudy}
              setYearOfStudy={setYearOfStudy}
              expectedGraduation={expectedGraduation}
              setExpectedGraduation={setExpectedGraduation}
              coursework={coursework}
              setCoursework={setCoursework}
              teachingExp={teachingExp}
              setTeachingExp={setTeachingExp}
              technicalSkills={technicalSkills}
              setTechnicalSkills={setTechnicalSkills}
              applicationType={applicationType}
              setApplicationType={handleApplicationTypeChange}
              onInputChange={() => {}}
              saveStatus={saveStatus.academicBackground}
              onSave={saveAcademicBackground}
              onValidationError={(message) => toast.error(message)}
            />
            <div className="border-t border-gray-100 dark:border-gray-700 p-6">
              {/* Transcript information message */}
              <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5"
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
                  </div>
                  <div>
                    <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                      Uploading an unofficial transcript is highly recommended
                      for UBC students. Only UBC unofficial transcripts will be
                      considered during evaluation.
                    </p>
                  </div>
                </div>
              </div>
              <TranscriptUpload userId={userId} transcriptUrl={transcriptUrl} />
            </div>
          </div>
          <div
            id="availability-preferences"
            className="bg-white dark:bg-gray-800 rounded-[16px] border border-[#E5E7EB] dark:border-gray-700 shadow-sm"
          >
            <AvailabilityPreferencesSection
              availability={availability}
              setAvailability={setAvailability}
              maxHours={maxHours}
              setMaxHours={setMaxHours}
              preferredTerm={preferredTerm}
              setPreferredTerm={setPreferredTerm}
              onInputChange={() => {}}
              saveStatus={saveStatus.availability}
              onSave={saveAvailability}
            />
          </div>
        </div>

        {/* Modern Sidebar */}
        <div className="w-[320px] max-lg:w-full space-y-6">
          {/* Profile Completion Card */}
          <div className="bg-white dark:bg-gray-800 rounded-[16px] border border-[#E5E7EB] dark:border-gray-700 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Profile Status
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Complete your profile to apply
                </p>
              </div>
            </div>

            <div className="space-y-3 mt-6">
              {[
                {
                  label: "Personal Information",
                  id: "personal-information",
                  completed: !!(
                    fullName?.trim() &&
                    email?.trim() &&
                    program?.trim() &&
                    (program !== "Other (Please Specify)" ||
                      programOther?.trim()) &&
                    studentNumber?.trim()
                  ),
                  icon: "👤",
                },
                {
                  label: "Academic Background",
                  id: "academic-background",
                  completed: !!(
                    overallGpa &&
                    parseFloat(overallGpa) > 0 &&
                    expectedGraduation &&
                    coursework?.trim() &&
                    technicalSkills?.trim() &&
                    teachingExp?.trim()
                  ),
                  icon: "🎓",
                },
                {
                  label: "Availability Preferences",
                  id: "availability-preferences",
                  completed: !!(
                    availability &&
                    availability !== "" &&
                    maxHours?.trim() &&
                    preferredTerm?.trim()
                  ),
                  icon: "📅",
                },
              ].map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 border ${
                    section.completed
                      ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50"
                      : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{section.icon}</span>
                      <span className="font-medium text-sm">
                        {section.label}
                      </span>
                    </div>
                    {section.completed ? (
                      <svg
                        className="w-5 h-5 text-green-600 dark:text-green-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-500"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white dark:bg-gray-800 rounded-[16px] border border-[#E5E7EB] dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={saveAllSections}
                disabled={Object.values(saveStatus).some(
                  (status) => status === "saving"
                )}
                className="w-full flex items-center gap-3 p-3 text-left rounded-lg bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors border border-purple-200 dark:border-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
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
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <div>
                  <div className="font-medium text-purple-900 dark:text-purple-300">
                    {Object.values(saveStatus).some(
                      (status) => status === "saving"
                    )
                      ? "Saving..."
                      : "Save All Sections"}
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400">
                    Save all profile information at once
                  </div>
                </div>
              </button>

              <button
                onClick={() => setShowPreview(true)}
                className="w-full flex items-center gap-3 p-3 text-left rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800"
              >
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
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <div>
                  <div className="font-medium text-blue-900 dark:text-blue-300">
                    Preview Profile
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    See how your profile looks
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Tips Card */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-[16px] border border-purple-200 dark:border-purple-800 p-6">
            <div className="flex items-center gap-2 mb-3">
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
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <h3 className="font-semibold text-purple-900 dark:text-purple-300">Pro Tips</h3>
            </div>
            <ul className="text-sm text-purple-800 dark:text-purple-300 space-y-2">
              <li>• Complete all sections for the best TA matches</li>
              <li>• Upload your transcript for verification</li>
              <li>• Update availability each semester</li>
              <li>• Highlight relevant coursework and skills</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
