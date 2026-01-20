# Project Architecture & Structure Implementation

This document provides a comprehensive technical overview of the University Hyperlocal Social Platform. It maps the file structure to the architectural components and details the key technologies in use.

## 1. System Architecture Overview

The project follows a **Microservices-based Monorepo** architecture (currently transitioning from MVP to full scale).

### Core Components
| Component | Type | Path | Description |
| :--- | :--- | :--- | :--- |
| **Mobile App** | Frontend | `apps/mobile` | React Native (Expo) application using Expo Router for navigation. |
| **API Gateway** | Service | `services/gateway` | Single entry point. Handles request routing and initial auth verification. |
| **User Service** | Service | `services/user-service` | The primary monolith-style microservice containing logic for Users, Posts, Marketplace, and Messaging. |
| **Shared Types** | Package | `packages/shared-types` | TypeScript definitions shared between client and server. |

### Infrastructure
- **Database**: PostgreSQL (managed via Prisma ORM).
- **Caching**: Redis (for feed caching and sessions).
- **File Storage**: Cloudinary (images/video) & Vercel Blob (documents).
- **Real-time**: Socket.io (messaging and notifications).
- **Deployment**: Render (defined in `render.yaml`).

---

## 2. Directory Structure & Key Files

### Root Configuration
The root contains project-wide configuration and documentation.
- `render.yaml`: Infrastructure-as-Code for Render deployment.
- `integrated.md`: Feature specification & RAG system design.
- `DOCUMENTATION.md`: Detailed functional specs and product requirements.
- `package.json`: Workspaces configuration.

### 📱 Mobile App (`apps/mobile`)
**Framework**: React Native, Expo SDK 50+, Expo Router v3, NativeWind (Tailwind CSS).

#### File Structure
```text
apps/mobile/
├── app/                        # Expo Router Pages
│   ├── _layout.tsx             # Root Layout (Providers, Auth Check)
│   ├── index.tsx               # Entry redirect
│   ├── (auth)/                 # Authentication Group
│   │   ├── login.tsx           # Login Screen
│   │   ├── sign-up.tsx         # Registration
│   │   └── verify/             # Verification flows
│   ├── (onboarding)/           # Post-signup Onboarding
│   │   ├── identity.tsx        # Profile setup
│   │   └── select-university.tsx
│   ├── (tabs)/                 # Main Tab Navigation
│   │   ├── home/               # Feed
│   │   ├── marketplace/        # Marketplace Grid
│   │   ├── events/             # Events Calender
│   │   ├── communities/        # Groups/Communities
│   │   └── profile/            # User Profile
│   ├── chat/                   # Messaging Interface
│   │   └── [id].tsx            # Chat Room
│   ├── marketplace/            # Marketplace Details & Creation
│   │   ├── [id].tsx            # Item Details
│   │   └── create.tsx          # Sell Item
│   ├── admin/                  # Admin Dashboard
│   └── notifications/          # Notification Center
├── components/                 # Reusable UI Components
├── hooks/                      # Custom React Hooks (useAuth, etc.)
└── lib/                        # Utilities (API client, date formatting)
```

### 🛡️ API Gateway (`services/gateway`)
**Role**: Lightweight proxy and security layer.

#### Key Files
```text
services/gateway/
├── src/
│   ├── index.ts                # Entry point, Express app setup
│   ├── middleware/
│   │   └── auth.ts             # JWT Verification Middleware
│   └── utils/
│       └── logger.ts           # Centralized logging
```

### 🧠 User Service (`services/user-service`)
**Role**: Heavy-lifting backend. Handles data persistence, business logic, and integrations.

#### Key Files
```text
services/user-service/
├── prisma/
│   └── schema.prisma           # Database Schema (PostgreSQL)
├── src/
│   ├── index.ts                # Server initialization
│   ├── lib/                    # Infrastructure Integrations
│   │   ├── prisma.ts           # DB Client instance
│   │   ├── redis.ts            # Redis Client
│   │   ├── cloudinary.ts       # Media Upload Config
│   │   └── socket.ts           # Socket.io Server Logic
│   ├── routes/                 # API Route Controllers
│   │   ├── auth.ts             # Login/Register endpoints
│   │   ├── posts.ts            # Feed, Create Post, Likes
│   │   ├── users.ts            # Profile operations
│   │   ├── marketplace.ts      # Marketplace Listings
│   │   ├── events.ts           # Event CRUD
│   │   ├── messaging.ts        # Chat History & Send
│   │   └── notifications.ts    # Notification Fetching
│   └── services/               # Business Logic Layer
│       ├── auth.service.ts
│       ├── post.service.ts
│       └── ... (matches routes)
```

---

## 3. Data & API Architecture

### Database Schema (Prisma)
Key models defined in `services/user-service/prisma/schema.prisma`:
- **User**: Core identity.
- **Post**: Feeds and content.
- **Comment**: Threaded discussions.
- **Listing**: Marketplace items.
- **Event**: Campus events.
- **Notification**: Activity alerts.
- **Message**: Chat messages.

### API Standards
- **REST**: Primary protocol for CRUD operations.
- **Sockets**: Used for `chat` and real-time `notifications`.
- **Authentication**: Bearer Token (JWT).
- **Responses**: JSON format standard.

## 4. Deployment Pipeline

The project relies on **Render** for hosting (`render.yaml`).

1.  **Gateway Service**: Deployed as a Web Service. Exposed to public internet.
2.  **User Service**: Deployed as a Private Service (only accessible by Gateway).
3.  **Database**: Managed PostgreSQL instance on Render.
4.  **Redis**: Managed Redis instance on Render.

## 5. Future Considerations (from `integrated.md`)
- **Multimodal RAG**: Integration of AI for document analysis.
- **Search**: Migration to vector-based search for semantic understanding.
- **Identity**: Possible integration with University SSO.
