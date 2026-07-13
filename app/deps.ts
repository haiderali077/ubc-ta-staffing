export { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

// Dotenv for loading environment variables
import "https://deno.land/std@0.203.0/dotenv/load.ts";

// Oak web framework
export {
  Application,
  Context,
  Router,
  Status,
  send,
} from "https://deno.land/x/oak@v12.6.1/mod.ts";

export type { Next } from "https://deno.land/x/oak@v12.6.1/mod.ts";

export type { RouterContext } from "https://deno.land/x/oak@v12.6.1/mod.ts";

// CORS middleware
export { oakCors } from "https://deno.land/x/cors@v1.2.1/mod.ts";

// Validation library (zod)
export * as z from "https://deno.land/x/zod@v3.22.4/mod.ts";

// JWT for authentication
export {
  create as createJWT,
  getNumericDate,
  verify as verifyJWT,
} from "https://deno.land/x/djwt@v3.0.2/mod.ts";

// Testing utilities
export {
  assertEquals,
  assertExists,
  assertNotEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

export function getEnvConfig() {
  return {
    DB_HOST: Deno.env.get("DB_HOST") || "localhost",
    DB_PORT: parseInt(Deno.env.get("DB_PORT") || "5432"),
    DB_USER: Deno.env.get("DB_USER") || "allocaid_user",
    DB_PASSWORD: Deno.env.get("DB_PASSWORD") || "allocaid_pass",
    DB_NAME: Deno.env.get("DB_NAME") || "allocaid_db",
    JWT_SECRET:
      Deno.env.get("JWT_SECRET") || "your-secret-key-change-in-production",
    REFRESH_SECRET:
      Deno.env.get("REFRESH_SECRET") ||
      "your-refresh-secret-change-in-production",
  };
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

export const logger = {
  info: (message: string) =>
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
  error: (message: string) =>
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`),
  warn: (message: string) =>
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`),
  debug: (message: string) =>
    console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`),
};

// Password hashing using Deno's built-in crypto module
export async function hashPassword(password: string): Promise<string> {
  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Combine password and salt
  const passwordData = new TextEncoder().encode(password + saltHex);

  // Hash multiple times for security (simple PBKDF2-like approach)
  let hash = passwordData;
  for (let i = 0; i < 10000; i++) {
    hash = new Uint8Array(await crypto.subtle.digest("SHA-256", hash));
  }

  const hashHex = Array.from(hash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${saltHex}:${hashHex}`;
}

export { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Compare hashed password
export async function compareHash(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    const [saltHex, expectedHashHex] = hash.split(":");
    if (!saltHex || !expectedHashHex) {
      return false;
    }

    // Combine password and salt
    const passwordData = new TextEncoder().encode(password + saltHex);

    // Hash multiple times for security (same as hashPassword)
    let computedHash = passwordData;
    for (let i = 0; i < 10000; i++) {
      computedHash = new Uint8Array(
        await crypto.subtle.digest("SHA-256", computedHash)
      );
    }

    const computedHashHex = Array.from(computedHash)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return computedHashHex === expectedHashHex;
  } catch (error) {
    console.error("Error comparing hash:", error);
    return false;
  }
}
