# BrainBox Agent

## Overview

BrainBox Agent is a self-learning, API-free AI chat application that stores and retrieves knowledge from a local database. Unlike traditional AI assistants that rely on external APIs, BrainBox Agent learns entirely through user interactions - users can teach the AI new information when it doesn't know an answer, and the AI uses a search-based retrieval system to answer questions based on its accumulated knowledge base.

The application features a conversational chat interface where users can ask questions, teach the AI new information, and improve existing knowledge entries. The system provides confidence indicators to show how certain the AI is about its responses.

## Recent Changes

**November 24, 2025**: Successfully generated and loaded a comprehensive 100-entry knowledge dataset covering diverse categories:
- Technology & Web Development (HTML, CSS, JavaScript, React, Node.js, MongoDB, APIs, Git, npm)
- Computer Science (algorithms, data structures, programming concepts, OOP)
- Sciences (Physics, Chemistry, Biology, Earth Science)
- Mathematics (geometry, algebra, formulas)
- Internet & Networking (HTTP/HTTPS, Wi-Fi, IP addresses, VPNs, bandwidth, encryption)
- Daily Life (study tips, productivity, health, troubleshooting)
- AI/Machine Learning basics (neural networks, deep learning)

All entries follow the standard JSON format with id, question, and answer fields. Answers are concise (2-4 lines), beginner-friendly, and written in simple English.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component System**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- Follows a "New York" design style with consistent spacing, typography, and color systems
- Design philosophy prioritizes conversational clarity with minimal chrome and maximum conversation space
- Uses Inter font family via Google Fonts for clean, highly legible chat interface
- Mobile-first responsive design with max-width containers (max-w-3xl for chat, max-w-5xl for outer containers)

**State Management**: 
- TanStack Query (React Query) for server state management with custom query client configuration
- Local React state for UI interactions and chat message history
- No global state management library - relies on React hooks and context

**Routing**: Wouter for lightweight client-side routing (though currently only serves a single chat page)

**Key Design Patterns**:
- Component composition with shadcn/ui's reusable component library
- Custom hooks for mobile detection and toast notifications
- Form validation using React Hook Form with Zod resolvers
- TypeScript path aliases (@/, @shared/, @assets/) for clean imports

### Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript

**Development vs Production**:
- Development mode uses Vite middleware for HMR and SSR of React components
- Production mode serves pre-built static files from dist/public
- Separate entry points (index-dev.ts vs index-prod.ts) with shared app logic

**API Structure**:
- RESTful API endpoints under /api prefix
- Key endpoints:
  - POST /api/query - Submit questions to the AI
  - POST /api/teach - Add new knowledge entries
  - POST /api/improve - Update existing knowledge entries
  - GET /api/knowledge/count - Retrieve knowledge base statistics

**Search & Retrieval System**:
- Lunr.js for full-text search indexing and querying
- In-memory search index rebuilt when knowledge base changes
- Confidence scoring based on search result scores (high/low/none)
- Question and answer fields indexed with different boost values (question: 10, answer: 5)

**Knowledge Storage Strategy**:
- Initially designed to use JSON file storage (knowledge.json)
- Database schema defined using Drizzle ORM for PostgreSQL migration path
- Storage abstraction layer (IStorage interface) allows swapping between file and database backends
- Knowledge entries cached in memory for performance

### Data Storage Solutions

**Current Implementation**: File-based storage using knowledge.json
- Simple JSON structure with id, question, and answer fields
- In-memory caching with write-through to disk
- Suitable for small to medium knowledge bases

**Database Schema** (Drizzle ORM configured for PostgreSQL):
- Schema defined in shared/schema.ts for portability
- Migrations configured to output to ./migrations directory
- Connection via Neon serverless PostgreSQL driver
- Ready for migration when scaling requires persistent database

**Session Management**:
- Connect-pg-simple configured for PostgreSQL session storage
- Suggests user authentication/sessions may be planned feature

### External Dependencies

**Core Dependencies**:
- @neondatabase/serverless - PostgreSQL database driver for serverless environments
- drizzle-orm & drizzle-kit - Type-safe SQL ORM and migration toolkit
- lunr - Client-side full-text search library
- express - Web application framework
- react & react-dom - UI library
- @tanstack/react-query - Server state management
- wouter - Lightweight routing
- zod - Schema validation

**UI Component Libraries**:
- @radix-ui/* - Unstyled, accessible component primitives (20+ components)
- tailwindcss - Utility-first CSS framework
- class-variance-authority - Variant-based component styling
- lucide-react - Icon library

**Development Tools**:
- vite - Build tool and dev server
- typescript - Type safety
- tsx - TypeScript execution for Node.js
- esbuild - Production bundling
- @replit/vite-plugin-* - Replit-specific development enhancements

**Form & Validation**:
- react-hook-form - Form state management
- @hookform/resolvers - Validation resolvers
- drizzle-zod - Zod schema generation from Drizzle schemas

**Styling & Utilities**:
- clsx & tailwind-merge - Conditional CSS class management
- date-fns - Date manipulation utilities
- cmdk - Command menu component