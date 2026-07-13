import { AuditLogger } from "../../backend/services/auditLogger.ts";
import { Database } from "../config.ts";

export interface TAApplication {
  application_id?: number;
  user_id?: number;
  submitted_at?: Date;
  status?: "pending" | "approved" | "rejected" | "allocated";
  notes?: string;
  domain_areas?: string[]; // Top 3 domain areas
  application_type?: "UTA" | "GTA"; // Type of application
  term_availability?: string; // Availability for the term
}

export interface ApplicationRanking {
  id?: number;
  application_id: number;
  course_id: number;
  rank: number;
  created_at?: Date;
}

// Extended application data types to match the form structure
export interface ApplicationPersonalInfo {
  full_name: string;
  year_of_study: string;
  student_id: string;
  email: string;
  phone?: string;
  program?: string;
}

export interface ApplicationAcademicBackground {
  courses_taken?: string[];
  overall_gpa?: string;
  expected_graduation?: string;
  relevant_coursework?: string;
}

export interface ApplicationTeachingExperience {
  experience?: string;
}

export interface ApplicationTechnicalSkills {
  skills?: string;
}

export interface ApplicationAvailability {
  weekly_availability?: string;
  max_hours?: number;
  preferred_term?: string;
  preferred_courses?: string[];
  specific_preferences?: string;
}

export interface ApplicationReferences {
  reference_letter?: string;
  reference_names?: string[];
  reference_emails?: string[];
  personal_statement?: string;
}

export interface TAApplicationDetail extends TAApplication {
  applicant_name?: string;
  applicant_email?: string;
  personal_info?: ApplicationPersonalInfo;
  academic_background?: ApplicationAcademicBackground;
  teaching_experience?: ApplicationTeachingExperience;
  technical_skills?: ApplicationTechnicalSkills;
  availability?: ApplicationAvailability;
  references?: ApplicationReferences;
  course_preferences?: Array<{
    course_id: number;
    rank: number;
    course_code: string;
    course_title: string;
    term: string;
  }>;
}

export class ApplicationModel {
  private db: Database;
  private auditLogger: AuditLogger;

  constructor(database: Database) {
    this.db = database;
    this.auditLogger = new AuditLogger(database);
  }

