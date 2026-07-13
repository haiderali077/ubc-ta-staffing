import { Context, Router, RouterContext, Status, z } from "../../../deps.ts";
import { AllocationModel } from "../../database/models/allocation.ts";
import { ApplicationModel } from "../../database/models/application.ts";
import { CourseModel } from "../../database/models/course.ts";
import { ExportModel } from '../../database/models/export.ts';
import { LabSectionModel } from "../../database/models/labSection.ts";
import { TANeedModel } from "../../database/models/taNeed.ts";
import { TermModel } from "../../database/models/term.ts";
import { UserModel } from "../../database/models/user.ts";
import { requireRole } from "../middleware/auth.ts";
import { AuditLogger } from "../services/auditLogger.ts";
import { AuthService } from "../services/auth.ts";
import { InstructorNotificationService } from "../services/instructorNotificationService.ts";
import { NotificationService } from "../services/notification.ts";
import { ExportUtils } from '../utils/exportUtils.ts';

let notificationService: NotificationService;
let instructorNotificationService: InstructorNotificationService;

export const taCoordinatorRouter = new Router();

// Initialize models (to be injected)
let termModel: TermModel;
let courseModel: CourseModel;
let authService: AuthService;
let userModel: UserModel;
let taNeedModel: TANeedModel;
let applicationModel: ApplicationModel;
let allocationModel: AllocationModel;
let exportModel: ExportModel;
let labSectionModel: LabSectionModel;
let auditLogger: AuditLogger;

/**
 * Sets the export model for the TA coordinator router
 * @param model - The ExportModel instance to use
 */
export function setExportModel(model: ExportModel) {
    exportModel = model;
}

/**
 * Initializes all required models for the TA coordinator router
 * This function must be called before using any router endpoints
 */
export function setTACoordinatorModels(
  termModelParam: TermModel,
  courseModelParam: CourseModel,
  authServiceParam: AuthService,
  userModelParam: UserModel,
  taNeedModelParam: TANeedModel,
  applicationModelParam: ApplicationModel,
  allocationModelParam: AllocationModel,
  labSectionModelParam: LabSectionModel,
  auditLoggerParam: AuditLogger,
  notificationServiceParam: NotificationService,
  instructorNotificationServiceParam: InstructorNotificationService
) {
  termModel = termModelParam;
  courseModel = courseModelParam;
  authService = authServiceParam;
  userModel = userModelParam;
  taNeedModel = taNeedModelParam;
  applicationModel = applicationModelParam;
  allocationModel = allocationModelParam;
  labSectionModel = labSectionModelParam;
  auditLogger = auditLoggerParam;
  notificationService = notificationServiceParam;
  instructorNotificationService = instructorNotificationServiceParam;
}

/**
 * Middleware to check if user has admin or TA coordinator authorization
 * @param ctx - Koa context
 * @param next - Next middleware function
 */
async function requireAdminOrTACoordinator(
  ctx: Context,
  next: () => Promise<unknown>
) {
  const accessToken = await ctx.cookies.get("access_token");
  if (!accessToken) {
    ctx.response.status = Status.Unauthorized;
    ctx.response.body = { error: "No access token provided" };
    return;
  }

  const tokenResult = await authService.verifyToken(accessToken);
  if (
    !tokenResult.success ||
    (tokenResult.user?.role !== "admin" &&
      tokenResult.user?.role !== "ta_coordinator")
  ) {
    ctx.response.status = Status.Forbidden;
    ctx.response.body = { error: "Admin or TA Coordinator access required" };
    return;
  }

  // Set user context for downstream handlers
  ctx.state.user = tokenResult.user;
  await next();
}

// =========== EXPORT ROUTES (UR2.11, FR6.1) ===========

/**
 * GET /analytics
 * Get analytics data for dashboard
 * Supports optional term filtering and raw data inclusion for charts
 */
