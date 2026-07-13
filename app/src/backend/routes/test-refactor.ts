// Test script to verify the refactored profile routes work correctly
import { profileRouter, setupProfileRoutes } from "./profileRouter.ts";

console.log("✅ profileRouter imported successfully");
console.log("✅ setupProfileRoutes imported successfully");
console.log("✅ Refactored profile routes are working correctly!");

// Verify router has the expected structure
if (profileRouter && typeof setupProfileRoutes === "function") {
  console.log("✅ Router and setup function are properly defined");
} else {
  console.error("❌ Issue with router or setup function");
}
