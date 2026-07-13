import { Context, logger, Status } from "../../../deps.ts";

import type { Next } from "../../../deps.ts";

// Input sanitization middleware
export async function sanitizeInput(ctx: Context, next: Next) {
    if (ctx.request.method === "OPTIONS") {
    return await next(); // Skip for preflight
  }
  try {
    // Sanitize query parameters
    if (ctx.request.url.search) {
      const searchParams = new URLSearchParams(ctx.request.url.search);
      searchParams.forEach((value, key) => {
        searchParams.set(key, escapeHtml(value));
      });
      ctx.request.url.search = `?${searchParams.toString()}`;
    }

    // Sanitize request body - skip for file uploads and logout
    if (ctx.request.hasBody && 
        !ctx.request.url.pathname.includes('/upload') && 
        !ctx.request.url.pathname.includes('/auth/logout')) {
      const body = ctx.request.body();
      const value = await body.value;
      
      if (typeof value === 'object' && value !== null) {
        for (const key in value) {
          if (typeof value[key] === 'string') {
            value[key] = escapeHtml(value[key]);
          }
        }
      }
      
      // Replace the body with sanitized version
      ctx.request.body = () => ({
        value: Promise.resolve(value),
        type: body.type
      });
    }

    await next();
  } catch (error) {
    logger.error(`Input sanitization error: ${error}`);
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: "Invalid input detected" };
  }
}

// Basic HTML escaping
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Rate limiting setup
const rateLimits = new Map<string, { count: number; lastRequest: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 200; // 200 requests per minute (increased for manual testing)

export async function rateLimit(ctx: Context, next: Next) {
    if (ctx.request.method === "OPTIONS") {
    return await next(); // Skip for preflight
  }
  const ip = ctx.request.ip;
  const now = Date.now();
  
  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, { count: 1, lastRequest: now });
  } else {
    const record = rateLimits.get(ip)!;
    
    // Reset if window has passed
    if (now - record.lastRequest > RATE_LIMIT_WINDOW) {
      record.count = 1;
      record.lastRequest = now;
    } else {
      record.count++;
      if (record.count > RATE_LIMIT_MAX) {
        ctx.response.status = Status.TooManyRequests;
        ctx.response.body = { error: "Too many requests, please try again later" };
        return;
      }
    }
  }

  await next();
}

// Validation middleware factory
export function validate(schema: any) {
  return async (ctx: Context, next: Next) => {
    try {
      const body = await ctx.request.body().value;
      const result = schema.safeParse(body);
      
      if (!result.success) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { 
          error: "Validation failed",
          details: result.error.errors 
        };
        return;
      }
      
      ctx.state.validatedData = result.data;
      await next();
    } catch (error) {
      logger.error(`Validation error: ${error}`);
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: "Invalid request data" };
    }
  };
}

export {
  escapeHtml,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW
};

