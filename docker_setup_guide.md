# AllocAid Docker Setup Guide - Cross-Platform

This guide will help every team member get AllocAid running with Docker, regardless of whether they're using Windows, macOS, or Linux.

## Prerequisites Check

Before starting, everyone should verify they have:
- Git installed
- At least 8GB RAM available
- At least 10GB free disk space
- Administrative/sudo privileges on their machine

## Step 1: Install Docker

### Windows Users

1. **Download Docker Desktop for Windows**
   - Go to https://docs.docker.com/desktop/windows/install/
   - Download "Docker Desktop for Windows"
   - Requires Windows 10/11 Pro, Enterprise, or Education (64-bit)

2. **Install Docker Desktop**
   - Run the installer as Administrator
   - During installation, ensure "Use WSL 2 instead of Hyper-V" is checked
   - Restart your computer when prompted

3. **Enable WSL 2 (if not already enabled)**
   - Open PowerShell as Administrator
   - Run: `wsl --install`
   - Restart if prompted

4. **Start Docker Desktop**
   - Launch Docker Desktop from Start menu
   - Accept the terms and conditions
   - Wait for Docker to start (green light in system tray)

5. **Verify Installation**
   ```cmd
   docker --version
   docker-compose --version
   ```

### macOS Users

1. **Download Docker Desktop for Mac**
   - Go to https://docs.docker.com/desktop/mac/install/
   - Choose the correct version for your chip:
     - **Apple Silicon (M1/M2)**: "Mac with Apple chip"
     - **Intel**: "Mac with Intel chip"

2. **Install Docker Desktop**
   - Open the downloaded `.dmg` file
   - Drag Docker to Applications folder
   - Launch Docker from Applications

3. **Grant Permissions**
   - Enter your password when prompted for privileged access
   - Docker may ask for accessibility permissions

4. **Start Docker Desktop**
   - Wait for Docker to start (whale icon in menu bar)
   - Complete the onboarding tutorial if desired

5. **Verify Installation**
   ```bash
   docker --version
   docker-compose --version
   ```

### Linux Users

#### Ubuntu/Debian
```bash
# Update package index
sudo apt update

# Install prerequisites
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Log out and back in, then verify
docker --version
docker compose version
```

#### CentOS/RHEL/Fedora
```bash
# Install Docker
sudo dnf install docker docker-compose

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, then verify
docker --version
docker-compose --version
```

## Step 2: Clone the Repository

All team members should clone the project repository:

```bash
# Clone the repository
git clone [YOUR_REPOSITORY_URL]
cd allocaid

# Verify you're in the right directory
ls -la
# You should see: Dockerfile, docker-compose.yml, Makefile, etc.
```

## Step 3: Initial Project Setup

### Option A: Using the Automated Script (Recommended)

```bash
# Make the setup script executable (Linux/Mac)
chmod +x scripts/docker-setup.sh

# Run the setup script
./scripts/docker-setup.sh development
```

**For Windows users using Git Bash or WSL:**
```bash
bash scripts/docker-setup.sh development
```

**For Windows users using Command Prompt:**
```cmd
# Navigate to scripts directory
cd scripts
# Run with bash (if available) or manually follow Option B
bash docker-setup.sh development
```

### Option B: Manual Setup (If script doesn't work)

1. **Create necessary directories:**
   ```bash
   mkdir -p database/init
   mkdir -p logs
   mkdir -p scripts
   ```

2. **Create environment file:**
   ```bash
   # Copy the template
   cp .env.docker .env
   
   # Edit the .env file to update secrets (see Step 4)
   ```

3. **Build and start services:**
   ```bash
   make dev
   # OR if make is not available:
   docker-compose --profile development up -d --build
   ```

## Step 4: Configure Environment Variables

**IMPORTANT**: Everyone must update the `.env` file with secure secrets:

1. **Open `.env` file in your preferred editor**

2. **Change these values** (use different random strings for each):
   ```env
   JWT_SECRET=your-unique-long-random-string-here-make-it-very-long
   REFRESH_SECRET=another-different-very-long-random-string-here
   ```

3. **Generate secure secrets** (choose one method):
   
   **Linux/Mac:**
   ```bash
   # Generate random strings
   openssl rand -base64 32
   openssl rand -base64 32
   ```
   
   **Windows PowerShell:**
   ```powershell
   # Generate random strings
   [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
   ```
   
   **Any OS - Online generator:**
   - Visit https://www.uuidgenerator.net/
   - Generate two different long random strings

