import { Database } from "../config.ts";

export interface StudentProfile {
  profile_id?: number;
  user_id: number;
  overall_gpa?: number;
  year_of_study?: number;
  expected_graduation?: Date;
  application_type?: string;
  personal_statement?: string;
  weekly_availability?: string;
  max_hours_per_week?: number;
  preferred_term?: string;
  preferred_course_types?: any;
  specific_course_preferences?: string;
  additional_notes?: string;
  relevant_coursework?: string;
  teaching_experience?: string;
  technical_skills?: string;
  transcript_url?: string;
  created_at?: Date;
  updated_at?: Date;
  is_submitted?: boolean;
  submitted_at?: Date;
}

export interface Reference {
  reference_id?: number;
  user_id: number;
  reference_name: string;
  reference_email: string;
  reference_letter_url?: string;
  uploaded_at?: Date;
}

export class ProfileModel {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  async getStudentProfile(userId: number): Promise<StudentProfile | null> {
    const query = `SELECT * FROM student_profiles WHERE user_id = $1`;
    const result = await this.db.query<StudentProfile>(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    // Ensure preferred_course_types is properly parsed from JSON
    const profile = result.rows[0];
    if (
      profile.preferred_course_types &&
      typeof profile.preferred_course_types === "string"
    ) {
      try {
        profile.preferred_course_types = JSON.parse(
          profile.preferred_course_types
        );
      } catch (e) {
        console.error("Error parsing preferred_course_types:", e);
        profile.preferred_course_types = {};
      }
    }

    return profile;
  }

  async createOrUpdateStudentProfile(
    profile: Omit<StudentProfile, "profile_id" | "created_at" | "updated_at">
  ): Promise<StudentProfile> {
    // Check if profile exists
    const existingProfile = await this.getStudentProfile(profile.user_id);

    // Only include profile-specific fields
    const profileFields = [
      "overall_gpa",
      "year_of_study",
      "expected_graduation",
      "personal_statement",
      "weekly_availability",
      "max_hours_per_week",
      "preferred_term",
      "preferred_course_types",
      "specific_course_preferences",
      "additional_notes",
      "relevant_coursework",
      "teaching_experience",
      "technical_skills",
      "transcript_url",
      "application_type",  // <-- Added this field!
    ];

    // Ensure preferred_course_types is JSON string if provided
    if (profile.preferred_course_types) {
      // If it's already a string, validate it's valid JSON
      if (typeof profile.preferred_course_types === "string") {
        try {
          JSON.parse(profile.preferred_course_types);
        } catch (e) {
          console.error("Invalid JSON in preferred_course_types:", e);
          profile.preferred_course_types = "{}";
        }
      } else {
        // If it's an object, stringify it
        profile.preferred_course_types = JSON.stringify(
          profile.preferred_course_types
        );
      }
    }

    if (existingProfile) {
      // Update existing profile
      const fields = Object.keys(profile).filter(
        (key) =>
          profileFields.includes(key) &&
          profile[key as keyof typeof profile] !== undefined
      );

      if (fields.length === 0) return existingProfile;

      const setClause = fields
        .map((field, index) => `${field} = $${index + 2}`)
        .join(", ");
      const query = `
        UPDATE student_profiles 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING *
      `;

      const values = [
        profile.user_id,
        ...fields.map((field) => (profile as any)[field]),
      ];
      const result = await this.db.query<StudentProfile>(query, values);

      const updatedProfile = result.rows[0];

      // Parse preferred_course_types for the returned profile
      if (
        updatedProfile.preferred_course_types &&
        typeof updatedProfile.preferred_course_types === "string"
      ) {
        try {
          updatedProfile.preferred_course_types = JSON.parse(
            updatedProfile.preferred_course_types
          );
        } catch (e) {
          console.error("Error parsing returned preferred_course_types:", e);
          updatedProfile.preferred_course_types = {};
        }
      }

      return updatedProfile;
    } else {
      // Create new profile
      const fields = Object.keys(profile).filter(
        (key) =>
          profileFields.includes(key) &&
          profile[key as keyof typeof profile] !== undefined
      );

      if (fields.length === 0) {
        // If no profile fields are provided, create a minimal profile
        const query = `
          INSERT INTO student_profiles (user_id)
          VALUES ($1)
          RETURNING *
        `;
        const result = await this.db.query<StudentProfile>(query, [
          profile.user_id,
        ]);

        // Parse preferred_course_types for the returned profile
        const newProfile = result.rows[0];
        if (
          newProfile.preferred_course_types &&
          typeof newProfile.preferred_course_types === "string"
        ) {
          try {
            newProfile.preferred_course_types = JSON.parse(
              newProfile.preferred_course_types
            );
          } catch (e) {
            console.error(
              "Error parsing new profile preferred_course_types:",
              e
            );
            newProfile.preferred_course_types = {};
          }
        }

        return newProfile;
      }

      const placeholders = fields.map((_, index) => `$${index + 2}`).join(", ");
      const columns = fields.join(", ");

      const query = `
        INSERT INTO student_profiles (user_id, ${columns})
        VALUES ($1, ${placeholders})
        RETURNING *
      `;

      const values = [
        profile.user_id,
        ...fields.map((field) => (profile as any)[field]),
      ];
      const result = await this.db.query<StudentProfile>(query, values);

      // Parse preferred_course_types for the returned profile
      const newProfile = result.rows[0];
      if (
        newProfile.preferred_course_types &&
        typeof newProfile.preferred_course_types === "string"
      ) {
        try {
          newProfile.preferred_course_types = JSON.parse(
            newProfile.preferred_course_types
          );
        } catch (e) {
          console.error("Error parsing new profile preferred_course_types:", e);
          newProfile.preferred_course_types = {};
        }
      }

      return newProfile;
    }
  }