taCoordinatorRouter.get('/analytics', async (ctx) => {
    await requireRole(authService, 'ta_coordinator')(ctx, async () => {
        try {
            const url = new URL(ctx.request.url);
            const term = url.searchParams.get('term') || undefined;
            const includeRawData = url.searchParams.get('includeRawData') === 'true';
            
            if (includeRawData) {
                // Use enhanced method that includes raw data for charts
                const result = await exportModel.getAnalyticsWithRawData(term, true);
                
                ctx.response.body = { 
                    success: true, 
                    data: result.analytics,
                    rawData: result.rawData,
                    term: term || 'All Terms'
                };
            } else {
                // Use original method for basic analytics only
                const analytics = await exportModel.getAnalytics(term);
                
                ctx.response.body = { 
                    success: true, 
                    data: analytics,
                    term: term || 'All Terms'
                };
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
            ctx.response.status = 500;
            ctx.response.body = { 
                success: false,
                error: 'Failed to fetch analytics data' 
            };
        }
    });
});

/**
 * GET /departments
 * Get list of all departments for filtering dropdowns
 */
taCoordinatorRouter.get('/departments', async (ctx) => {
    await requireRole(authService, 'ta_coordinator')(ctx, async () => {
        try {
            const query = `
                SELECT DISTINCT d.name as department_name
                FROM departments d
                JOIN courses c ON d.dept_id = c.dept_id
                ORDER BY d.name
            `;
            
            const result = await exportModel.db.query(query);
            const departments = result.rows.map(row => row.department_name);
            
            ctx.response.body = { 
                success: true, 
                data: departments
            };
        } catch (error) {
            console.error('Error fetching departments:', error);
            ctx.response.status = 500;
            ctx.response.body = { 
                success: false,
                error: 'Failed to fetch departments' 
            };
        }
    });
});

/**
 * GET /export/terms
 * Get available terms for export filtering
 */
taCoordinatorRouter.get('/export/terms', async (ctx) => {
    await requireRole(authService, 'ta_coordinator')(ctx, async () => {
        try {
            const terms = await exportModel.getAvailableTerms();
            ctx.response.body = { success: true, data: terms };
        } catch (error) {
            console.error('Error fetching terms:', error);
            ctx.response.status = 500;
            ctx.response.body = { error: 'Failed to fetch terms' };
        }
    });
});

/**
 * GET /export/course-allocations
 * Export course allocations report (FR6.1 - Course-wise allocations)
 * Supports CSV and PDF formats
 */
taCoordinatorRouter.get('/export/course-allocations', async (ctx) => {
    await requireRole(authService, 'ta_coordinator')(ctx, async () => {
        try {
            const url = new URL(ctx.request.url);
            const format = url.searchParams.get('format') as 'csv' | 'pdf' || 'csv';
            const term = url.searchParams.get('term') || undefined;
            
            if (!['csv', 'pdf'].includes(format)) {
                ctx.response.status = 400;
                ctx.response.body = { error: 'Invalid format. Must be csv or pdf' };
                return;
            }
            
            const data = await exportModel.getCourseAllocationReportData(term);
            const title = ExportUtils.getReportTitle('course-allocations', term);
            const filename = ExportUtils.getFilename('course-allocations', format, term);
            
            if (format === 'csv') {
                const csvContent = ExportUtils.generateCourseAllocationCSV(data);
                
                ctx.response.headers.set('Content-Type', 'text/csv; charset=utf-8');
                ctx.response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
                ctx.response.body = csvContent;
            } else {
                const htmlContent = ExportUtils.generatePDFHTML(data, title, 'course-allocations');
                
                ctx.response.headers.set('Content-Type', 'text/html; charset=utf-8');
                ctx.response.headers.set('Content-Disposition', `attachment; filename="${filename.replace('.pdf', '.html')}"`);
                ctx.response.body = htmlContent;
            }
        } catch (error) {
            console.error('Error generating course allocations report:', error);
            ctx.response.status = 500;
            ctx.response.body = { error: 'Failed to generate course allocations report' };
        }
    });
});

/**
 * GET /export/student-assignments
 * Export student assignments report (FR6.1 - Student assignments)
 * Supports CSV and PDF formats
 */
taCoordinatorRouter.get('/export/student-assignments', async (ctx) => {
    await requireRole(authService, 'ta_coordinator')(ctx, async () => {
        try {
            const url = new URL(ctx.request.url);
            const format = url.searchParams.get('format') as 'csv' | 'pdf' || 'csv';
            const term = url.searchParams.get('term') || undefined;
            
            if (!['csv', 'pdf'].includes(format)) {
                ctx.response.status = 400;
                ctx.response.body = { error: 'Invalid format. Must be csv or pdf' };
                return;
            }
            
            const data = await exportModel.getStudentAssignmentReportData(term);
            const title = ExportUtils.getReportTitle('student-assignments', term);
            const filename = ExportUtils.getFilename('student-assignments', format, term);
            
            if (format === 'csv') {
                const csvContent = ExportUtils.generateStudentAssignmentCSV(data);
                
                ctx.response.headers.set('Content-Type', 'text/csv; charset=utf-8');
                ctx.response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
                ctx.response.body = csvContent;
            } else {
                const htmlContent = ExportUtils.generatePDFHTML(data, title, 'student-assignments');
                
                ctx.response.headers.set('Content-Type', 'text/html; charset=utf-8');
                ctx.response.headers.set('Content-Disposition', `attachment; filename="${filename.replace('.pdf', '.html')}"`);
                ctx.response.body = htmlContent;
            }
        } catch (error) {
            console.error('Error generating student assignments report:', error);
            ctx.response.status = 500;
            ctx.response.body = { error: 'Failed to generate student assignments report' };
        }
    });
});

/**
 * GET /export/hours-comparison
 * Export hours comparison report (FR6.1 - Total hours requested vs. assigned)
 * Supports CSV and PDF formats
 */
taCoordinatorRouter.get('/export/hours-comparison', async (ctx) => {
    await requireRole(authService, 'ta_coordinator')(ctx, async () => {
        try {
            const url = new URL(ctx.request.url);
            const format = url.searchParams.get('format') as 'csv' | 'pdf' || 'csv';
            const term = url.searchParams.get('term') || undefined;
            
            if (!['csv', 'pdf'].includes(format)) {
                ctx.response.status = 400;
                ctx.response.body = { error: 'Invalid format. Must be csv or pdf' };
                return;
            }
            
            const data = await exportModel.getHoursComparisonReportData(term);
            const title = ExportUtils.getReportTitle('hours-comparison', term);
            const filename = ExportUtils.getFilename('hours-comparison', format, term);
            
            if (format === 'csv') {
                const csvContent = ExportUtils.generateHoursComparisonCSV(data);
                
                ctx.response.headers.set('Content-Type', 'text/csv; charset=utf-8');
                ctx.response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
                ctx.response.body = csvContent;
            } else {
                const htmlContent = ExportUtils.generatePDFHTML(data, title, 'hours-comparison');
                
                ctx.response.headers.set('Content-Type', 'text/html; charset=utf-8');
                ctx.response.headers.set('Content-Disposition', `attachment; filename="${filename.replace('.pdf', '.html')}"`);
                ctx.response.body = htmlContent;
            }
        } catch (error) {
            console.error('Error generating hours comparison report:', error);
            ctx.response.status = 500;
            ctx.response.body = { error: 'Failed to generate hours comparison report' };
        }
    });
});

/**
 * GET /export/preview/:reportType
 * Preview report data for frontend display before export
 * Supports limiting the number of rows returned
 */
taCoordinatorRouter.get('/export/preview/:reportType', async (ctx) => {
    await requireRole(authService, 'ta_coordinator')(ctx, async () => {
        try {
            const reportType = ctx.params.reportType;
            const url = new URL(ctx.request.url);
            const term = url.searchParams.get('term') || undefined;
            const limit = parseInt(url.searchParams.get('limit') || '10');
            
            if (!['course-allocations', 'student-assignments', 'hours-comparison'].includes(reportType!)) {
                ctx.response.status = 400;
                ctx.response.body = { error: 'Invalid report type' };
                return;
            }
            
            let data: any[];
            switch (reportType) {
                case 'course-allocations':
                    data = await exportModel.getCourseAllocationReportData(term);
                    break;
                case 'student-assignments':
                    data = await exportModel.getStudentAssignmentReportData(term);
                    break;
                case 'hours-comparison':
                    data = await exportModel.getHoursComparisonReportData(term);
                    break;
                default:
                    throw new Error('Invalid report type');
            }
            
            const previewData = data.slice(0, limit);
            
            ctx.response.body = { 
                success: true, 
                data: previewData,
                total: data.length,
                preview: true,
                term: term || 'All Terms'
            };
        } catch (error) {
            console.error('Error generating preview:', error);
            ctx.response.status = 500;
            ctx.response.body = { error: 'Failed to generate preview' };
        }
    });
});

// =============================================================================
// ACADEMIC TERMS ENDPOINTS
// =============================================================================

/**
 * GET /terms/active
 * Get all active terms (currently returns all terms as they are all considered upcoming)
 * Accessible by both admin and TA coordinator roles
 */
taCoordinatorRouter.get(
  "/terms/active",
  async (ctx: Context, next) => {
    // Allow both admin and ta_coordinator roles
    const accessToken = await ctx.cookies.get("access_token");
    if (!accessToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No access token provided" };
      return;
    }

    const tokenResult = await authService.verifyToken(accessToken);
    if (
      !tokenResult.success ||
      (tokenResult.user?.role !== "admin" &&
        tokenResult.user?.role !== "ta_coordinator")
    ) {
      ctx.response.status = Status.Forbidden;
      ctx.response.body = { error: "Admin or TA Coordinator access required" };
      return;
    }
    await next();
  },
  async (ctx: Context) => {
    try {
      // Since all terms are now 'upcoming', return all terms
      const allTerms = await termModel.getAllTerms();
      ctx.response.status = Status.OK;
      ctx.response.body = allTerms;
    } catch (error) {
      console.error("Error fetching terms:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch terms" };
    }
  }
);

/**
 * GET /terms
 * Get all terms
 * Accessible by both admin and TA coordinator roles
 */
taCoordinatorRouter.get(
  "/terms",
  async (ctx: Context, next) => {
    // Allow both admin and ta_coordinator roles
    const accessToken = await ctx.cookies.get("access_token");
    if (!accessToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No access token provided" };
      return;
    }

    const tokenResult = await authService.verifyToken(accessToken);
    if (
      !tokenResult.success ||
      (tokenResult.user?.role !== "admin" &&
        tokenResult.user?.role !== "ta_coordinator")
    ) {
      ctx.response.status = Status.Forbidden;
      ctx.response.body = { error: "Admin or TA Coordinator access required" };
      return;
    }
    await next();
  },
  async (ctx: Context) => {
    try {
      const terms = await termModel.getAllTerms();
      ctx.response.status = Status.OK;
      ctx.response.body = terms;
    } catch (error) {
      console.error("Error fetching terms:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch terms" };
    }
  }
);

/**
 * POST /terms
 * Create a new academic term
 * Validates that start date is not in the past and end date is after start date
 */
taCoordinatorRouter.post(
  "/terms",
  async (ctx: Context, next) => {
    // Allow both admin and ta_coordinator roles
    const accessToken = await ctx.cookies.get("access_token");
    if (!accessToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No access token provided" };
      return;
    }

    const tokenResult = await authService.verifyToken(accessToken);
    if (
      !tokenResult.success ||
      (tokenResult.user?.role !== "admin" &&
        tokenResult.user?.role !== "ta_coordinator")
    ) {
      ctx.response.status = Status.Forbidden;
      ctx.response.body = { error: "Admin or TA Coordinator access required" };
      return;
    }
    await next();
  },
  async (ctx: Context) => {
    try {
      const body = await ctx.request.body({ type: "json" }).value;
      const { name, start_date, end_date } = body;

      // Validate required fields
      if (!name || !start_date || !end_date) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          error: "Name, start_date, and end_date are required",
        };
        return;
      }

      // Validate dates
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to beginning of day for fair comparison
      
      // Validate that start date is not in the past (from feature/reports-generation)
      if (startDate < today) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Start date cannot be in the past" };
        return;
      }
      
      if (startDate >= endDate) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Start date must be before end date" };
        return;
      }

      const newTerm = await termModel.createTerm({
        name,
        start_date,
        end_date,
      });

      ctx.response.status = Status.Created;
      ctx.response.body = newTerm;
    } catch (error) {
      console.error("Error creating term:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to create term" };
    }
  }
);

