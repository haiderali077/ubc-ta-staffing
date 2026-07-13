import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { Context, Router, RouterContext, Status } from "../../../deps.ts";
import { AllocationModel, TAAllocation } from "../../database/models/allocation.ts";
import { ApplicationModel } from "../../database/models/application.ts";
import { CourseModel } from "../../database/models/course.ts";
import { LabSectionModel } from "../../database/models/labSection.ts";
import { SystemSettingsModel } from "../../database/models/systemSettings.ts";
import { TANeedModel } from "../../database/models/taNeed.ts";
import { UserModel } from "../../database/models/user.ts";
import { requireRole } from "../middleware/auth.ts";
import { AuthService } from "../services/auth.ts";
import { InstructorNotificationService } from "../services/instructorNotificationService.ts";

export const instructorRouter = new Router();

// Interface for allocation with student details
interface AllocationWithStudent extends TAAllocation {
  student_name: string;
  student_email: string;
}

// Initialize dependencies - these will be set by the main server
let authService: AuthService;
let courseModel: CourseModel;
let taNeedModel: TANeedModel;
let applicationModel: ApplicationModel;
let allocationModel: AllocationModel;
let labSectionModel: LabSectionModel;
let systemSettingsModel: SystemSettingsModel;
let userModel: UserModel;
let instructorNotificationService: InstructorNotificationService;

export function setInstructorRouterDependencies(
  auth: AuthService,
  course: CourseModel,
  taNeed: TANeedModel,
  application: ApplicationModel,
  allocation: AllocationModel,
  labSection: LabSectionModel,
  settings: SystemSettingsModel,
  user: UserModel,
  instructorNotifications: InstructorNotificationService
) {
  authService = auth;
  courseModel = course;
  taNeedModel = taNeed;
  applicationModel = application;
  allocationModel = allocation;
  labSectionModel = labSection;
  systemSettingsModel = settings;
  userModel = user;
  instructorNotificationService = instructorNotifications;
}

// =============================================================================
// GET INSTRUCTOR'S ASSIGNED COURSES
// =============================================================================

instructorRouter.get(
  '/instructor/courses',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const instructorId = ctx.state.user.id;
      
      if (!instructorId) {
        ctx.response.status = Status.Unauthorized;
        ctx.response.body = { error: "Invalid user session" };
        return;
      }

      // Get courses assigned to this instructor
      const courses = await courseModel.getCoursesByInstructor(instructorId);
      
      // Enhance courses with TA needs and current allocations
      const enhancedCourses = await Promise.all(
        courses.map(async (course) => {
          const taNeeds = await taNeedModel.getNeedsByCourse(course.course_id!);
          
          // Get lab sections for this course and count assigned TAs
          const labSections = await labSectionModel.getLabSectionsByCourse(course.course_id!);
          
          // Count TAs across all lab sections for this course
          let currentTAs = 0;
          for (const labSection of labSections) {
            const allocations = await allocationModel.getAllocationsByLabSection(labSection.lab_section_id!);
            currentTAs += allocations.filter((alloc: any) => alloc.status === 'active').length;
          }
          
          return {
            course_id: course.course_id,
            code: course.code,  // Frontend expects "code" not "course_code"
            title: course.title,
            term: course.term,
            ta_needs: taNeeds,
            current_tas: currentTAs,
            lab_sections: labSections
          };
        })
      );

      ctx.response.status = Status.OK;
      ctx.response.body = {
        courses: enhancedCourses,
        total: enhancedCourses.length
      };
      
    } catch (error) {
      console.error("Error fetching instructor courses:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch courses" };
    }
  }
);

// =============================================================================
// GET INSTRUCTOR'S TA REQUESTS
// =============================================================================

instructorRouter.get(
  '/instructor/ta-requests',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const instructorId = ctx.state.user.id;
      
      if (!instructorId) {
        ctx.response.status = Status.Unauthorized;
        ctx.response.body = { error: "Invalid user session" };
        return;
      }

      // Get courses for this instructor
      const courses = await courseModel.getCoursesByInstructor(instructorId);
      
      // Get all TA needs for instructor's courses
      const requests = [];
      for (const course of courses) {
        const taNeeds = await taNeedModel.getNeedsByCourse(course.course_id!);
        for (const need of taNeeds) {
          requests.push({
            ...need,
            course_code: course.code,
            course_title: course.title,
            course_term: course.term
          });
        }
      }
      
      // Sort by most recent first
      requests.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      ctx.response.status = Status.OK;
      ctx.response.body = {
        requests,
        total: requests.length
      };
      
    } catch (error) {
      console.error("Error fetching instructor TA requests:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch TA requests" };
    }
  }
);

