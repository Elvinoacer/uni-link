import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Markdown from 'react-native-markdown-display';
import EventSource from 'react-native-sse';
import { storage } from '../../utils/storage';
import apiClient from '../../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  resources?: Resource[];
  isStreaming?: boolean;
}

interface Resource {
  id: string;
  resourceId?: string;
  title?: string;
  fileType?: string;
  resourceType?: string;
  upvoteCount?: number;
}

const fileTypeColors: Record<string, string> = {
  pdf: '#E53935',
  docx: '#1976D2',
  doc: '#1976D2',
  pptx: '#FF9800',
  ppt: '#FF9800',
  image: '#4CAF50',
  other: '#9E9E9E',
};

const getFileTypeColor = (fileType?: string): string => {
  if (!fileType) return fileTypeColors.other;
  return fileTypeColors[fileType.toLowerCase()] || fileTypeColors.other;
};

const getResourceIcon = (resourceType?: string): keyof typeof Ionicons.glyphMap => {
  switch (resourceType?.toLowerCase()) {
    case 'lecture_notes': return 'document-text';
    case 'exam': return 'school';
    case 'assignment': return 'clipboard';
    case 'textbook': return 'book';
    case 'slide_deck': return 'easel';
    default: return 'document';
  }
};

const markdownStyles = StyleSheet.create({
  body: { fontSize: 15, color: '#333', lineHeight: 22 },
  strong: { fontWeight: '700', color: '#1a1a1a' },
  bullet_list: { marginTop: 8 },
  list_item: { marginBottom: 4 },
  paragraph: { marginBottom: 8 },
  code_inline: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 4,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
  link: { color: '#6366F1' },
});