/**
 * PUT /terms/:termId
 * Update an existing academic term
 * Validates dates if provided
 */
taCoordinatorRouter.put(
  "/terms/:termId",
  requireAdminOrTACoordinator,
  async (ctx: RouterContext<"/terms/:termId">) => {
    try {
      const termId = parseInt(ctx.params.termId);

      // Check if term exists
      const existingTerm = await termModel.getTermById(termId);
      if (!existingTerm) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Term not found" };
        return;
      }

      const body = await ctx.request.body({ type: "json" }).value;
      const updates = {
        name: body.name,
        start_date: body.start_date,
        end_date: body.end_date,
      };

      // Remove undefined fields
      Object.keys(updates).forEach((key) => {
        if (updates[key as keyof typeof updates] === undefined) {
          delete updates[key as keyof typeof updates];
        }
      });

      // Validate dates if provided
      if (updates.start_date || updates.end_date) {
        const startDate = new Date(updates.start_date || existingTerm.start_date);
        const endDate = new Date(updates.end_date || existingTerm.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to beginning of day for fair comparison
        
        // Validate that start date is not in the past (from feature/reports-generation)
        if (startDate < today) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Start date cannot be in the past" };
          return;
        }
        
        if (startDate >= endDate) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Start date must be before end date" };
          return;
        }
      }

      const updatedTerm = await termModel.updateTerm(termId, updates);
      ctx.response.status = Status.OK;
      ctx.response.body = updatedTerm;
    } catch (error) {
      console.error("Error updating term:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to update term" };
    }
  }
);

/**
 * DELETE /terms/:termId
 * Delete an academic term
 */
taCoordinatorRouter.delete(
  "/terms/:termId",
  requireAdminOrTACoordinator,
  async (ctx: RouterContext<"/terms/:termId">) => {
    try {
      const termId = parseInt(ctx.params.termId);

      // Check if term exists
      const existingTerm = await termModel.getTermById(termId);
      if (!existingTerm) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Term not found" };
        return;
      }

      const success = await termModel.deleteTerm(termId);
      ctx.response.status = success ? Status.OK : Status.NotFound;
      ctx.response.body = { success };
    } catch (error) {
      console.error("Error deleting term:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to delete term" };
    }
  }
);

// =============================================================================
// COURSE OFFERINGS ENDPOINTS (Extended from existing courseRouter)
// =============================================================================

/**
 * GET /courses
 * Get all courses with their lab sections
 * Accessible by both admin and TA coordinator roles
 */
taCoordinatorRouter.get(
  "/courses",
  async (ctx: Context, next) => {
    // Allow both admin and ta_coordinator roles
    const accessToken = await ctx.cookies.get("access_token");
    if (!accessToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No access token provided" };
      return;
    }

    const tokenResult = await authService.verifyToken(accessToken);
    if (
      !tokenResult.success ||
      (tokenResult.user?.role !== "admin" &&
        tokenResult.user?.role !== "ta_coordinator")
    ) {
      ctx.response.status = Status.Forbidden;
      ctx.response.body = { error: "Admin or TA Coordinator access required" };
      return;
    }
    await next();
  },
  async (ctx: Context) => {
    try {
      const courses = await courseModel.getAllCourses();

      // Add lab sections to each course
      const coursesWithLabSections = await Promise.all(
        courses.map(async (course) => {
          const labSections = course.course_id
            ? await labSectionModel.getLabSectionsByCourse(course.course_id)
            : [];
          return {
            ...course,
            lab_sections: labSections,
          };
        })
      );

      ctx.response.status = Status.OK;
      ctx.response.body = coursesWithLabSections;
    } catch (error) {
      console.error("Error fetching courses:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch courses" };
    }
  }
);

