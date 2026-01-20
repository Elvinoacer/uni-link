import { Post } from '../components/feed/PostItem';

import { getSafeImageUrl, getUserAvatar } from './images';

export function transformPost(rawPost: any): Post {
    const authorName = rawPost.author?.displayName || rawPost.author?.username || (rawPost.isAnonymous ? 'Anonymous' : 'Unknown');
    
    return {
        id: rawPost.id,
        authorId: rawPost.authorId || rawPost.author?.id,
        author: {
            id: rawPost.author?.id,
            name: authorName,
            handle: rawPost.author?.username,
            avatar: getUserAvatar(rawPost.author?.avatarUrl, authorName),
            isVerified: rawPost.author?.isVerified,
            isAnonymous: rawPost.isAnonymous
        },
        content: rawPost.content,
        // Backend now returns 'mediaUrls' as JSON string, need to parse
        image: rawPost.mediaUrls ? getSafeImageUrl(JSON.parse(rawPost.mediaUrls)[0]) : undefined, 
        images: rawPost.mediaUrls ? JSON.parse(rawPost.mediaUrls).map(getSafeImageUrl) : [],
        createdAt: formatDate(rawPost.createdAt), 
        stats: rawPost.stats || {
            comments: rawPost._count?.replies || 0,
            reposts: rawPost._count?.reposts || 0,
            likes: rawPost._count?.likes || 0
        },
        hasLiked: typeof rawPost.hasLiked === 'boolean' ? rawPost.hasLiked : (rawPost.likes && rawPost.likes.length > 0),
        hasReposted: typeof rawPost.hasReposted === 'boolean' ? rawPost.hasReposted : (rawPost.reposts && rawPost.reposts.length > 0),
        isPinned: rawPost.isPinned,
        type: rawPost.isAnonymous ? 'anonymous' : 'standard',
        replies: rawPost.replies?.map(transformPost) || [],
        poll: rawPost.poll ? transformPoll(rawPost.poll, rawPost.poll.votes) : undefined,
        // Community post fields (passed through from backend)
        postType: rawPost.postType || 'user',
        community: rawPost.community || null,
        originalId: rawPost.originalId,
        communityId: rawPost.communityId
    };
}

function transformPoll(rawPoll: any, userVotes: any[] = []): any {
    const totalVotes = rawPoll.options?.reduce((sum: number, opt: any) => sum + (opt.votes || opt.voteCount || 0), 0) || 0;
    const userVote = userVotes?.[0]; // Backend returns array of user's votes in this poll
    
    return {
        id: rawPoll.id,
        question: rawPoll.question,
        expiresAt: rawPoll.expiresAt,
        options: rawPoll.options?.map((opt: any) => ({
            id: opt.id,
            text: opt.text,
            votes: opt.votes || opt.voteCount || 0,
            order: opt.order || 0
        })) || [],
        hasVoted: !!userVote,
        userVotedOptionId: userVote?.pollOptionId,
        totalVotes
    };
}

function formatDate(date: string | Date | undefined): string {
    if (!date) return '';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const now = new Date();
        const diff = now.getTime() - d.getTime();
        
        // Less than 1 minute
        if (diff < 60 * 1000) return 'Just now';
        
        // Less than 1 hour
        if (diff < 60 * 60 * 1000) {
            return `${Math.floor(diff / (60 * 1000))}m`;
        }
        
        // Less than 24 hours
        if (diff < 24 * 60 * 60 * 1000) {
            return `${Math.floor(diff / (60 * 60 * 1000))}h`;
        }
        
        // Less than 7 days
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d`;
        }
        
        return d.toLocaleDateString();
    } catch (e) {
        return '';
    }
}
