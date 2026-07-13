import { Context, Router, RouterContext, Status, z } from "../../../deps.ts";
import { ArchiveModel } from "../../database/models/archive.ts";
import { TermModel } from "../../database/models/term.ts";
import { requireAuth } from "../middleware/auth.ts";
import { AuditLogger } from "../services/auditLogger.ts";
import { AuthService } from "../services/auth.ts";


export const archiveRouter = new Router();

// Dependencies - to be injected
let archiveModel: ArchiveModel;
let termModel: TermModel;
let authService: AuthService;
let auditLogger: AuditLogger;

export function setArchiveDependencies(
  archiveModelParam: ArchiveModel,
  termModelParam: TermModel,
  authServiceParam: AuthService,
  auditLoggerParam: AuditLogger
): void {
  archiveModel = archiveModelParam;
  termModel = termModelParam;
  authService = authServiceParam;
  auditLogger = auditLoggerParam;
}

// FIXED VERSION:
async function requireAdminOrTACoordinator(ctx: Context, next: () => Promise<unknown>) {
  // Get access token from cookie
  const accessToken = await ctx.cookies.get("access_token");
  
  if (!accessToken) {
    ctx.response.status = Status.Unauthorized;
    ctx.response.body = { error: "No access token provided" };
    return;
  }

  // Verify token
  const result = await authService.verifyToken(accessToken);
  
  if (!result.success || !result.user) {
    ctx.response.status = Status.Unauthorized;
    ctx.response.body = { error: result.error || "Invalid token" };
    return;
  }

  // Extract and format user ID
  const userId = result.user.user_id;
  if (!userId) {
    ctx.response.status = Status.Unauthorized;
    ctx.response.body = { error: "Invalid user data in token" };
    return;
  }

  // Add user to context state
  ctx.state.user = {
    id: typeof userId === 'string' ? parseInt(userId) : userId,
    email: result.user.email,
    name: result.user.name,
    role: result.user.role
  };

  // Check role BEFORE calling next()
  if (!['admin', 'ta_coordinator'].includes(ctx.state.user.role)) {
    ctx.response.status = Status.Forbidden;
    ctx.response.body = { error: "Admin or TA Coordinator access required" };
    return;
  }

  // Only call next() if all checks pass
  await next();
}


// Validation schemas
const archiveTermSchema = z.object({
  notes: z.string().optional()
});

const searchSchema = z.object({
  year: z.number().optional(),
  term_name: z.string().optional(),
  archived_by: z.number().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
});

// =============================================================================
// ADMIN/TA COORDINATOR ENDPOINTS (Archive Management)
// =============================================================================

/**
 * POST /api/admin/terms/:termId/archive
 * Archive a term (Admin/TA Coordinator only)
 */
archiveRouter.post(
  '/admin/terms/:termId/archive',
  requireAdminOrTACoordinator,
  async (ctx: RouterContext<"/admin/terms/:termId/archive">) => {
    try {
      const termId = parseInt(ctx.params.termId);
      const userId = ctx.state.user.id;
      
      if (isNaN(termId)) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid term ID" };
        return;
      }

      const body = await ctx.request.body({ type: "json" }).value;
      const validation = archiveTermSchema.safeParse(body);
      
      if (!validation.success) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          error: "Invalid input",
          details: validation.error.errors
        };
        return;
      }

      const { notes } = validation.data;

      // Archive the term
      const archivedTerm = await archiveModel.archiveTerm(termId, userId, notes);

      // Log the action
      await auditLogger.logSystemConfig(
        'UPDATE',
        userId,
        ctx.state.user.email,
        'Term Archive',
        termId.toString(),
        `Archived term: ${archivedTerm.name}`
      );

      ctx.response.status = Status.OK;
      ctx.response.body = {
        message: "Term archived successfully",
        term: archivedTerm
      };

    } catch (error) {
      console.error("Error archiving term:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { 
        error: error instanceof Error ? error.message : "Failed to archive term" 
      };
    }
  }
);

/**
 * POST /api/admin/terms/:termId/unarchive
 * Unarchive a term (Admin/TA Coordinator only)
 */
