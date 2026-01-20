# Deployment Guide

## 1. Database & Infrastructure Setup (Free Tier)
Before deploying code, set up these external services:

### A. Database (PostgreSQL) -> **Neon**
1. Create a project at [Neon.tech](https://neon.tech).
2. Get the **Connection String** (Postgres URL).
3. **Important**: Add `?sslmode=require` to the end if not present.

### B. Redis -> **Upstash**
1. Create a Redis database at [Upstash.com](https://upstash.com).
2. Go to the **REST API** section of your database dashboard.
3. Copy **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**.

---

## 2. Backend Deployment (Render)
We use the Monorepo structure. You don't need a separate repo.

### Steps
1. Push your code to GitHub.
2. In Render, click **New +** -> **Blueprint**.
3. Connect your repository.
4. Render will detect `render.yaml` and propose creating:
    - `unisocial-gateway`
    - `unisocial-user-service`
5. **CRITICAL**: Before clicking "Apply", or immediately after, go to the **Environment** tab for EACH service and add these variables:

#### Environment Variables for `unisocial-gateway`
| Key | Value Description |
| :--- | :--- |
| `USER_SERVICE_URL` | The internal Render URL for user-service (e.g., `http://unisocial-user-service:10000`) |
| `JWT_SECRET` | A long random string (must match user-service) |
| `CORS_ORIGIN` | `*` (or your mobile app's scheme/web URL) |

#### Environment Variables for `unisocial-user-service`
| Key | Value Description |
| :--- | :--- |
| `DATABASE_URL` | Your **Neon** Postgres connection string |
| `UPSTASH_REDIS_REST_URL` | Your **Upstash** REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Your **Upstash** REST Token |
| `JWT_SECRET` | Same string as Gateway |
| `CLOUDINARY_...` | (If using Cloudinary for images) |

---

## 3. Mobile Deployment (Expo)

### A. Environment Configuration
Since this is a mobile app, sensitive keys (API keys) are built into the bundle.
1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `eas login`
3. Configure Project: `eas build:configure`

### B. Build & Deploy
To create a build for Android (APK) to install on your phone:
```bash
cd apps/mobile
eas build --platform android --profile preview
```
This will generate a QR code / link to download the `.apk`.

### C. Remote Updates (OTA)
You asked about updating the app remotely.
1. **Publish an Update**:
   ```bash
   eas update --branch preview --message "Fixing login bug"
   ```
2. **What Updates?**
   - **Allowed**: JS code changes, component logic, CSS/Styles, local images.
   - **NOT Allowed**: Changing App Icon, Splash Screen, App Name, or installing new *native* libraries (e.g., adding a new camera permission). These require a new `eas build`.

---

## FAQ

**Q: Do I need multiple git repos?**
A: **No.** Keep your Monorepo. Render knows how to deploy just a specific folder (`services/gateway`) based on the `render.yaml` or Root Directory setting. Expo knows to look in `apps/mobile`.

**Q: Changing App Name / Logo Remotely?**
A: **No.** These are "Native Config" changes. You must change `app.json`, commit to git, and run `eas build` again to generate a new APK. Users must re-download the app.
