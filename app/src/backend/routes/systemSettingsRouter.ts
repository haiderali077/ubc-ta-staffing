import { Router, Context, Status, RouterContext } from "../../../deps.ts";
import { SystemSettingsModel, SystemSetting } from "../../database/models/systemSettings.ts";
import { requireAuth } from "../middleware/auth.ts";
import { AuthService } from "../services/auth.ts";

export const systemSettingsRouter = new Router();

// Dependencies - to be injected
let systemSettingsModel: SystemSettingsModel;
let authService: AuthService;

export function setSystemSettingsModels(
  settingsModel: SystemSettingsModel,
  auth: AuthService
): void {
  systemSettingsModel = settingsModel;
  authService = auth;
}

// Helper function to require admin role
async function requireAdmin(ctx: Context, next: () => Promise<unknown>): Promise<void> {
  await requireAuth(authService)(ctx, next);
  
  if (ctx.state.user.role !== 'admin') {
    ctx.response.status = Status.Forbidden;
    ctx.response.body = { error: "Admin access required" };
    return;
  }
}

/**
 * GET /admin/system-settings
 * Get all system settings (admin only)
 */
systemSettingsRouter.get(
  '/admin/system-settings',
  async (ctx: Context, next) => {
    await requireAdmin(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const settings = await systemSettingsModel.getAllSettings();
      
      // Transform settings to match frontend format
      const formattedSettings = settings.map(setting => ({
        id: setting.setting_id?.toString(),
        category: formatCategory(setting.category),
        name: formatSettingName(setting.key),
        value: setting.value,
        description: setting.description || '',
        type: setting.type
      }));

      ctx.response.status = Status.OK;
      ctx.response.body = { settings: formattedSettings };
    } catch (error) {
      console.error("Error fetching system settings:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch system settings" };
    }
  }
);

/**
 * PUT /admin/system-settings/:key
 * Update a specific system setting (admin only)
 */
systemSettingsRouter.put(
  '/admin/system-settings/:key',
  async (ctx: Context, next) => {
    await requireAdmin(ctx, next);
  },
  async (ctx: RouterContext<"/admin/system-settings/:key">) => {
    try {
      const key = ctx.params.key;
      const body = await ctx.request.body({ type: "json" }).value;
      
      if (!body.value) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Value is required" };
        return;
      }

      // Validate date format for date settings
      if (key.includes('deadline') && !isValidDate(body.value)) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid date format. Use YYYY-MM-DD format." };
        return;
      }

      // Validate numeric values
      if (key.includes('hours') || key.includes('gpa') || key.includes('timeout')) {
        const numValue = parseFloat(body.value);
        if (isNaN(numValue) || numValue < 0) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid numeric value" };
          return;
        }
      }

      // Validate boolean values
      if (key.includes('notifications')) {
        if (body.value !== 'true' && body.value !== 'false') {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Boolean value must be 'true' or 'false'" };
          return;
        }
      }

      const updatedSetting = await systemSettingsModel.updateSetting(key, body.value);
      
      if (!updatedSetting) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Setting not found" };
        return;
      }

      ctx.response.status = Status.OK;
      ctx.response.body = { 
        message: "Setting updated successfully",
        setting: {
          id: updatedSetting.setting_id?.toString(),
          category: formatCategory(updatedSetting.category),
          name: formatSettingName(updatedSetting.key),
          value: updatedSetting.value,
          description: updatedSetting.description || '',
          type: updatedSetting.type
        }
      };
    } catch (error) {
      console.error("Error updating system setting:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to update system setting" };
    }
  }
);

/**
 * GET /admin/system-settings/category/:category
 * Get settings by category (admin only)
 */
systemSettingsRouter.get(
  '/admin/system-settings/category/:category',
  async (ctx: Context, next) => {
    await requireAdmin(ctx, next);
  },
  async (ctx: RouterContext<"/admin/system-settings/category/:category">) => {
    try {
      const category = ctx.params.category;
      const settings = await systemSettingsModel.getSettingsByCategory(category);
      
      const formattedSettings = settings.map(setting => ({
        id: setting.setting_id?.toString(),
        category: formatCategory(setting.category),
        name: formatSettingName(setting.key),
        value: setting.value,
        description: setting.description || '',
        type: setting.type
      }));

      ctx.response.status = Status.OK;
      ctx.response.body = { settings: formattedSettings };
    } catch (error) {
      console.error("Error fetching settings by category:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch settings by category" };
    }
  }
);

// Helper functions
function formatCategory(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatSettingName(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(dateString);
} 