  async getReferences(userId: number): Promise<Reference[]> {
    const query = `SELECT * FROM professor_references WHERE user_id = $1 ORDER BY uploaded_at DESC`;
    const result = await this.db.query<Reference>(query, [userId]);

    return result.rows;
  }

  async getReference(referenceId: number): Promise<Reference | null> {
    const query = `SELECT * FROM professor_references WHERE reference_id = $1`;
    const result = await this.db.query<Reference>(query, [referenceId]);

    return result.rows[0] || null;
  }

  async addReference(
    reference: Omit<Reference, "reference_id" | "uploaded_at">
  ): Promise<Reference> {
    const fields = Object.keys(reference);
    const placeholders = fields.map((_, index) => `$${index + 1}`).join(", ");
    const columns = fields.join(", ");

    const query = `
      INSERT INTO professor_references (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;

    const values = fields.map((field) => (reference as any)[field]);
    const result = await this.db.query<Reference>(query, values);

    return result.rows[0];
  }

  async updateReferenceLetterUrl(
    referenceId: number,
    letterUrl: string
  ): Promise<Reference> {
    const query = `
      UPDATE professor_references
      SET reference_letter_url = $1, uploaded_at = CASE WHEN $1 = '' THEN NULL ELSE CURRENT_TIMESTAMP END
      WHERE reference_id = $2
      RETURNING *
    `;

    const result = await this.db.query<Reference>(query, [
      letterUrl,
      referenceId,
    ]);

    if (result.rows.length === 0) {
      throw new Error("Reference not found");
    }

    return result.rows[0];
  }

  async deleteReference(referenceId: number): Promise<boolean> {
    const query = `DELETE FROM professor_references WHERE reference_id = $1 RETURNING *`;
    const result = await this.db.query<Reference>(query, [referenceId]);

    return result.rows.length > 0;
  }

  async getCoursePreferences(
    userId: number
  ): Promise<Record<string, string[]>> {
    const query = `
      SELECT preferred_course_types 
      FROM student_profiles 
      WHERE user_id = $1
    `;

    const result = await this.db.query<{ preferred_course_types: string }>(
      query,
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].preferred_course_types) {
      return { preferred: [], avoid: [] };
    }

    try {
      const preferences = JSON.parse(result.rows[0].preferred_course_types);
      // Ensure the structure has preferred and avoid arrays
      return {
        preferred: Array.isArray(preferences.preferred)
          ? preferences.preferred
          : [],
        avoid: Array.isArray(preferences.avoid) ? preferences.avoid : [],
      };
    } catch (e) {
      console.error("Error parsing course preferences:", e);
      return { preferred: [], avoid: [] };
    }
  }

  async updateCoursePreferences(
    userId: number,
    preferences: { preferred?: string[]; avoid?: string[] }
  ): Promise<void> {
    // Ensure proper structure
    const coursePreferences = {
      preferred: Array.isArray(preferences.preferred)
        ? preferences.preferred
        : [],
      avoid: Array.isArray(preferences.avoid) ? preferences.avoid : [],
    };

    const query = `
      UPDATE student_profiles
      SET preferred_course_types = $1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
    `;

    await this.db.query(query, [JSON.stringify(coursePreferences), userId]);
  }

  async updateProfileSubmissionStatus(
    userId: number,
    isSubmitted: boolean
  ): Promise<StudentProfile> {
    const query = `
      UPDATE student_profiles
      SET is_submitted = $1, 
          submitted_at = CASE WHEN $1 = true THEN CURRENT_TIMESTAMP ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
      RETURNING *
    `;

    const result = await this.db.query<StudentProfile>(query, [
      isSubmitted,
      userId,
    ]);

    if (result.rows.length === 0) {
      throw new Error("Profile not found");
    }

    // Parse preferred_course_types for the returned profile
    const updatedProfile = result.rows[0];
    if (
      updatedProfile.preferred_course_types &&
      typeof updatedProfile.preferred_course_types === "string"
    ) {
      try {
        updatedProfile.preferred_course_types = JSON.parse(
          updatedProfile.preferred_course_types
        );
      } catch (e) {
        console.error(
          "Error parsing submitted profile preferred_course_types:",
          e
        );
        updatedProfile.preferred_course_types = {};
      }
    }

    return updatedProfile;
  }
}