/**
 * GET /courses/term/:termId
 * Get courses filtered by term
 */
taCoordinatorRouter.get(
  "/courses/term/:termId",
  requireAdminOrTACoordinator,
  async (ctx: RouterContext<"/courses/term/:termId">) => {
    try {
      const termId = parseInt(ctx.params.termId);

      // First verify term exists
      const term = await termModel.getTermById(termId);
      if (!term) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Term not found" };
        return;
      }

      const courses = await courseModel.getCoursesByTerm(term.name);
      ctx.response.status = Status.OK;
      ctx.response.body = courses;
    } catch (error) {
      console.error("Error fetching courses by term:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch courses by term" };
    }
  }
);

/**
 * POST /courses
 * Create a new course with optional lab sections
 * Includes audit logging
 */
taCoordinatorRouter.post(
  "/courses",
  async (ctx: Context, next) => {
    // Allow both admin and ta_coordinator roles
    const accessToken = await ctx.cookies.get("access_token");
    if (!accessToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No access token provided" };
      return;
    }

    const tokenResult = await authService.verifyToken(accessToken);
    if (
      !tokenResult.success ||
      (tokenResult.user?.role !== "admin" &&
        tokenResult.user?.role !== "ta_coordinator")
    ) {
      ctx.response.status = Status.Forbidden;
      ctx.response.body = { error: "Admin or TA Coordinator access required" };
      return;
    }

    // Store user in context for audit logging
    ctx.state.user = tokenResult.user;
    await next();
  },
  async (ctx: Context) => {
    try {
      const body = await ctx.request.body({ type: "json" }).value;
      const {
        code,
        title,
        term,
        instructor_id,
        dept_id,
        course_days,
        course_time,
        course_frequency,
        lab_sections,
      } = body;

      // Validate required fields
      if (!code || !title || !term) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Code, title, and term are required" };
        return;
      }

      // Validate course_frequency if provided
      if (
        course_frequency &&
        !["weekly", "bi-weekly"].includes(course_frequency)
      ) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          error: "Course frequency must be either 'weekly' or 'bi-weekly'",
        };
        return;
      }

      // Validate instructor if provided
      if (instructor_id) {
        const instructor = await userModel.getUserById(instructor_id);
        if (!instructor || instructor.role !== "instructor") {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid instructor ID" };
          return;
        }
      }

      // Validate lab sections if provided
      if (lab_sections && Array.isArray(lab_sections)) {
        for (const labSection of lab_sections) {
          if (
            !labSection.section_name ||
            !labSection.lab_days ||
            !labSection.lab_start_time ||
            !labSection.lab_end_time
          ) {
            ctx.response.status = Status.BadRequest;
            ctx.response.body = {
              error:
                "All lab section fields (section_name, lab_days, lab_start_time, lab_end_time) are required",
            };
            return;
          }
        }
      }

      const newCourse = await courseModel.createCourse({
        code,
        title,
        term,
        instructor_id: instructor_id || null,
        dept_id: dept_id || null, // No default department - make it optional
        max_tas: 0, // Set default to 0 since instructors will determine actual needs
        course_days: course_days || null,
        course_time: course_time || null,
        course_frequency: course_frequency || null,
      });

      // Create lab sections if provided
      if (lab_sections && Array.isArray(lab_sections) && newCourse.course_id) {
        for (const labSection of lab_sections) {
          await labSectionModel.createLabSection({
            course_id: newCourse.course_id,
            section_name: labSection.section_name,
            lab_days: labSection.lab_days,
            lab_start_time: labSection.lab_start_time,
            lab_end_time: labSection.lab_end_time,
            ta_id: labSection.ta_id || null,
          });
        }
      }

      // Log course creation
      const user = (ctx.state as any).user;
      await auditLogger.logSystemConfig(
        "CREATE",
        user.user_id!,
        user.email,
        "Course",
        newCourse.course_id?.toString(),
        `Created course ${code} - ${title} for term ${term}`
      );

      // Fetch the complete course with lab sections
      const labSections = newCourse.course_id
        ? await labSectionModel.getLabSectionsByCourse(newCourse.course_id)
        : [];
      const courseWithLabSections = {
        ...newCourse,
        lab_sections: labSections,
      };

      ctx.response.status = Status.Created;
      ctx.response.body = courseWithLabSections;
    } catch (error) {
      console.error("Error creating course:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to create course" };
    }
  }
);

/**
 * PUT /courses/:courseId
 * Update a course and optionally its lab sections
 * TA coordinators cannot modify max_tas
 */
taCoordinatorRouter.put(
  "/courses/:courseId",
  async (ctx: Context, next) => {
    await requireAdminOrTACoordinator(ctx, next);
  },
  async (ctx: RouterContext<"/courses/:courseId">) => {
    try {
      const courseId = parseInt(ctx.params.courseId);
      if (isNaN(courseId)) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid course ID" };
        return;
      }

      const body = await ctx.request.body({ type: "json" }).value;
      const {
        code,
        title,
        term,
        instructor_id,
        dept_id,
        course_days,
        course_time,
        course_frequency,
        lab_sections,
      } = body;

      // Verify course exists
      const existingCourse = await courseModel.getCourseById(courseId);
      if (!existingCourse) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Course not found" };
        return;
      }

      // Validate course_frequency if provided
      if (
        course_frequency &&
        !["weekly", "bi-weekly"].includes(course_frequency)
      ) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          error: "Course frequency must be either 'weekly' or 'bi-weekly'",
        };
        return;
      }

      // Validate instructor if provided
      if (instructor_id) {
        const instructor = await userModel.getUserById(instructor_id);
        if (!instructor || instructor.role !== "instructor") {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid instructor ID" };
          return;
        }
      }

      // Prepare updates object (TA coordinators cannot modify max_tas)
      const updates: Record<string, unknown> = {};
      if (code !== undefined) updates.code = code;
      if (title !== undefined) updates.title = title;
      if (term !== undefined) updates.term = term;
      if (instructor_id !== undefined) updates.instructor_id = instructor_id;
      if (dept_id !== undefined) updates.dept_id = dept_id;
      if (course_days !== undefined) updates.course_days = course_days;
      if (course_time !== undefined) updates.course_time = course_time;
      if (course_frequency !== undefined)
        updates.course_frequency = course_frequency;

      const updatedCourse = await courseModel.updateCourse(courseId, updates);

      // Handle lab sections updates if provided
      if (lab_sections && Array.isArray(lab_sections)) {
        // Validate lab sections
        for (const labSection of lab_sections) {
          if (
            !labSection.section_name ||
            !labSection.lab_days ||
            !labSection.lab_start_time ||
            !labSection.lab_end_time
          ) {
            ctx.response.status = Status.BadRequest;
            ctx.response.body = {
              error:
                "All lab section fields (section_name, lab_days, lab_start_time, lab_end_time) are required",
            };
            return;
          }
        }

        // Delete existing lab sections for this course
        await labSectionModel.deleteLabSectionsByCourse(courseId);

        // Create new lab sections
        for (const labSection of lab_sections) {
          await labSectionModel.createLabSection({
            course_id: courseId,
            section_name: labSection.section_name,
            lab_days: labSection.lab_days,
            lab_start_time: labSection.lab_start_time,
            lab_end_time: labSection.lab_end_time,
            ta_id: labSection.ta_id || null,
          });
        }
      }

      // Fetch the complete course with lab sections
      const labSectionsData = await labSectionModel.getLabSectionsByCourse(
        courseId
      );
      const courseWithLabSections = {
        ...updatedCourse,
        lab_sections: labSectionsData,
      };

      ctx.response.status = Status.OK;
      ctx.response.body = courseWithLabSections;
    } catch (error) {
      console.error("Error updating course:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to update course" };
    }
  }
);