archiveRouter.post(
  '/admin/terms/:termId/unarchive',
  requireAdminOrTACoordinator,
  async (ctx: RouterContext<"/admin/terms/:termId/unarchive">) => {
    try {
      const termId = parseInt(ctx.params.termId);
      const userId = ctx.state.user.id;
      
      if (isNaN(termId)) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid term ID" };
        return;
      }

      const body = await ctx.request.body({ type: "json" }).value;
      const validation = archiveTermSchema.safeParse(body);
      
      if (!validation.success) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          error: "Invalid input",
          details: validation.error.errors
        };
        return;
      }

      const { notes } = validation.data;

      // Unarchive the term
      const unarchivedTerm = await archiveModel.unarchiveTerm(termId, userId, notes);

      // Log the action
      await auditLogger.logSystemConfig(
        'UPDATE',
        userId,
        ctx.state.user.email,
        'Term Archive',
        termId.toString(),
        `Unarchived term: ${unarchivedTerm.name}`
      );

      ctx.response.status = Status.OK;
      ctx.response.body = {
        message: "Term unarchived successfully",
        term: unarchivedTerm
      };

    } catch (error) {
      console.error("Error unarchiving term:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { 
        error: error instanceof Error ? error.message : "Failed to unarchive term" 
      };
    }
  }
);

/**
 * GET /api/admin/terms/archivable
 * Get terms that can be archived (Admin/TA Coordinator only)
 */
archiveRouter.get(
  '/admin/terms/archivable',
  requireAdminOrTACoordinator,
  async (ctx: Context) => {
    try {
      // Get all non-archived terms
      const allTerms = await termModel.getAllTerms();
      const archivableTerms = allTerms.filter(term => !term.archived);

      ctx.response.status = Status.OK;
      ctx.response.body = {
        terms: archivableTerms,
        total: archivableTerms.length
      };

    } catch (error) {
      console.error("Error fetching archivable terms:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch archivable terms" };
    }
  }
);

// =============================================================================
// PUBLIC ARCHIVE BROWSING ENDPOINTS (Read-Only)
// =============================================================================

/**
 * GET /api/archive/terms
 * Get all archived terms (Read-only access for authenticated users)
 */
archiveRouter.get(
  '/archive/terms',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const url = new URL(ctx.request.url);
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      if (limit > 100) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Limit cannot exceed 100" };
        return;
      }

      const result = await archiveModel.getArchivedTerms(limit, offset);

      ctx.response.status = Status.OK;
      ctx.response.body = {
        archived_terms: result.terms,
        pagination: {
          total: result.total,
          limit,
          offset,
          has_more: result.total > offset + limit
        }
      };

    } catch (error) {
      console.error("Error fetching archived terms:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch archived terms" };
    }
  }
);

/**
 * GET /api/archive/terms/search
 * Search archived terms with filters
 */
/**
 * GET /api/archive/terms/search
 * Search archived terms with filters
 */
archiveRouter.get(
  '/archive/terms/search',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const url = new URL(ctx.request.url);
      
      // Extract search parameters with proper typing
      const yearParam = url.searchParams.get('year');
      const termNameParam = url.searchParams.get('term_name');
      const archivedByParam = url.searchParams.get('archived_by');
      const startDateParam = url.searchParams.get('start_date');
      const endDateParam = url.searchParams.get('end_date');
      const limitParam = url.searchParams.get('limit');
      const offsetParam = url.searchParams.get('offset');

      const searchParams = {
        year: yearParam ? parseInt(yearParam) : undefined,
        term_name: termNameParam ? termNameParam : undefined,
        archived_by: archivedByParam ? parseInt(archivedByParam) : undefined,
        start_date: startDateParam ? startDateParam : undefined,
        end_date: endDateParam ? endDateParam : undefined,
        limit: parseInt(limitParam || '20'),
        offset: parseInt(offsetParam || '0')
      };

      const validation = searchSchema.safeParse(searchParams);
      if (!validation.success) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          error: "Invalid search parameters",
          details: validation.error.errors
        };
        return;
      }

      const { limit, offset, ...filters } = validation.data;
      const result = await archiveModel.searchArchivedTerms(filters, limit || 20, offset || 0);

      ctx.response.status = Status.OK;
      ctx.response.body = {
        archived_terms: result.terms,
        search_filters: filters,
        pagination: {
          total: result.total,
          limit: limit || 20,
          offset: offset || 0,
          has_more: result.total > (offset || 0) + (limit || 20)
        }
      };

    } catch (error) {
      console.error("Error searching archived terms:", error);
      console.error("Error details:", error?.message);
      console.error("Error stack:", error?.stack);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to search archived terms" };
    }
  }
);

