# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development
npm run dev          # Start with Turbopack on http://localhost:3000
npm run dev:daemon   # Start in background, logs to logs.txt

# Build & Production
npm run build
npm run start

# Testing
npm run test              # Run all tests with Vitest
npx vitest run <file>     # Run a single test file

# Linting
npm run lint

# Database
npm run db:reset          # Reset and re-run all migrations
npx prisma generate       # Regenerate Prisma client after schema changes
npx prisma migrate dev    # Create and apply new migration
```

## Architecture

UIGen is an AI-powered React component generator with live preview. Users describe components in a chat interface, and Claude generates working React code that renders in real-time.

### Core Data Flow

1. **Chat API** (`src/app/api/chat/route.ts`) - Receives messages and virtual file system state, streams responses using Vercel AI SDK with Claude. The AI has access to two tools:
   - `str_replace_editor` - Create files, view files, replace strings, insert lines
   - `file_manager` - Rename and delete files

2. **Virtual File System** (`src/lib/file-system.ts`) - In-memory file system that stores generated code. Files never touch disk. Serializes to/from JSON for persistence in the database.

3. **JSX Transformer** (`src/lib/transform/jsx-transformer.ts`) - Transforms JSX/TSX to browser-compatible JS using Babel standalone. Creates blob URLs and import maps for the preview iframe. Third-party packages are loaded from esm.sh.

4. **Preview Frame** (`src/components/preview/PreviewFrame.tsx`) - Renders generated components in a sandboxed iframe using import maps and blob URLs. Automatically finds entry point (App.jsx/tsx or index.jsx/tsx).

### Key Contexts

- **FileSystemContext** (`src/lib/contexts/file-system-context.tsx`) - Provides virtual file system to components, handles tool calls from AI responses
- **ChatContext** (`src/lib/contexts/chat-context.tsx`) - Wraps Vercel AI SDK's useChat, passes file system state to API

### Database

SQLite database via Prisma. Always refer to `prisma/schema.prisma` to understand the data structure. Prisma client is output to `src/generated/prisma/`.

### Authentication

JWT-based auth implemented in `src/lib/auth.ts` using jose library. Session stored in cookies.