/**
 * DELETE /courses/:courseId
 * Delete a course (cascades to related data)
 */
taCoordinatorRouter.delete(
  "/courses/:courseId",
  async (ctx: Context, next) => {
    await requireAdminOrTACoordinator(ctx, next);
  },
  async (ctx: RouterContext<"/courses/:courseId">) => {
    try {
      const courseId = parseInt(ctx.params.courseId);
      if (isNaN(courseId)) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid course ID" };
        return;
      }

      // Verify course exists
      const existingCourse = await courseModel.getCourseById(courseId);
      if (!existingCourse) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Course not found" };
        return;
      }

      // Delete the course (this will also cascade delete related data)
      const success = await courseModel.deleteCourse(courseId);

      ctx.response.status = Status.OK;
      ctx.response.body = {
        success,
        message: success
          ? "Course deleted successfully"
          : "Failed to delete course",
      };
    } catch (error) {
      console.error("Error deleting course:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to delete course" };
    }
  }
);

// =============================================================================
// LAB SECTIONS ENDPOINTS
// =============================================================================

/**
 * GET /courses/:courseId/lab-sections
 * Get lab sections for a specific course
 */
taCoordinatorRouter.get(
  "/courses/:courseId/lab-sections",
  requireAdminOrTACoordinator,
  async (ctx: RouterContext<"/courses/:courseId/lab-sections">) => {
    try {
      const courseId = parseInt(ctx.params.courseId);
      if (isNaN(courseId)) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid course ID" };
        return;
      }

      // Verify course exists
      const course = await courseModel.getCourseById(courseId);
      if (!course) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Course not found" };
        return;
      }

      const labSections = await labSectionModel.getLabSectionsByCourse(
        courseId
      );
      ctx.response.status = Status.OK;
      ctx.response.body = labSections;
    } catch (error) {
      console.error("Error fetching lab sections:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch lab sections" };
    }
  }
);

/**
 * POST /courses/:courseId/lab-sections
 * Create a new lab section for a course
 */
taCoordinatorRouter.post(
  "/courses/:courseId/lab-sections",
  requireAdminOrTACoordinator,
  async (ctx: RouterContext<"/courses/:courseId/lab-sections">) => {
    try {
      const courseId = parseInt(ctx.params.courseId);
      if (isNaN(courseId)) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid course ID" };
        return;
      }

      // Verify course exists
      const course = await courseModel.getCourseById(courseId);
      if (!course) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Course not found" };
        return;
      }

      const body = await ctx.request.body({ type: "json" }).value;
      const { section_name, lab_days, lab_start_time, lab_end_time, ta_id } =
        body;

      // Validate required fields
      if (!section_name || !lab_days || !lab_start_time || !lab_end_time) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          error:
            "section_name, lab_days, lab_start_time, and lab_end_time are required",
        };
        return;
      }

      // Validate TA if provided
      if (ta_id) {
        const ta = await userModel.getUserById(ta_id);
        if (!ta || ta.role !== "student") {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid TA ID" };
          return;
        }
      }

      const newLabSection = await labSectionModel.createLabSection({
        course_id: courseId,
        section_name,
        lab_days,
        lab_start_time,
        lab_end_time,
        ta_id: ta_id || null,
      });

      ctx.response.status = Status.Created;
      ctx.response.body = newLabSection;
    } catch (error) {
      console.error("Error creating lab section:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to create lab section" };
    }
  }
);

/**
 * PUT /lab-sections/:labSectionId
 * Update a lab section
 */
taCoordinatorRouter.put(
  "/lab-sections/:labSectionId",
  requireAdminOrTACoordinator,
  async (ctx: RouterContext<"/lab-sections/:labSectionId">) => {
    try {
      const labSectionId = parseInt(ctx.params.labSectionId);
      if (isNaN(labSectionId)) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid lab section ID" };
        return;
      }

      // Verify lab section exists
      const existingLabSection = await labSectionModel.getLabSectionById(
        labSectionId
      );
      if (!existingLabSection) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Lab section not found" };
        return;
      }

      const body = await ctx.request.body({ type: "json" }).value;
      const { section_name, lab_days, lab_start_time, lab_end_time, ta_id } =
        body;

      // Validate TA if provided
      if (ta_id) {
        const ta = await userModel.getUserById(ta_id);
        if (!ta || ta.role !== "student") {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid TA ID" };
          return;
        }
      }

      // Prepare updates object
      const updates: Record<string, unknown> = {};
      if (section_name !== undefined) updates.section_name = section_name;
      if (lab_days !== undefined) updates.lab_days = lab_days;
      if (lab_start_time !== undefined) updates.lab_start_time = lab_start_time;
      if (lab_end_time !== undefined) updates.lab_end_time = lab_end_time;
      if (ta_id !== undefined) updates.ta_id = ta_id;

      const updatedLabSection = await labSectionModel.updateLabSection(
        labSectionId,
        updates
      );

      ctx.response.status = Status.OK;
      ctx.response.body = updatedLabSection;
    } catch (error) {
      console.error("Error updating lab section:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to update lab section" };
    }
  }
);

