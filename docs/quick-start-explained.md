# Quick Start Guide: How `make quick-start` Works

The `make quick-start` command is designed to get new developers up and running with the AllocAid TA Management System as quickly as possible. It automates the essential setup and launch steps using Docker, so you don't have to run each command manually.

## What Happens When You Run `make quick-start`?

The `quick-start` target in the Makefile is defined as:

```
quick-start: setup dev ## Quick start for new developers
	@echo "🎉 AllocAid is ready for development!"
```

This means it runs two other Makefile targets in sequence:

### 1. `make setup`
- Runs the environment setup script (`scripts/docker-setup.sh development`).
- Ensures necessary environment files and directories are created.
- Prepares Docker and project configuration for development.

### 2. `make dev`
- Starts the development environment using Docker Compose with the `development` profile.
- Launches all required services in the background:
  - Backend API (http://localhost:8000)
  - Frontend (http://localhost:3000)
  - pgAdmin (http://localhost:5050)
- Enables live reload for rapid development.

### 3. Success Message
- Prints: `🎉 AllocAid is ready for development!`

## Summary
- **One command**: `make quick-start`
- **Result**: Your entire development stack is set up and running in Docker containers, ready for you to start coding.

## Troubleshooting
- If you encounter issues, check the logs with `make logs` or `make logs-app`.
- For a clean slate, use `make reset-dev` to stop, clean, and restart everything.

---
For more details, see the Makefile or run `make help` for a list of available commands.