## Step 5: Start the Development Environment

### Using Makefile (Recommended)
```bash
# Start development environment
make dev

# Check status
make status

# View logs
make logs
```

### Using Docker Compose Directly
```bash
# Start development services
docker-compose --profile development up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Step 6: Verify Everything is Working

### Check Service Status
```bash
# Using make
make health

# OR manually check each service
docker-compose ps
```

### Test Application Access

Open your web browser and verify these URLs work:

1. **Main Application**: http://localhost:8000
2. **Frontend Development**: http://localhost:3000
3. **Database Admin (pgAdmin)**: http://localhost:5050
   - Email: admin@allocaid.com
   - Password: admin123

### Check Database Connection
```bash
# Open database shell
make db-shell
# OR
docker-compose exec database psql -U allocaid_user -d allocaid_db

# You should see a PostgreSQL prompt
# Type \q to exit
```

## Step 7: Common Development Commands

### Daily Workflow
```bash
# Start development environment
make dev

# View logs from all services
make logs

# View only application logs
make logs-app

# Open shell in application container
make shell

# Stop all services
make stop

# Restart services
make restart
```

### Database Operations
```bash
# Access database shell
make db-shell

# Run migrations (if you have them)
make db-migrate

# Seed database with sample data
make db-seed

# Create database backup
make db-backup

# Reset database (WARNING: deletes all data)
make db-reset
```

### Code Development
```bash
# Install frontend dependencies
make install-frontend

# Build frontend
make frontend-build

# Run linting
make lint

# Format code
make format
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Permission denied" on Linux
**Solution:**
```bash
# Add your user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

#### Issue: "Port already in use"
**Solution:**
```bash
# Check what's using the port
netstat -tulpn | grep :8000
# Stop the conflicting service or change ports in .env
```

#### Issue: "No space left on device"
**Solution:**
```bash
# Clean up Docker
make clean
# OR
docker system prune -af --volumes
```

#### Issue: Services won't start
**Solution:**
```bash
# Check logs for errors
make logs

# Restart Docker Desktop (Windows/Mac)
# OR restart Docker service (Linux)
sudo systemctl restart docker
```

#### Issue: Database connection failed
**Solution:**
```bash
# Wait for database to fully start
sleep 30

# Check database status
docker-compose exec database pg_isready -U allocaid_user -d allocaid_db

# If still failing, restart database
docker-compose restart database
```

#### Issue: WSL issues on Windows
**Solution:**
```bash
# Update WSL
wsl --update

# Restart WSL
wsl --shutdown
# Then restart Docker Desktop
```

### Getting Help

1. **Check the logs first:**
   ```bash
   make logs
   ```

2. **Check service status:**
   ```bash
   make status
   make health
   ```

3. **Clean restart:**
   ```bash
   make clean
   make dev
   ```

4. **Complete reset (nuclear option):**
   ```bash
   make reset-dev
   ```

## Environment-Specific Notes

### Windows Specific
- Use Git Bash or WSL for the best experience
- Docker Desktop must be running before using commands
- File path separators might need adjustment in some commands

### macOS Specific
- Docker Desktop must be running
- Some commands might require `sudo` on older versions
- M1/M2 Macs: ensure you downloaded the ARM version

### Linux Specific
- Docker service must be running: `sudo systemctl start docker`
- User must be in docker group
- Use `docker compose` (space) instead of `docker-compose` on newer installations

## Team Onboarding Checklist

Print this checklist for new team members:

- [ ] Docker installed and running
- [ ] Repository cloned
- [ ] Environment file configured with unique secrets
- [ ] Development environment started (`make dev`)
- [ ] All services accessible (localhost:8000, 3000, 5050)
- [ ] Database connection working
- [ ] Able to view logs and check status
- [ ] Familiar with common make commands

## Next Steps

Once everyone has Docker running:

1. **Set up your IDE** with the project
2. **Review the codebase structure**
3. **Run tests** to ensure everything works
4. **Make a small test change** to verify hot reloading
5. **Learn the development workflow** your team uses

---

**Need help?** Ask in the team chat or reach out to a team lead!