/**
 * DELETE /lab-sections/:labSectionId
 * Delete a lab section
 */
taCoordinatorRouter.delete(
  "/lab-sections/:labSectionId",
  requireAdminOrTACoordinator,
  async (ctx: RouterContext<"/lab-sections/:labSectionId">) => {
    try {
      const labSectionId = parseInt(ctx.params.labSectionId);
      if (isNaN(labSectionId)) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid lab section ID" };
        return;
      }

      // Verify lab section exists
      const existingLabSection = await labSectionModel.getLabSectionById(
        labSectionId
      );
      if (!existingLabSection) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Lab section not found" };
        return;
      }

      const success = await labSectionModel.deleteLabSection(labSectionId);

      ctx.response.status = Status.OK;
      ctx.response.body = {
        success,
        message: success
          ? "Lab section deleted successfully"
          : "Failed to delete lab section",
      };
    } catch (error) {
      console.error("Error deleting lab section:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to delete lab section" };
    }
  }
);

/**
 * GET /lab-sections
 * Get all lab sections with course information
 */
taCoordinatorRouter.get(
  "/lab-sections",
  requireAdminOrTACoordinator,
  async (ctx: Context) => {
    try {
      const labSections = await labSectionModel.getLabSectionsWithCourseInfo();
      ctx.response.status = Status.OK;
      ctx.response.body = labSections;
    } catch (error) {
      console.error("Error fetching all lab sections:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch lab sections" };
    }
  }
);

/**
 * GET /instructors
 * Get all instructors in the system
 */
taCoordinatorRouter.get("/instructors", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const instructors = await userModel.getUsersByRole("instructor");
      ctx.response.body = { instructors };
    } catch (error) {
      console.error("Error fetching instructors:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to fetch instructors" };
    }
  });
});

/**
 * GET /courses/unassigned
 * Get courses without instructors assigned
 */
taCoordinatorRouter.get("/courses/unassigned", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const courses = await courseModel.getCoursesWithoutInstructors();
      ctx.response.body = { courses };
    } catch (error) {
      console.error("Error fetching unassigned courses:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to fetch unassigned courses" };
    }
  });
});

/**
 * GET /courses/assignments
 * Get courses with their instructor assignments
 */
taCoordinatorRouter.get("/courses/assignments", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const assignments = await courseModel.getCoursesWithInstructors();
      ctx.response.body = { assignments };
    } catch (error) {
      console.error("Error fetching course assignments:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to fetch course assignments" };
    }
  });
});

/**
 * PUT /courses/:courseId/instructor
 * Assign an instructor to a course
 */
taCoordinatorRouter.put("/courses/:courseId/instructor", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const courseId = parseInt(ctx.params.courseId!);
      if (isNaN(courseId)) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid course ID" };
        return;
      }

      const requestBody = await ctx.request.body({ type: "json" }).value;
      const schema = z.object({
        instructor_id: z.number().positive("Instructor ID must be positive"),
      });

      const validation = schema.safeParse(requestBody);
      if (!validation.success) {
        ctx.response.status = 400;
        ctx.response.body = {
          error: "Validation failed",
          details: validation.error.errors,
        };
        return;
      }

      const { instructor_id } = validation.data;

      // Verify instructor exists and has instructor role
      const instructor = await userModel.getUserById(instructor_id);
      if (!instructor || instructor.role !== "instructor") {
        ctx.response.status = 404;
        ctx.response.body = { error: "Instructor not found" };
        return;
      }

      // Verify course exists
      const course = await courseModel.getCourseById(courseId);
      if (!course) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Course not found" };
        return;
      }

      // Assign instructor to course
      const updatedCourse = await courseModel.updateCourse(courseId, {
        instructor_id: instructor_id,
      });

      ctx.response.body = {
        message: "Instructor assigned successfully",
        course: updatedCourse,
      };
    } catch (error) {
      console.error("Error assigning instructor:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to assign instructor" };
    }
  });
});

/**
 * DELETE /courses/:courseId/instructor
 * Unassign instructor from course
 */
taCoordinatorRouter.delete("/courses/:courseId/instructor", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const courseId = parseInt(ctx.params.courseId!);
      if (isNaN(courseId)) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid course ID" };
        return;
      }

      // Verify course exists
      const course = await courseModel.getCourseById(courseId);
      if (!course) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Course not found" };
        return;
      }

      // Unassign instructor from course
      const updatedCourse = await courseModel.updateCourse(courseId, {
        instructor_id: undefined,
      });

      ctx.response.body = {
        message: "Instructor unassigned successfully",
        course: updatedCourse,
      };
    } catch (error) {
      console.error("Error unassigning instructor:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to unassign instructor" };
    }
  });
});

// =============================================================================
// TA REQUEST/NEED REVIEW ENDPOINTS
// =============================================================================

/**
 * GET /ta-requests
 * Get all TA needs with course and instructor information
 */
taCoordinatorRouter.get("/ta-requests", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const requests = await taNeedModel.getAllNeedsWithCourseInfo();
      ctx.response.body = { requests };
    } catch (error) {
      console.error("Error fetching TA requests:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to fetch TA requests" };
    }
  });
});

/**
 * PUT /ta-requests/:needId
 * Update TA need status (approve/reject)
 */
taCoordinatorRouter.put("/ta-requests/:needId", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const needId = parseInt(ctx.params.needId!);
      if (isNaN(needId)) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid need ID" };
        return;
      }

      const requestBody = await ctx.request.body({ type: "json" }).value;
      const schema = z.object({
        status: z.enum(["open", "filled", "cancelled"], {
          required_error: "Status is required",
        }),
        notes: z.string().optional(),
      });

      const validation = schema.safeParse(requestBody);
      if (!validation.success) {
        ctx.response.status = 400;
        ctx.response.body = {
          error: "Validation failed",
          details: validation.error.errors,
        };
        return;
      }

      const { status, notes } = validation.data;

      // Verify the TA need exists
      const existingNeed = await taNeedModel.getNeedById(needId);
      if (!existingNeed) {
        ctx.response.status = 404;
        ctx.response.body = { error: "TA request not found" };
        return;
      }

      // Update the TA need
      const updates: any = { status };
      if (notes) updates.notes = notes;

      const updatedNeed = await taNeedModel.updateNeed(needId, updates);

      // Send notification to instructor about TA request status change
      try {
        const course = await courseModel.getCourseById(existingNeed.course_id);
        if (course && course.instructor_id) {
          await instructorNotificationService.notifyTARequestStatusChange({
            instructorId: course.instructor_id,
            courseId: existingNeed.course_id,
            taRequestId: needId,
            metadata: {
              previous_status: existingNeed.status,
              new_status: status,
              coordinator_notes: notes
            }
          });
          console.log(`📧 Sent TA request status change notification to instructor ${course.instructor_id}`);
        }
      } catch (notificationError) {
        console.error('Failed to send TA request status change notification:', notificationError);
        // Don't fail the request if notification fails
      }

      // CRITICAL FIX: When approving (status = 'filled'), ensure course has lab sections
      if (status === 'filled') {
        const existingLabSections = await labSectionModel.getLabSectionsByCourse(existingNeed.course_id);
        
        if (existingLabSections.length === 0) {
          // Course has no lab sections - create a general one for TA allocation
          console.log(`🔧 Creating general lab section for course ${existingNeed.course_id} (TA request approved but no lab sections)`);
          
          await labSectionModel.createLabSection({
            course_id: existingNeed.course_id,
            section_name: "General TA",
            lab_days: "As Needed", 
            lab_start_time: "Flexible",
            lab_end_time: "Flexible"
          });
          
          console.log(`✅ Created general lab section for course ${existingNeed.course_id}`);
        }
      }

      ctx.response.body = {
        message: "TA request updated successfully",
        request: updatedNeed,
      };
    } catch (error) {
      console.error("Error updating TA request:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to update TA request" };
    }
  });
});