// =============================================================================
// GET SPECIFIC COURSE DETAILS FOR INSTRUCTOR
// =============================================================================

instructorRouter.get(
  '/instructor/courses/:courseId',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: RouterContext<"/instructor/courses/:courseId">) => {
    try {
      const courseId = parseInt(ctx.params.courseId);
      const instructorId = ctx.state.user.id;
      
      if (!instructorId) {
        ctx.response.status = Status.Unauthorized;
        ctx.response.body = { error: "Invalid user session" };
        return;
      }

      // Verify instructor owns this course
      const isOwner = await courseModel.isInstructorOfCourse(courseId, instructorId);
      if (!isOwner) {
        ctx.response.status = Status.Forbidden;
        ctx.response.body = { error: "You are not assigned to this course" };
        return;
      }

      // Get course details
      const course = await courseModel.getCourseById(courseId);
      if (!course) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Course not found" };
        return;
      }

      // Get TA needs for this course
      const taNeeds = await taNeedModel.getNeedsByCourse(courseId);
      
      // Get lab sections for this course and their allocations
      const labSections = await labSectionModel.getLabSectionsByCourse(courseId);
      let allAllocations: any[] = [];
      
      for (const labSection of labSections) {
        const labAllocations = await allocationModel.getAllocationsByLabSection(labSection.lab_section_id!);
        allAllocations = allAllocations.concat(labAllocations);
      }
      
      // Get active TAs with their details
      const activeTAs = allAllocations
        .filter((alloc: any) => alloc.status === 'active')
        .map((alloc: any) => ({
          allocation_id: alloc.allocation_id,
          user_id: alloc.user_id,
          allocated_at: alloc.allocated_at,
          notes: alloc.notes
          // Note: We'd need to join with users table to get TA names/emails
          // This could be enhanced in a future iteration
        }));

      ctx.response.status = Status.OK;
      ctx.response.body = {
        course: {
          ...course,
          ta_needs: taNeeds,
          current_tas: activeTAs.length,
          assigned_tas: activeTAs
        }
      };
      
    } catch (error) {
      console.error("Error fetching course details:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch course details" };
    }
  }
);

// =============================================================================
// GET INSTRUCTOR DASHBOARD SUMMARY
// =============================================================================

instructorRouter.get(
  '/instructor/dashboard',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const instructorId = ctx.state.user.id;
      
      if (!instructorId) {
        ctx.response.status = Status.Unauthorized;
        ctx.response.body = { error: "Invalid user session" };
        return;
      }

      // Get basic stats for dashboard
      const courses = await courseModel.getCoursesByInstructor(instructorId);
      
      let totalCourses = courses.length;
      let totalTARequests = 0;
      let openTARequests = 0;
      let totalTAs = 0;
      
      // Calculate stats across all courses
      for (const course of courses) {
        const taNeeds = await taNeedModel.getNeedsByCourse(course.course_id!);
        
        // Get lab sections for this course and count allocations
        const labSections = await labSectionModel.getLabSectionsByCourse(course.course_id!);
        let courseAllocations: any[] = [];
        
        for (const labSection of labSections) {
          const labAllocations = await allocationModel.getAllocationsByLabSection(labSection.lab_section_id!);
          courseAllocations = courseAllocations.concat(labAllocations);
        }
        
        totalTARequests += taNeeds.length;
        openTARequests += taNeeds.filter(need => need.status === 'open').length;
        totalTAs += courseAllocations.filter((alloc: any) => alloc.status === 'active').length;
      }

      ctx.response.status = Status.OK;
      ctx.response.body = {
        summary: {
          total_courses: totalCourses,
          total_ta_requests: totalTARequests,
          open_ta_requests: openTARequests,
          total_assigned_tas: totalTAs
        },
        recent_courses: courses.slice(0, 5) // Most recent 5 courses
      };
      
    } catch (error) {
      console.error("Error fetching instructor dashboard:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch dashboard data" };
    }
  }
);

// =============================================================================
// CREATE TA REQUEST
// =============================================================================

