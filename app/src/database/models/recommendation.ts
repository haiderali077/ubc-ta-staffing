import { Database } from "../config.ts";

// ========== INTERFACES ==========

export interface CourseCompletion {
  completion_id?: number;
  user_id: number;
  course_code: string;
  course_title?: string;
  grade_percentage: number; // UBC uses 0-100 percentage grades
  credits?: number;
  term_taken?: string;
  year_taken?: number;
  grade_letter?: string; // Calculated from percentage (A, B+, etc.)
  course_level?: number; // e.g., CPSC 110 -> 100, CPSC 310 -> 300
  is_verified?: boolean;
  source?: "transcript" | "manual";
}

export interface CourseRequirements {
  requirement_id?: number;
  course_id: number;
  prerequisite_courses?: string[];
  minimum_grade_percentage?: number;
  recommended_courses?: string[];
  recommended_grade_percentage?: number;
  required_skills?: string[];
  preferred_skills?: string[];
  minimum_year_of_study?: number;
  prefer_previous_ta_experience?: boolean;
  minimum_overall_gpa?: number;
  notes?: string;
}

export interface TACandidate {
  user_id: number;
  name: string;
  email: string;
  student_number?: string;
  major?: string;
  overall_gpa?: number;
  year_of_study?: number;
  technical_skills?: string[];
  teaching_experience?: string;
  relevant_coursework?: string;

  // Calculated fields
  completed_courses?: CourseCompletion[];
  skills_match_percentage?: number;
  coursework_match_percentage?: number;
  experience_level?: "beginner" | "intermediate" | "advanced";
  previous_ta_assignments?: any[];
  recommendation_score?: number;
  avg_performance_rating?: number;
  would_rehire_percentage?: number;
  total_evaluations?: number;
}

export interface RecommendationFilters {
  // Basic filters
  min_gpa?: number;
  max_gpa?: number;
  major?: string[];
  year_of_study?: number[];

  // Skills filters
  required_skills?: string[];
  preferred_skills?: string[];
  min_skills_match?: number; // percentage

  // Course completion filters
  required_courses?: string[];
  minimum_grade_in_courses?: number; // percentage
  recommended_courses?: string[];
  min_coursework_match?: number; // percentage

  // Experience filters
  min_experience_level?: "beginner" | "intermediate" | "advanced";
  has_previous_ta_experience?: boolean;

  // Application status
  application_status?: string[];

  // Match score filters
  min_overall_score?: number;
}

export interface UserSkill {
  user_id: number;
  skill_id: number;
  skill_name?: string;
  proficiency_level?: number;
  years_experience?: number;
  last_used?: Date;
  verified?: boolean;
}

export interface TAPerformance {
  performance_id?: number;
  allocation_id?: number;
  course_id?: number;
  user_id: number;
  term: string;
  instructor_rating?: number;
  student_feedback_score?: number;
  attendance_rate?: number;
  tasks_completed?: number;
  tasks_assigned?: number;
  strengths?: string;
  areas_for_improvement?: string;
  would_rehire?: boolean;
  notes?: string;
}

export interface TranscriptCourse {
  course_code: string;
  course_title?: string;
  grade_percentage: number;
  grade_letter?: string;
  credits?: number;
  term: string;
  year: number;
}

// ========== MAIN CLASS ==========

export class TARecommendationModel {
  constructor(private db: Database) {}

  // ========== EXISTING METHODS ==========

