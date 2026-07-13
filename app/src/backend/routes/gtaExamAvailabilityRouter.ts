// app/src/backend/routes/gtaExamAvailabilityRouter.ts
// COMPLETE FIX: Add graduate student middleware to ALL endpoints

import { Context, Router, RouterContext, Status, z } from "../../../deps.ts";
import { GTAExamAvailabilityModel } from "../../database/models/gtaExamAvailability.ts";
import { ProfileModel } from "../../database/models/profile.ts";
import { TermModel } from "../../database/models/term.ts";
import { requireAuth } from "../middleware/auth.ts";
import { AuthService } from "../services/auth.ts";
import { canAccessGTAFeatures, getGTAStatusMessage } from "../utils/gtaUtils.ts";

export const gtaExamAvailabilityRouter = new Router();

// Dependencies - to be injected
let gtaAvailabilityModel: GTAExamAvailabilityModel;
let termModel: TermModel;
let profileModel: ProfileModel;
let authService: AuthService;

export function setGTAExamAvailabilityDependencies(
  availabilityModel: GTAExamAvailabilityModel,
  termModelParam: TermModel,
  profileModelParam: ProfileModel,
  authServiceParam: AuthService
): void {
  gtaAvailabilityModel = availabilityModel;
  termModel = termModelParam;
  profileModel = profileModelParam;
  authService = authServiceParam;
}

/**
 * Middleware to check if user is a graduate student (GTA eligible)

async function requireGraduateStudent(ctx: Context, next: () => Promise<unknown>) {
  const userId = ctx.state.user.id;
  const userRole = ctx.state.user.role;
  
  // Get user's profile to check year of study
  const profile = await profileModel.getStudentProfile(userId);
  const yearOfStudy = profile?.year_of_study;
  
  if (!canAccessGTAFeatures(userRole, yearOfStudy)) {
    ctx.response.status = Status.Forbidden;
    ctx.response.body = { 
      error: getGTAStatusMessage(userRole, yearOfStudy),
      is_graduate_student: false,
      year_of_study: yearOfStudy,
      required_year: 5
    };
    return;
  }
  
  await next();
}
 */

// In gtaExamAvailabilityRouter.ts
// Replace the existing requireGraduateStudent function with:

async function requireGraduateStudent(ctx: Context, next: () => Promise<unknown>) {
  console.log("🔍 DEBUG: Starting graduate student check");
  console.log("👤 DEBUG: User ID:", ctx.state.user.id, "Role:", ctx.state.user.role);
  
  const userId = ctx.state.user.id;
  const userRole = ctx.state.user.role;
  
  try {
    console.log("🔍 DEBUG: Available ProfileModel methods:");
    console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(profileModel)));
    
    // Try the most likely method names:
    let profile = null;
    
    if (typeof profileModel.getStudentProfile === 'function') {
      console.log("📋 DEBUG: Trying getStudentProfile...");
      profile = await profileModel.getStudentProfile(userId);
    } else if (typeof profileModel.getProfile === 'function') {
      console.log("📋 DEBUG: Trying getProfile...");
      profile = await profileModel.getProfile(userId);
    } else if (typeof profileModel.getByUserId === 'function') {
      console.log("📋 DEBUG: Trying getByUserId...");
      profile = await profileModel.getByUserId(userId);
    } else {
      console.log("❌ DEBUG: No profile method found, trying common patterns...");
      // List all methods that might work
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(profileModel));
      console.log("📋 DEBUG: All methods:", methods);
    }
    
    console.log("📋 DEBUG: Profile result:", profile);
    
    const yearOfStudy = profile?.year_of_study;
    console.log("🎓 DEBUG: Year of study:", yearOfStudy);
    
    const canAccess = canAccessGTAFeatures(userRole, yearOfStudy);
    console.log("🔑 DEBUG: Can access:", canAccess);
    
    if (!canAccess) {
      console.log("🚫 DEBUG: Access denied");
      ctx.response.status = Status.Forbidden;
      ctx.response.body = { 
        error: getGTAStatusMessage(userRole, yearOfStudy),
        is_graduate_student: false,
        year_of_study: yearOfStudy,
        required_year: 5
      };
      return;
    }
    
    console.log("✅ DEBUG: Access granted, proceeding");
    await next();
  } catch (error) {
    console.error("💥 DEBUG: Error:", error.message);
    console.error("💥 DEBUG: Stack:", error.stack);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Failed to check graduate student status" };
  }
}

// Validation schemas
const availabilitySchema = z.object({
  term_id: z.number().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  notes: z.string().optional()
}).refine(data => {
  return new Date(data.end_date) >= new Date(data.start_date);
}, {
  message: "End date must be on or after start date",
  path: ["end_date"]
});