instructorRouter.post(
  '/instructor/ta-request',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const instructorId = ctx.state.user.id;
      
      if (!instructorId) {
        ctx.response.status = Status.Unauthorized;
        ctx.response.body = { error: "Invalid user session" };
        return;
      }

      const requestBody = await ctx.request.body({ type: 'json' }).value;
      
      // Check instructor request deadline
      if (systemSettingsModel) {
        const isDeadlinePassed = await systemSettingsModel.isDeadlinePassed('instructor_request_deadline');
        if (isDeadlinePassed) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Instructor request deadline passed." };
          return;
        }
      }
      
      // Validate request data
      const schema = z.object({
        course_id: z.number().positive('Course ID must be positive'),
        hours_required: z.number().positive('TA hours required must be positive').max(80, 'Maximum 80 hours per request'),
        qualifications: z.string().optional(),
        notes: z.string().optional(),
        lab_tutorial_skills: z.string().optional()
      });

      const validation = schema.safeParse(requestBody);
      if (!validation.success) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { 
          error: 'Validation failed', 
          details: validation.error.errors 
        };
        return;
      }

      const { course_id, hours_required, qualifications, notes, lab_tutorial_skills } = validation.data;

      // Verify instructor owns this course
      const isOwner = await courseModel.isInstructorOfCourse(course_id, instructorId);
      if (!isOwner) {
        ctx.response.status = Status.Forbidden;
        ctx.response.body = { error: "You can only submit TA requests for your assigned courses" };
        return;
      }

      // Check if TA request already exists for this course
      const existingRequests = await taNeedModel.getNeedsByCourse(course_id);
      
      let taRequest;
      if (existingRequests.length > 0) {
        // Update existing TA request instead of creating a new one
        const existingRequest = existingRequests[0]; // Get the first (and should be only) request
        taRequest = await taNeedModel.updateNeed(existingRequest.need_id!, {
          hours_required,
          notes,
          qualifications,
          lab_tutorial_skills,
          status: 'open' // Reset status to open when updating
        });
        
        console.log(`📝 Updated existing TA request ${existingRequest.need_id} for course ${course_id}`);
      } else {
        // Create new TA request if none exists
        taRequest = await taNeedModel.createNeed({
          course_id,
          hours_required,
          notes,
          qualifications,
          lab_tutorial_skills,
          status: 'open'
        });
        
        console.log(`✨ Created new TA request ${taRequest.need_id} for course ${course_id}`);
      }

      // CRITICAL FIX: Ensure course has at least one lab section for allocation
      // Check if course has any lab sections
      const existingLabSections = await labSectionModel.getLabSectionsByCourse(course_id);
      
      if (existingLabSections.length === 0) {
        // Course has no lab sections - create a general one for TA allocation
        console.log(`🔧 Creating general lab section for course ${course_id} (no existing lab sections)`);
        
        await labSectionModel.createLabSection({
          course_id,
          section_name: "General TA",
          lab_days: "As Needed",
          lab_start_time: "Flexible",
          lab_end_time: "Flexible"
        });
        
        console.log(`✅ Created general lab section for course ${course_id}`);
      }

      // Send notification to instructor about TA request submission
      try {
        await instructorNotificationService.notifyTARequestSubmission({
          instructorId,
          courseId: course_id,
          taRequestId: taRequest?.need_id,
          metadata: {
            hours_required,
            is_update: existingRequests.length > 0
          }
        });
        console.log(`📧 Sent TA request submission notification to instructor ${instructorId}`);
      } catch (notificationError) {
        console.error('Failed to send TA request submission notification:', notificationError);
        // Don't fail the request if notification fails
      }

      ctx.response.status = Status.Created;
      ctx.response.body = {
        message: existingRequests.length > 0 ? 'TA request updated successfully' : 'TA request submitted successfully',
        ta_request: taRequest
      };
      
    } catch (error) {
      console.error("Error creating TA request:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to create TA request" };
    }
  }
);

// =============================================================================
// GET TA APPLICATIONS FOR A SPECIFIC TA REQUEST
// =============================================================================