  async createApplication(
    application: Omit<TAApplication, "application_id" | "submitted_at">
  ): Promise<TAApplication> {
    const query = `
      INSERT INTO ta_applications (user_id, status, notes, domain_areas, application_type, term_availability)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await this.db.query<TAApplication>(query, [
      application.user_id,
      application.status || "pending",
      application.notes || null,
      application.domain_areas
        ? JSON.stringify(application.domain_areas)
        : null,
      application.application_type || null,
      application.term_availability || null,
    ]);

    return result.rows[0];
  }

  async setCourseRankings(
    applicationId: number,
    rankings: Array<{course_id: number, rank: number}>
  ): Promise<void> {
    // Start transaction
    await this.db.query("BEGIN");
    
    try {
      // First delete existing rankings
      await this.deleteCourseRankings(applicationId);
      
      // Then add new rankings
      for (const ranking of rankings) {
        await this.addCourseRanking({
          application_id: applicationId,
          course_id: ranking.course_id,
          rank: ranking.rank
        });
      }
      
      // Commit transaction
      await this.db.query("COMMIT");
    } catch (error) {
      // Rollback on error
      await this.db.query("ROLLBACK");
      throw error;
    }
}

  async getApplicationById(
    applicationId: number
  ): Promise<TAApplicationDetail | null> {
    const query = `
        SELECT
            ta.*,
            u.name as applicant_name,
            u.email as applicant_email,
            u.major,
            u.student_number,
            sp.overall_gpa as profile_overall_gpa,
            sp.expected_graduation as profile_expected_graduation,
            sp.relevant_coursework as profile_relevant_coursework,
            sp.technical_skills as profile_technical_skills,
            sp.teaching_experience as profile_teaching_experience,
            sp.weekly_availability as profile_weekly_availability,
            sp.transcript_url as profile_transcript_url,
            json_agg(
                json_build_object(
                    'course_id', ar.course_id,
                    'rank', ar.rank,
                    'course_code', c.code,
                    'course_title', c.title,
                    'term', c.term
                ) ORDER BY ar.rank
            ) as course_preferences
        FROM ta_applications ta
        JOIN users u ON ta.user_id = u.user_id
        LEFT JOIN student_profiles sp ON ta.user_id = sp.user_id
        LEFT JOIN applicationrankings ar ON ta.application_id = ar.application_id
        LEFT JOIN courses c ON ar.course_id = c.course_id
        WHERE ta.application_id = $1
        GROUP BY ta.application_id, u.name, u.email, u.major, u.student_number,
                 sp.overall_gpa, sp.expected_graduation, sp.relevant_coursework, 
                 sp.technical_skills, sp.teaching_experience, sp.weekly_availability, sp.transcript_url
        `;

    const result = await this.db.query(query, [applicationId]);

    if (result.rows.length === 0) {
      return null;
    }

    const application = result.rows[0] as any;

    // Map profile fields back to expected names
    if (application.profile_overall_gpa !== undefined)
      application.overall_gpa = application.profile_overall_gpa;
    if (application.profile_expected_graduation !== undefined)
      application.expected_graduation = application.profile_expected_graduation;
    if (application.profile_relevant_coursework !== undefined)
      application.relevant_coursework = application.profile_relevant_coursework;
    if (application.profile_technical_skills !== undefined)
      application.technical_skills = application.profile_technical_skills;
    if (application.profile_teaching_experience !== undefined)
      application.teaching_experience = application.profile_teaching_experience;
    if (application.profile_weekly_availability !== undefined)
      application.weekly_availability = application.profile_weekly_availability;
    if (application.profile_transcript_url !== undefined)
      application.transcript_url = application.profile_transcript_url;

    // Parse domain_areas if it's a JSON string
    if (
      application.domain_areas &&
      typeof application.domain_areas === "string"
    ) {
      try {
        application.domain_areas = JSON.parse(application.domain_areas);
      } catch (e) {
        console.error("Error parsing domain_areas:", e);
        application.domain_areas = [];
      }
    }
    return application as TAApplicationDetail;
  }

  async addCourseRanking(
    ranking: Omit<ApplicationRanking, "id" | "created_at">
  ): Promise<ApplicationRanking> {
    const query = `
        INSERT INTO applicationrankings (application_id, course_id, rank)
        VALUES ($1, $2, $3)
        RETURNING *
        `;

    const result = await this.db.query<ApplicationRanking>(query, [
      ranking.application_id,
      ranking.course_id,
      ranking.rank,
    ]);

    return result.rows[0];
  }

  async getApplicationByUserId(
    userId: number
  ): Promise<TAApplicationDetail | null> {
    // Return only the latest application for the user to show as "current/updated" application
    const query = `
        SELECT
            ta.*,
            u.name as applicant_name,
            u.email as applicant_email,
            u.major,
            u.student_number,
            sp.overall_gpa as profile_overall_gpa,
            sp.expected_graduation as profile_expected_graduation,
            sp.relevant_coursework as profile_relevant_coursework,
            sp.technical_skills as profile_technical_skills,
            sp.teaching_experience as profile_teaching_experience,
            sp.weekly_availability as profile_weekly_availability,
            sp.transcript_url as profile_transcript_url,
            json_agg(
                json_build_object(
                    'course_id', ar.course_id,
                    'rank', ar.rank,
                    'course_code', c.code,
                    'course_title', c.title,
                    'term', c.term
                ) ORDER BY ar.rank
            ) as course_preferences
        FROM ta_applications ta
        JOIN users u ON ta.user_id = u.user_id
        LEFT JOIN student_profiles sp ON ta.user_id = sp.user_id
        LEFT JOIN applicationrankings ar ON ta.application_id = ar.application_id
        LEFT JOIN courses c ON ar.course_id = c.course_id
        WHERE ta.user_id = $1 
        AND ta.application_id = (
            SELECT application_id 
            FROM ta_applications 
            WHERE user_id = $1 
            ORDER BY submitted_at DESC 
            LIMIT 1
        )
        GROUP BY ta.application_id, u.name, u.email, u.major, u.student_number,
                 sp.overall_gpa, sp.expected_graduation, sp.relevant_coursework, 
                 sp.technical_skills, sp.teaching_experience, sp.weekly_availability, sp.transcript_url
        ORDER BY ta.submitted_at DESC
        `;

    const result = await this.db.query(query, [userId]);
    if (result.rows.length === 0) {
      return null;
    }
    // Parse domain_areas for each application
    const application = result.rows[0] as any;
    // Map profile fields back to expected names
    if (application.profile_overall_gpa !== undefined)
      application.overall_gpa = application.profile_overall_gpa;
    if (application.profile_expected_graduation !== undefined)
      application.expected_graduation = application.profile_expected_graduation;
    if (application.profile_relevant_coursework !== undefined)
      application.relevant_coursework =
        application.profile_relevant_coursework;
    if (application.profile_technical_skills !== undefined)
      application.technical_skills = application.profile_technical_skills;
    if (application.profile_teaching_experience !== undefined)
      application.teaching_experience =
        application.profile_teaching_experience;
    if (application.profile_weekly_availability !== undefined)
      application.weekly_availability =
        application.profile_weekly_availability;
    if (application.profile_transcript_url !== undefined)
      application.transcript_url = application.profile_transcript_url;

    if (
      application.domain_areas &&
      typeof application.domain_areas === "string"
    ) {
      try {
        application.domain_areas = JSON.parse(application.domain_areas);
      } catch (e) {
        console.error("Error parsing domain_areas:", e);
        application.domain_areas = [];
      }
    }
    return application as TAApplicationDetail;
  }

  async deleteCourseRankings(applicationId: number): Promise<boolean> {
    const query = `DELETE FROM applicationrankings WHERE application_id = $1`;
    const result = await this.db.query(query, [applicationId]);
    return result.rowCount > 0;
  }

  async getApplicationsByUser(userId: number): Promise<TAApplicationDetail[]> {
    // Return only the latest application for the user to show as "current/updated" application
    const query = `
        SELECT
            ta.*,
            u.name as applicant_name,
            u.email as applicant_email,
            u.major,
            u.student_number,
            sp.overall_gpa as profile_overall_gpa,
            sp.expected_graduation as profile_expected_graduation,
            sp.relevant_coursework as profile_relevant_coursework,
            sp.technical_skills as profile_technical_skills,
            sp.teaching_experience as profile_teaching_experience,
            sp.weekly_availability as profile_weekly_availability,
            sp.transcript_url as profile_transcript_url,
            json_agg(
                json_build_object(
                    'course_id', ar.course_id,
                    'rank', ar.rank,
                    'course_code', c.code,
                    'course_title', c.title,
                    'term', c.term
                ) ORDER BY ar.rank
            ) as course_preferences
        FROM ta_applications ta
        JOIN users u ON ta.user_id = u.user_id
        LEFT JOIN student_profiles sp ON ta.user_id = sp.user_id
        LEFT JOIN applicationrankings ar ON ta.application_id = ar.application_id
        LEFT JOIN courses c ON ar.course_id = c.course_id
        WHERE ta.user_id = $1 
        AND ta.application_id = (
            SELECT application_id 
            FROM ta_applications 
            WHERE user_id = $1 
            ORDER BY submitted_at DESC 
            LIMIT 1
        )
        GROUP BY ta.application_id, u.name, u.email, u.major, u.student_number,
                 sp.overall_gpa, sp.expected_graduation, sp.relevant_coursework, 
                 sp.technical_skills, sp.teaching_experience, sp.weekly_availability, sp.transcript_url
        ORDER BY ta.submitted_at DESC
        `;

    const result = await this.db.query(query, [userId]);
    // Parse domain_areas for each application
    return result.rows.map((app: any) => {
      // Map profile fields back to expected names
      if (app.profile_overall_gpa !== undefined)
        app.overall_gpa = app.profile_overall_gpa;
      if (app.profile_expected_graduation !== undefined)
        app.expected_graduation = app.profile_expected_graduation;
      if (app.profile_relevant_coursework !== undefined)
        app.relevant_coursework = app.profile_relevant_coursework;
      if (app.profile_technical_skills !== undefined)
        app.technical_skills = app.profile_technical_skills;
      if (app.profile_teaching_experience !== undefined)
        app.teaching_experience = app.profile_teaching_experience;
      if (app.profile_weekly_availability !== undefined)
        app.weekly_availability = app.profile_weekly_availability;
      if (app.profile_transcript_url !== undefined)
        app.transcript_url = app.profile_transcript_url;

      if (app.domain_areas && typeof app.domain_areas === "string") {
        try {
          app.domain_areas = JSON.parse(app.domain_areas);
        } catch (e) {
          console.error("Error parsing domain_areas:", e);
          app.domain_areas = [];
        }
      }
      return app;
    }) as TAApplicationDetail[];
  }

  // Get ALL applications by a user (for admin/coordinator views)
  async getAllApplicationsByUser(userId: number): Promise<TAApplicationDetail[]> {
    const query = `
        SELECT
            ta.*,
            u.name as applicant_name,
            u.email as applicant_email,
            u.major,
            u.student_number,
            sp.overall_gpa as profile_overall_gpa,
            sp.expected_graduation as profile_expected_graduation,
            sp.relevant_coursework as profile_relevant_coursework,
            sp.technical_skills as profile_technical_skills,
            sp.teaching_experience as profile_teaching_experience,
            sp.weekly_availability as profile_weekly_availability,
            sp.transcript_url as profile_transcript_url,
            json_agg(
                json_build_object(
                    'course_id', ar.course_id,
                    'rank', ar.rank,
                    'course_code', c.code,
                    'course_title', c.title,
                    'term', c.term
                ) ORDER BY ar.rank
            ) as course_preferences
        FROM ta_applications ta
        JOIN users u ON ta.user_id = u.user_id
        LEFT JOIN student_profiles sp ON ta.user_id = sp.user_id
        LEFT JOIN applicationrankings ar ON ta.application_id = ar.application_id
        LEFT JOIN courses c ON ar.course_id = c.course_id
        WHERE ta.user_id = $1
        GROUP BY ta.application_id, u.name, u.email, u.major, u.student_number,
                 sp.overall_gpa, sp.expected_graduation, sp.relevant_coursework, 
                 sp.technical_skills, sp.teaching_experience, sp.weekly_availability, sp.transcript_url
        ORDER BY ta.submitted_at DESC
        `;

    const result = await this.db.query(query, [userId]);
    // Parse domain_areas for each application
    return result.rows.map((app: any) => {
      // Map profile fields back to expected names
      if (app.profile_overall_gpa !== undefined)
        app.overall_gpa = app.profile_overall_gpa;
      if (app.profile_expected_graduation !== undefined)
        app.expected_graduation = app.profile_expected_graduation;
      if (app.profile_relevant_coursework !== undefined)
        app.relevant_coursework = app.profile_relevant_coursework;
      if (app.profile_technical_skills !== undefined)
        app.technical_skills = app.profile_technical_skills;
      if (app.profile_teaching_experience !== undefined)
        app.teaching_experience = app.profile_teaching_experience;
      if (app.profile_weekly_availability !== undefined)
        app.weekly_availability = app.profile_weekly_availability;
      if (app.profile_transcript_url !== undefined)
        app.transcript_url = app.profile_transcript_url;

      if (app.domain_areas && typeof app.domain_areas === "string") {
        try {
          app.domain_areas = JSON.parse(app.domain_areas);
        } catch (e) {
          console.error("Error parsing domain_areas:", e);
          app.domain_areas = [];
        }
      }
      return app;
    }) as TAApplicationDetail[];
  }

  async getApplicationsForCourse(courseId: number): Promise<any[]> {
    const query = `
        SELECT
            ta.*,
            u.name as applicant_name,
            u.email as applicant_email,
            u.major,
            up.bio,
            up.resume_url,
            ar.rank
        FROM ta_applications ta
        JOIN users u ON ta.user_id = u.user_id
        LEFT JOIN user_profiles up ON u.user_id = up.user_id
        JOIN applicationrankings ar ON ta.application_id = ar.application_id
        WHERE ar.course_id = $1
        ORDER BY ar.rank, ta.submitted_at
        `;

    const result = await this.db.query(query, [courseId]);
    return result.rows;
  }

  async updateApplication(
    applicationId: number,
    updates: Partial<TAApplication>
  ): Promise<TAApplication | null> {
    const fields = Object.keys(updates).filter(
      (key) => key !== "application_id"
    );

    if (fields.length === 0) {
      return null;
    }

    // Handle domain_areas JSON conversion
    if (updates.domain_areas && Array.isArray(updates.domain_areas)) {
      (updates as any).domain_areas = JSON.stringify(updates.domain_areas);
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 2}`)
      .join(", ");

