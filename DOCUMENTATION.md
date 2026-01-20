# University Hyperlocal Social Platform

## 1. Overview

This document consolidates and formalizes all system features derived from the *Architectural and Functional Engineering Framework for a Hyperlocal University Social Ecosystem*. It serves as a single source of truth for product, engineering, and operations teams, documenting **what the system does**, **why each feature exists**, and **how it is supported architecturally**.

The platform is a **university-centric social network** inspired by X (formerly Twitter), augmented with **campus-specific utility layers** such as marketplaces, lost-and-found, and event discovery. The system is designed to operate **without official university authentication**, prioritizing openness, scalability, safety, and hyperlocal relevance.

---

## 2. Core System Architecture Features

### 2.1 Microservices-Based Architecture

* Fully decoupled microservices design
* Each major feature runs as an independent service
* Services communicate via lightweight APIs and message queues

**Benefits:**

* Horizontal scalability
* Fault isolation (one service failure does not crash the system)
* Independent deployment and iteration

### 2.2 API Gateway

**Features:**

* Single entry point for all clients (web & mobile)
* Rate limiting and abuse protection
* Request routing to internal services
* SSL termination and traffic management

---

## 3. User & Identity Management Features

### 3.1 Account Creation & Onboarding

* Open registration using email or phone number
* No mandatory university email requirement
* Optional institutional email linking for trust-building

### 3.2 Profile Management

* Unique username (social graph identifier)
* Non-unique display name
* Bio (short-form personal or professional description, 160 character limit)
* Profile picture with enforced size and format constraints:

  * Circular thumbnail at 48x48 pixels
  * PNG/JPG format only
  * Maximum file size limits enforced

### 3.3 Identity Shielding (Anonymity Control)

* Users can post as:

  * Verified identity
  * Pseudonymous identity
* Identity choice is per-post, not global

**Purpose:**

* Encourage honest discourse
* Reduce fear of social or professional repercussions
* Preserve accountability through internal identity mapping

---

## 4. Social & Microblogging Features

### 4.1 Post Creation

* Short-form text posts (200–280 characters)
* Rich media support:

  * Up to 4 images OR
  * 1 video (60–120 seconds)
  * Multi-part upload with progress tracking
* Hyperlinks and embedded previews
* Validated on both client and server side

### 4.2 Interactive Content

* Polls with:

  * 2–4 options
  * Custom expiration (1–7 days)
* Real-time poll updates

### 4.3 Post Metadata

* Timestamp
* Author ID
* Re-post reference
* Globally sortable unique IDs (Snowflake-style)

### 4.4 Engagement Actions

* Reply
* Re-post (Refizz)
* Like (Favorite)
* Share

These actions feed engagement metrics and discovery algorithms.

---

## 5. Feed, Timeline & Discovery Features

### 5.1 Personalized Home Timeline

* Generated based on:

  * Follow graph
  * Engagement signals
  * Content recency

### 5.2 Hybrid Feed Generation (Celebrity Problem Solution)

* Fan-out on write ("Push" model) for normal users:

  * Post immediately injected into followers' timelines
* Fan-in on read ("Pull" model) for high-profile users:

  * Used for campus figures (e.g., student government leaders, popular influencers)
  * Prevents database write storms

**Purpose:**

* Prevent write amplification
* Handle influencer-scale follower counts
* Optimize for disparate follower count distributions

### 5.3 Infinite Scroll & Pagination

* Cursor-based pagination
* Optimized for deep scrolling without performance degradation

### 5.4 Search & Discovery

* Keyword-based search across:

  * Posts
  * Users
  * Hashtags
* Inverted index-based search engine

---

## 6. Campus Utility Features

### 6.1 Campus Marketplace

#### Supported Listings

* Textbooks
* Dorm furniture
* Electronics
* Tickets

#### Marketplace Features

* ISBN-based textbook lookup:

  * 13-digit ISBN identifier support
  * Third-party book metadata API integration
  * Automated textbook details retrieval
* Category-based listings with dropdown menus (academic subjects, dorm gear, electronics)
* Condition ratings (New, Used – Excellent/Fair, etc.)
* In-app secure messaging between buyer and seller (prevents doxxing)
* Campus-themed branding (school colors, mascots)

**Goal:**
Create a trusted, hyperlocal alternative to general marketplaces.

---

### 6.2 Lost & Found System

**Features:**

* Lost item postings
* Found item postings
* Photo and location attachment
* Detailed item descriptions

**Security Controls:**

* Claim verification via private security questions:

  * Finder sets a verification question not visible in the public post
  * Example: "What is the specific sticker on the back?"
  * Prevents fraudulent claims
* Automatic expiration and deletion after 30 days

**Impact:**

* Reduces fraud
* Keeps database fresh and relevant
* Keeps listings relevant

---

### 6.3 Campus Events & Organizations

**Event Management:**

* Event creation by student leaders
* Event categorization
* Date-based browsing

**User Engagement:**

* RSVP and favorites
* Push reminders for upcoming events

**Spatial Features:**

* Interactive campus maps
* Location-based directions (particularly useful for freshmen and visitors)
* Geofenced alerts for nearby students:

  * Virtual boundaries around event locations
  * Push targeted notifications to students who are physically present
  * Encourages live participation and "herd" joining