  // FIXED: Get TA candidates for a course with filtering - NO MORE JSON EQUALITY ISSUES
  async getTACandidatesForCourse(
    courseId: number,
    filters: RecommendationFilters = {}
  ): Promise<TACandidate[]> {
    // STEP 1: Get basic student information WITHOUT JSON aggregation
    let query = `
      SELECT DISTINCT
        u.user_id, u.name, u.email, u.student_number, u.major,
        sp.overall_gpa, sp.year_of_study, sp.technical_skills,
        sp.teaching_experience, sp.relevant_coursework
      FROM users u
      LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
      LEFT JOIN ta_applications ta ON u.user_id = ta.user_id
      WHERE u.role = 'student' AND u.is_active = true
    `;

    const queryParams: any[] = [];
    const whereConditions: string[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filters.min_gpa !== undefined) {
      whereConditions.push(`sp.overall_gpa >= $${paramIndex}`);
      queryParams.push(filters.min_gpa);
      paramIndex++;
    }

    if (filters.max_gpa !== undefined) {
      whereConditions.push(`sp.overall_gpa <= $${paramIndex}`);
      queryParams.push(filters.max_gpa);
      paramIndex++;
    }

    if (filters.major && filters.major.length > 0) {
      whereConditions.push(`u.major = ANY($${paramIndex})`);
      queryParams.push(filters.major);
      paramIndex++;
    }

    if (filters.year_of_study && filters.year_of_study.length > 0) {
      whereConditions.push(`sp.year_of_study = ANY($${paramIndex})`);
      queryParams.push(filters.year_of_study);
      paramIndex++;
    }

    if (filters.application_status && filters.application_status.length > 0) {
      whereConditions.push(`ta.status = ANY($${paramIndex})`);
      queryParams.push(filters.application_status);
      paramIndex++;
    }

    // Add WHERE conditions to query
    if (whereConditions.length > 0) {
      query += ` AND (${whereConditions.join(" AND ")})`;
    }

    query += ` ORDER BY sp.overall_gpa DESC NULLS LAST, sp.year_of_study DESC NULLS LAST`;

    try {
      const result = await this.db.query(query, queryParams);
      let candidates = result.rows as TACandidate[];

      // STEP 2: Get additional data for each candidate in separate queries
      // This avoids the JSON aggregation equality operator issue
      for (const candidate of candidates) {
        try {
          // Get completed courses - separate simple query
          const completedCoursesQuery = `
            SELECT 
              course_code, course_title, grade_percentage, 
              credits, term_taken, year_taken, grade_letter,
              course_level, is_verified, source
            FROM student_course_completions 
            WHERE user_id = $1
            ORDER BY year_taken DESC, term_taken
          `;
          const completedResult = await this.db.query(completedCoursesQuery, [
            candidate.user_id,
          ]);
          candidate.completed_courses =
            completedResult.rows as CourseCompletion[];

          // Get previous TA assignments - separate simple query
          const taAssignmentsQuery = `
            SELECT 
              c.code as course_code,
              c.title as course_title,
              c.term
            FROM ta_allocations ta
            JOIN lab_sections ls ON ta.lab_section_id = ls.lab_section_id
            JOIN courses c ON ls.course_id = c.course_id
            WHERE ta.user_id = $1
            ORDER BY c.term DESC
          `;
          const taResult = await this.db.query(taAssignmentsQuery, [
            candidate.user_id,
          ]);
          candidate.previous_ta_assignments = taResult.rows;
        } catch (error) {
          console.error(
            `Error getting additional data for candidate ${candidate.user_id}:`,
            error
          );
          // Set safe defaults if queries fail
          candidate.completed_courses = [];
          candidate.previous_ta_assignments = [];
        }
      }

      // STEP 3: Apply advanced filters that require processing
      candidates = this.applyAdvancedFilters(candidates, filters);

      return candidates;
    } catch (error) {
      console.error("Error in getTACandidatesForCourse:", error);
      throw new Error(`Failed to fetch TA candidates: ${error.message}`);
    }
  }

