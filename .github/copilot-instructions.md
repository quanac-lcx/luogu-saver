# Luogu Saver - Copilot Coding Instructions

## Project Overview

**Luogu Saver** is a web application for archiving and preserving content from Luogu (a Chinese online judge platform). It's a Node.js-based Express web application with server-side rendering using Nunjucks templates and SemanticUI for the frontend.

**Project Type**: Full-stack web application (SSR)  
**Lines of Code**: ~5,300 lines of JavaScript  
**Languages**: JavaScript (ES Modules), Nunjucks templates, JSON  
**Runtime**: Node.js 22.18.0 (specified in README)  
**Package Manager**: npm (package-lock.json is in .gitignore, but npm install works)

### Key Technologies
- **Backend**: Express 5.x, TypeORM 0.3.x
- **Database**: MySQL/MariaDB (via mysql2), Redis (via ioredis)
- **Frontend**: Nunjucks templates, SemanticUI, jQuery, KaTeX (math rendering)
- **Task Scheduling**: node-schedule
- **Markdown**: markdown-it with plugins (attrs, container)
- **Real-time**: WebSocket (ws library)

## Directory Structure

```
/
├── .github/                  # GitHub workflows and issue templates
│   └── workflows/
│       └── autoAssign.yml    # Auto-assigns advertising issues
├── app.js                    # Main application entry point
├── package.json              # Project dependencies and scripts
├── migrate.js                # Database migration script
├── config.example.js         # Configuration template (copy to config.js)
├── ormconfig.example.json    # TypeORM config template (copy to ormconfig.json)
├── contentConfig.example.json     # App settings template (copy to contentConfig.json)
├── accounts.example.json     # Accounts config template (copy to accounts.json)
├── core/                     # Core utilities and helpers
│   ├── logger.js             # Logging with chalk (info, warn, error, debug)
│   ├── utils.js              # Utility functions (formatDate, hash, etc.)
│   ├── markdown.js           # Markdown rendering configuration
│   ├── redis.js              # Redis client manager
│   ├── request.js            # HTTP request utilities
│   ├── cache.js              # Caching logic
│   ├── pagination.js         # Pagination helpers
│   ├── response.js           # Response formatting
│   └── storage.js            # Storage utilities
├── entities/                 # TypeORM entity definitions (JSON format)
│   ├── index.js              # Entity loader
│   ├── article.entity.json   # Article entity schema
│   ├── user.entity.json      # User entity schema
│   ├── paste.entity.json     # Paste entity schema
│   ├── problem.entity.json   # Problem entity schema
│   ├── task.entity.json      # Task entity schema
│   ├── judgement.entity.json # Judgement entity schema
│   └── [other entities]
├── models/                   # Business logic models
│   ├── common.js             # Common model utilities
│   ├── article.js            # Article model
│   ├── user.js               # User model
│   └── [other models]
├── services/                 # Service layer (14 services)
│   ├── article.service.js    # Article business logic
│   ├── user.service.js       # User business logic
│   ├── admin.service.js      # Admin operations
│   ├── problem.service.js    # Problem management
│   ├── statistic.service.js  # Statistics
│   └── [other services]
├── routes/                   # Express route definitions (14 route files)
│   ├── index.route.js        # Home page routes
│   ├── article.route.js      # Article routes
│   ├── admin.route.js        # Admin panel routes
│   ├── benben.route.js       # Benben (chat/feed) routes
│   ├── problem.route.js      # Problem routes
│   └── [other routes]
├── middleware/               # Express middleware
│   ├── auth.js               # Authentication middleware
│   ├── logging.js            # Request logging
│   ├── permission.js         # Permission checking
│   ├── cache_context.js      # Cache context management
│   ├── mobile_detect.js      # Mobile device detection
│   ├── get_ip.js             # Client IP extraction
│   └── [other middleware]
├── workers/                  # Background workers
│   ├── index.worker.js       # Main worker coordinator
│   ├── processor.worker.js   # Task processor
│   ├── queue.worker.js       # Queue management
│   ├── websocket.worker.js   # WebSocket handler
│   └── admin.worker.js       # Admin worker tasks
├── jobs/                     # Scheduled jobs (via node-schedule)
│   ├── cleanup.js            # Cleanup tasks (every 10 minutes)
│   ├── update_problems.js    # Problem updates (daily at midnight)
│   ├── crawl_judgement.js    # Judgement crawling (daily at noon)
│   └── warm_up.js            # Cache warming (every 5 minutes)
├── handlers/                 # Event handlers
│   ├── index.handler.js      # Main handler
│   ├── broadcast.benben.handler.js
│   ├── task_progress.benben.handler.js
│   └── [other handlers]
├── views/                    # Nunjucks templates
│   ├── layout.njk            # Main layout template
│   ├── index.njk             # Homepage
│   ├── admin/                # Admin panel templates
│   ├── content/              # Content display templates
│   ├── benben/               # Benben templates
│   ├── components/           # Reusable components
│   ├── user/                 # User-related templates
│   └── [other views]
└── static/                   # Static assets
    ├── self/                 # Custom CSS/JS
    ├── semantic/             # SemanticUI framework
    ├── katex/                # KaTeX math rendering
    ├── fontawesome/          # Font Awesome icons
    ├── jquery/               # jQuery library
    └── [other static files]
```