instructorRouter.get(
  '/instructor/ta-requests/:needId/applications',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: RouterContext<'/instructor/ta-requests/:needId/applications'>) => {
    try {
      const instructorId = ctx.state.user.id;
      const needId = parseInt(ctx.params.needId);
      
      if (!instructorId || !needId) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid request parameters" };
        return;
      }

      // Verify the TA need belongs to this instructor's course
      const taNeed = await taNeedModel.getNeedById(needId);
      if (!taNeed) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "TA request not found" };
        return;
      }

      const course = await courseModel.getCourseById(taNeed.course_id);
      if (!course || course.instructor_id !== instructorId) {
        ctx.response.status = Status.Forbidden;
        ctx.response.body = { error: "You can only view applications for your courses" };
        return;
      }

      // Get applications for this TA need
      const applications = await applicationModel.getApplicationsByTANeed(needId);
      
      // Transform to match frontend interface
      const transformedApplications = applications.map((app) => ({
        application_id: (app as Record<string, unknown>).application_id,
        user_id: (app as Record<string, unknown>).user_id,
        student_name: (app as Record<string, unknown>).applicant_name,
        student_email: (app as Record<string, unknown>).applicant_email,
        student_number: (app as Record<string, unknown>).student_number,
        major: (app as Record<string, unknown>).major,
        gpa: (app as Record<string, unknown>).gpa,
        status: (app as Record<string, unknown>).status,
        applied_at: (app as Record<string, unknown>).submitted_at,
        cover_letter: (app as Record<string, unknown>).notes,
        relevant_experience: (app as Record<string, unknown>).teaching_experience,
        lab_tutorial_skills: (app as Record<string, unknown>).technical_skills
      }));

      ctx.response.status = Status.OK;
      ctx.response.body = {
        applications: transformedApplications,
        total: transformedApplications.length
      };
      
    } catch (error) {
      console.error("Error fetching TA applications:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch TA applications" };
    }
  }
);

// =============================================================================
// UPDATE SHORTLIST STATUS FOR APPLICATIONS
// =============================================================================

instructorRouter.put(
  '/instructor/ta-requests/:needId/applications/shortlist',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: RouterContext<'/instructor/ta-requests/:needId/applications/shortlist'>) => {
    try {
      const instructorId = ctx.state.user.id;
      const needId = parseInt(ctx.params.needId);
      
      if (!instructorId || !needId) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid request parameters" };
        return;
      }

      // Validate request body
      const shortlistSchema = z.object({
        application_ids: z.array(z.number()),
        is_shortlisted: z.boolean()
      });

      const body = await ctx.request.body().value;
      const validatedData = shortlistSchema.parse(body);

      // Verify the TA need belongs to this instructor's course
      const taNeed = await taNeedModel.getNeedById(needId);
      if (!taNeed) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "TA request not found" };
        return;
      }

      const course = await courseModel.getCourseById(taNeed.course_id);
      if (!course || course.instructor_id !== instructorId) {
        ctx.response.status = Status.Forbidden;
        ctx.response.body = { error: "You can only modify applications for your courses" };
        return;
      }

      // Update shortlist status
      const updatedCount = await applicationModel.updateShortlistStatus(
        validatedData.application_ids, 
        validatedData.is_shortlisted
      );

      ctx.response.status = Status.OK;
      ctx.response.body = {
        message: `Successfully updated ${updatedCount} applications`,
        updated_count: updatedCount
      };
      
    } catch (error) {
      console.error("Error updating shortlist status:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to update shortlist status" };
    }
  }
);

// =============================================================================
// SEND OFFERS TO SHORTLISTED CANDIDATES
// =============================================================================

instructorRouter.post(
  '/instructor/ta-requests/send-offers',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const instructorId = ctx.state.user.id;
      
      if (!instructorId) {
        ctx.response.status = Status.Unauthorized;
        ctx.response.body = { error: "Invalid user session" };
        return;
      }

      // Validate request body
      const offerSchema = z.object({
        need_id: z.number(),
        message: z.string().optional()
      });

      const body = await ctx.request.body().value;
      const validatedData = offerSchema.parse(body);

      // Verify the TA need belongs to this instructor's course
      const taNeed = await taNeedModel.getNeedById(validatedData.need_id);
      if (!taNeed) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "TA request not found" };
        return;
      }

      const course = await courseModel.getCourseById(taNeed.course_id);
      if (!course || course.instructor_id !== instructorId) {
        ctx.response.status = Status.Forbidden;
        ctx.response.body = { error: "You can only send offers for your courses" };
        return;
      }

      // Get shortlisted applications
      const shortlistedApps = await applicationModel.getShortlistedApplications(validatedData.need_id);
      
      if (shortlistedApps.length === 0) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "No shortlisted candidates found" };
        return;
      }

      // Update status for all shortlisted applications
      const applicationIds = shortlistedApps.map(app => app.application_id!);
      
      // Update applications to 'approved' status (closest to offer_sent)
      for (const appId of applicationIds) {
        await applicationModel.updateApplicationStatus(appId, 'approved');
      }

      // TODO: Send actual emails here (implement email service)
      // For now, we just update the status

      ctx.response.status = Status.OK;
      ctx.response.body = {
        message: `Successfully sent offers to ${shortlistedApps.length} candidates`,
        offers_sent: shortlistedApps.length,
        failed_offers: 0
      };
      
    } catch (error) {
      console.error("Error sending offers:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to send offers" };
    }
  }
); 

