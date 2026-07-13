import { Context, Router, Status } from "../../../deps.ts";
import { CourseModel } from "../../database/models/course.ts";
import {
  RecommendationFilters,
  TARecommendationModel,
} from "../../database/models/recommendation.ts";
import { createAuthMiddleware } from "../middleware/auth.ts";
import { AuthService } from "../services/auth.ts";

export const recommendationRouter = new Router();

// Initialize dependencies (to be injected)
let recommendationModel: TARecommendationModel;
let courseModel: CourseModel;
let authService: AuthService;

// Dependency injection function
export function setRecommendationDependencies(
  recModel: TARecommendationModel,
  courseModelParam: CourseModel,
  authServiceParam: AuthService
) {
  recommendationModel = recModel;
  courseModel = courseModelParam;
  authService = authServiceParam;

  // Initialize middleware
  const instructorOrCoordinatorAuth = createAuthMiddleware({
    authService: authServiceParam,
    requiredRoles: ["instructor", "ta_coordinator", "admin"],
  });

  const generalAuth = createAuthMiddleware({
    authService: authServiceParam,
  });

  // Register all routes with proper middleware
  registerRecommendationRoutes(instructorOrCoordinatorAuth, generalAuth);
}

function registerRecommendationRoutes(
  authMiddleware: any,
  generalAuthMiddleware: any
) {
  // ========== EXISTING ENDPOINTS ==========

  // GET /api/courses/:courseId/recommendations - Get TA recommendations for a course
  recommendationRouter.get(
    "/courses/:courseId/recommendations",
    authMiddleware,
    async (ctx: Context) => {
      try {
        const courseId = parseInt(ctx.params.courseId);

        if (isNaN(courseId)) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid course ID" };
          return;
        }

        // Verify the course exists
        const course = await courseModel.getCourseById(courseId);
        if (!course) {
          ctx.response.status = Status.NotFound;
          ctx.response.body = { error: "Course not found" };
          return;
        }

        // Check if user has permission (instructor of the course or coordinator/admin)
        const userId = ctx.state.user.id;
        const userRole = ctx.state.user.role;

        if (userRole === "instructor") {
          const isInstructor = await courseModel.isInstructorOfCourse(
            courseId,
            userId
          );
          if (!isInstructor) {
            ctx.response.status = Status.Forbidden;
            ctx.response.body = {
              error:
                "You must be the course instructor to view recommendations",
            };
            return;
          }
        }

        // Parse query parameters for filtering
        const url = new URL(ctx.request.url);
        const filters: RecommendationFilters = {};

        // GPA filters
        if (url.searchParams.get("min_gpa")) {
          filters.min_gpa = parseFloat(url.searchParams.get("min_gpa")!);
        }
        if (url.searchParams.get("max_gpa")) {
          filters.max_gpa = parseFloat(url.searchParams.get("max_gpa")!);
        }

        // Skills filters
        if (url.searchParams.get("required_skills")) {
          filters.required_skills = url.searchParams
            .get("required_skills")!
            .split(",")
            .map((s) => s.trim());
        }
        if (url.searchParams.get("preferred_skills")) {
          filters.preferred_skills = url.searchParams
            .get("preferred_skills")!
            .split(",")
            .map((s) => s.trim());
        }

        // Course completion filters
        if (url.searchParams.get("required_courses")) {
          filters.required_courses = url.searchParams
            .get("required_courses")!
            .split(",")
            .map((s) => s.trim());
        }
        if (url.searchParams.get("minimum_grade_in_courses")) {
          filters.minimum_grade_in_courses = parseInt(
            url.searchParams.get("minimum_grade_in_courses")!
          );
        }

        // Student info filters
        if (url.searchParams.get("major")) {
          filters.major = url.searchParams
            .get("major")!
            .split(",")
            .map((s) => s.trim());
        }
        if (url.searchParams.get("year_of_study")) {
          filters.year_of_study = url.searchParams
            .get("year_of_study")!
            .split(",")
            .map(Number);
        }
        if (url.searchParams.get("experience_level")) {
          filters.min_experience_level = url.searchParams.get(
            "experience_level"
          ) as any;
        }
        if (url.searchParams.get("has_ta_experience")) {
          filters.has_previous_ta_experience =
            url.searchParams.get("has_ta_experience") === "true";
        }
        if (url.searchParams.get("application_status")) {
          filters.application_status = url.searchParams
            .get("application_status")!
            .split(",")
            .map((s) => s.trim());
        }

        // Match percentage filters
        if (url.searchParams.get("min_skills_match")) {
          filters.min_skills_match = parseInt(
            url.searchParams.get("min_skills_match")!
          );
        }
        if (url.searchParams.get("min_coursework_match")) {
          filters.min_coursework_match = parseInt(
            url.searchParams.get("min_coursework_match")!
          );
        }
        if (url.searchParams.get("min_overall_score")) {
          filters.min_overall_score = parseInt(
            url.searchParams.get("min_overall_score")!
          );
        }

        // Get candidates and course requirements
        const [candidates, courseRequirements] = await Promise.all([
          recommendationModel.getTACandidatesForCourse(courseId, filters),
          recommendationModel.getCourseRequirements(courseId),
        ]);

        ctx.response.status = Status.OK;
        ctx.response.body = {
          course: course,
          course_requirements: courseRequirements,
          candidates: candidates,
          total_candidates: candidates.length,
          filters_applied: filters,
          scoring_explanation: {
            skills_match:
              "Percentage based on required and preferred skills matching",
            coursework_match:
              "Percentage based on prerequisite and recommended courses completed with minimum grades",
            experience_level:
              "Determined by year of study, GPA, and previous TA experience",
            recommendation_score:
              "Weighted score: 40% skills + 40% coursework + 20% experience (0-100 scale)",
          },
        };
      } catch (error) {
        console.error("Error fetching TA recommendations:", error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: "Failed to fetch TA recommendations" };
      }
    }
  );

  // GET /api/recommendations/filters - Get available filter options
  recommendationRouter.get(
    "/recommendations/filters",
    authMiddleware,
    async (ctx: Context) => {
      try {
        const [skills, majors] = await Promise.all([
          recommendationModel.getAvailableSkills(),
          recommendationModel.getAvailableMajors(),
        ]);

        ctx.response.status = Status.OK;
        ctx.response.body = {
          available_skills: skills,
          available_majors: majors,
          experience_levels: ["beginner", "intermediate", "advanced"],
          application_statuses: ["pending", "approved", "rejected"],
          year_of_study_options: [1, 2, 3, 4, 5, 6, 7, 8], // Covers undergrad through PhD
          grade_range: {
            min: 0,
            max: 100,
            recommended_minimum: 60,
          },
        };
      } catch (error) {
        console.error("Error fetching filter options:", error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: "Failed to fetch filter options" };
      }
    }
  );

  // GET /api/courses/:courseId/requirements - Get course requirements for TA positions
  recommendationRouter.get(
    "/courses/:courseId/requirements",
    authMiddleware,
    async (ctx: Context) => {
      try {
        const courseId = parseInt(ctx.params.courseId);

        if (isNaN(courseId)) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid course ID" };
          return;
        }

        const requirements = await recommendationModel.getCourseRequirements(
          courseId
        );

        ctx.response.status = Status.OK;
        ctx.response.body = requirements || {
          course_id: courseId,
          message: "No specific requirements set for this course",
          default_requirements: {
            minimum_year_of_study: 2,
            minimum_overall_gpa: 3.0,
            recommended_skills: [],
          },
        };
      } catch (error) {
        console.error("Error fetching course requirements:", error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: "Failed to fetch course requirements" };
      }
    }
  );

  // POST /api/courses/:courseId/requirements - Set course requirements for TA positions
  recommendationRouter.post(
    "/courses/:courseId/requirements",
    authMiddleware,
    async (ctx: Context) => {
      try {
        const courseId = parseInt(ctx.params.courseId);

        if (isNaN(courseId)) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid course ID" };
          return;
        }

        // Check if user has permission (instructor of the course or coordinator/admin)
        const userId = ctx.state.user.id;
        const userRole = ctx.state.user.role;

        if (userRole === "instructor") {
          const isInstructor = await courseModel.isInstructorOfCourse(
            courseId,
            userId
          );
          if (!isInstructor) {
            ctx.response.status = Status.Forbidden;
            ctx.response.body = {
              error: "You must be the course instructor to update requirements",
            };
            return;
          }
        }

        const body = await ctx.request.body().value;

        const requirements = await recommendationModel.setCourseRequirements({
          course_id: courseId,
          prerequisite_courses: body.prerequisite_courses || [],
          minimum_grade_percentage: body.minimum_grade_percentage || 60,
          recommended_courses: body.recommended_courses || [],
          recommended_grade_percentage: body.recommended_grade_percentage || 50,
          required_skills: body.required_skills || [],
          preferred_skills: body.preferred_skills || [],
          minimum_year_of_study: body.minimum_year_of_study || 2,
          prefer_previous_ta_experience:
            body.prefer_previous_ta_experience || false,
          minimum_overall_gpa: body.minimum_overall_gpa || 3.0,
          notes: body.notes || "",
        });

        ctx.response.status = Status.OK;
        ctx.response.body = {
          message: "Course requirements updated successfully",
          requirements,
        };
      } catch (error) {
        console.error("Error updating course requirements:", error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: "Failed to update course requirements" };
      }
    }
  );

  // ========== STUDENT DATA MANAGEMENT ENDPOINTS ==========

  /**
   * GET /api/students/:studentId/completed-courses
   * Get all completed courses for a student
   */
  recommendationRouter.get(
    "/students/:studentId/completed-courses",
    generalAuthMiddleware,
    async (ctx: Context) => {
      try {
        const studentId = parseInt(ctx.params.studentId);

        if (isNaN(studentId)) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid student ID" };
          return;
        }

        const completedCourses =
          await recommendationModel.getStudentCompletedCourses(studentId);

        ctx.response.status = Status.OK;
        ctx.response.body = {
          student_id: studentId,
          completed_courses: completedCourses,
          total_courses: completedCourses.length,
          verified_courses: completedCourses.filter((c) => c.is_verified)
            .length,
          manual_entries: completedCourses.filter((c) => !c.is_verified).length,
        };
      } catch (error) {
        console.error("Error fetching student completed courses:", error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: "Failed to fetch completed courses" };
      }
    }
  );

  /**
   * POST /api/students/:studentId/completed-courses
   * Add a completed course for a student
   */
  recommendationRouter.post(
    "/students/:studentId/completed-courses",
    generalAuthMiddleware,
    async (ctx: Context) => {
      try {
        const studentId = parseInt(ctx.params.studentId);

        if (isNaN(studentId)) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid student ID" };
          return;
        }

        // Check authorization - students can only update their own data
        if (
          ctx.state.user.role === "student" &&
          ctx.state.user.id !== studentId
        ) {
          ctx.response.status = Status.Forbidden;
          ctx.response.body = {
            error: "You can only update your own course completions",
          };
          return;
        }

        const body = await ctx.request.body().value;

        // Validate required fields
        if (!body.course_code || body.grade_percentage === undefined) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = {
            error: "Missing required fields: course_code, grade_percentage",
          };
          return;
        }

        const completion = await recommendationModel.addCourseCompletion({
          user_id: studentId,
          course_code: body.course_code.toUpperCase().trim(),
          course_title: body.course_title || "",
          grade_percentage: parseInt(body.grade_percentage),
          credits: body.credits ? parseFloat(body.credits) : undefined,
          term_taken: body.term_taken || "",
          year_taken: body.year_taken ? parseInt(body.year_taken) : undefined,
          grade_letter: body.grade_letter || "",
          is_verified: body.is_verified || false,
          source: body.source || "manual",
        });

        ctx.response.status = Status.Created;
        ctx.response.body = {
          message: "Course completion added successfully",
          completion,
        };
      } catch (error) {
        console.error("Error adding course completion:", error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: "Failed to add course completion" };
      }
    }
  );

  /**
   * POST /api/students/:studentId/completed-courses/bulk
   * Bulk import completed courses (from transcript)
   */
  recommendationRouter.post(
    "/students/:studentId/completed-courses/bulk",
    generalAuthMiddleware,
    async (ctx: Context) => {
      try {
        const studentId = parseInt(ctx.params.studentId);

        if (isNaN(studentId)) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid student ID" };
          return;
        }

        // Check authorization
        if (
          ctx.state.user.role === "student" &&
          ctx.state.user.id !== studentId
        ) {
          ctx.response.status = Status.Forbidden;
          ctx.response.body = {
            error: "You can only import your own transcript data",
          };
          return;
        }

        const body = await ctx.request.body().value;

        if (!body.courses || !Array.isArray(body.courses)) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Missing or invalid courses array" };
          return;
        }

        // Validate each course
        for (const course of body.courses) {
          if (!course.course_code || course.grade_percentage === undefined) {
            ctx.response.status = Status.BadRequest;
            ctx.response.body = {
              error: "Each course must have course_code and grade_percentage",
            };
            return;
          }
        }

        const result = await recommendationModel.importTranscriptData(
          studentId,
          body.courses
        );

        ctx.response.status = result.success
          ? Status.OK
          : Status.PartialContent;
        ctx.response.body = {
          message: `Imported ${result.imported} courses successfully`,
          ...result,
        };
      } catch (error) {
        console.error("Error importing transcript data:", error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: "Failed to import transcript data" };
      }
    }
  );

  /**
   * DELETE /api/students/:studentId/completed-courses/:courseCode
   * Delete a course completion record
   */
  recommendationRouter.delete(
    "/students/:studentId/completed-courses/:courseCode",
    generalAuthMiddleware,
    async (ctx: Context) => {
      try {
        const studentId = parseInt(ctx.params.studentId);
        const courseCode = ctx.params.courseCode;

        if (isNaN(studentId)) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid student ID" };
          return;
        }

        // Check authorization
        if (
          ctx.state.user.role === "student" &&
          ctx.state.user.id !== studentId
        ) {
          ctx.response.status = Status.Forbidden;
          ctx.response.body = {
            error: "You can only delete your own course completions",
          };
          return;
        }

        const query = `
        DELETE FROM student_course_completions 
        WHERE user_id = $1 AND course_code = $2
      `;

        const result = await recommendationModel.db.query(query, [
          studentId,
          courseCode.toUpperCase(),
        ]);

        if (result.rowCount === 0) {
          ctx.response.status = Status.NotFound;
          ctx.response.body = { error: "Course completion not found" };
          return;
        }

        ctx.response.status = Status.OK;
        ctx.response.body = {
          message: "Course completion deleted successfully",
        };
      } catch (error) {
        console.error("Error deleting course completion:", error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: "Failed to delete course completion" };
      }
    }
  );

  // ========== SKILLS MANAGEMENT ENDPOINTS ==========

  /**
   * POST /api/students/:studentId/skills
   * Add or update a skill for a student
   */
  recommendationRouter.post(
    "/students/:studentId/skills",
    generalAuthMiddleware,
    async (ctx: Context) => {
      try {
        const studentId = parseInt(ctx.params.studentId);

        if (isNaN(studentId)) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid student ID" };
          return;
        }

        // Check authorization
        if (
          ctx.state.user.role === "student" &&
          ctx.state.user.id !== studentId
        ) {
          ctx.response.status = Status.Forbidden;
          ctx.response.body = { error: "You can only update your own skills" };
          return;
        }

        const body = await ctx.request.body().value;

        if (!body.skill_name || !body.proficiency_level) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = {
            error: "skill_name and proficiency_level are required",
          };
          return;
        }

        // Get or create skill ID
        let skillId: number;
        const existingSkill = await recommendationModel.db.query<{
          skill_id: number;
        }>(
          `SELECT skill_id FROM skill_categories WHERE LOWER(skill_name) = LOWER($1)`,
          [body.skill_name]
        );

        if (existingSkill.rows.length > 0) {
          skillId = existingSkill.rows[0].skill_id;
        } else {
          const newSkill = await recommendationModel.db.query<{
            skill_id: number;
          }>(
            `INSERT INTO skill_categories (skill_name, category) VALUES ($1, $2) RETURNING skill_id`,
            [body.skill_name, body.category || "custom"]
          );
          skillId = newSkill.rows[0].skill_id;
        }

        const skill = await recommendationModel.addUserSkill({
          user_id: studentId,
          skill_id: skillId,
          proficiency_level: body.proficiency_level,
          years_experience: body.years_experience,
          last_used: body.last_used,
          verified: body.verified || false,
        });

        ctx.response.status = Status.Created;
        ctx.response.body = {
          message: "Skill added/updated successfully",
          skill,
        };
      } catch (error) {
        console.error("Error adding skill:", error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: "Failed to add skill" };
      }
    }
  );

  /**
   * POST /api/students/:studentId/skills/bulk
   * Bulk update skills for a student
   */
  recommendationRouter.post(
    "/students/:studentId/skills/bulk",
    generalAuthMiddleware,
    async (ctx: Context) => {
      try {
        const studentId = parseInt(ctx.params.studentId);

        if (isNaN(studentId)) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid student ID" };
          return;
        }

        // Check authorization
        if (
          ctx.state.user.role === "student" &&
          ctx.state.user.id !== studentId
        ) {
          ctx.response.status = Status.Forbidden;
          ctx.response.body = { error: "You can only update your own skills" };
          return;
        }

        const body = await ctx.request.body().value;

        if (!body.skills || !Array.isArray(body.skills)) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "skills array is required" };
          return;
        }

        const updatedSkills = await recommendationModel.bulkUpdateUserSkills(
          studentId,
          body.skills
        );

        ctx.response.status = Status.OK;
        ctx.response.body = {
          message: `Updated ${updatedSkills.length} skills successfully`,
          skills: updatedSkills,
        };
      } catch (error) {
        console.error("Error bulk updating skills:", error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: "Failed to bulk update skills" };
      }
    }
  );

  /**
   * GET /api/students/:studentId/skills
   * Get all skills for a student
   */
  recommendationRouter.get(
    "/students/:studentId/skills",
    generalAuthMiddleware,
    async (ctx: Context) => {
      try {
        const studentId = parseInt(ctx.params.studentId);

        if (isNaN(studentId)) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid student ID" };
          return;
        }

        const skills = await recommendationModel.getUserSkills(studentId);

        ctx.response.status = Status.OK;
        ctx.response.body = {
          student_id: studentId,
          skills: skills,
          total_skills: skills.length,
        };
      } catch (error) {
        console.error("Error fetching skills:", error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: "Failed to fetch skills" };
      }
    }
  );

  /**
   * DELETE /api/students/:studentId/skills/:skillId
   * Delete a skill for a student
   */
  recommendationRouter.delete(
    "/students/:studentId/skills/:skillId",
    generalAuthMiddleware,
    async (ctx: Context) => {
      try {
        const studentId = parseInt(ctx.params.studentId);
        const skillId = parseInt(ctx.params.skillId);

        if (isNaN(studentId) || isNaN(skillId)) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid student ID or skill ID" };
          return;
        }

        // Check authorization
        if (
          ctx.state.user.role === "student" &&
          ctx.state.user.id !== studentId
        ) {
          ctx.response.status = Status.Forbidden;
          ctx.response.body = { error: "You can only delete your own skills" };
          return;
        }

        const deleted = await recommendationModel.deleteUserSkill(
          studentId,
          skillId
        );

        if (!deleted) {
          ctx.response.status = Status.NotFound;
          ctx.response.body = { error: "Skill not found" };
          return;
        }

        ctx.response.status = Status.OK;
        ctx.response.body = { message: "Skill deleted successfully" };
      } catch (error) {
        console.error("Error deleting skill:", error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: "Failed to delete skill" };
      }
    }
  );

  // ========== TA PERFORMANCE ENDPOINTS ==========

  /**
   * POST /api/ta-performance
   * Add TA performance evaluation (instructor only)
   */
  recommendationRouter.post(
    "/ta-performance",
    authMiddleware,
    async (ctx: Context) => {
      try {
        // Only instructors and coordinators can add performance evaluations
        if (
          !["instructor", "ta_coordinator", "admin"].includes(
            ctx.state.user.role
          )
        ) {
          ctx.response.status = Status.Forbidden;
          ctx.response.body = {
            error: "Only instructors can add performance evaluations",
          };
          return;
        }

        const body = await ctx.request.body().value;

        if (!body.user_id || !body.term) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "user_id and term are required" };
          return;
        }

        const performance = await recommendationModel.addTAPerformance(body);

        ctx.response.status = Status.Created;
        ctx.response.body = {
          message: "Performance evaluation added successfully",
          performance,
        };
      } catch (error) {
        console.error("Error adding performance evaluation:", error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: "Failed to add performance evaluation" };
      }
    }
  );

  /**
   * GET /api/students/:studentId/ta-performance
   * Get TA performance history for a student
   */
  recommendationRouter.get(
    "/students/:studentId/ta-performance",
    generalAuthMiddleware,
    async (ctx: Context) => {
      try {
        const studentId = parseInt(ctx.params.studentId);

        if (isNaN(studentId)) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid student ID" };
          return;
        }

        const performance = await recommendationModel.getTAPerformanceHistory(
          studentId
        );
        const averages = await recommendationModel.getTAAveragePerformance(
          studentId
        );

        ctx.response.status = Status.OK;
        ctx.response.body = {
          student_id: studentId,
          performance_history: performance,
          averages: averages,
          total_evaluations: performance.length,
        };
      } catch (error) {
        console.error("Error fetching performance history:", error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: "Failed to fetch performance history" };
      }
    }
  );

  // ========== ENHANCED RECOMMENDATION ENDPOINT ==========

  /**
   * GET /api/courses/:courseId/recommendations/enhanced
   * Get enhanced TA recommendations with all new filters
   */
  recommendationRouter.get(
    "/courses/:courseId/recommendations/enhanced",
    authMiddleware,
    async (ctx: Context) => {
      try {
        const courseId = parseInt(ctx.params.courseId);

        if (isNaN(courseId)) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid course ID" };
          return;
        }

        // Parse enhanced query parameters
        const url = new URL(ctx.request.url);
        const filters = {
          // Existing filters
          min_gpa: url.searchParams.get("min_gpa")
            ? parseFloat(url.searchParams.get("min_gpa")!)
            : undefined,
          max_gpa: url.searchParams.get("max_gpa")
            ? parseFloat(url.searchParams.get("max_gpa")!)
            : undefined,
          major: url.searchParams.get("major")?.split(","),
          year_of_study: url.searchParams
            .get("year_of_study")
            ?.split(",")
            .map(Number),
          required_skills: url.searchParams.get("required_skills")?.split(","),
          preferred_skills: url.searchParams
            .get("preferred_skills")
            ?.split(","),
          required_courses: url.searchParams
            .get("required_courses")
            ?.split(","),
          minimum_grade_in_courses: url.searchParams.get("minimum_grade")
            ? parseInt(url.searchParams.get("minimum_grade")!)
            : undefined,

          // New enhanced filters
          check_availability:
            url.searchParams.get("check_availability") === "true",
          max_current_hours: url.searchParams.get("max_current_hours")
            ? parseInt(url.searchParams.get("max_current_hours")!)
            : undefined,
          exclude_conflicts:
            url.searchParams.get("exclude_conflicts") === "true",
          min_performance_rating: url.searchParams.get("min_performance_rating")
            ? parseFloat(url.searchParams.get("min_performance_rating")!)
            : undefined,
        };

        const candidates = await recommendationModel.getEnhancedTACandidates(
          courseId,
          filters
        );

        ctx.response.status = Status.OK;
        ctx.response.body = {
          course_id: courseId,
          candidates: candidates,
          total_candidates: candidates.length,
          filters_applied: filters,
        };
      } catch (error) {
        console.error("Error fetching enhanced recommendations:", error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = {
          error: "Failed to fetch enhanced recommendations",
        };
      }
    }
  );

  // GET /students/:studentId/recommendation-profile - Get detailed student profile for recommendations
  recommendationRouter.get(
    "/students/:studentId/recommendation-profile",
    generalAuthMiddleware,
    async (ctx: Context) => {
      try {
        const studentId = parseInt(ctx.params.studentId);

        if (isNaN(studentId)) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid student ID" };
          return;
        }

        // Get student profile with completed courses, skills, and performance data
        const profile =
          await recommendationModel.getStudentRecommendationProfile(studentId);

        if (!profile) {
          ctx.response.status = Status.NotFound;
          ctx.response.body = { error: "Student profile not found" };
          return;
        }

        ctx.response.status = Status.OK;
        ctx.response.body = profile;
      } catch (error) {
        console.error("Error fetching enhanced recommendations:", error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = {
          error: "Failed to fetch enhanced recommendations",
        };
      }
    }
  );
}
