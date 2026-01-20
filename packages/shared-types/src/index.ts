// ============================================
// User Types
// ============================================

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isAnonymous?: boolean;
  bannerUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing?: boolean;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface UpdateUserDto {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}

// ============================================
// Authentication Types
// ============================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto extends CreateUserDto {}

export interface JwtPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

// ============================================
// Post Types
// ============================================

export interface Post {
  id: string;
  snowflakeId: string;
  authorId: string;
  author?: User;
  content: string;
  media: MediaItem[];
  poll?: Poll;
  replyToId: string | null;
  repostOfId: string | null;
  originalPost?: Post;
  isAnonymous: boolean;
  metrics: PostMetrics;
  createdAt: Date;
}

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
}

export interface Poll {
  id: string; // Added ID as it is likely needed for frontend
  question: string;
  options: PollOption[];
  votes?: Record<string, number>; // Maps optionId to count? Or simplifies logic. 
  // simplified for MVP based on checking usage, sticking to closest existing pattern but robustifying
  expiresAt: Date;
  userVote?: string;
}

export interface PollOption {
  id: string;
  text: string;
  order: number;
  voteCount: number;
}

export interface PostMetrics {
  likes: number;
  reposts: number;
  replies: number;
}

export interface CreatePostDto {
  content: string;
  media?: MediaItem[];
  poll?: {
      question: string;
      options: string[];
      durationDays: number;
  };
  replyToId?: string;
  isAnonymous?: boolean;
}

// ============================================
// Timeline Types
// ============================================

export interface TimelineResponse {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

// ============================================
// Marketplace Types
// ============================================

export interface Listing {
  id: string;
  sellerId: string;
  seller?: User;
  title: string;
  description: string | null;
  price: number;
  category: ListingCategory;
  condition: ItemCondition;
  isbn: string | null;
  images: string[];
  status: ListingStatus;
  expiresAt: Date;
  createdAt: Date;
}

export type ListingCategory = 
  | 'textbooks'
  | 'electronics'
  | 'furniture'
  | 'tickets'
  | 'clothing'
  | 'other';

export type ItemCondition = 
  | 'new'
  | 'like_new'
  | 'excellent'
  | 'good'
  | 'fair';

export type ListingStatus = 
  | 'active'
  | 'sold'
  | 'expired'
  | 'removed';

export interface CreateListingDto {
  title: string;
  description?: string;
  price: number;
  category: ListingCategory;
  condition: ItemCondition;
  isbn?: string;
  images: string[];
}

// ============================================
// Lost & Found Types
// ============================================

export interface LostFoundItem {
  id: string;
  userId: string;
  user?: User;
  type: 'lost' | 'found';
  title: string;
  description: string;
  location: string;
  images: string[];
  securityQuestion?: string; // Only visible to poster
  status: 'active' | 'resolved' | 'expired';
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateLostFoundDto {
  type: 'lost' | 'found';
  title: string;
  description: string;
  location: string;
  images: string[];
  securityQuestion?: string;
  securityAnswer?: string;
}

export interface ClaimItemDto {
  itemId: string;
  securityAnswer: string;
  message: string;
}

// ============================================
// Event Types
// ============================================

export interface Event {
  id: string;
  organizerId: string;
  organizer?: User;
  title: string;
  description: string;
  location: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  startsAt: Date;
  endsAt: Date;
  category: EventCategory;
  imageUrl: string | null;
  rsvpCount: number;
  isRsvped?: boolean;
  createdAt: Date;
}

export type EventCategory =
  | 'social'
  | 'academic'
  | 'sports'
  | 'career'
  | 'arts'
  | 'other';

export interface CreateEventDto {
  title: string;
  description: string;
  location: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  startsAt: Date;
  endsAt: Date;
  category: EventCategory;
  imageUrl?: string;
}

// ============================================
// Notification Types
// ============================================

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content?: string;
  entityId?: string;
  entityType?: string;
  isRead: boolean;
  count: number;
  createdAt: Date;
  updatedAt?: Date;
  actor?: User;
}

export type NotificationType =
  | 'like'
  | 'repost'
  | 'reply'
  | 'mention'
  | 'follow'
  | 'dm'
  | 'marketplace'
  | 'event';

// ============================================
// Chat / DM Types
// ============================================

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: User;
  content: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: Date;
}

export interface SendMessageDto {
  conversationId?: string;
  recipientId?: string;
  content: string;
  imageUrl?: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
