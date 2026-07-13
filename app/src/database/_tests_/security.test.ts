import { assertEquals, assertExists, assertNotEquals } from "../../../deps.ts";
import {
  escapeHtml,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW,
  rateLimit,
  sanitizeInput,
  validate
} from "../middleware/security.ts";

/**
 * Security Middleware Tests
 * 
 * Comprehensive tests for security middleware including:
 * - Input sanitization (XSS prevention)
 * - Rate limiting
 * - Request validation
 * - HTML escaping
 */

Deno.test("Security Middleware - Comprehensive Tests", async (t) => {
  /**
   * Test 1: escapeHtml function should properly escape HTML entities
   */
  await t.step("escapeHtml - should escape HTML entities", () => {
    const maliciousInput = "<script>alert('xss')</script>";
    const escaped = escapeHtml(maliciousInput);
    assertEquals(
      escaped,
      "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;",
      "Should escape all HTML entities"
    );

    // Test with various HTML tags and attributes
    const testCases = [
      { input: '<img src="x" onerror="alert(1)">', 
        expected: '&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;' },
      { input: '<a href="javascript:alert(\'XSS\')">click</a>', 
        expected: '&lt;a href=&quot;javascript:alert(&#039;XSS&#039;)&quot;&gt;click&lt;/a&gt;' },
      { input: 'Normal text & symbols', 
        expected: 'Normal text &amp; symbols' }
    ];

    for (const {input, expected} of testCases) {
      assertEquals(escapeHtml(input), expected, `Should escape ${input} properly`);
    }
  });

  /**
   * Test 2: sanitizeInput middleware should escape HTML in query parameters
   */
  await t.step("sanitizeInput - query parameters", async () => {
    const maliciousInput = "<script>alert('xss')</script>";
    const ctx = {
      request: {
        url: new URL(`http://localhost/search?q=${maliciousInput}`),
        hasBody: false
      },
      response: {}
    } as any;
    const next = () => {};

    await sanitizeInput(ctx, next);

    const sanitizedQuery = ctx.request.url.searchParams.get('q');
    assertEquals(
      sanitizedQuery,
      "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;",
      "Should sanitize query parameters"
    );
  });

  /**
   * Test 3: sanitizeInput middleware should escape HTML in request body
   */
  await t.step("sanitizeInput - request body", async () => {
    const maliciousInput = "<script>alert('xss')</script>";
    const originalBody = { comment: maliciousInput };
    
    // Create a properly structured mock context
    const ctx = {
        request: {
        url: new URL("http://localhost/comments"),
        hasBody: true,
        body: () => ({
            value: Promise.resolve(originalBody),
            type: "json"
        })
        },
        response: {},
        state: {}
    } as any;

    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await sanitizeInput(ctx, next);

    // Get the sanitized body
    const bodyFunc = ctx.request.body();
    const body = await bodyFunc.value;
    
    assertEquals(
        body.comment,
        "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;",
        "Should sanitize request body"
    );
    assertEquals(nextCalled, true, "Should call next()");
    });

  /**
   * Test 4: rateLimit middleware should block excessive requests
   */
  await t.step("rateLimit - should block excessive requests", async () => {
    // Mock context and next function
    const mockNext = () => {};
    const mockIp = "127.0.0.1";
    
    // First make RATE_LIMIT_MAX requests (should all succeed)
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      const ctx = {
        request: { ip: mockIp },
        response: {}
      } as any;
      
      await rateLimit(ctx, mockNext);
      assertEquals(ctx.response.status, undefined, `Request ${i+1} should succeed`);
    }
    
    // Next request should be blocked
    const blockedCtx = {
      request: { ip: mockIp },
      response: {}
    } as any;
    
    await rateLimit(blockedCtx, mockNext);
    assertEquals(
      blockedCtx.response.status,
      429,
      "Should block request over rate limit"
    );
    assertEquals(
      blockedCtx.response.body?.error,
      "Too many requests, please try again later",
      "Should return rate limit error message"
    );
    
    // Wait for rate limit window to expire and test again
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_WINDOW + 100));
    const afterWindowCtx = {
      request: { ip: mockIp },
      response: {}
    } as any;
    
    await rateLimit(afterWindowCtx, mockNext);
    assertEquals(
      afterWindowCtx.response.status,
      undefined,
      "Should allow requests after rate limit window"
    );
  });

  /**
   * Test 5: validate middleware should reject invalid data
   */
  await t.step("validate - should reject invalid data", async () => {
    const schema = {
      safeParse: (data: any) => {
        if (data.email && data.email.includes('@')) {
          return { success: true, data };
        }
        return { 
          success: false, 
          error: { errors: [{ message: "Invalid email" }] } 
        };
      }
    };

    // Test with valid data
    const validCtx = {
      request: {
        body: () => ({ value: { email: "test@example.com" } })
      },
      response: {},
      state: {}
    } as any;
    const validNext = () => {};

    const validationMiddleware = validate(schema);
    await validationMiddleware(validCtx, validNext);
    assertEquals(validCtx.response.status, undefined, "Should accept valid data");
    assertExists(validCtx.state.validatedData, "Should set validated data");

    // Test with invalid data
    const invalidCtx = {
      request: {
        body: () => ({ value: { email: "invalid-email" } })
      },
      response: {},
      state: {}
    } as any;
    const invalidNext = () => {};

    await validationMiddleware(invalidCtx, invalidNext);
    assertEquals(
      invalidCtx.response.status,
      400,
      "Should reject invalid email format"
    );
    assertEquals(
      invalidCtx.response.body?.error,
      "Validation failed",
      "Should return validation error"
    );
  });

  /**
   * Test 6: validate middleware should handle errors
   */
  await t.step("validate - should handle errors", async () => {
    const schema = {
      safeParse: () => {
        throw new Error("Test error");
      }
    };

    const ctx = {
      request: {
        body: () => ({ value: {} })
      },
      response: {},
      state: {}
    } as any;
    const next = () => {};

    const validationMiddleware = validate(schema);
    await validationMiddleware(ctx, next);
    
    assertEquals(
      ctx.response.status,
      400,
      "Should return 400 on validation error"
    );
    assertEquals(
      ctx.response.body?.error,
      "Invalid request data",
      "Should return error message"
    );
  });

  await t.step("should block SQL injection attempts", async () => {
    const sqlInjectionPayloads = [
      "'; DROP TABLE users;--",
      "1' OR '1'='1",
      "admin'--",
      "x'; SELECT * FROM users WHERE '1'='1"
    ];
    
    for (const payload of sqlInjectionPayloads) {
      const ctx = {
        request: {
          url: new URL(`http://localhost/search?q=${payload}`),
          hasBody: false
        },
        response: {}
      } as any;
      
      await sanitizeInput(ctx, () => {});
      const sanitized = ctx.request.url.searchParams.get('q');
      assertNotEquals(sanitized, payload, "Should sanitize SQL injection");
    }
  });

  await t.step("should allow safe input", () => {
    const safeInput = "Normal text 123";
    assertEquals(escapeHtml(safeInput), safeInput);
  });
});