  private applyAdvancedFilters(
    candidates: TACandidate[],
    filters: RecommendationFilters
  ): TACandidate[] {
    return candidates
      .filter((candidate) => {
        // Skills filtering
        if (filters.required_skills && filters.required_skills.length > 0) {
          const candidateSkills = this.parseSkills(candidate.technical_skills);
          const hasRequiredSkills = filters.required_skills.every((skill) =>
            candidateSkills.some((cs) =>
              cs.toLowerCase().includes(skill.toLowerCase())
            )
          );
          if (!hasRequiredSkills) return false;
        }

        // Course completion filtering
        if (filters.required_courses && filters.required_courses.length > 0) {
          const completed = candidate.completed_courses || [];
          const hasRequiredCourses = filters.required_courses.every(
            (reqCourse) => {
              return completed.some(
                (comp) =>
                  comp.course_code.toLowerCase() === reqCourse.toLowerCase() &&
                  comp.grade_percentage >=
                    (filters.minimum_grade_in_courses || 50)
              );
            }
          );
          if (!hasRequiredCourses) return false;
        }

        // Experience level filtering
        if (filters.min_experience_level) {
          const level = this.determineExperienceLevel(candidate);
          const levelValue = this.experienceLevelToNumber(level);
          const minLevelValue = this.experienceLevelToNumber(
            filters.min_experience_level
          );
          if (levelValue < minLevelValue) return false;
        }

        // TA experience filtering
        if (filters.has_previous_ta_experience === true) {
          const hasExperience =
            candidate.previous_ta_assignments &&
            candidate.previous_ta_assignments.length > 0;
          if (!hasExperience) return false;
        } else if (filters.has_previous_ta_experience === false) {
          const hasExperience =
            candidate.previous_ta_assignments &&
            candidate.previous_ta_assignments.length > 0;
          if (hasExperience) return false;
        }

        return true;
      })
      .map((candidate) => {
        // Calculate match percentages
        candidate.skills_match_percentage = this.calculateSkillsMatchPercentage(
          candidate,
          filters
        );
        candidate.coursework_match_percentage =
          this.calculateCourseworkMatchPercentage(candidate, filters);
        candidate.experience_level = this.determineExperienceLevel(candidate);
        candidate.recommendation_score = this.calculateRecommendationScore(
          candidate,
          filters
        );

        return candidate;
      });
  }