export default function AIAssistantScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    schoolId?: string;
    schoolName?: string;
    courseId?: string;
    courseName?: string;
    courseCode?: string;
    unitId?: string;
    unitName?: string;
    unitCode?: string;
  }>();
  
  const flatListRef = useRef<FlatList>(null);
  const typingAnim = useRef(new Animated.Value(0)).current;
  const eventSourceRef = useRef<EventSource | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Typing animation
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(typingAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [loading, typingAnim]);

  // Initial welcome message based on context level
  useEffect(() => {
    const welcomeMessage = getWelcomeMessage();
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: welcomeMessage,
    }]);
  }, []);

  const getContextLevel = () => {
    if (params.unitId) return 'unit';
    if (params.courseId) return 'course';
    if (params.schoolId) return 'school';
    return 'global';
  };

  const getContextLabel = () => {
    if (params.unitCode) return params.unitCode;
    if (params.courseCode) return params.courseCode;
    if (params.schoolName) return params.schoolName;
    return 'All Resources';
  };

  const getWelcomeMessage = () => {
    const level = getContextLevel();
    
    if (level === 'unit') {
      return `👋 Hi! I'm your study assistant for **${params.unitCode || params.unitName}**.\n\nI can help you find:\n- 📝 Lecture notes\n- 📋 Assignments\n- 📚 Exam papers\n\nTry: "Show me all resources" or "Find lecture notes"`;
    }
    if (level === 'course') {
      return `👋 Hi! I'm here to help you find resources for **${params.courseCode} - ${params.courseName}**.\n\nI'll search across all units in this course.\n\nTry: "Show me all materials" or "Find past exams"`;
    }
    if (level === 'school') {
      return `👋 Hi! I can search resources across **${params.schoolName}**.\n\nI'll look through all courses and units.\n\nTry: "Find CSC 311 notes" or "Show programming assignments"`;
    }
    return `👋 Hi! I'm your AI study assistant.\n\nI can search across all available resources.\n\nTry asking about specific courses or topics!`;
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    const assistantId = (Date.now() + 1).toString();
    
    setMessages(prev => [...prev, userMessage, {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    }]);
    
    const questionText = input.trim();
    setInput('');
    setLoading(true);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // Get auth token and base URL
      const token = await storage.getItem('accessToken');
      const baseUrl = apiClient.defaults.baseURL || 'http://localhost:3000/api';
      
      // Build request body with hierarchy context
      const body: Record<string, unknown> = {
        question: questionText,
        topK: 15,
      };
      
      if (params.unitId) body.unitId = params.unitId;
      else if (params.courseId) body.courseId = params.courseId;
      else if (params.schoolId) body.schoolId = params.schoolId;

      let accumulatedContent = '';
      let sources: Resource[] = [];

      // Create SSE connection
      const es = new EventSource(`${baseUrl}/rag/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });

      eventSourceRef.current = es;

      es.addEventListener('message', (event: any) => {
        const data = event.data;
        
        if (data === '[DONE]') {
          es.close();
          eventSourceRef.current = null;
          setLoading(false);
          
          // Finalize message
          setMessages(prev => prev.map(m => 
            m.id === assistantId 
              ? { 
                  ...m, 
                  content: accumulatedContent || "I couldn't find relevant information.",
                  resources: sources,
                  isStreaming: false,
                }
              : m
          ));
          return;
        }

        try {
          const parsed = JSON.parse(data);
          
          if (parsed.type === 'sources') {
            sources = (parsed.data || []).map((s: any) => ({
              id: s.resourceId || s.id,
              title: s.title,
              fileType: s.fileType,
              resourceType: s.resourceType,
            }));
          } else if (parsed.type === 'token') {
            accumulatedContent += parsed.data;
            // Update in real-time
            setMessages(prev => prev.map(m => 
              m.id === assistantId 
                ? { ...m, content: accumulatedContent }
                : m
            ));
          } else if (parsed.type === 'error') {
            accumulatedContent = `Error: ${parsed.data}`;
          } else if (parsed.type === 'text') {
            // Handle simple text response
            accumulatedContent = parsed.data || accumulatedContent;
          }
        } catch {
          // Ignore parse errors
        }
        
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
      });

      es.addEventListener('error', (event: any) => {
        console.log('SSE Error:', event);
        es.close();
        eventSourceRef.current = null;
        
        // Fallback to non-streaming
        fallbackToQuery(questionText, assistantId);
      });

    } catch (err: any) {
      console.error('Streaming error:', err);
      fallbackToQuery(questionText, assistantId);
    }
  }, [input, loading, params]);

  const fallbackToQuery = async (question: string, assistantId: string) => {
    try {
      const body: Record<string, unknown> = {
        question,
        topK: 15,
      };
      
      if (params.unitId) body.unitId = params.unitId;
      else if (params.courseId) body.courseId = params.courseId;
      else if (params.schoolId) body.schoolId = params.schoolId;

      const result = await apiClient.post('/rag/query', body);
      
      const sources = (result.data?.data?.sources || result.data?.sources || []).map((s: any) => ({
        id: s.resourceId || s.id,
        title: s.title,
        fileType: s.fileType,
        resourceType: s.resourceType,
      }));

      const answer = result.data?.data?.answer || result.data?.answer || "I couldn't find relevant resources.";

      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: answer, resources: sources, isStreaming: false }
          : m
      ));
    } catch {
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: "😔 Connection error. Please try again.", isStreaming: false }
          : m
      ));
    } finally {
      setLoading(false);
    }
  };

  const handleResourcePress = (resource: Resource) => {
    const resourceId = resource.id || resource.resourceId;
    if (resourceId) {
      router.push(`/resources/${resourceId}` as any);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageRow, item.role === 'user' ? styles.userRow : styles.assistantRow]}>
      {item.role === 'assistant' && (
        <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.avatar}>
          <Ionicons name="sparkles" size={14} color="#fff" />
        </LinearGradient>
      )}
      
      <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
        {item.role === 'user' ? (
          <Text style={styles.userText}>{item.content}</Text>
        ) : (
          <>
            {item.content ? (
              <Markdown style={markdownStyles}>{item.content}</Markdown>
            ) : item.isStreaming ? (
              <View style={styles.typingDots}>
                {[0, 1, 2].map(i => (
                  <Animated.View key={i} style={[styles.dot, { opacity: typingAnim }]} />
                ))}
              </View>
            ) : null}
          </>
        )}

        {item.resources && item.resources.length > 0 && !item.isStreaming && (
          <View style={styles.resourcesSection}>
            <View style={styles.resourcesHeader}>
              <Ionicons name="documents" size={14} color="#6366F1" />
              <Text style={styles.resourcesLabel}>
                {item.resources.length} resource{item.resources.length !== 1 ? 's' : ''} found
              </Text>
            </View>
            
            {item.resources.slice(0, 6).map((resource, index) => (
              <TouchableOpacity
                key={resource.id || `res-${index}`}
                style={styles.resourceItem}
                onPress={() => handleResourcePress(resource)}
              >
                <View style={[styles.resourceIcon, { backgroundColor: getFileTypeColor(resource.fileType) + '20' }]}>
                  <Ionicons name={getResourceIcon(resource.resourceType)} size={16} color={getFileTypeColor(resource.fileType)} />
                </View>
                <Text style={styles.resourceTitle} numberOfLines={1}>
                  {resource.title || 'Untitled'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>
            ))}
            
            {item.resources.length > 6 && (
              <Text style={styles.moreCount}>+{item.resources.length - 6} more</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );

  const suggestions = [
    'Show me all resources',
    params.courseCode ? `Find ${params.courseCode} notes` : 'Find lecture notes',
    'Get past exams',
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Study Assistant</Text>
          <Text style={styles.headerContext}>{getContextLabel()}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {messages.length <= 1 ? (
          <View style={styles.emptyState}>
            <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.emptyIcon}>
              <Ionicons name="sparkles" size={40} color="#fff" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>AI Study Assistant</Text>
            <Text style={styles.emptySubtitle}>
              Filtering: {getContextLabel()}
            </Text>
            
            <View style={styles.suggestionsWrap}>
              {suggestions.map((s, i) => (
                <TouchableOpacity key={i} style={styles.chip} onPress={() => setInput(s)}>
                  <Ionicons name="search" size={14} color="#6366F1" />
                  <Text style={styles.chipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Input */}
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Ask about study materials..."
            placeholderTextColor="#999"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  headerContext: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerSpacer: { width: 40 },
  content: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#666', marginBottom: 32 },
  suggestionsWrap: { gap: 10, width: '100%' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  chipText: { fontSize: 14, color: '#333' },
  list: { padding: 16, paddingBottom: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  userRow: { justifyContent: 'flex-end' },
  assistantRow: { justifyContent: 'flex-start' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  bubble: { maxWidth: '80%', padding: 14, borderRadius: 18 },
  userBubble: { backgroundColor: '#6366F1', borderBottomRightRadius: 6 },
  assistantBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  userText: { fontSize: 15, color: '#fff', lineHeight: 22 },
  typingDots: { flexDirection: 'row', gap: 6, paddingVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1' },
  resourcesSection: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  resourcesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  resourcesLabel: { fontSize: 13, color: '#6366F1', fontWeight: '500' },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    gap: 10,
  },
  resourceIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceTitle: { flex: 1, fontSize: 13, color: '#333' },
  moreCount: { fontSize: 12, color: '#6366F1', textAlign: 'center', marginTop: 4 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#ccc' },
});