/**
 * GET /ta-requests/stats
 * Get TA request statistics by status
 */
taCoordinatorRouter.get("/ta-requests/stats", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const requests = await taNeedModel.getAllNeedsWithCourseInfo();

      const stats = {
        total: requests.length,
        open: requests.filter((r) => r.status === "open").length,
        filled: requests.filter((r) => r.status === "filled").length,
        cancelled: requests.filter((r) => r.status === "cancelled").length,
      };

      ctx.response.body = { stats };
    } catch (error) {
      console.error("Error fetching TA request stats:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to fetch TA request statistics" };
    }
  });
});

/**
 * DELETE /ta-requests/:needId
 * Delete a TA request/need
 */
taCoordinatorRouter.delete("/ta-requests/:needId", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const needId = parseInt(ctx.params.needId!);
      if (isNaN(needId)) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid need ID" };
        return;
      }

      // Verify the TA need exists
      const existingNeed = await taNeedModel.getNeedById(needId);
      if (!existingNeed) {
        ctx.response.status = 404;
        ctx.response.body = { error: "TA request not found" };
        return;
      }

      // Delete the TA need
      const success = await taNeedModel.deleteNeed(needId);

      if (!success) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to delete TA request" };
        return;
      }

      ctx.response.body = {
        message: "TA request deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting TA request:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to delete TA request" };
    }
  });
});

// =============================================================================
// STUDENT APPLICATION MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * GET /applications
 * Get all student applications with full details
 */
taCoordinatorRouter.get("/applications", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const applications =
        await applicationModel.getAllApplicationsWithDetails();
      ctx.response.body = { applications };
    } catch (error) {
      console.error("Error fetching applications:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to fetch applications" };
    }
  });
});

/**
 * GET /applications/stats
 * Get application statistics by status
 */
taCoordinatorRouter.get("/applications/stats", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const stats = await applicationModel.getApplicationStats();
      ctx.response.body = { stats };
    } catch (error) {
      console.error("Error fetching application stats:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to fetch application statistics" };
    }
  });
});

/**
 * GET /applications/status/:status
 * Get applications filtered by status
 */
taCoordinatorRouter.get("/applications/status/:status", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const status = ctx.params.status as "pending" | "approved" | "rejected";

      if (!["pending", "approved", "rejected"].includes(status)) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid status parameter" };
        return;
      }

      const applications = await applicationModel.getApplicationsByStatus(
        status
      );
      ctx.response.body = { applications };
    } catch (error) {
      console.error("Error fetching applications by status:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to fetch applications by status" };
    }
  });
});

/**
 * PUT /applications/:applicationId
 * Update application status (approve/reject) with notifications
 */
taCoordinatorRouter.put("/applications/:applicationId", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const applicationId = parseInt(ctx.params.applicationId!);
      if (isNaN(applicationId)) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid application ID" };
        return;
      }

      const requestBody = await ctx.request.body({ type: "json" }).value;
      const schema = z.object({
        status: z.enum(["pending", "approved", "rejected"], {
          required_error: "Status is required",
        }),
        notes: z.string().optional(),
      });

      const validation = schema.safeParse(requestBody);
      if (!validation.success) {
        ctx.response.status = 400;
        ctx.response.body = {
          error: "Validation failed",
          details: validation.error.errors,
        };
        return;
      }

      const { status, notes } = validation.data;

      // Verify the application exists
      const existingApplication = await applicationModel.getApplicationById(
        applicationId
      );
      if (!existingApplication) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Application not found" };
        return;
      }

      // Get current user for audit logging
      const currentUser = (ctx.state as any).user;

      // Update the application status with audit logging
      const updatedApplication = await applicationModel.updateApplicationStatus(
        applicationId,
        status,
        notes,
        currentUser?.user_id,
        currentUser?.email
      );

      // Send notification to student if status changed
      try {
        if (status === "approved") {
          if (typeof existingApplication.user_id === "number") {
            await notificationService.notifyApplicationAccepted(
              existingApplication.user_id,
              applicationId
            );
          }
        } else if (status === "rejected" && existingApplication.user_id) {
          await notificationService.notifyApplicationRejected(
            existingApplication.user_id,
            applicationId
          );
        }
      } catch (notificationError) {
        console.error(
          "Failed to send application status notification:",
          notificationError
        );
      }

      ctx.response.body = {
        message: "Application updated successfully",
        application: updatedApplication,
      };
    } catch (error) {
      console.error("Error updating application:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to update application" };
    }
  });
});

/**
 * GET /applications/:applicationId
 * Get detailed application by ID
 */
taCoordinatorRouter.get("/applications/:applicationId", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const applicationId = parseInt(ctx.params.applicationId!);
      if (isNaN(applicationId)) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid application ID" };
        return;
      }

      const application = await applicationModel.getApplicationById(
        applicationId
      );
      if (!application) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Application not found" };
        return;
      }

      ctx.response.body = { application };
    } catch (error) {
      console.error("Error fetching application details:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to fetch application details" };
    }
  });
});

/**
 * DELETE /applications/:applicationId
 * Delete an application
 */
taCoordinatorRouter.delete("/applications/:applicationId", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const applicationId = parseInt(ctx.params.applicationId!);
      if (isNaN(applicationId)) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid application ID" };
        return;
      }

      // Verify the application exists
      const existingApplication = await applicationModel.getApplicationById(
        applicationId
      );
      if (!existingApplication) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Application not found" };
        return;
      }

      // Delete the application
      const success = await applicationModel.deleteApplication(applicationId);

      if (!success) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to delete application" };
        return;
      }

      ctx.response.body = {
        message: "Application deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting application:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to delete application" };
    }
  });
});

