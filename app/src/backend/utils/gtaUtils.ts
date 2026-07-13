// app/src/backend/utils/gtaUtils.ts
// NEW FILE: Utility functions for determining GTA eligibility

/**
 * Determines if a student is eligible to be a Graduate TA (GTA)
 * Based on year of study - 5th year and above are considered graduate students
 */
export function isGraduateStudent(yearOfStudy?: number): boolean {
  if (!yearOfStudy) {
    return false;
  }
  return yearOfStudy >= 5;
}

/**
 * Determines if a user can access GTA exam availability features
 * Must be a student AND a graduate student (year 5+)
 */
export function canAccessGTAFeatures(role: string, yearOfStudy?: number): boolean {
  return role === 'student' && isGraduateStudent(yearOfStudy);
}

/**
 * Get GTA status message for user feedback
 */
export function getGTAStatusMessage(role: string, yearOfStudy?: number): string {
  if (role !== 'student') {
    return "Only students can access GTA features";
  }
  
  if (!yearOfStudy) {
    return "Year of study not specified. Please update your profile.";
  }
  
  if (yearOfStudy < 5) {
    return `Undergraduate student (Year ${yearOfStudy}). GTA features require graduate student status (Year 5+).`;
  }
  
  return `Graduate student (Year ${yearOfStudy}) - GTA features available`;
}