// =============================================================================
// INSTRUCTOR TA ASSIGNMENT ENDPOINTS
// =============================================================================

// Get all TAs and lab sections for instructor's courses
instructorRouter.get(
  '/instructor/courses/:courseId/lab-sections',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: RouterContext<'/instructor/courses/:courseId/lab-sections'>) => {
    try {
      const courseId = parseInt(ctx.params.courseId);
      const instructorId = ctx.state.user.id;
      
      if (!instructorId) {
        ctx.response.status = Status.Unauthorized;
        ctx.response.body = { error: "Invalid user session" };
        return;
      }

      // Verify instructor owns this course
      const isOwner = await courseModel.isInstructorOfCourse(courseId, instructorId);
      if (!isOwner) {
        ctx.response.status = Status.Forbidden;
        ctx.response.body = { error: "You are not assigned to this course" };
        return;
      }

      // Get lab sections for this course
      const labSections = await labSectionModel.getLabSectionsByCourse(courseId);
      
      // Get allocations for each lab section with student details
      const labSectionsWithTAs = await Promise.all(
        labSections.map(async (labSection) => {
          const allocations = await allocationModel.getAllocationsByLabSection(labSection.lab_section_id!);
          
          return {
            ...labSection,
            assigned_tas: allocations.filter(alloc => alloc.status === 'active').map(alloc => ({
              allocation_id: alloc.allocation_id,
              user_id: alloc.user_id,
              student_name: (alloc as AllocationWithStudent).student_name,
              student_email: (alloc as AllocationWithStudent).student_email,
              is_marker: alloc.is_marker,
              allocated_at: alloc.allocated_at,
              notes: alloc.notes
            }))
          };
        })
      );

      ctx.response.status = Status.OK;
      ctx.response.body = {
        lab_sections: labSectionsWithTAs
      };
      
    } catch (error) {
      console.error("Error fetching lab sections:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch lab sections" };
    }
  }
);

// Get approved TAs available for assignment
instructorRouter.get(
  '/instructor/courses/:courseId/available-tas',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: RouterContext<'/instructor/courses/:courseId/available-tas'>) => {
    try {
      const courseId = parseInt(ctx.params.courseId);
      const instructorId = ctx.state.user.id;
      
      if (!instructorId) {
        ctx.response.status = Status.Unauthorized;
        ctx.response.body = { error: "Invalid user session" };
        return;
      }

      // Verify instructor owns this course
      const isOwner = await courseModel.isInstructorOfCourse(courseId, instructorId);
      if (!isOwner) {
        ctx.response.status = Status.Forbidden;
        ctx.response.body = { error: "You are not assigned to this course" };
        return;
      }

      // Get approved applications (we'll filter by course preference in a simpler way)
      const approvedTAs = await allocationModel.getApprovedApplications();
      
      // TODO: This could be enhanced to filter by course preferences
      // For now, return all approved TAs
      
      ctx.response.status = Status.OK;
      ctx.response.body = {
        available_tas: approvedTAs
      };
      
    } catch (error) {
      console.error("Error fetching available TAs:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch available TAs" };
    }
  }
);