// =============================================================================
// STUDENT ALLOCATION MANAGEMENT ENDPOINTS (UR2.6)
// =============================================================================

/**
 * GET /allocations/approved-applications
 * Get all approved applications available for allocation
 */
taCoordinatorRouter.get("/allocations/approved-applications", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const applications = await allocationModel.getApprovedApplications();
      ctx.response.body = { applications };
    } catch (error) {
      console.error("Error fetching approved applications:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to fetch approved applications" };
    }
  });
});

/**
 * GET /allocations/lab-sections
 * Get all lab sections with their TA slot information
 */
taCoordinatorRouter.get("/allocations/lab-sections", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const labSections = await allocationModel.getLabSectionsWithSlots();
      ctx.response.body = { labSections };
    } catch (error) {
      console.error("Error fetching lab sections:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to fetch lab sections" };
    }
  });
});

/**
 * GET /allocations/stats
 * Get allocation statistics
 */
taCoordinatorRouter.get("/allocations/stats", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const stats = await allocationModel.getAllocationStats();
      ctx.response.body = { stats };
    } catch (error) {
      console.error("Error fetching allocation stats:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to fetch allocation statistics" };
    }
  });
});

/**
 * POST /allocations/assign
 * Assign a student to a lab section with notification
 */
taCoordinatorRouter.post("/allocations/assign", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const requestBody = await ctx.request.body({ type: "json" }).value;
      const schema = z.object({
        userId: z.number({ required_error: "User ID is required" }),
        labSectionId: z.number({ required_error: "Lab Section ID is required" }),
        notes: z.string().optional(),
        isMarker: z.boolean().optional(),
      });

      const validation = schema.safeParse(requestBody);
      if (!validation.success) {
        ctx.response.status = 400;
        ctx.response.body = {
          error: "Validation failed",
          details: validation.error.errors,
        };
        return;
      }

      const { userId, labSectionId, notes, isMarker } = validation.data;

      // Get the current user (TA coordinator) ID from the authenticated session
      const currentUser = (ctx.state as any).user;
      const allocatedBy = currentUser?.user_id;

      if (!allocatedBy) {
        ctx.response.status = 401;
        ctx.response.body = { error: "Unable to identify the allocating user" };
        return;
      }

      // Create the allocation with audit logging
      const allocation = await allocationModel.assignStudentToLabSection(
        userId,
        labSectionId,
        allocatedBy,
        notes,
        currentUser?.email,
        undefined,
        undefined,
        isMarker
      );

      // Send notification to student about allocation
      try {
        await notificationService.notifyAllocationConfirmed(
          userId,
          labSectionId
        );
      } catch (notificationError) {
        console.error(
          "Failed to send allocation notification:",
          notificationError
        );
      }

      // Send notification to instructor about the allocation
      try {
        // Get lab section details to find the course and instructor
        const labSection = await labSectionModel.getLabSectionById(labSectionId);
        if (labSection && labSection.course_id) {
          const course = await courseModel.getCourseById(labSection.course_id);
          if (course && course.instructor_id) {
            await instructorNotificationService.notifyAllocationConfirmation({
              instructorId: course.instructor_id,
              courseId: course.course_id,
              metadata: {
                student_id: userId,
                lab_section_id: labSectionId,
                allocated_by: allocatedBy,
                auto_generated: false
              }
            });
          }
        }
      } catch (instructorNotificationError) {
        console.error(
          "Failed to send instructor allocation notification:",
          instructorNotificationError
        );
        // Continue even if instructor notification fails
      }

      // Return the allocation data in consistent format
      ctx.response.body = { 
        success: true,
        message: "Student assigned successfully",
        data: allocation 
      };
    } catch (error) {
      console.error("Error assigning student:", error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: error instanceof Error ? error.message : "Failed to assign student to lab section",
      };
    }
  });
});

/**
 * DELETE /allocations/:allocationId
 * Unassign a student from a lab section
 */
taCoordinatorRouter.delete("/allocations/:allocationId", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const allocationId = parseInt(ctx.params.allocationId!);
      if (isNaN(allocationId)) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid allocation ID" };
        return;
      }

      // Get current user for audit logging
      const currentUser = (ctx.state as any).user;

      const success = await allocationModel.unassignStudent(
        allocationId,
        currentUser?.user_id,
        currentUser?.email
      );

      if (!success) {
        ctx.response.status = 404;
        ctx.response.body = {
          error: "Allocation not found or already inactive",
        };
        return;
      }

      ctx.response.body = {
        message: "Student unassigned successfully",
      };
    } catch (error) {
      console.error("Error unassigning student:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to unassign student" };
    }
  });
});

// Update marker designation for an allocation
taCoordinatorRouter.put("/allocations/:allocationId/marker", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const allocationId = parseInt(ctx.params.allocationId!);
      if (isNaN(allocationId)) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid allocation ID" };
        return;
      }

      const requestBody = await ctx.request.body({ type: "json" }).value;
      const schema = z.object({
        isMarker: z.boolean({
          required_error: "isMarker is required",
        }),
      });

      const validation = schema.safeParse(requestBody);
      if (!validation.success) {
        ctx.response.status = 400;
        ctx.response.body = {
          error: "Validation failed",
          details: validation.error.errors,
        };
        return;
      }

      const { isMarker } = validation.data;

      // Get current user for audit logging
      const currentUser = (ctx.state as any).user;

      const updatedAllocation = await allocationModel.updateMarkerDesignation(
        allocationId,
        isMarker,
        currentUser?.user_id,
        currentUser?.email
      );

      if (!updatedAllocation) {
        ctx.response.status = 404;
        ctx.response.body = {
          error: "Allocation not found",
        };
        return;
      }

      ctx.response.body = {
        message: "Marker designation updated successfully",
        allocation: updatedAllocation,
      };
    } catch (error) {
      console.error("Error updating marker designation:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to update marker designation" };
    }
  });
});

/**
 * GET /allocations/student/:userId
 * Get student assignment history
 */
taCoordinatorRouter.get("/allocations/student/:userId", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const userId = parseInt(ctx.params.userId!);
      if (isNaN(userId)) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid user ID" };
        return;
      }

      const assignments = await allocationModel.getStudentAssignments(userId);
      ctx.response.body = { assignments };
    } catch (error) {
      console.error("Error fetching student assignments:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to fetch student assignments" };
    }
  });
});