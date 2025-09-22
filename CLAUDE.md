# Claude Code Project Configuration

This project is configured for Claude Code assistance.

## Project Type
Express.js server with SQLite database

## Project Structure
```
radiocalico/
├── server.js                    # Main Express.js server entry point
├── package.json                 # Node.js dependencies and scripts
├── package-lock.json           # Locked dependency versions
├── database.db                 # SQLite database file
├── jest.config.js              # Jest configuration for backend tests
├── vite.config.js              # Vitest configuration for frontend tests
├── README.md                   # Project documentation
├── TESTING_STRATEGY.md         # Comprehensive testing documentation
├── Dockerfile                  # Multi-stage Docker build (dev/prod)
├── docker-compose.yml          # Development container configuration
├── docker-compose.prod.yml     # Production container configuration
├── .dockerignore               # Docker build context optimization
├── public/                     # Static web assets
│   ├── index.html              # Main development page
│   ├── radio.html              # Radio player page
│   ├── radio.js                # Radio player JavaScript
│   ├── styles.css              # CSS styles
│   ├── script.js               # Client-side JavaScript
│   └── logo.png                # Logo image
├── tests/                      # Test suites
│   ├── backend/                # Backend tests (Jest)
│   │   ├── unit/               # Unit tests
│   │   ├── integration/        # API integration tests
│   │   ├── fixtures/           # Test data
│   │   └── setup.js            # Test setup
│   └── frontend/               # Frontend tests (Vitest)
│       ├── unit/               # Unit tests
│       ├── integration/        # Integration tests
│       ├── mocks/              # MSW API mocks
│       └── setup.js            # Test setup
├── .github/                    # GitHub configuration
│   └── workflows/              # CI/CD workflows
│       └── test.yml            # Automated testing
├── CLAUDE.md                   # This configuration file
├── RadioCalico_Style_Guide.txt # Design guidelines
├── RadioCalicoLogoTM.png       # Logo trademark version
├── RadioCalicoLayout.png       # Layout reference
├── stream_URL.txt              # Stream configuration
└── .idea/                      # IDE configuration files
```

## Development Commands

### Make Targets (Recommended)
- `make help` - Show all available commands
- `make dev` or `make d` - Start development server locally
- `make dev-docker` - Start development with Docker
- `make prod` or `make p` - Start production environment
- `make test` or `make t` - Run all tests
- `make test-watch` - Run tests in watch mode
- `make test-coverage` - Run tests with coverage
- `make security` - Run comprehensive security scan
- `make security-report` - Generate detailed security report
- `make setup` - Initial project setup
- `make clean` - Clean all Docker resources
- `make health` - Check production service health
- `make info` - Show project information

### Local Development
- `npm start` - Start the server (port 3001)
- `npm run dev` - Start development server
- `npm test` - Run all tests (backend + frontend)
- `npm run test:backend` - Run backend tests only
- `npm run test:frontend` - Run frontend tests only
- `npm run test:backend:watch` - Run backend tests in watch mode
- `npm run test:frontend:watch` - Run frontend tests in watch mode
- `npm run test:backend:coverage` - Run backend tests with coverage
- `npm run test:frontend:coverage` - Run frontend tests with coverage
- `npm run test:ci` - Run tests optimized for CI/CD

### Docker Commands
- `docker-compose up` - Start development container
- `docker-compose up -d` - Start development container in background
- `docker-compose -f docker-compose.prod.yml up -d` - Start production container
- `docker build --target development -t radiocalico:dev .` - Build dev image
- `docker build --target production -t radiocalico:prod .` - Build prod image

### Database Commands (Production)
- `make db-backup` - Backup PostgreSQL database
- `make db-restore BACKUP_FILE=path/to/backup.sql` - Restore database
- `make db-shell` - Access PostgreSQL shell
- `make db-reset` - Reset database (WARNING: deletes data)