    const query = `
        UPDATE ta_applications
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE application_id = $1
        RETURNING *
        `;

    const values = [
      applicationId,
      ...fields.map((field) => (updates as any)[field]),
    ];
    const result = await this.db.query<TAApplication>(query, values);

    return result.rows[0] || null;
  }

  async deleteApplication(applicationId: number): Promise<boolean> {
    const query = `DELETE FROM ta_applications WHERE application_id = $1`;
    const result = await this.db.query(query, [applicationId]);
    return result.rowCount > 0;
  }

  // Add this method to handle checking for existing course rankings
  async getCourseRanking(
    applicationId: number,
    courseId: number
  ): Promise<any | null> {
    const query = `
          SELECT * FROM applicationrankings 
          WHERE application_id = $1 AND course_id = $2
      `;
    const result = await this.db.query(query, [applicationId, courseId]);
    return result.rows[0] || null;
  }

  // Add this method to handle updating existing course rankings
  async updateCourseRanking(ranking: {
    application_id: number;
    course_id: number;
    rank: number;
  }): Promise<any> {
    const query = `
          UPDATE applicationrankings 
          SET rank = $3, updated_at = NOW()
          WHERE application_id = $1 AND course_id = $2
          RETURNING *
      `;
    const result = await this.db.query(query, [
      ranking.application_id,
      ranking.course_id,
      ranking.rank,
    ]);
    return result.rows[0];
  }

  // Add this method if it doesn't exist - for getting domain areas
  async getDomainAreas(): Promise<any[]> {
    const query = `
          SELECT id, name, description, created_at 
          FROM domain_areas 
          ORDER BY name ASC
      `;
    const result = await this.db.query(query);
    return result.rows;
  }

  // NEW: Get all applications with details for TA coordinator
  async getAllApplicationsWithDetails(): Promise<TAApplicationDetail[]> {
    const query = `
        WITH latest_applications_per_student AS (
            SELECT DISTINCT ON (user_id) 
                application_id,
                user_id,
                submitted_at,
                updated_at,
                status,
                notes,
                domain_areas,
                application_type,
                term_availability
            FROM ta_applications 
            ORDER BY user_id, submitted_at DESC
        )
        SELECT
            la.*,
            u.name as applicant_name,
            u.email as applicant_email,
            u.major,
            u.student_number,
            sp.overall_gpa as profile_overall_gpa,
            sp.expected_graduation as profile_expected_graduation,
            sp.relevant_coursework as profile_relevant_coursework,
            sp.technical_skills as profile_technical_skills,
            sp.teaching_experience as profile_teaching_experience,
            sp.weekly_availability as profile_weekly_availability,
            sp.transcript_url as profile_transcript_url,
            json_agg(
                json_build_object(
                    'course_id', ar.course_id,
                    'rank', ar.rank,
                    'course_code', c.code,
                    'course_title', c.title,
                    'term', c.term
                ) ORDER BY ar.rank
            ) FILTER (WHERE ar.course_id IS NOT NULL) as course_preferences
        FROM latest_applications_per_student la
        JOIN users u ON la.user_id = u.user_id
        LEFT JOIN student_profiles sp ON la.user_id = sp.user_id
        LEFT JOIN applicationrankings ar ON la.application_id = ar.application_id
        LEFT JOIN courses c ON ar.course_id = c.course_id
        GROUP BY la.application_id, la.user_id, la.submitted_at, la.updated_at, la.status, la.notes, 
                 la.domain_areas, la.application_type, la.term_availability,
                 u.name, u.email, u.major, u.student_number, 
                 sp.overall_gpa, sp.expected_graduation, sp.relevant_coursework, 
                 sp.technical_skills, sp.teaching_experience, sp.weekly_availability, sp.transcript_url
        ORDER BY la.submitted_at DESC
        `;

    const result = await this.db.query(query);
    return result.rows.map((app) => {
      // Map profile fields back to expected names
      if (app.profile_overall_gpa !== undefined)
        app.overall_gpa = app.profile_overall_gpa;
      if (app.profile_expected_graduation !== undefined)
        app.expected_graduation = app.profile_expected_graduation;
      if (app.profile_relevant_coursework !== undefined)
        app.relevant_coursework = app.profile_relevant_coursework;
      if (app.profile_technical_skills !== undefined)
        app.technical_skills = app.profile_technical_skills;
      if (app.profile_teaching_experience !== undefined)
        app.teaching_experience = app.profile_teaching_experience;
      if (app.profile_weekly_availability !== undefined)
        app.weekly_availability = app.profile_weekly_availability;
      if (app.profile_transcript_url !== undefined)
        app.transcript_url = app.profile_transcript_url;

      if (app.domain_areas && typeof app.domain_areas === "string") {
        try {
          app.domain_areas = JSON.parse(app.domain_areas);
        } catch (e) {
          console.error("Error parsing domain_areas:", e);
          app.domain_areas = [];
        }
      }
      return app;
    }) as TAApplicationDetail[];
  }

  // NEW: Get application statistics for TA coordinator
  async getApplicationStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    allocated: number;
  }> {
    const query = `
        WITH latest_applications_per_student AS (
            SELECT DISTINCT ON (user_id) 
                application_id,
                user_id,
                status
            FROM ta_applications 
            ORDER BY user_id, submitted_at DESC
        )
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'approved') as approved,
            COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
            COUNT(*) FILTER (WHERE status = 'allocated') as allocated
        FROM latest_applications_per_student
        `;

    const result = await this.db.query(query);
    const row = result.rows[0] as any;

    return {
      total: parseInt(row.total?.toString() || "0") || 0,
      pending: parseInt(row.pending?.toString() || "0") || 0,
      approved: parseInt(row.approved?.toString() || "0") || 0,
      rejected: parseInt(row.rejected?.toString() || "0") || 0,
      allocated: parseInt(row.allocated?.toString() || "0") || 0,
    };
  }

  // NEW: Get applications by status for TA coordinator
  async getApplicationsByStatus(
    status: "pending" | "approved" | "rejected"
  ): Promise<TAApplicationDetail[]> {
    const query = `
        WITH latest_applications_per_student AS (
            SELECT DISTINCT ON (user_id) 
                application_id,
                user_id,
                submitted_at,
                updated_at,
                status,
                notes,
                domain_areas,
                application_type,
                term_availability
            FROM ta_applications 
            WHERE status = $1
            ORDER BY user_id, submitted_at DESC
        )
        SELECT
            la.*,
            u.name as applicant_name,
            u.email as applicant_email,
            u.major,
            u.student_number,
            sp.overall_gpa as profile_overall_gpa,
            sp.expected_graduation as profile_expected_graduation,
            sp.relevant_coursework as profile_relevant_coursework,
            sp.technical_skills as profile_technical_skills,
            sp.teaching_experience as profile_teaching_experience,
            sp.weekly_availability as profile_weekly_availability,
            sp.transcript_url as profile_transcript_url,
            json_agg(
                json_build_object(
                    'course_id', ar.course_id,
                    'rank', ar.rank,
                    'course_code', c.code,
                    'course_title', c.title,
                    'term', c.term
                ) ORDER BY ar.rank
            ) as course_preferences
        FROM latest_applications_per_student la
        JOIN users u ON la.user_id = u.user_id
        LEFT JOIN student_profiles sp ON la.user_id = sp.user_id
        LEFT JOIN applicationrankings ar ON la.application_id = ar.application_id
        LEFT JOIN courses c ON ar.course_id = c.course_id
        GROUP BY la.application_id, la.user_id, la.submitted_at, la.updated_at, la.status, la.notes, 
                 la.domain_areas, la.application_type, la.term_availability,
                 u.name, u.email, u.major, u.student_number,
                 sp.overall_gpa, sp.expected_graduation, sp.relevant_coursework, 
                 sp.technical_skills, sp.teaching_experience, sp.weekly_availability, sp.transcript_url
        ORDER BY la.submitted_at DESC
        `;

    const result = await this.db.query(query, [status]);
    return result.rows.map((app) => {
      // Map profile fields back to expected names
      if (app.profile_overall_gpa !== undefined)
        app.overall_gpa = app.profile_overall_gpa;
      if (app.profile_expected_graduation !== undefined)
        app.expected_graduation = app.profile_expected_graduation;
      if (app.profile_relevant_coursework !== undefined)
        app.relevant_coursework = app.profile_relevant_coursework;
      if (app.profile_technical_skills !== undefined)
        app.technical_skills = app.profile_technical_skills;
      if (app.profile_teaching_experience !== undefined)
        app.teaching_experience = app.profile_teaching_experience;
      if (app.profile_weekly_availability !== undefined)
        app.weekly_availability = app.profile_weekly_availability;
      if (app.profile_transcript_url !== undefined)
        app.transcript_url = app.profile_transcript_url;

      if (app.domain_areas && typeof app.domain_areas === "string") {
        try {
          app.domain_areas = JSON.parse(app.domain_areas);
        } catch (e) {
          console.error("Error parsing domain_areas:", e);
          app.domain_areas = [];
        }
      }
      return app;
    }) as TAApplicationDetail[];
  }

  // NEW: Update application status for TA coordinator
  async updateApplicationStatus(
    applicationId: number,
    status: "pending" | "approved" | "rejected" | "allocated",
    notes?: string,
    actorId?: number,
    actorEmail?: string,
    ip_address?: string,
    user_agent?: string
  ): Promise<TAApplication | null> {
    // Get current application details for audit logging
    const currentQuery = `
      SELECT 
          ta.*,
          u.email as student_email,
          u.name as student_name
      FROM ta_applications ta
      JOIN users u ON ta.user_id = u.user_id
      WHERE ta.application_id = $1
      `;

    const currentResult = await this.db.query(currentQuery, [applicationId]);
    if (currentResult.rows.length === 0) {
      return null;
    }

    const currentApplication = currentResult.rows[0] as any;

    const updates: any = { status };
    if (notes !== undefined) {
      updates.notes = notes;
    }

    const fields = Object.keys(updates);
    const setClause = fields
      .map((field, index) => `${field} = $${index + 2}`)
      .join(", ");

    const query = `
      UPDATE ta_applications
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE application_id = $1
      RETURNING *
      `;

    const values = [applicationId, ...fields.map((field) => updates[field])];
    const result = await this.db.query<TAApplication>(query, values);

    const updatedApplication = result.rows[0];

    // Log the application status change with detailed information
    if (updatedApplication && actorId && actorEmail) {
      try {
        const previous_values = {
          status: currentApplication.status,
          notes: currentApplication.notes,
        };

        const new_values = {
          status: updatedApplication.status,
          notes: updatedApplication.notes,
        };

        await this.auditLogger.logApplicationEdit(
          "STATUS_CHANGE",
          actorId,
          actorEmail,
          applicationId,
          currentApplication.user_id,
          currentApplication.student_email,
          previous_values,
          new_values,
          `Status changed from ${previous_values.status} to ${new_values.status}`
        );
      } catch (auditError) {
        console.error(
          "Failed to log application status change audit:",
          auditError
        );
        // Don't fail the operation if audit logging fails
      }
    }

    return updatedApplication || null;
  }

  // Get applications for a specific TA need (course + requirements)
  async getApplicationsByTANeed(needId: number): Promise<TAApplicationDetail[]> {
    const query = `
        SELECT
            ta.*,
            u.name as applicant_name,
            u.email as applicant_email,
            u.major,
            u.student_number,
            u.gpa,
            sp.overall_gpa as profile_overall_gpa,
            sp.expected_graduation as profile_expected_graduation,
            sp.relevant_coursework as profile_relevant_coursework,
            sp.technical_skills as profile_technical_skills,
            sp.teaching_experience as profile_teaching_experience,
            sp.weekly_availability as profile_weekly_availability,
            tn.course_id,
            c.code as course_code,
            c.title as course_title,
            c.term as course_term
        FROM ta_applications ta
        JOIN users u ON ta.user_id = u.user_id
        LEFT JOIN student_profiles sp ON ta.user_id = sp.user_id
        JOIN applicationrankings ar ON ta.application_id = ar.application_id
        JOIN ta_needs tn ON ar.course_id = tn.course_id
        JOIN courses c ON tn.course_id = c.course_id
        WHERE tn.need_id = $1
        ORDER BY ta.submitted_at DESC
        `;

    const result = await this.db.query(query, [needId]);
    
    return result.rows.map((app: Record<string, unknown>) => {
      // Handle domain_areas parsing
      if (app.domain_areas && typeof app.domain_areas === "string") {
        try {
          app.domain_areas = JSON.parse(app.domain_areas);
        } catch (e) {
          console.error("Error parsing domain_areas:", e);
          app.domain_areas = [];
        }
      }
      
      // Map profile fields back to expected names
      if (app.profile_overall_gpa !== undefined) app.overall_gpa = app.profile_overall_gpa;
      if (app.profile_expected_graduation !== undefined) app.expected_graduation = app.profile_expected_graduation;
      if (app.profile_relevant_coursework !== undefined) app.relevant_coursework = app.profile_relevant_coursework;
      if (app.profile_technical_skills !== undefined) app.technical_skills = app.profile_technical_skills;
      if (app.profile_teaching_experience !== undefined) app.teaching_experience = app.profile_teaching_experience;
      if (app.profile_weekly_availability !== undefined) app.weekly_availability = app.profile_weekly_availability;
      
      return app;
    }) as TAApplicationDetail[];
  }

  // Update shortlist status for multiple applications
  async updateShortlistStatus(applicationIds: number[], isShortlisted: boolean): Promise<number> {
    if (applicationIds.length === 0) return 0;
    
    const status = isShortlisted ? 'shortlisted' : 'pending';
    const placeholders = applicationIds.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
        UPDATE ta_applications 
        SET status = '${status}', updated_at = NOW()
        WHERE application_id IN (${placeholders})
        RETURNING application_id
        `;

    const result = await this.db.query(query, applicationIds);
    return result.rows.length;
  }

  // Get shortlisted applications for a TA need
  async getShortlistedApplications(needId: number): Promise<TAApplicationDetail[]> {
    const query = `
        SELECT
            ta.*,
            u.name as applicant_name,
            u.email as applicant_email,
            u.major,
            u.student_number,
            u.gpa,
            sp.overall_gpa as profile_overall_gpa,
            sp.expected_graduation as profile_expected_graduation,
            sp.relevant_coursework as profile_relevant_coursework,
            sp.technical_skills as profile_technical_skills,
            sp.teaching_experience as profile_teaching_experience,
            sp.weekly_availability as profile_weekly_availability
        FROM ta_applications ta
        JOIN users u ON ta.user_id = u.user_id
        LEFT JOIN student_profiles sp ON ta.user_id = sp.user_id
        JOIN applicationrankings ar ON ta.application_id = ar.application_id
        JOIN ta_needs tn ON ar.course_id = tn.course_id
        WHERE tn.need_id = $1 AND ta.status = 'shortlisted'
        ORDER BY ta.submitted_at DESC
        `;

    const result = await this.db.query(query, [needId]);
    
    return result.rows.map((app: Record<string, unknown>) => {
      // Handle domain_areas parsing
      if (app.domain_areas && typeof app.domain_areas === "string") {
        try {
          app.domain_areas = JSON.parse(app.domain_areas);
        } catch (e) {
          console.error("Error parsing domain_areas:", e);
          app.domain_areas = [];
        }
      }
      
      // Map profile fields back to expected names
      if (app.profile_overall_gpa !== undefined) app.overall_gpa = app.profile_overall_gpa;
      if (app.profile_expected_graduation !== undefined) app.expected_graduation = app.profile_expected_graduation;
      if (app.profile_relevant_coursework !== undefined) app.relevant_coursework = app.profile_relevant_coursework;
      if (app.profile_technical_skills !== undefined) app.technical_skills = app.profile_technical_skills;
      if (app.profile_teaching_experience !== undefined) app.teaching_experience = app.profile_teaching_experience;
      if (app.profile_weekly_availability !== undefined) app.weekly_availability = app.profile_weekly_availability;
      
      return app;
    }) as TAApplicationDetail[];
  }
}
