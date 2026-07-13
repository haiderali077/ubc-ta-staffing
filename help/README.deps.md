Reusable `deps.ts` file for Deno

Instead of importing directly from URLs everywhere, just import from ./deps.ts

e.g.

```
import { Application, Router } from "./deps.ts";
import { Client } from "./deps.ts";
```

intead of:

```
import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { Client } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

---

# 📦 Dependency Reference (`deps.ts`)

This project uses a centralized `deps.ts` file to manage third-party and standard library dependencies. This approach simplifies version management, improves readability, and allows quick updates in one place.

All external imports should go through `deps.ts`. Below is a breakdown of each dependency, its purpose, and usage examples.

---

## 🔌 PostgreSQL – `Client`

**URL:** `https://deno.land/x/postgres@v0.17.0/mod.ts`  
**Why:** Connect to and interact with a PostgreSQL database.

**Usage:**
```ts
import { Client } from "deps";

const client = new Client({
  user: "postgres",
  password: "pass",
  database: "allocaid",
  hostname: "localhost",
  port: 5432,
});
await client.connect();
```

---

## 🌐 Oak – Web Framework

**URL:** `https://deno.land/x/oak@v12.6.1/mod.ts`  
**Why:** Core framework for routing, middleware, and HTTP server handling.

**Usage:**
```ts
import { Application, Router, Context, Status } from "deps";

const app = new Application();
const router = new Router();

router.get("/", (ctx: Context) => {
  ctx.response.status = Status.OK;
  ctx.response.body = "Hello, AllocAid!";
});

app.use(router.routes());
await app.listen({ port: 8000 });
```

---

## ✅ Zod – Input Validation

**URL:** `https://deno.land/x/zod@v3.22.4/mod.ts`  
**Why:** Schema validation for API inputs, environment variables, etc.

**Usage:**
```ts
import { z } from "deps";

const schema = z.object({
  email: z.string().email(),
  age: z.number().int().positive(),
});

const result = schema.safeParse({ email: "test@example.com", age: 20 });
if (!result.success) {
  console.error(result.error.format());
}
```

---

## 🛠️ Dotenv – Environment Variable Loader

**URL:** `https://deno.land/std@0.223.0/dotenv/mod.ts`  
**Why:** Load environment variables from a `.env` file.

**Usage:**
```ts
import { config } from "deps";

const env = await config();
console.log(env["DB_HOST"]);
```

> You can also use `await config({ export: true })` to populate `Deno.env.get()`.

---

## 🔐 Bcrypt – Password Hashing

**URL:** `https://deno.land/x/bcrypt@v0.4.1/mod.ts`  
**Why:** Securely hash and compare passwords.

**Usage:**
```ts
import { hashPassword, compareHash } from "deps";

const hash = await hashPassword("mypassword");
const match = await compareHash("mypassword", hash);
```

---

## 🆔 UUID – Unique Identifier Generator

**URL:** `https://deno.land/std@0.223.0/uuid/mod.ts`  
**Why:** Generate unique IDs for users, sessions, etc.

**Usage:**
```ts
import { uuid } from "deps";

const id = uuid.generate();
console.log(id);
```

---

## 🧾 Logging – Deno Standard Logging

**URL:** `https://deno.land/std@0.223.0/log/mod.ts`  
**Why:** Unified logging with levels and formatting.

**Usage:**
```ts
import { log } from "deps";

await log.setup({
  handlers: { console: new log.handlers.ConsoleHandler("DEBUG") },
  loggers: { default: { level: "DEBUG", handlers: ["console"] } },
});

log.info("Server started");
log.error("Something failed");
```

---

## 🌐 CORS – Cross-Origin Middleware

**URL:** `https://deno.land/x/cors@v1.2.1/mod.ts`  
**Why:** Allow cross-origin requests (needed for frontend-backend communication).

**Usage:**
```ts
import { oakCors } from "deps";

app.use(oakCors()); // Enable CORS for all routes
```

---

## ❗ `createHttpError` – Custom HTTP Error Helper

**Why:** Throw HTTP errors consistently from routes or services.

**Usage:**
```ts
import { createHttpError } from "deps";

throw createHttpError(401, "Unauthorized access");
```

**Definition (in `deps.ts`):**
```ts
export interface HttpError extends Error {
  status: number;
}

export function createHttpError(status: number, message: string): HttpError {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
}
```

---

## 🧠 Best Practices

- Only update versioned URLs in `deps.ts` to maintain consistency.
- Use `"deps"` alias in your `import_map.json` and `deno.json`.
- Document any new dependencies directly in `deps.ts` with comments.
