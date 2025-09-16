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
├── public/                     # Static web assets
│   ├── index.html              # Main development page
│   ├── radio.html              # Radio player page
│   ├── styles.css              # CSS styles
│   ├── script.js               # Client-side JavaScript
│   └── logo.png                # Logo image
├── CLAUDE.md                   # This configuration file
├── RadioCalico_Style_Guide.txt # Design guidelines
├── RadioCalicoLogoTM.png       # Logo trademark version
├── RadioCalicoLayout.png       # Layout reference
├── stream_URL.txt              # Stream configuration
└── .idea/                      # IDE configuration files
```

## Development Commands
- `npm start` - Start the server
- `npm run dev` - Start development server
- `npm test` - Run tests (not configured)

## Dependencies
- **express** (^5.1.0) - Web framework
- **better-sqlite3** (^12.2.0) - SQLite database driver
- **sqlite3** (^5.1.7) - Alternative SQLite driver
- **cors** (^2.8.5) - Cross-origin resource sharing
- **helmet** (^8.1.0) - Security middleware
- **morgan** (^1.10.1) - HTTP request logger

## Notes
- Keep documentation minimal unless explicitly requested
- Prefer editing existing files over creating new ones