## Configuration Setup

**CRITICAL**: The application requires four configuration files that MUST be created from their example templates before running:

1. **config.js** (from config.example.js) - Main application configuration
2. **ormconfig.json** (from ormconfig.example.json) - TypeORM database configuration  
3. **contentConfig.json** (from contentConfig.example.json) - Application settings (announcements, banners)
4. **accounts.json** (from accounts.example.json) - Account credentials for crawling

These files are in .gitignore and must be manually created. Use these commands:

```bash
cp config.example.js config.js
cp ormconfig.example.json ormconfig.json
cp contentConfig.example.json contentConfig.json
cp accounts.example.json accounts.json
```

## Environment Requirements

### Required Services
The application requires the following services to be running:

1. **MySQL/MariaDB** (default: localhost:3306)
   - Database: `luogu_save` (configurable in config.js)
   - User credentials configured in config.js
   - TypeORM synchronize mode is enabled (auto-creates tables)

2. **Redis** (default: localhost:6379)
   - Used for caching and session management
   - Connection settings in config.js under `redis` section
   - Database 0 by default

**Note**: If MySQL or Redis are not available, the application will fail with connection errors. For development without these services, you'll need to stub them out or use Docker containers.

### Optional External Services
- **Benben WebSocket Server** (spider-benben.imken.dev) - For real-time benben updates
- **Benben API Server** (api-benben.imken.dev) - For benben data fetching

These will show warnings if unavailable but won't prevent the app from starting.

## Build and Run Instructions

### Installation
**ALWAYS run npm install before any other commands.** Installation takes approximately 30-40 seconds and succeeds without errors:

```bash
npm install
```

You may see deprecation warnings for `gauge`, `npmlog`, `inflight`, `rimraf`, and `glob` - these are expected and can be ignored.

### Available npm Scripts
```bash
npm run migrate   # Run database migration (requires MySQL connection)
npm test          # Currently not implemented - exits with error
```

### Running the Application

1. **First-time setup**:
```bash
# Create configuration files
cp config.example.js config.js
cp ormconfig.example.json ormconfig.json
cp contentConfig.example.json contentConfig.json
cp accounts.example.json accounts.json

# Edit config.js to set your database and Redis credentials
# Edit ormconfig.json if using a different database type

# Install dependencies
npm install

# Ensure MySQL and Redis are running
# The app will auto-create database tables via TypeORM synchronize
```

2. **Start the application**:
```bash
node app.js
```

The server listens on port 55086 by default (configurable in config.js).

### Migration Script
The `migrate.js` script is used for migrating from old table schemas to new ones. It:
- Truncates existing tables (user, paste, article_version, task, article)
- Imports data from old tables (users→user, pastes→paste, etc.)
- Requires a working database connection

**Note**: This is likely only needed for initial setup from an existing database.

## Important Code Patterns and Conventions

### ES Modules
The project uses ES modules (`"type": "module"` in package.json). All imports must use:
- `.js` file extensions in import statements
- `import` syntax (not `require`)
- JSON imports use: `import data from "./file.json" with { type: "json" };`

### Global Variables
The application sets these globals in app.js:
- `global.logger` - Logger instance (from core/logger.js)
- `global.renderer` - Markdown renderer instance
- `global.worker` - Worker instance
- `global.redis` - Redis manager instance
- `global.listener` - WebSocket listener instance

### TypeORM Entity Pattern
Entities are defined as JSON files in `entities/`, not as TypeScript classes:
- Each `.entity.json` file defines a database table schema
- `entities/index.js` loads and converts them to TypeORM EntitySchema objects
- Special handling for CURRENT_TIMESTAMP defaults (converted to functions)

