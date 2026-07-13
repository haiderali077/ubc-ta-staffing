import { Client } from "../../deps.ts";

export interface DatabaseConfig { //Interface for PostgreSQL database configuration
    hostname: string;  
    port: number;      
    user: string; 
    password: string;  
    database: string; 
}

export function getDatabaseConfig() {
  const isTest = Deno.env.get("DENO_ENV") === "test";
  
  if (isTest) {
  return {
    hostname: "localhost", 
    port: 5434, // Use a different port for testing to avoid conflicts
    user: "test_user",
    password: "test_password",
    database: "test_db"
  };
}
  
  return {
    hostname: Deno.env.get("DB_HOST") || "database",
    port: parseInt(Deno.env.get("DB_PORT") || "5432"),
    user: Deno.env.get("DB_USER") || "allocaid_user",
    password: Deno.env.get("DB_PASSWORD") || "allocaid_pass",
    database: Deno.env.get("DB_NAME") || "allocaid_db"
  };
}

export class Database {
    end() {
      throw new Error("Method not implemented.");
    }
    private client: Client; // PostgreSQL (pgs) client instance
    private config: DatabaseConfig;

    constructor(config?: DatabaseConfig) {
        if (config) {
            this.config = config;
        } else {
            // Read from environment variables (like init.ts does)
            this.config = {
                hostname: Deno.env.get("DB_HOST") || "database",
                port: parseInt(Deno.env.get("DB_PORT") || "5432"),
                user: Deno.env.get("DB_USER") || "allocaid_user",
                password: Deno.env.get("DB_PASSWORD") || "allocaid_pass",
                database: Deno.env.get("DB_NAME") || "allocaid_db"
            };
        }
        this.client = new Client(this.config);
    }

    async connect(): Promise<void> {
        try {
            console.log("Connecting to database...");
            console.log("Host:", this.config.hostname);
            console.log("Port:", this.config.port);
            console.log("User:", this.config.user);
            console.log("Database:", this.config.database);
            
            await this.client.connect();
            console.log("Connected to PostgreSQL database");
        } catch (error) {
            console.error("Failed to connect to database:", error);
            throw error;
        }
    }

        async disconnect(): Promise<void> {
        try {
        await this.client.end();
        console.log("Disconnected from PostgreSQL database");
        } catch (error) {
        console.error("Failed to disconnect from database:", error);
        throw error;
        }
    }

    getClient(): Client {
        return this.client;
    }

    /** 
        @param text - SQL query string
        @param params - Optional array of parameters for parameterized queries
    */
    async query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }> {
        try {
            // Check if client is connected, reconnect if not
            if (!this.client || !this.client.connected) {
                console.log("Database connection lost, reconnecting...");
                await this.connect();
            }
            
            const result = await this.client.queryObject<T>(text, params);
            return { rows: Array.from(result.rows) };
        } catch (error) {
            // If connection error, try to reconnect once
            if (
                typeof error === "object" &&
                error !== null &&
                "message" in error &&
                typeof (error as { message: unknown }).message === "string" &&
                (error as { message: string }).message.includes("Connection to the database has been terminated")
            ) {
                console.log("Connection terminated, attempting to reconnect...");
                await this.connect();
                // Retry the query
                const result = await this.client.queryObject<T>(text, params);
                return { rows: Array.from(result.rows) };
            }
            throw error;
        }
    }

    /**
     * Executes a series of database operations within a transaction
     * Automatically handles commit and rollback based on success/failure
     * 
     * @param callback - Function containing database operations to execute in transaction
     * @returns Promise that resolves to the result of the callback function
     * @throws Error if transaction fails (automatically rolls back)
    
     * Example usage:

    await db.transaction(async (client) => {
        await client.queryObject("INSERT INTO courses (name) VALUES ($1)", ["COSC 499"]);
        await client.queryObject("INSERT INTO instructors (name) VALUES ($1)", ["Dr. Chen"]);
    });

     */
    async transaction<T>(callback: (client: Client) => Promise<T>): Promise<T> {
        const transaction = this.client.createTransaction("ta_transaction");
        
        try {
            await transaction.begin(); 
            console.log("Transaction started");

            const result = await callback(this.client);

            await transaction.commit(); 
            console.log("Transaction committed");

            return result;
        } catch (error) {
            await transaction.rollback(); 
            console.error("Transaction rolled back", error);
            throw error;
        }
    }
}

export class DatabaseWithRetry {
  private client: Client;
  private config: any;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor(config: any) {
    this.config = config;
    this.client = new Client(config);
  }

  async connect(): Promise<void> {
    let lastError;
    
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        console.log(`Database connection attempt ${i + 1}/${this.maxRetries}...`);
        await this.client.connect();
        console.log("✅ Database connected successfully!");
        return;
      } catch (error) {
        lastError = error;
        const errorMsg = (error && typeof error === "object" && "message" in error)
          ? (error as { message: string }).message
          : String(error);
        console.error(`Connection attempt ${i + 1} failed:`, errorMsg);
        
        if (i < this.maxRetries - 1) {
          console.log(`Retrying in ${this.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }
    
    const errorMsg = (lastError && typeof lastError === "object" && "message" in lastError)
      ? (lastError as { message: string }).message
      : String(lastError);
    throw new Error(`Failed to connect after ${this.maxRetries} attempts: ${errorMsg}`);
  }

  async query(sql: string, params?: any[]): Promise<any> {
    try {
      return await this.client.queryObject(sql, params);
    } catch (error) {
      // If connection lost, try to reconnect once
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string" &&
        (
          (error as { message: string }).message.includes("terminated") ||
          (error as { message: string }).message.includes("Connection")
        )
      ) {
        console.log("Connection lost, attempting to reconnect...");
        try {
          await this.client.end();
        } catch {}
        
        this.client = new Client(this.config);
        await this.connect();
        
        // Retry the query
        return await this.client.queryObject(sql, params);
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.end();
    } catch (error) {
      if (error && typeof error === "object" && "message" in error) {
        console.warn("Error disconnecting:", (error as { message: string }).message);
      } else {
        console.warn("Error disconnecting:", error);
      }
    }
  }
}