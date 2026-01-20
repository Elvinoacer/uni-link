# 📱 Screen Index

This document lists all available screens in the mobile application, organized by user flow.

## 🟢 Authentication & Onboarding
| Path | Description |
|------|-------------|
| `apps/mobile/app/index.tsx` | **Landing Page**: The entry point for unauthenticated users. |
| `apps/mobile/app/(auth)/login.tsx` | **Login**: Email/Password entry. |
| `apps/mobile/app/(auth)/sign-up.tsx` | **Sign Up**: Account creation form. |
| `apps/mobile/app/(auth)/verify/enter-email.tsx` | **Verification**: Email entry step. |
| `apps/mobile/app/(auth)/verify/confirm-code.tsx` | **Confirmation**: 6-digit code entry. |
| `apps/mobile/app/(auth)/verify/account-linked.tsx` | **Success**: Verification completion screen. |
| `apps/mobile/app/(onboarding)/select-university.tsx` | **University**: Campus selection. |
| `apps/mobile/app/(onboarding)/identity.tsx` | **Profile Setup**: Avatar & Display Name. |
| `apps/mobile/app/(onboarding)/interests.tsx` | **Interests**: User preferences. |

## 🏠 Main Tabs (LoggedIn)
| Path | Description |
|------|-------------|
| `apps/mobile/app/(tabs)/home/index.tsx` | **Feed**: Global & Following posts + Marketplace Carousel. |
| `apps/mobile/app/(tabs)/marketplace/index.tsx` | **Marketplace**: Browse listings, search, and category filters. |
| `apps/mobile/app/(tabs)/events/index.tsx` | **Events**: Nearby & Trending events + Map visualization. |
| `apps/mobile/app/(tabs)/chat/index.tsx` | **Chat**: List of active DMs. |
| `apps/mobile/app/(tabs)/profile/index.tsx` | **Profile**: User stats, posts, and settings access. |

## 🛠️ Feature Screens
### Social
- `apps/mobile/app/post/[id].tsx`: **Post Details**: View full thread and replies.
- `apps/mobile/app/post/new.tsx`: **New Post**: (Alternative to inline composer).
- `apps/mobile/app/post/poll.tsx`: **Poll Creation**: Create voting posts.
- `apps/mobile/app/notifications/index.tsx`: **Notifications**: Activity feed.
- `apps/mobile/app/search/index.tsx`: **Search**: Find users and content.
- `apps/mobile/app/chat/[id].tsx`: **DM Conversation**: 1-on-1 chat interface.

### Marketplace
- `apps/mobile/app/marketplace/[id].tsx`: **Listing Details**: Full item view.
- `apps/mobile/app/marketplace/create.tsx`: **Sell Item**: Create listing form (ISBN).

### Events
- `apps/mobile/app/events/[id].tsx`: **Event Details**: Info & RSVP action.

### Admin
- `apps/mobile/app/admin/index.tsx`: **Dashboard**: Moderation tools.

## ⚙️ Utilities
- `apps/mobile/app/modal.tsx`: **Modal**: Generic popup container.
- `apps/mobile/app/+not-found.tsx`: **404**: Fallback for missing routes.
