import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRAG, RAGMessage, RAGSource } from '../../hooks/useRAG';
import { useResources } from '../../hooks/useResources';
import Markdown from 'react-native-markdown-display';

// Markdown styles for AI responses
const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  heading1: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 8,
  },
  heading2: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 10,
    marginBottom: 6,
  },
  heading3: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  paragraph: {
    marginTop: 4,
    marginBottom: 8,
  },
  bullet_list: {
    marginLeft: 8,
  },
  ordered_list: {
    marginLeft: 8,
  },
  list_item: {
    marginBottom: 4,
  },
  strong: {
    fontWeight: '600',
  },
  em: {
    fontStyle: 'italic',
  },
  code_inline: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
  fence: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
    paddingLeft: 12,
    marginLeft: 0,
    opacity: 0.8,
  },
  link: {
    color: '#6366F1',
    textDecorationLine: 'underline',
  },
});

export default function AskAIScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ resourceIds?: string }>();
  const { messages, isLoading, isStreaming, streamQuery, clearMessages, cancelStream } = useRAG();
  const { resources, fetchResources } = useResources();
  const flatListRef = useRef<FlatList>(null);

  const [inputText, setInputText] = useState('');
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [showResourcePicker, setShowResourcePicker] = useState(false);

  // Parse resourceIds from URL params
  useEffect(() => {
    if (params.resourceIds) {
      try {
        const ids = JSON.parse(params.resourceIds);
        if (Array.isArray(ids)) {
          setSelectedResources(ids);
        }
      } catch {
        // Single ID
        setSelectedResources([params.resourceIds]);
      }
    }
  }, [params.resourceIds]);

  // Load user's resources for selection
  useEffect(() => {
    fetchResources({}, 1, false);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    const question = inputText.trim();
    setInputText('');

    await streamQuery(question, {
      resourceIds: selectedResources.length > 0 ? selectedResources : undefined,
    });
  }, [inputText, isLoading, streamQuery, selectedResources]);

  const toggleResourceSelection = (resourceId: string) => {
    setSelectedResources((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  const renderMessage = ({ item }: { item: RAGMessage }) => {
    const isUser = item.type === 'user';

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.assistantMessage,
        ]}
      >
        {!isUser && (
          <View style={styles.avatarContainer}>
            <View style={styles.aiAvatar}>
              <Ionicons name="sparkles" size={16} color="#fff" />
            </View>
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          {isUser ? (
            <Text style={[styles.messageText, styles.userMessageText]}>
              {item.content}
            </Text>
          ) : (
            <Markdown style={markdownStyles}>
              {item.content || ' '}
            </Markdown>
          )}

          {item.isStreaming && (
            <View style={styles.streamingIndicator}>
              <ActivityIndicator size="small" color="#6366F1" />
            </View>
          )}

          {/* Sources */}
          {item.sources && item.sources.length > 0 && (
            <View style={styles.sourcesContainer}>
              <Text style={styles.sourcesTitle}>Sources:</Text>
              {item.sources.map((source: RAGSource, index: number) => (
                <TouchableOpacity
                  key={`${source.resourceId}-${index}`}
                  style={styles.sourceItem}
                  onPress={() => router.push(`/resources/${source.resourceId}`)}
                >
                  <Ionicons name="document-text-outline" size={14} color="#6366F1" />
                  <Text style={styles.sourceText} numberOfLines={1}>
                    {source.title}
                    {source.pageNumber && ` (Page ${source.pageNumber})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {isUser && (
          <View style={styles.avatarContainer}>
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={16} color="#fff" />
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyChat = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.aiIconLarge}>
        <Ionicons name="sparkles" size={48} color="#6366F1" />
      </View>
      <Text style={styles.emptyTitle}>Ask AI about your study materials</Text>
      <Text style={styles.emptySubtitle}>
        I can help you understand course content, find specific information, and answer
        questions about your uploaded resources.
      </Text>

      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Try asking:</Text>
        {[
          'What are the key concepts in Chapter 3?',
          'Explain the main theory from the lecture notes',
          'Summarize the assignment requirements',
        ].map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionChip}
            onPress={() => setInputText(suggestion)}
          >
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderResourcePicker = () => (
    <View style={styles.resourcePickerOverlay}>
      <View style={styles.resourcePicker}>
        <View style={styles.resourcePickerHeader}>
          <Text style={styles.resourcePickerTitle}>Select Resources</Text>
          <TouchableOpacity onPress={() => setShowResourcePicker(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <Text style={styles.resourcePickerSubtitle}>
          Limit AI responses to specific documents
        </Text>

        <FlatList
          data={resources}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.resourcePickerItem,
                selectedResources.includes(item.id) && styles.resourcePickerItemSelected,
              ]}
              onPress={() => toggleResourceSelection(item.id)}
            >
              <View style={styles.resourcePickerItemContent}>
                <Text style={styles.resourcePickerItemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.resourcePickerItemMeta}>
                  {item.fileType.toUpperCase()} • {item.course?.code || 'No course'}
                </Text>
              </View>
              <Ionicons
                name={selectedResources.includes(item.id) ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={selectedResources.includes(item.id) ? '#6366F1' : '#ccc'}
              />
            </TouchableOpacity>
          )}
          style={styles.resourcePickerList}
        />

        <View style={styles.resourcePickerFooter}>
          <TouchableOpacity
            style={styles.clearSelectionButton}
            onPress={() => setSelectedResources([])}
          >
            <Text style={styles.clearSelectionText}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => setShowResourcePicker(false)}
          >
            <Text style={styles.doneButtonText}>
              Done ({selectedResources.length} selected)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Study Assistant</Text>
          <Text style={styles.headerSubtitle}>Powered by AI</Text>
        </View>
        <TouchableOpacity onPress={clearMessages}>
          <Ionicons name="trash-outline" size={22} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Selected Resources Badge */}
      {selectedResources.length > 0 && (
        <TouchableOpacity
          style={styles.selectedResourcesBadge}
          onPress={() => setShowResourcePicker(true)}
        >
          <Ionicons name="documents-outline" size={16} color="#6366F1" />
          <Text style={styles.selectedResourcesText}>
            {selectedResources.length} resource{selectedResources.length > 1 ? 's' : ''} selected
          </Text>
          <Ionicons name="chevron-down" size={16} color="#6366F1" />
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.emptyList,
          ]}
          ListEmptyComponent={renderEmptyChat}
          showsVerticalScrollIndicator={false}
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.resourceButton}
            onPress={() => setShowResourcePicker(true)}
          >
            <Ionicons
              name="documents-outline"
              size={22}
              color={selectedResources.length > 0 ? '#6366F1' : '#666'}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Ask a question..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Resource Picker Modal */}
      {showResourcePicker && renderResourcePicker()}
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6366F1',
    marginTop: 2,
  },
  selectedResourcesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0ff',
    paddingVertical: 8,
    gap: 6,
  },
  selectedResourcesText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyList: {
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginTop: 4,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  userMessageText: {
    color: '#fff',
  },
  streamingIndicator: {
    marginTop: 8,
  },
  sourcesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sourcesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  sourceText: {
    fontSize: 13,
    color: '#6366F1',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  aiIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  suggestionsContainer: {
    width: '100%',
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
  },
  suggestionChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 8,
  },
  resourceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#f5f5f5',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  resourcePickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  resourcePicker: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  resourcePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resourcePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  resourcePickerSubtitle: {
    fontSize: 13,
    color: '#666',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  resourcePickerList: {
    maxHeight: 300,
  },
  resourcePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resourcePickerItemSelected: {
    backgroundColor: '#f8f8ff',
  },
  resourcePickerItemContent: {
    flex: 1,
    marginRight: 12,
  },
  resourcePickerItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  resourcePickerItemMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  resourcePickerFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  clearSelectionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  clearSelectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  doneButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
