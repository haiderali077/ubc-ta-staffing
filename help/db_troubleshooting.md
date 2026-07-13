# Database Troubleshooting Guide

## Common macOS PostgreSQL Issues

### Problem: "role allocaid_user does not exist" 
**Cause:** Local PostgreSQL (Homebrew) conflicts with Docker PostgreSQL on port 5432

**Solution:**
```bash
# Stop local PostgreSQL
brew services stop postgresql@14

# Verify it's stopped
brew services list | grep postgres

# Then restart your server
deno run --allow-net --allow-read --allow-env --allow-write server.ts