### Security Commands
- `make security` - Run comprehensive security scan
- `make security-audit` - NPM dependency vulnerability scan
- `make security-audit-fix` - Automatically fix vulnerabilities
- `make security-docker` - Scan Docker images with Trivy
- `make security-config` - Validate security configurations
- `make security-report` - Generate detailed security report
- `make security-outdated` - Check for outdated packages

## Dependencies
### Production
- **express** (^5.1.0) - Web framework
- **better-sqlite3** (^12.2.0) - SQLite database driver
- **sqlite3** (^5.1.7) - Alternative SQLite driver
- **cors** (^2.8.5) - Cross-origin resource sharing
- **helmet** (^8.1.0) - Security middleware
- **morgan** (^1.10.1) - HTTP request logger

### Development/Testing
- **jest** (^30.1.3) - Backend testing framework
- **vitest** (^3.2.4) - Frontend testing framework
- **supertest** (^7.1.4) - HTTP API testing
- **@testing-library/dom** (^10.4.1) - DOM testing utilities
- **@testing-library/jest-dom** (^6.8.0) - Jest DOM matchers
- **@testing-library/user-event** (^14.6.1) - User interaction simulation
- **msw** (^2.11.2) - API mocking for frontend tests
- **jsdom** (^27.0.0) - DOM environment for tests
- **@vitest/ui** (^3.2.4) - Vitest UI for interactive testing
- **@vitest/coverage-v8** (^3.2.4) - Code coverage reporting

## Testing Framework
The project uses a comprehensive testing strategy with both backend and frontend coverage:

### Backend Testing (Jest)
- **Database unit tests**: SQLite operations, constraints, and data integrity
- **API integration tests**: All endpoints with error handling and validation
- **Test files**: `tests/backend/unit/` and `tests/backend/integration/`
- **Coverage**: Database logic, rating system, user management (27 passing tests)

### Frontend Testing (Vitest + Testing Library)
- **Player unit tests**: Audio controls, HLS streaming, timer functionality
- **Rating system tests**: API interactions, UI updates, error handling
- **MSW mocking**: Realistic API responses for isolated testing
- **Test files**: `tests/frontend/unit/` and `tests/frontend/integration/`
- **Coverage**: Player controls, rating interactions (30 passing tests)

### CI/CD Pipeline
- **GitHub Actions**: Automated testing on push/PR (`test.yml`)
- **Coverage reporting**: Backend and frontend coverage with Codecov integration
- **Security auditing**: Automated dependency vulnerability checks
- **Integration testing**: Full application startup and API validation

## Radio Features
- **HLS streaming**: 48kHz FLAC audio via CloudFront CDN
- **Interactive ratings**: Thumbs up/down with SQLite persistence
- **Track metadata**: Real-time song information and album art
- **User fingerprinting**: Anonymous rating system using client characteristics
- **Recent tracks**: History display of previously played songs

## API Endpoints
- `GET /api/song/:hash/ratings` - Get rating counts for a track
- `POST /api/song/:hash/rate` - Submit a rating for a track
- `GET /api/song/:hash/user-rating/:userId` - Get user's rating
- `GET /api/client-ip` - Client fingerprinting endpoint
- `GET /api/users` - User management (development)
- `POST /api/users` - Create user (development)

## Docker Deployment
- **Multi-stage Dockerfile**: Separate development and production builds
- **Development image**: 552MB with full dev dependencies and test frameworks
- **Production image**: 425MB optimized with security hardening
- **Security features**: Non-root user, read-only filesystem, capability restrictions
- **Persistent storage**: SQLite database via Docker volumes
- **Health checks**: Built-in container monitoring
- **Port**: Application runs on port 3001 in containers

## Notes
- Keep documentation minimal unless explicitly requested
- Prefer editing existing files over creating new ones
- All tests passing: 57 total (27 backend + 30 frontend)
- Use `npm test` to run full test suite before commits
- Use `make security` to run security scans before commits
- For Docker deployment, use `docker-compose up` for development or `docker-compose -f docker-compose.prod.yml up -d` for production
- Security scanning includes NPM audit, Docker image scanning, and configuration validation
- CI/CD pipeline includes automated security checks with Trivy and GitHub Security integration