  private parseSkills(skillsString?: string): string[] {
    if (!skillsString) return [];
    return skillsString
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  private calculateSkillsMatchPercentage(
    candidate: TACandidate,
    filters: RecommendationFilters
  ): number {
    const candidateSkills = this.parseSkills(candidate.technical_skills);
    if (candidateSkills.length === 0) return 0;

    const allRequiredSkills = [
      ...(filters.required_skills || []),
      ...(filters.preferred_skills || []),
    ];

    if (allRequiredSkills.length === 0) return 100;

    const matchedSkills = allRequiredSkills.filter((reqSkill) =>
      candidateSkills.some(
        (candidateSkill) =>
          candidateSkill.toLowerCase().includes(reqSkill.toLowerCase()) ||
          reqSkill.toLowerCase().includes(candidateSkill.toLowerCase())
      )
    );

    return Math.round((matchedSkills.length / allRequiredSkills.length) * 100);
  }

  private calculateCourseworkMatchPercentage(
    candidate: TACandidate,
    filters: RecommendationFilters
  ): number {
    const completed = candidate.completed_courses || [];
    if (completed.length === 0) return 0;

    const allRequiredCourses = [
      ...(filters.required_courses || []),
      ...(filters.recommended_courses || []),
    ];

    if (allRequiredCourses.length === 0) return 100;

    const matchedCourses = allRequiredCourses.filter((reqCourse) =>
      completed.some(
        (comp) =>
          comp.course_code.toLowerCase() === reqCourse.toLowerCase() &&
          comp.grade_percentage >= (filters.minimum_grade_in_courses || 50)
      )
    );

    return Math.round(
      (matchedCourses.length / allRequiredCourses.length) * 100
    );
  }

  private determineExperienceLevel(
    candidate: TACandidate
  ): "beginner" | "intermediate" | "advanced" {
    const yearOfStudy = candidate.year_of_study || 1;
    const hasTA =
      candidate.previous_ta_assignments &&
      candidate.previous_ta_assignments.length > 0;
    const gpa = candidate.overall_gpa || 0;

    if (yearOfStudy >= 4 && hasTA && gpa >= 3.5) {
      return "advanced";
    } else if (yearOfStudy >= 3 || hasTA || gpa >= 3.0) {
      return "intermediate";
    } else {
      return "beginner";
    }
  }

  private experienceLevelToNumber(
    level: "beginner" | "intermediate" | "advanced"
  ): number {
    switch (level) {
      case "beginner":
        return 1;
      case "intermediate":
        return 2;
      case "advanced":
        return 3;
      default:
        return 1;
    }
  }

  private calculateRecommendationScore(
    candidate: TACandidate,
    filters: RecommendationFilters
  ): number {
    const skillsWeight = 30;
    const courseworkWeight = 40;
    const experienceWeight = 20;
    const maturityWeight = 10; // NEW: Academic maturity based on course levels and grades

    const skillsScore = candidate.skills_match_percentage || 0;
    const courseworkScore = candidate.coursework_match_percentage || 0;
    const experienceScore =
      this.experienceLevelToNumber(candidate.experience_level || "beginner") *
      33.33;
    const maturityScore = this.calculateAcademicMaturityScore(candidate);

    return Math.round(
      (skillsScore * skillsWeight) / 100 +
        (courseworkScore * courseworkWeight) / 100 +
        (experienceScore * experienceWeight) / 100 +
        (maturityScore * maturityWeight) / 100
    );
  }

  // Get course requirements for a specific course
  async getCourseRequirements(
    courseId: number
  ): Promise<CourseRequirements | null> {
    const query = `
      SELECT * FROM course_ta_requirements 
      WHERE course_id = $1
    `;

    const result = await this.db.query<CourseRequirements>(query, [courseId]);
    return result.rows[0] || null;
  }

  // Create or update course requirements
  async setCourseRequirements(
    requirements: Omit<CourseRequirements, "requirement_id">
  ): Promise<CourseRequirements> {
    const existing = await this.getCourseRequirements(requirements.course_id);

    if (existing) {
      // Update existing
      const query = `
        UPDATE course_ta_requirements SET
          prerequisite_courses = $2,
          minimum_grade_percentage = $3,
          recommended_courses = $4,
          recommended_grade_percentage = $5,
          required_skills = $6,
          preferred_skills = $7,
          minimum_year_of_study = $8,
          prefer_previous_ta_experience = $9,
          minimum_overall_gpa = $10,
          notes = $11,
          updated_at = CURRENT_TIMESTAMP
        WHERE course_id = $1
        RETURNING *
      `;

      const result = await this.db.query<CourseRequirements>(query, [
        requirements.course_id,
        requirements.prerequisite_courses,
        requirements.minimum_grade_percentage,
        requirements.recommended_courses,
        requirements.recommended_grade_percentage,
        requirements.required_skills,
        requirements.preferred_skills,
        requirements.minimum_year_of_study,
        requirements.prefer_previous_ta_experience,
        requirements.minimum_overall_gpa,
        requirements.notes,
      ]);

      return result.rows[0];
    } else {
      // Create new
      const query = `
        INSERT INTO course_ta_requirements (
          course_id, prerequisite_courses, minimum_grade_percentage,
          recommended_courses, recommended_grade_percentage,
          required_skills, preferred_skills, minimum_year_of_study,
          prefer_previous_ta_experience, minimum_overall_gpa, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const result = await this.db.query<CourseRequirements>(query, [
        requirements.course_id,
        requirements.prerequisite_courses,
        requirements.minimum_grade_percentage,
        requirements.recommended_courses,
        requirements.recommended_grade_percentage,
        requirements.required_skills,
        requirements.preferred_skills,
        requirements.minimum_year_of_study,
        requirements.prefer_previous_ta_experience,
        requirements.minimum_overall_gpa,
        requirements.notes,
      ]);

      return result.rows[0];
    }
  }

  // Add course completion record with automatic course level extraction
  async addCourseCompletion(
    completion: Omit<CourseCompletion, "completion_id">
  ): Promise<CourseCompletion> {
    // Extract course level from course code (e.g., CPSC 110 -> 100, CPSC 310 -> 300)
    const courseLevel = this.extractCourseLevel(completion.course_code);

    const query = `
      INSERT INTO student_course_completions (
        user_id, course_code, course_title, grade_percentage,
        credits, term_taken, year_taken, grade_letter, course_level, is_verified, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id, course_code, term_taken) 
      DO UPDATE SET
        grade_percentage = EXCLUDED.grade_percentage,
        course_title = EXCLUDED.course_title,
        credits = EXCLUDED.credits,
        year_taken = EXCLUDED.year_taken,
        grade_letter = EXCLUDED.grade_letter,
        course_level = EXCLUDED.course_level,
        is_verified = EXCLUDED.is_verified,
        source = EXCLUDED.source,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await this.db.query<CourseCompletion>(query, [
      completion.user_id,
      completion.course_code,
      completion.course_title,
      completion.grade_percentage,
      completion.credits,
      completion.term_taken,
      completion.year_taken,
      completion.grade_letter,
      courseLevel,
      completion.is_verified,
      completion.source,
    ]);

    return result.rows[0];
  }

  // Extract course level from course code
  private extractCourseLevel(courseCode: string): number {
    const match = courseCode.match(/(\d{3})/); // Extract 3-digit number
    if (match) {
      const courseNum = parseInt(match[1]);
      return Math.floor(courseNum / 100) * 100; // 110 -> 100, 310 -> 300, etc.
    }
    return 100; // Default to 100 level
  }

  // Calculate academic maturity score (higher for advanced courses with good grades)
  private calculateAcademicMaturityScore(candidate: TACandidate): number {
    const completed = candidate.completed_courses || [];
    if (completed.length === 0) return 0;

    // Weight grades by course level and recency
    let totalWeightedScore = 0;
    let totalWeight = 0;

    completed.forEach((course) => {
      const courseLevel =
        course.course_level || this.extractCourseLevel(course.course_code);
      const yearTaken = course.year_taken || 2020;
      const currentYear = new Date().getFullYear();

      // Weight factors:
      const levelWeight = courseLevel / 100; // 300-level = 3x weight of 100-level
      const recencyWeight = Math.max(0.5, 1 - (currentYear - yearTaken) * 0.1); // Recent courses weighted more
      const gradeWeight = course.grade_percentage / 100;

      const weight = levelWeight * recencyWeight;
      totalWeightedScore += gradeWeight * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;
  }

  // Get available skills for filtering UI
  async getAvailableSkills(): Promise<string[]> {
    const query = `
      SELECT DISTINCT skill_name FROM skill_categories 
      ORDER BY skill_name
    `;

    const result = await this.db.query<{ skill_name: string }>(query);
    return result.rows.map((row) => row.skill_name);
  }

  // Get available majors for filtering UI
  async getAvailableMajors(): Promise<string[]> {
    const query = `
      SELECT DISTINCT major FROM users 
      WHERE major IS NOT NULL AND role = 'student'
      ORDER BY major
    `;

    const result = await this.db.query<{ major: string }>(query);
    return result.rows.map((row) => row.major);
  }

  // Get student's completed courses
  async getStudentCompletedCourses(
    userId: number
  ): Promise<CourseCompletion[]> {
    const query = `
      SELECT * FROM student_course_completions 
      WHERE user_id = $1 
      ORDER BY year_taken DESC, term_taken, course_code
    `;

    const result = await this.db.query<CourseCompletion>(query, [userId]);
    return result.rows;
  }

  // ========== BULK IMPORT METHODS ==========

  /**
   * Import transcript data for a user
   * Handles bulk course completion imports
   */
  async importTranscriptData(
    userId: number,
    transcriptData: TranscriptCourse[]
  ): Promise<{
    success: boolean;
    imported: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      success: true,
      imported: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Record import attempt
    const importQuery = `
      INSERT INTO transcript_imports (user_id, courses_imported, import_status, imported_data)
      VALUES ($1, $2, $3, $4)
      RETURNING import_id
    `;

    const importResult = await this.db.query(importQuery, [
      userId,
      transcriptData.length,
      "processing",
      JSON.stringify(transcriptData),
    ]);

    const importId = importResult.rows[0].import_id;

    // Process each course
    for (const course of transcriptData) {
      try {
        await this.addCourseCompletion({
          user_id: userId,
          course_code: course.course_code.toUpperCase().trim(),
          course_title: course.course_title || "",
          grade_percentage: course.grade_percentage,
          grade_letter:
            course.grade_letter ||
            this.percentageToLetter(course.grade_percentage),
          credits: course.credits,
          term_taken: course.term,
          year_taken: course.year,
          is_verified: true, // Mark as verified since from transcript
          source: "transcript",
        });
        results.imported++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to import ${course.course_code}: ${error}`);
        results.success = false;
      }
    }

    // Update import status
    await this.db.query(
      `
      UPDATE transcript_imports 
      SET import_status = $1, courses_imported = $2, error_message = $3
      WHERE import_id = $4
    `,
      [
        results.success ? "completed" : "failed",
        results.imported,
        results.errors.join("; "),
        importId,
      ]
    );

    return results;
  }

  /**
   * Bulk update course completions
   */
  async bulkUpdateCourseCompletions(
    userId: number,
    courses: CourseCompletion[]
  ): Promise<number> {
    let updated = 0;

    for (const course of courses) {
      try {
        await this.addCourseCompletion({
          ...course,
          user_id: userId,
        });
        updated++;
      } catch (error) {
        console.error(`Failed to update course ${course.course_code}:`, error);
      }
    }

    return updated;
  }

  // ========== SKILLS MANAGEMENT ==========

  /**
   * Add or update a user's skill
   */
  async addUserSkill(skill: UserSkill): Promise<UserSkill> {
    const query = `
      INSERT INTO user_skills (
        user_id, skill_id, proficiency_level, years_experience, last_used, verified
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, skill_id)
      DO UPDATE SET
        proficiency_level = EXCLUDED.proficiency_level,
        years_experience = EXCLUDED.years_experience,
        last_used = EXCLUDED.last_used,
        verified = EXCLUDED.verified,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await this.db.query<UserSkill>(query, [
      skill.user_id,
      skill.skill_id,
      skill.proficiency_level,
      skill.years_experience || null,
      skill.last_used || null,
      skill.verified || false,
    ]);

    return result.rows[0];
  }

  /**
   * Get all skills for a user
   */
  async getUserSkills(userId: number): Promise<UserSkill[]> {
    const query = `
      SELECT us.*, sc.skill_name, sc.category
      FROM user_skills us
      JOIN skill_categories sc ON us.skill_id = sc.skill_id
      WHERE us.user_id = $1
      ORDER BY sc.skill_name
    `;

    const result = await this.db.query<UserSkill>(query, [userId]);
    return result.rows;
  }

  /**
   * Bulk update user skills
   */
  async bulkUpdateUserSkills(
    userId: number,
    skills: Array<{
      skill_name: string;
      proficiency_level: number;
      years_experience?: number;
    }>
  ): Promise<UserSkill[]> {
    const updatedSkills: UserSkill[] = [];

    for (const skill of skills) {
      // First, get or create skill in skill_categories
      let skillId: number;

      const existingSkill = await this.db.query<{ skill_id: number }>(
        `SELECT skill_id FROM skill_categories WHERE LOWER(skill_name) = LOWER($1)`,
        [skill.skill_name]
      );

      if (existingSkill.rows.length > 0) {
        skillId = existingSkill.rows[0].skill_id;
      } else {
        // Create new skill category
        const newSkill = await this.db.query<{ skill_id: number }>(
          `INSERT INTO skill_categories (skill_name, category) VALUES ($1, $2) RETURNING skill_id`,
          [skill.skill_name, "custom"]
        );
        skillId = newSkill.rows[0].skill_id;
      }

      // Add/update user skill
      const updated = await this.addUserSkill({
        user_id: userId,
        skill_id: skillId,
        proficiency_level: skill.proficiency_level,
        years_experience: skill.years_experience,
      });

      updatedSkills.push(updated);
    }

    return updatedSkills;
  }

  /**
   * Delete a user's skill
   */
  async deleteUserSkill(userId: number, skillId: number): Promise<boolean> {
    const query = `DELETE FROM user_skills WHERE user_id = $1 AND skill_id = $2`;
    const result = await this.db.query(query, [userId, skillId]);
    return result.rowCount > 0;
  }

  // ========== TA PERFORMANCE TRACKING ==========

  /**
   * Add TA performance record
   */
  async addTAPerformance(performance: TAPerformance): Promise<TAPerformance> {
    const query = `
      INSERT INTO ta_performance (
        allocation_id, course_id, user_id, term, instructor_rating,
        student_feedback_score, attendance_rate, tasks_completed, tasks_assigned,
        strengths, areas_for_improvement, would_rehire, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const result = await this.db.query<TAPerformance>(query, [
      performance.allocation_id || null,
      performance.course_id || null,
      performance.user_id,
      performance.term,
      performance.instructor_rating || null,
      performance.student_feedback_score || null,
      performance.attendance_rate || null,
      performance.tasks_completed || 0,
      performance.tasks_assigned || 0,
      performance.strengths || null,
      performance.areas_for_improvement || null,
      performance.would_rehire || null,
      performance.notes || null,
    ]);

    return result.rows[0];
  }

  /**
   * Get TA performance history
   */
  async getTAPerformanceHistory(userId: number): Promise<TAPerformance[]> {
    const query = `
      SELECT tp.*, c.code as course_code, c.title as course_title
      FROM ta_performance tp
      LEFT JOIN courses c ON tp.course_id = c.course_id
      WHERE tp.user_id = $1
      ORDER BY tp.created_at DESC
    `;

    const result = await this.db.query<TAPerformance>(query, [userId]);
    return result.rows;
  }

  /**
   * Get average TA performance metrics
   */
  async getTAAveragePerformance(userId: number): Promise<{
    avg_instructor_rating: number;
    avg_student_feedback: number;
    avg_attendance_rate: number;
    total_evaluations: number;
    would_rehire_percentage: number;
  }> {
    const query = `
      SELECT 
        AVG(instructor_rating) as avg_instructor_rating,
        AVG(student_feedback_score) as avg_student_feedback,
        AVG(attendance_rate) as avg_attendance_rate,
        COUNT(*) as total_evaluations,
        (COUNT(*) FILTER (WHERE would_rehire = true))::float / NULLIF(COUNT(*) FILTER (WHERE would_rehire IS NOT NULL), 0) * 100 as would_rehire_percentage
      FROM ta_performance
      WHERE user_id = $1
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows[0];
  }

  // ========== ENHANCED FILTERING ==========

  /**
   * Check if student is available during course time
   */
  async checkAvailabilityConflict(
    userId: number,
    courseId: number
  ): Promise<boolean> {
    const query = `
      SELECT 
        c.course_days, c.course_time,
        sp.weekly_availability
      FROM courses c
      CROSS JOIN student_profiles sp
      WHERE c.course_id = $1 AND sp.user_id = $2
    `;

    const result = await this.db.query(query, [courseId, userId]);

    if (result.rows.length === 0) return true; // No data, assume available

    const course = result.rows[0];
    if (!course.weekly_availability) return true; // No availability data

    try {
      const availability = JSON.parse(course.weekly_availability);
      // Implement actual availability checking logic here
      // This is a simplified version
      return true; // Placeholder
    } catch {
      return true;
    }
  }

  /**
   * Get current TA workload
   */
  async getCurrentTAWorkload(userId: number, term: string): Promise<number> {
    const query = `
      SELECT COUNT(*) * 10 as current_hours -- Assuming 10 hours per assignment
      FROM ta_allocations ta
      JOIN lab_sections ls ON ta.lab_section_id = ls.lab_section_id
      JOIN courses c ON ls.course_id = c.course_id
      WHERE ta.user_id = $1 AND c.term = $2 AND ta.status = 'active'
    `;

    const result = await this.db.query<{ current_hours: number }>(query, [
      userId,
      term,
    ]);
    return result.rows[0]?.current_hours || 0;
  }

  // ========== UTILITY METHODS ==========

  /**
   * Convert percentage grade to letter grade
   */
  private percentageToLetter(percentage: number): string {
    if (percentage >= 90) return "A+";
    if (percentage >= 85) return "A";
    if (percentage >= 80) return "A-";
    if (percentage >= 76) return "B+";
    if (percentage >= 72) return "B";
    if (percentage >= 68) return "B-";
    if (percentage >= 64) return "C+";
    if (percentage >= 60) return "C";
    if (percentage >= 55) return "C-";
    if (percentage >= 50) return "D";
    return "F";
  }

  /**
   * Enhanced candidate filtering with new criteria
   */
  async getEnhancedTACandidates(
    courseId: number,
    filters: RecommendationFilters & {
      check_availability?: boolean;
      max_current_hours?: number;
      exclude_conflicts?: boolean;
      min_performance_rating?: number;
    }
  ): Promise<TACandidate[]> {
    try {
      // Get base candidates using fixed method
      let candidates = await this.getTACandidatesForCourse(courseId, filters);

      // Get course details for term
      const courseQuery = await this.db.query<{ term: string }>(
        `SELECT term FROM courses WHERE course_id = $1`,
        [courseId]
      );
      const courseTerm = courseQuery.rows[0]?.term;

      // Apply enhanced filters
      const enhancedCandidates = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            // Check availability
            if (filters.check_availability) {
              const hasConflict = await this.checkAvailabilityConflict(
                candidate.user_id,
                courseId
              );
              if (hasConflict) {
                return null; // Filter out
              }
            }

            // Check workload
            if (filters.max_current_hours && courseTerm) {
              const currentWorkload = await this.getCurrentTAWorkload(
                candidate.user_id,
                courseTerm
              );
              if (currentWorkload >= filters.max_current_hours) {
                return null; // Filter out
              }
            }

            // Check performance rating
            if (filters.min_performance_rating) {
              const performance = await this.getTAAveragePerformance(
                candidate.user_id
              );
              if (
                performance.avg_instructor_rating <
                filters.min_performance_rating
              ) {
                return null; // Filter out
              }
            }

            // Add performance data to candidate
            const performanceData = await this.getTAAveragePerformance(
              candidate.user_id
            );
            return {
              ...candidate,
              avg_performance_rating: performanceData.avg_instructor_rating,
              would_rehire_percentage: performanceData.would_rehire_percentage,
              total_evaluations: performanceData.total_evaluations,
            };
          } catch (error) {
            console.error(
              `Error processing candidate ${candidate.user_id}:`,
              error
            );
            return candidate; // Return original candidate if error processing
          }
        })
      );

      // Filter out nulls and return
      return enhancedCandidates.filter((c) => c !== null) as TACandidate[];
    } catch (error) {
      console.error("Error in getEnhancedTACandidates:", error);
      throw new Error(
        `Failed to fetch enhanced TA candidates: ${error.message}`
      );
    }
  }
}