---

## 7. Messaging & Communication Features

### 7.1 Direct Messaging (DMs)

* One-to-one private conversations
* End-to-end encryption
* Typing indicators
* Read receipts

### 7.2 Safety Controls in DMs

* Conversation reporting
* Moderation access for abuse or scam reports

---

## 8. Notification System Features

### 8.1 Real-Time Notifications

* Mentions
* Likes and re-posts
* Direct messages
* Marketplace inquiries

### 8.2 Notification Processing

* Event-based generation
* Intelligent aggregation (batching likes, etc.)
* Priority-based delivery

### 8.3 Delivery Channels

* WebSockets (active users)
* Mobile push notifications (inactive users)

### 8.4 User Controls

* Notification muting
* Frequency capping
* Category-level toggles

---

## 9. Moderation & Safety Features
*(Status: Backend Implemented)*

### 9.1 Automated Moderation

* AI-based profanity detection
* Hate speech detection
* Image moderation for explicit content
* *(Note: Basic reporting structure in place, AI integration pending phase 3)*

### 9.2 Community Moderation

* **User reporting system (Implemented)**: `POST /moderation/reports` for posts, users, events.
* Report threshold-triggered review queues
* Status tracking (PENDING, RESOLVED, DISMISSED)

### 9.3 Shadowbanning

* **User Banning (Implemented)**: `isBanned` flag on User model.
* Reduced visibility for repeat offenders
* No explicit user notification

**Goal:**
Reduce harm without escalating adversarial behavior.

---

## 10. Administrative & Governance Features
*(Status: Backend Implemented)*

### 10.1 Admin Dashboard

**Capabilities (Implemented):**

* **User lifecycle management**: Ban/Unban, Role updates.
* **Role and permission control**: Middleware `requireAdminOrMod` ensures security.
* Content moderation queue: `GET /admin/reports` with pagination and status filtering.
* Sentiment and trend analytics: `GET /analytics/trends` provides platform insight.
* Audit logs for all admin actions

### 10.2 Enforcement Actions

* Mute users
* **Ban users (Implemented)**: `POST /admin/users/:id/ban`.
* **Promote moderators (Implemented)**: `POST /admin/users/:id/role`.
* Delete or restore content
* **Resolve Reports**: `POST /admin/reports/:id/resolve`.

### 10.3 Appeals & Accountability

* Action traceability
* User appeal workflows

---

## 11. Performance & Infrastructure Features
*(Status: Backend Implemented)*

### 11.1 Data Storage Strategy

* SQL databases (ACID-compliant): **SQLite/Prisma** (Current MVP).
* NoSQL databases: Planned for scale (MongoDB).
* Graph databases: Planned for complex social queries.

### 11.2 Data Sharding Strategy

* Data partitioned by UserID (Architecture ready).

### 11.3 Media Handling

* **Cloud Storage (Implemented)**:
  * Images/Videos stream to **Cloudinary**.
  * Documents stream to **Vercel Blob**.
  * Zero-disk memory streaming for stateless container deployment.
* CDN-backed media delivery for low latency.

### 11.4 Caching & Latency Control

* **Redis-based feed caching (Implemented)**:
  * `feed:global:{page}` cached for 60s.
  * Cache-Aside pattern in `GET /posts`.
* Precomputed timelines (top 50-100 posts pre-cached)
* Sub-300ms end-to-end latency target

### 11.5 ID Generation

* **UUIDs (Current)**: Using standard UUID v4 for compatibility.
* *Snowflake-style globally sortable unique IDs (Planned Transition).*

---

## 12. Trends & Analytics Features
*(Status: Backend Implemented)*

* **Hashtag Analytics (Implemented)**:
  * `Hashtag` model tracks usage counts and last-used timestamps.
  * `GET /analytics/trends` returns top tags.
  * `GET /analytics/search` allows tag discovery.
* **Campus-specific trending topics**: Supported via feed filters.
* Engagement-weighted ranking
* Recency-aware trend decay

### 12.1 Search Engine Architecture

* Inverted indexes for rapid keyword lookup
* Tokenization (breaking content into searchable terms)
* Stop words removal
* Profanity filtering during indexing
* Ranking based on recency, engagement velocity, and user relevance

---

## 13. Legal, Compliance & Trust Features
*(Status: Backend Implemented)*

* **GDPR & CCPA compliance (Implemented)**:
  * **Data Export**: `GET /legal/export` dumps all user profile, posts, comments, and activity data.
  * **Right to be Forgotten**: `DELETE /legal/account` performs a cascading delete of the user and all associated records.
* Data breach notification workflows
* Age verification for under-13 protection
* DMCA takedown mechanisms

---

## 14. Strategic Product Features

* No dependency on official university systems
* Organic, community-driven growth
* Hyperlocal focus for retention
* UX-first consumer-grade design philosophy

---

## 15. Summary

This system combines **large-scale social networking mechanics** with **deeply localized university utilities**. The result is a platform that is not merely social, but **operationally useful**, architected for high concurrency, cultural nuance, and long-term campus relevance.

This document represents the complete functional feature set derived from the provided architectural framework.