### Error Handling
- Logger provides: `info()`, `warn()`, `error()`, `debug()` (debug requires `config.debug = true`)
- Error logging attempts to write to ErrorLog entity (may fail if DB not initialized)
- Express error handling via `middleware/error_display.js`

### Scheduled Jobs
Jobs are defined in `jobs/` and registered in app.js:
- `cleanup.js` - Every 10 minutes (`'0/10 * * * *'`)
- `update_problems.js` - Daily at midnight (`'0 0 * * *'`)
- `crawl_judgement.js` - Daily at noon (`'0 12 * * *'`)
- `warmUpBenbenStatistics` - Every 5 minutes (`'0/5 * * * *'`)

## Testing and Validation

### No Automated Tests
The repository has no test suite configured. `npm test` will fail with "Error: no test specified".

**When making changes**: Manually test by:
1. Starting the application with `node app.js`
2. Verifying the server starts without errors
3. Testing affected routes/functionality through the web interface
4. Checking console logs for errors

### Validation Checklist
Before committing changes:
- [ ] Run `npm install` to ensure dependencies resolve
- [ ] Verify configuration files are not committed (they're in .gitignore)
- [ ] Check that app.js can be imported without syntax errors
- [ ] Ensure all .js files use ES module syntax with .js extensions
- [ ] If changing entities, verify JSON schema is valid
- [ ] If adding dependencies, ensure they're compatible with Node.js 22

## GitHub Workflows

Only one workflow is configured:
- `.github/workflows/autoAssign.yml` - Auto-assigns issues labeled "advertising application" to user quanac-lcx

**No CI/CD pipeline exists** - there are no automated build, test, or deployment checks.

## Common Issues and Workarounds

### Issue: "Cannot find module ormconfig.json"
**Cause**: Configuration files not created from examples  
**Fix**: Run `cp ormconfig.example.json ormconfig.json` (and same for other config files)

### Issue: "ECONNREFUSED ::1:3306" or "ECONNREFUSED 127.0.0.1:6379"
**Cause**: MySQL or Redis not running  
**Fix**: Start MySQL and Redis services, or modify config.js to point to running instances

### Issue: "No metadata for 'ErrorLog' was found"
**Cause**: Database not initialized yet (entity loading failed)  
**Fix**: Ensure database connection is successful before app tries to log errors

### Issue: Deprecation warnings during npm install
**Expected behavior**: Warnings for gauge, npmlog, inflight, rimraf, glob are normal and can be ignored

## Making Code Changes

### Adding a New Route
1. Create route file in `routes/` (e.g., `newfeature.route.js`)
2. Import and register in `app.js`: `app.use('/newfeature', newfeatureRouter);`
3. Add corresponding service in `services/` if needed
4. Add templates in `views/` for rendering

### Adding a New Entity
1. Create `entityname.entity.json` in `entities/`
2. Follow the JSON schema pattern from existing entities
3. TypeORM will auto-create the table if `synchronize: true` in ormconfig.json
4. Create corresponding model in `models/` for business logic

### Adding a Scheduled Job
1. Create job file in `jobs/`
2. Import in `app.js`
3. Register with `scheduleJob()` in the initialization chain

### Modifying Frontend
1. Templates are in `views/` (Nunjucks syntax)
2. Static assets in `static/self/` for custom CSS/JS
3. SemanticUI is the CSS framework - use its classes
4. KaTeX is available for math rendering

## Key Files to Review

When working on this codebase, frequently reference:
1. **app.js** - Application entry point, middleware chain, route registration
2. **config.example.js** - All configuration options and their defaults
3. **entities/index.js** - How entities are loaded
4. **core/logger.js** - Logging API
5. **core/utils.js** - Common utility functions
6. **views/layout.njk** - Main page layout and structure

## Tips for Efficient Development

1. **Trust these instructions** - Only search the codebase if information here is incomplete or incorrect
2. **Configuration first** - Always ensure config files exist before running any code
3. **Check logs** - The logger provides detailed output; use it to debug issues
4. **ES modules** - Remember to use .js extensions in all imports
5. **Database-dependent** - Most functionality requires MySQL; stub it if needed for offline development
6. **No TypeScript** - Despite using TypeORM, this is pure JavaScript (ES modules)
7. **Frontend is server-rendered** - Changes to views require server restart
8. **Global state** - Be aware of globals set in app.js (logger, renderer, worker, redis, listener)
