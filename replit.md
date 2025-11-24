# BrainBox Agent

## Overview

BrainBox Agent is a self-learning, API-free AI chat application that stores and retrieves knowledge from a local database. Unlike traditional AI assistants that rely on external APIs, BrainBox Agent learns entirely through user interactions - users can teach the AI new information when it doesn't know an answer, and the AI uses a search-based retrieval system to answer questions based on its accumulated knowledge base.

The application features a conversational chat interface where users can ask questions, teach the AI new information, and improve existing knowledge entries. The system provides confidence indicators to show how certain the AI is about its responses.

## Recent Changes

**November 24, 2025 (Critical Search Fix - Final)**: Fixed critical search issue preventing answers from being retrieved. Implemented robust dual-layer search system:
- **Layer 1**: Lunr full-text search with lowered threshold (minScore 0.1)
- **Layer 2**: Fallback keyword matching for guaranteed match when Lunr returns nothing
- Result: AI now correctly retrieves answers from 300-topic database
- Tested and verified working with comprehensive dataset

**November 24, 2025 (Complete Multilingual System)**: Built comprehensive multilingual chat system that stores all knowledge in English but responds naturally in user's language (English, Hindi, Hinglish, or mixed styles) without any external APIs:

**System Architecture:**
- 6 core AI modules working together seamlessly
- Language detection using character frequency and vocabulary analysis
- 500+ word Hindi dictionary for accurate translations
- Context persistence for multi-turn teaching conversations
- All knowledge stored in English, converted on output

**Core Modules Created:**
1. `languageDetector.ts` - Detects English/Hindi/Hinglish/mixed languages automatically
2. `hindiDictionary.json` - 500+ English↔Hindi word mappings for conversion
3. `converter.ts` - Converts English to Hindi/Hinglish without external APIs
4. `knowledgeBase.ts` - Stores and retrieves knowledge (all in English internally)
5. `learningManager.ts` - Handles teaching mode when users teach new information
6. `mainChatEngine.ts` - Orchestrates all modules for complete conversations

**Key Features:**
- Automatic language detection (no user configuration needed)
- Responds in same language as user input
- Learning mode triggered by keywords: "samjhao", "learn this", "yaad karo", "sikhao", "batao"
- Context persistence across multi-turn conversations
- Completely offline - no translation APIs or cloud services
- 300 pre-loaded topics in knowledge base

**Technical Implementation:**
- Updated API routes to accept/return chat context for stateful conversations
- Frontend persists context between requests for learning mode
- Shared TypeScript types ensure consistency across frontend/backend
- Modular architecture allows easy extension and maintenance

**November 24, 2025**: Expanded knowledge base to **300 total entries** by adding 100 general conversation questions covering everyday life topics:
- Personal development (confidence, motivation, habits, resilience, growth mindset)
- Social skills (making friends, conversations, networking, first impressions, small talk)
- Life advice (dealing with anxiety, stress, loneliness, criticism, change, failure)
- Work & career (job interviews, work-life balance, productivity, teamwork, leadership)
- Communication (listening, feedback, apologies, setting boundaries, conflict resolution)
- Daily routines (morning/bedtime routines, organization, time management)
- Emotional intelligence (empathy, self-care, gratitude, handling emotions)
- Practical wisdom (decision-making, learning, problem-solving, adaptability)

**November 24, 2025 (Second Update)**: Expanded knowledge base to **200 total entries** by adding 100 additional unique questions and answers covering:
- Advanced programming topics (TypeScript, Redux, SQL, REST APIs, debugging, refactoring)
- Extended science coverage (Newton's laws, meiosis, immune/nervous/muscular systems, homeostasis)
- Additional chemistry concepts (acids, bases, catalysts, oxidation, chemical bonds)
- More web development (DOM, responsive design, CSS animation, box model)
- Life skills (time management, goal setting, public speaking, language learning)
- Health & safety (antibiotics, sunscreen, recycling, stress management)

**November 24, 2025 (Initial)**: Successfully generated and loaded a comprehensive 100-entry knowledge dataset covering diverse categories:
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