const bulkAvailabilitySchema = z.object({
  term_id: z.number(),
  availabilities: z.array(z.object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().optional()
  }))
});

// =============================================================================
// CREATE EXAM AVAILABILITY
// =============================================================================

gtaExamAvailabilityRouter.post(
  '/gta/exam-availability',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  requireGraduateStudent,
  async (ctx: Context) => {
    try {
      const userId = ctx.state.user.id;
      const body = await ctx.request.body({ type: "json" }).value;
      
      const validation = availabilitySchema.safeParse(body);
      if (!validation.success) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          error: "Invalid input",
          details: validation.error.errors
        };
        return;
      }

      const { term_id, start_date, end_date, notes } = validation.data;

      const conflicts = await gtaAvailabilityModel.checkConflicts(
        userId, 
        start_date, 
        end_date, 
        term_id
      );

      if (conflicts.length > 0) {
        ctx.response.status = Status.Conflict;
        ctx.response.body = {
          error: "Availability period conflicts with existing availability",
          conflicts: conflicts.map(c => ({
            existing_period: `${c.start_date} to ${c.end_date}`,
            notes: c.notes
          }))
        };
        return;
      }

      const availability = await gtaAvailabilityModel.createAvailability({
        user_id: userId,
        term_id,
        start_date,
        end_date,
        notes
      });

      ctx.response.status = Status.Created;
      ctx.response.body = {
        message: "Exam availability created successfully",
        availability
      };
    } catch (error) {
      console.error("Error creating exam availability:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to create exam availability" };
    }
  }
);

// =============================================================================
// GET MY EXAM AVAILABILITY
// =============================================================================

gtaExamAvailabilityRouter.get(
  '/gta/exam-availability',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  requireGraduateStudent,
  async (ctx: Context) => {
    try {
      const userId = ctx.state.user.id;
      const url = new URL(ctx.request.url);
      const termId = url.searchParams.get('term_id');

      const availabilities = await gtaAvailabilityModel.getAvailabilityByUser(
        userId, 
        termId ? parseInt(termId) : undefined
      );

      ctx.response.status = Status.OK;
      ctx.response.body = {
        availabilities,
        total: availabilities.length
      };
    } catch (error) {
      console.error("Error fetching exam availability:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch exam availability" };
    }
  }
);

// =============================================================================
// UPDATE EXAM AVAILABILITY - FIXED WITH GRADUATE STUDENT CHECK
// =============================================================================

gtaExamAvailabilityRouter.put(
  '/gta/exam-availability/:availabilityId',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  requireGraduateStudent, // ADDED: Graduate student check
  async (ctx: RouterContext<"/gta/exam-availability/:availabilityId">) => {
    try {
      const userId = ctx.state.user.id;
      const availabilityId = parseInt(ctx.params.availabilityId);
      
      if (isNaN(availabilityId)) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid availability ID" };
        return;
      }

      // Verify ownership
      const existing = await gtaAvailabilityModel.getAvailabilityById(availabilityId);
      if (!existing || existing.user_id !== userId) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Availability period not found" };
        return;
      }

      const body = await ctx.request.body({ type: "json" }).value;
      
      // Validate input (partial schema for updates)
      //const updateSchema = availabilitySchema.partial(); <-DOESNT WORK

      const updateSchema = z.object({
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
        notes: z.string().optional()
        }).refine(data => {
      
        if (data.start_date && data.end_date) {
        return new Date(data.end_date) >= new Date(data.start_date);
        }
          return true;
      }, {
          message: "End date must be on or after start date",
        path: ["end_date"]
      });
      
      const validation = updateSchema.safeParse(body);
      if (!validation.success) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          error: "Invalid input",
          details: validation.error.errors
        };
        return;
      }

      const updates = validation.data;

      // Check for conflicts if dates are being updated
      if (updates.start_date || updates.end_date) {
        const startDate = updates.start_date || existing.start_date;
        const endDate = updates.end_date || existing.end_date;
        
        const conflicts = await gtaAvailabilityModel.checkConflicts(
          userId, 
          startDate, 
          endDate, 
          existing.term_id || undefined,
          availabilityId // exclude current record
        );

        if (conflicts.length > 0) {
          ctx.response.status = Status.Conflict;
          ctx.response.body = {
            error: "Updated availability period conflicts with existing availability",
            conflicts: conflicts.map(c => ({
              existing_period: `${c.start_date} to ${c.end_date}`,
              notes: c.notes
            }))
          };
          return;
        }
      }

      // Update availability
      const updatedAvailability = await gtaAvailabilityModel.updateAvailability(
        availabilityId, 
        updates
      );

      if (!updatedAvailability) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Failed to update availability" };
        return;
      }

      ctx.response.status = Status.OK;
      ctx.response.body = {
        message: "Exam availability updated successfully",
        availability: updatedAvailability
      };
    } catch (error) {
      console.error("Error updating exam availability:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to update exam availability" };
    }
  }
);