/**
 * GET /api/archive/terms/:termId
 * Get specific archived term details
 */
archiveRouter.get(
  '/archive/terms/:termId',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: RouterContext<"/archive/terms/:termId">) => {
    try {
      const termId = parseInt(ctx.params.termId);
      
      if (isNaN(termId)) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid term ID" };
        return;
      }

      const archivedTerm = await archiveModel.getArchivedTermById(termId);
      const archiveLogs = await archiveModel.getArchiveLogs(termId);

      ctx.response.status = Status.OK;
      ctx.response.body = {
        term: archivedTerm,
        archive_logs: archiveLogs
      };

    } catch (error) {
      console.error("Error fetching archived term:", error);
      if (error instanceof Error && error.message === 'Archived term not found') {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Archived term not found" };
      } else {
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: "Failed to fetch archived term" };
      }
    }
  }
);

/**
 * GET /api/archive/terms/:termId/data
 * Get archived term data (courses, applications, allocations) - READ ONLY
 */
archiveRouter.get(
  '/archive/terms/:termId/data',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: RouterContext<"/archive/terms/:termId/data">) => {
    try {
      const termId = parseInt(ctx.params.termId);
      
      if (isNaN(termId)) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid term ID" };
        return;
      }

      // Check if user has permission to view detailed data
      const userRole = ctx.state.user.role;
      if (!['admin', 'ta_coordinator', 'instructor'].includes(userRole)) {
        ctx.response.status = Status.Forbidden;
        ctx.response.body = { 
          error: "Insufficient permissions to view detailed archive data" 
        };
        return;
      }

      const archiveData = await archiveModel.getArchivedTermData(termId);

      // Log access to archived data
      await auditLogger.logDataAccess(
        'VIEW',
        ctx.state.user.id,
        ctx.state.user.email,
        'Archived Term Data',
        termId.toString(),
        `Viewed archived data for term ${termId}`
      );

      ctx.response.status = Status.OK;
      ctx.response.body = {
        term_id: termId,
        archive_data: archiveData,
        disclaimer: "This is read-only archived data. No modifications are permitted."
      };

    } catch (error) {
      console.error("Error fetching archived term data:", error);
      if (error instanceof Error && (
        error.message === 'Term not found' || 
        error.message === 'Term is not archived'
      )) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: error.message };
      } else {
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: "Failed to fetch archived term data" };
      }
    }
  }
);

/**
 * GET /api/archive/stats
 * Get archive system statistics
 */

archiveRouter.get(
  '/archive/stats',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: Context) => {
    try {
      // Use a safer approach - call the database through a method that exists
      const result = await archiveModel.getArchivedTerms(1000, 0); // Get all archived terms
      
      // Calculate stats from the returned data
      const totalTerms = result.total;
      const currentYear = new Date().getFullYear();
      const archivedThisYear = result.terms.filter(term => 
        term.archived_at && new Date(term.archived_at).getFullYear() === currentYear
      ).length;
      
      // Sum up the totals
      const totalCourses = result.terms.reduce((sum, term) => sum + (term.total_courses || 0), 0);
      const totalApplications = result.terms.reduce((sum, term) => sum + (term.total_applications || 0), 0);
      const totalAllocations = result.terms.reduce((sum, term) => sum + (term.total_allocations || 0), 0);
      
      // Get date range
      const archiveDates = result.terms
        .map(term => term.archived_at)
        .filter(date => date)
        .sort();
      
      ctx.response.status = Status.OK;
      ctx.response.body = {
        archive_statistics: {
          total_archived_terms: totalTerms,
          archived_this_year: archivedThisYear,
          first_archive_date: archiveDates[0] || null,
          last_archive_date: archiveDates[archiveDates.length - 1] || null,
          total_archived_courses: totalCourses,
          total_archived_applications: totalApplications,
          total_archived_allocations: totalAllocations
        }
      };

    } catch (error) {
      console.error("Error fetching archive statistics:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch archive statistics" };
    }
  }
);