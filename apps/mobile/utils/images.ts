/**
 * Utility for handling image URLs in the mobile app,
 * specifically for resolving localhost issues on Android emulators
 * and providing robust fallbacks.
 */

export const getSafeImageUrl = (url: string | undefined | null) => {
    if (!url) return undefined;
    
    // If it is localhost, replace with 10.0.2.2 for Android Emulator compatibility
    if (url.includes('localhost')) {
        return url.replace('localhost', '10.0.2.2');
    }
    return url;
};

/**
 * Gets a valid avatar URL for a user.
 * @param avatarUrl The user's uploaded avatar URL
 * @param name The user's display name or username for fallback initials
 * @returns A safe image URL or a generated initials avatar
 */
export const getUserAvatar = (avatarUrl: string | undefined | null, name: string) => {
    const safeUrl = getSafeImageUrl(avatarUrl);
    if (safeUrl) return safeUrl;
    
    // Fallback to ui-avatars with user's initials
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
};