// =============================================================================
// DELETE EXAM AVAILABILITY - FIXED WITH GRADUATE STUDENT CHECK
// =============================================================================

gtaExamAvailabilityRouter.delete(
  '/gta/exam-availability/:availabilityId',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  requireGraduateStudent, // ADDED: Graduate student check
  async (ctx: RouterContext<"/gta/exam-availability/:availabilityId">) => {
    try {
      const userId = ctx.state.user.id;
      const availabilityId = parseInt(ctx.params.availabilityId);
      
      if (isNaN(availabilityId)) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid availability ID" };
        return;
      }

      const success = await gtaAvailabilityModel.deleteAvailability(availabilityId, userId);
      
      if (!success) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Availability period not found" };
        return;
      }

      ctx.response.status = Status.OK;
      ctx.response.body = { message: "Exam availability deleted successfully" };
    } catch (error) {
      console.error("Error deleting exam availability:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to delete exam availability" };
    }
  }
);

// =============================================================================
// BULK UPDATE AVAILABILITY - FIXED WITH GRADUATE STUDENT CHECK
// =============================================================================

gtaExamAvailabilityRouter.post(
  '/gta/exam-availability/bulk',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  requireGraduateStudent, // ADDED: Graduate student check
  async (ctx: Context) => {
    try {
      const userId = ctx.state.user.id;
      const body = await ctx.request.body({ type: "json" }).value;
      
      // Validate input
      const validation = bulkAvailabilitySchema.safeParse(body);
      if (!validation.success) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          error: "Invalid input",
          details: validation.error.errors
        };
        return;
      }

      const { term_id, availabilities } = validation.data;

      // Verify term exists
      const term = await termModel.getTermById(term_id);
      if (!term) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Term not found" };
        return;
      }

      // Check for internal conflicts within the new availability periods
      const sortedAvailabilities = availabilities.sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );

      for (let i = 0; i < sortedAvailabilities.length - 1; i++) {
        const current = sortedAvailabilities[i];
        const next = sortedAvailabilities[i + 1];
        
        if (new Date(current.end_date) >= new Date(next.start_date)) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = {
            error: "Conflicting availability periods in submission",
            conflict: {
              period_1: `${current.start_date} to ${current.end_date}`,
              period_2: `${next.start_date} to ${next.end_date}`
            }
          };
          return;
        }
      }

      // Replace all availability for this term
      const createdAvailabilities = await gtaAvailabilityModel.replaceUserAvailability(
        userId,
        term_id,
        availabilities
      );

      ctx.response.status = Status.Created;
      ctx.response.body = {
        message: `Successfully updated exam availability for term`,
        term: term.name,
        availabilities: createdAvailabilities,
        total: createdAvailabilities.length
      };
    } catch (error) {
      console.error("Error bulk updating exam availability:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to update exam availability" };
    }
  }
);

// =============================================================================
// GET AVAILABLE TERMS - WITH GRADUATE STUDENT CHECK
// =============================================================================

gtaExamAvailabilityRouter.get(
  '/gta/exam-availability/terms',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  requireGraduateStudent,
  async (ctx: Context) => {
    try {
      const terms = await termModel.getAllTerms();
      
      // Filter to show only active and upcoming terms
      const availableTerms = terms.filter(term => 
        term.status === 'active' || term.status === 'upcoming'
      );

      ctx.response.status = Status.OK;
      ctx.response.body = { terms: availableTerms };
    } catch (error) {
      console.error("Error fetching terms:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch terms" };
    }
  }
);

// =============================================================================
// CHECK GTA ELIGIBILITY ENDPOINT (NO GRADUATE CHECK - FOR DIAGNOSIS)
// =============================================================================

gtaExamAvailabilityRouter.get(
  '/gta/eligibility',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  // NO requireGraduateStudent here - this endpoint is for checking eligibility
  async (ctx: Context) => {
    try {
      const userId = ctx.state.user.id;
      const userRole = ctx.state.user.role;
      
      // Get user's profile to check year of study
      const profile = await profileModel.getStudentProfile(userId);
      const yearOfStudy = profile?.year_of_study;
      
      const isEligible = canAccessGTAFeatures(userRole, yearOfStudy);
      const statusMessage = getGTAStatusMessage(userRole, yearOfStudy);
      
      ctx.response.status = Status.OK;
      ctx.response.body = {
        is_eligible: isEligible,
        is_graduate_student: isEligible,
        year_of_study: yearOfStudy,
        required_year: 5,
        role: userRole,
        message: statusMessage
      };
    } catch (error) {
      console.error("Error checking GTA eligibility:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to check GTA eligibility" };
    }
  }
);

