import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useResources, Resource } from '../../hooks/useResources';
import { useAuthStore } from '../../store/authStore';

// File type icons and colors
const fileTypeIcons: Record<string, string> = {
  pdf: 'document-text',
  docx: 'document',
  pptx: 'easel',
  image: 'image',
  other: 'document',
};

const fileTypeColors: Record<string, string> = {
  pdf: '#E53935',
  docx: '#1976D2',
  pptx: '#FF9800',
  image: '#4CAF50',
  other: '#9E9E9E',
};

export default function ResourceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { getResource, toggleUpvote, addComment, downloadResource, deleteResource } =
    useResources();

  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const loadResource = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await getResource(id);
      if (response.success) {
        setResource(response.data);
      }
    } catch (error) {
      console.error('Error loading resource:', error);
    } finally {
      setLoading(false);
    }
  }, [id, getResource]);

  useEffect(() => {
    loadResource();
  }, [loadResource]);

  const handleUpvote = async () => {
    if (!resource) return;
    try {
      const response = await toggleUpvote(resource.id);
      if (response.success) {
        setResource((prev) =>
          prev
            ? {
                ...prev,
                hasUpvoted: response.data.upvoted,
                upvoteCount: response.data.upvoted
                  ? prev.upvoteCount + 1
                  : prev.upvoteCount - 1,
              }
            : null
        );
      }
    } catch (error) {
      console.error('Error toggling upvote:', error);
    }
  };

  const handleDownload = async () => {
    if (!resource) return;
    try {
      const response = await downloadResource(resource.id);
      if (response.success && response.data.url) {
        await Linking.openURL(response.data.url);
      }
    } catch (error) {
      console.error('Error downloading:', error);
      Alert.alert('Error', 'Failed to download resource');
    }
  };

  const handleAddComment = async () => {
    if (!resource || !commentText.trim()) return;
    try {
      setSubmittingComment(true);
      const response = await addComment(resource.id, commentText.trim(), replyingTo || undefined);
      if (response.success) {
        setCommentText('');
        setReplyingTo(null);
        loadResource(); // Reload to get updated comments
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Resource',
      'Are you sure you want to delete this resource? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteResource(resource!.id);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete resource');
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  if (!resource) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <Text style={styles.errorText}>Resource not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = user?.id === resource.uploaderId;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resource</Text>
        <View style={styles.headerActions}>
          {isOwner && (
            <TouchableOpacity onPress={handleDelete}>
              <Ionicons name="trash-outline" size={24} color="#E53935" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* File Preview Card */}
        <View style={styles.previewCard}>
          {resource.fileType === 'image' ? (
            <Image source={{ uri: resource.fileUrl }} style={styles.imagePreview} />
          ) : (
            <View
              style={[
                styles.filePreview,
                { backgroundColor: fileTypeColors[resource.fileType] || fileTypeColors.other },
              ]}
            >
              <Ionicons
                name={fileTypeIcons[resource.fileType] as any || 'document'}
                size={48}
                color="#fff"
              />
              <Text style={styles.fileTypeLabel}>{resource.fileType.toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.fileInfo}>
            <Text style={styles.fileName}>{resource.title}</Text>
            <Text style={styles.fileMeta}>
              {formatFileSize(resource.fileSize)} • {resource.mimeType}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, resource.hasUpvoted && styles.actionButtonActive]}
            onPress={handleUpvote}
          >
            <Ionicons
              name={resource.hasUpvoted ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
              size={24}
              color={resource.hasUpvoted ? '#fff' : '#4CAF50'}
            />
            <Text
              style={[styles.actionButtonText, resource.hasUpvoted && styles.actionButtonTextActive]}
            >
              {resource.upvoteCount} Upvotes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
            <Ionicons name="download-outline" size={24} color="#fff" />
            <Text style={styles.downloadButtonText}>Download</Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        {resource.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{resource.description}</Text>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.metadataGrid}>
            {resource.course && (
              <View style={styles.metadataItem}>
                <Ionicons name="school-outline" size={20} color="#666" />
                <View>
                  <Text style={styles.metadataLabel}>Course</Text>
                  <Text style={styles.metadataValue}>
                    {resource.course.code} - {resource.course.name}
                  </Text>
                </View>
              </View>
            )}

            {resource.course?.department && (
              <View style={styles.metadataItem}>
                <Ionicons name="business-outline" size={20} color="#666" />
                <View>
                  <Text style={styles.metadataLabel}>Department</Text>
                  <Text style={styles.metadataValue}>
                    {resource.course.department.name}
                  </Text>
                </View>
              </View>
            )}

            {resource.semester && (
              <View style={styles.metadataItem}>
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <View>
                  <Text style={styles.metadataLabel}>Semester</Text>
                  <Text style={styles.metadataValue}>{resource.semester}</Text>
                </View>
              </View>
            )}

            {resource.professorName && (
              <View style={styles.metadataItem}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <View>
                  <Text style={styles.metadataLabel}>Professor</Text>
                  <Text style={styles.metadataValue}>{resource.professorName}</Text>
                </View>
              </View>
            )}

            <View style={styles.metadataItem}>
              <Ionicons name="eye-outline" size={20} color="#666" />
              <View>
                <Text style={styles.metadataLabel}>Views</Text>
                <Text style={styles.metadataValue}>{resource.viewCount}</Text>
              </View>
            </View>

            <View style={styles.metadataItem}>
              <Ionicons name="download-outline" size={20} color="#666" />
              <View>
                <Text style={styles.metadataLabel}>Downloads</Text>
                <Text style={styles.metadataValue}>{resource.downloadCount}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Uploader */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uploaded by</Text>
          <TouchableOpacity
            style={styles.uploaderCard}
            onPress={() => router.push(`/user/${resource.uploader.id}`)}
          >
            <View style={styles.uploaderAvatar}>
              {resource.uploader.avatarUrl ? (
                <Image
                  source={{ uri: resource.uploader.avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {resource.uploader.displayName?.[0] || resource.uploader.username[0]}
                </Text>
              )}
            </View>
            <View style={styles.uploaderInfo}>
              <View style={styles.uploaderNameRow}>
                <Text style={styles.uploaderName}>
                  {resource.uploader.displayName || resource.uploader.username}
                </Text>
                {resource.uploader.isVerified && (
                  <Ionicons name="checkmark-circle" size={16} color="#1DA1F2" />
                )}
              </View>
              <Text style={styles.uploadDate}>
                Uploaded {formatDate(resource.createdAt)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Comments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Comments ({resource._count?.comments || 0})
          </Text>

          <View style={styles.commentInputContainer}>
            {replyingTo && (
              <View style={styles.replyingTo}>
                <Text style={styles.replyingToText}>Replying to comment</Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Ionicons name="close-circle" size={18} color="#666" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.commentInput}>
              <TextInput
                style={styles.commentTextInput}
                placeholder="Add a comment..."
                placeholderTextColor="#999"
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.commentSubmit,
                  (!commentText.trim() || submittingComment) && styles.commentSubmitDisabled,
                ]}
                onPress={handleAddComment}
                disabled={!commentText.trim() || submittingComment}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {(resource as any).comments?.map((comment: any) => (
            <View key={comment.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {comment.user.displayName?.[0] || comment.user.username[0]}
                  </Text>
                </View>
                <View style={styles.commentMeta}>
                  <Text style={styles.commentAuthor}>
                    {comment.user.displayName || comment.user.username}
                  </Text>
                  <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
                </View>
                <TouchableOpacity onPress={() => setReplyingTo(comment.id)}>
                  <Ionicons name="arrow-undo-outline" size={18} color="#666" />
                </TouchableOpacity>
              </View>
              <Text style={styles.commentContent}>{comment.content}</Text>

              {/* Replies */}
              {comment.replies?.map((reply: any) => (
                <View key={reply.id} style={styles.replyCard}>
                  <View style={styles.commentHeader}>
                    <View style={[styles.commentAvatar, styles.replyAvatar]}>
                      <Text style={styles.commentAvatarText}>
                        {reply.user.displayName?.[0] || reply.user.username[0]}
                      </Text>
                    </View>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentAuthor}>
                        {reply.user.displayName || reply.user.username}
                      </Text>
                      <Text style={styles.commentDate}>{formatDate(reply.createdAt)}</Text>
                    </View>
                  </View>
                  <Text style={styles.commentContent}>{reply.content}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6366F1',
    borderRadius: 24,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  previewCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  filePreview: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  fileTypeLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  fileInfo: {
    padding: 16,
  },
  fileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  fileMeta: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  actionButtonActive: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
  },
  actionButtonTextActive: {
    color: '#fff',
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  downloadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  metadataGrid: {
    gap: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metadataLabel: {
    fontSize: 12,
    color: '#999',
  },
  metadataValue: {
    fontSize: 14,
    color: '#333',
  },
  uploaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploaderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  uploaderInfo: {
    flex: 1,
  },
  uploaderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  uploaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  uploadDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  commentInputContainer: {
    marginBottom: 16,
  },
  replyingTo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyingToText: {
    fontSize: 13,
    color: '#666',
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
  },
  commentSubmit: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSubmitDisabled: {
    backgroundColor: '#ccc',
  },
  commentCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  commentAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  commentMeta: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
  },
  commentContent: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  replyCard: {
    marginLeft: 24,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});