// Assign TA to lab section
instructorRouter.post(
  '/instructor/assign-ta',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const instructorId = ctx.state.user.id;
      
      if (!instructorId) {
        ctx.response.status = Status.Unauthorized;
        ctx.response.body = { error: "Invalid user session" };
        return;
      }

      const requestBody = await ctx.request.body({ type: 'json' }).value;
      
      // Validate request data
      const schema = z.object({
        user_id: z.number().positive('User ID must be positive'),
        lab_section_id: z.number().positive('Lab section ID must be positive'),
        notes: z.string().optional(),
        is_marker: z.boolean().optional().default(false)
      });

      const validation = schema.safeParse(requestBody);
      if (!validation.success) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { 
          error: 'Validation failed', 
          details: validation.error.errors 
        };
        return;
      }

      const { user_id, lab_section_id, notes, is_marker } = validation.data;

      // Get lab section to verify course ownership
      const labSection = await labSectionModel.getLabSectionById(lab_section_id);
      if (!labSection) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Lab section not found" };
        return;
      }

      // Verify instructor owns the course this lab section belongs to
      const isOwner = await courseModel.isInstructorOfCourse(labSection.course_id!, instructorId);
      if (!isOwner) {
        ctx.response.status = Status.Forbidden;
        ctx.response.body = { error: "You can only assign TAs to your courses" };
        return;
      }

      // Get instructor email for audit logging
      const instructorResult = await userModel.getUserById(instructorId);
      const instructorEmail = instructorResult?.email || 'unknown';

      // Assign the TA
      const allocation = await allocationModel.assignStudentToLabSection(
        user_id,
        lab_section_id,
        instructorId,
        notes,
        instructorEmail,
        undefined,
        undefined,
        is_marker
      );

      ctx.response.status = Status.Created;
      ctx.response.body = {
        message: 'TA assigned successfully',
        allocation
      };
      
    } catch (error) {
      console.error("Error assigning TA:", error);
      if (error instanceof Error && error.message.includes('already assigned')) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: error.message };
      } else {
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: "Failed to assign TA" };
      }
    }
  }
);

// Unassign TA from lab section
instructorRouter.delete(
  '/instructor/assignments/:allocationId',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: RouterContext<'/instructor/assignments/:allocationId'>) => {
    try {
      const allocationId = parseInt(ctx.params.allocationId);
      const instructorId = ctx.state.user.id;
      
      if (!instructorId) {
        ctx.response.status = Status.Unauthorized;
        ctx.response.body = { error: "Invalid user session" };
        return;
      }

      // Get allocation details to verify ownership
      // Note: The unassignStudent method will handle validation of allocation existence
      // TODO: Add course ownership verification by getting allocation details first
      
      // Get instructor email for audit logging
      const instructorResult = await userModel.getUserById(instructorId);
      const instructorEmail = instructorResult?.email || 'unknown';

      // Unassign the TA
      const success = await allocationModel.unassignStudent(
        allocationId,
        instructorId,
        instructorEmail
      );

      if (!success) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Assignment not found or already inactive" };
        return;
      }

      ctx.response.status = Status.OK;
      ctx.response.body = {
        message: 'TA unassigned successfully'
      };
      
    } catch (error) {
      console.error("Error unassigning TA:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to unassign TA" };
    }
  }
);

// Update marker designation
instructorRouter.put(
  '/instructor/assignments/:allocationId/marker',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: RouterContext<'/instructor/assignments/:allocationId/marker'>) => {
    try {
      const allocationId = parseInt(ctx.params.allocationId);
      const instructorId = ctx.state.user.id;
      
      if (!instructorId) {
        ctx.response.status = Status.Unauthorized;
        ctx.response.body = { error: "Invalid user session" };
        return;
      }

      const requestBody = await ctx.request.body({ type: 'json' }).value;
      
      // Validate request data
      const schema = z.object({
        is_marker: z.boolean()
      });

      const validation = schema.safeParse(requestBody);
      if (!validation.success) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { 
          error: 'Validation failed', 
          details: validation.error.errors 
        };
        return;
      }

      const { is_marker } = validation.data;

      // Get instructor email for audit logging
      const instructorResult = await userModel.getUserById(instructorId);
      const instructorEmail = instructorResult?.email || 'unknown';

      // Update marker designation
      const updatedAllocation = await allocationModel.updateMarkerDesignation(
        allocationId,
        is_marker,
        instructorId,
        instructorEmail
      );

      if (!updatedAllocation) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Assignment not found" };
        return;
      }

      ctx.response.status = Status.OK;
      ctx.response.body = {
        message: `TA ${is_marker ? 'designated as' : 'removed as'} marker successfully`,
        allocation: updatedAllocation
      };
      
    } catch (error) {
      console.error("Error updating marker designation:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to update marker designation" };
    }
  }
); 