import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '@/mobile/components/ThemedText';
import { ThemedView } from '@/mobile/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/mobile/constants/Colors';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  input: string;
}

const MIN_TAB_WIDTH = 90;
const MAX_VISIBLE_TABS = 10;

const ChatView = ({ 
  chat, 
  onSendMessage, 
  onInputChange 
}: { 
  chat: Chat;
  onSendMessage: (chatId: string, message: string) => void;
  onInputChange: (chatId: string, text: string) => void;
}) => {
  const colorScheme = useColorScheme() ?? 'light';

  const handleSend = () => {
    if (chat.input.trim()) {
      onSendMessage(chat.id, chat.input.trim());
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.chatContainer} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {chat.messages.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <ThemedText type="title" style={styles.emptyTitle}>What are you working on?</ThemedText>
          </ThemedView>
        ) : (
          chat.messages.map((message) => (
            <View 
              key={message.id} 
              style={[
                styles.messageWrapper,
                message.isUser ? styles.userMessageWrapper : styles.assistantMessageWrapper
              ]}
            >
              <View 
                style={[
                  styles.messageBubble,
                  message.isUser 
                    ? [styles.userMessage, { backgroundColor: Colors[colorScheme].tint }]
                    : [styles.assistantMessage, { backgroundColor: Colors[colorScheme].tint + '20' }]
                ]}
              >
                <Text 
                  style={[
                    styles.messageText,
                    message.isUser 
                      ? { color: '#fff' }
                      : { color: Colors[colorScheme].text }
                  ]}
                >
                  {message.text}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <ThemedView style={styles.inputContainer}>
        <View style={styles.inputCenterWrapper}>
          <View style={styles.modernInputWrapper}>
            <TouchableOpacity style={styles.addButton}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
            
            <View style={styles.inputSection}>
              <TextInput
                style={styles.modernTextInput}
                value={chat.input}
                onChangeText={(text) => onInputChange(chat.id, text)}
                placeholder="Ask anything"
                placeholderTextColor="#888"
                multiline
                maxLength={1000}
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
              />
              
              <TouchableOpacity style={styles.toolsButton}>
                <Text style={styles.toolsText}>🔧 Tools</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.micButton}>
              <Text style={styles.micText}>🎤</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.audioButton}>
              <Text style={styles.audioText}>〰️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedView>
    </KeyboardAvoidingView>
  );
};

export default function Chat() {
  const colorScheme = useColorScheme() ?? 'light';
  const [allChats, setAllChats] = useState<Chat[]>([
    {
      id: '1',
      title: 'New Chat',
      messages: [],
      input: '',
    },
  ]);
  
  const [visibleTabIds, setVisibleTabIds] = useState<string[]>(['1']);
  const [sidebarTabIds, setSidebarTabIds] = useState<string[]>([]);
  const [activeChatId, setActiveChatId] = useState('1');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [lastTapTime, setLastTapTime] = useState<Record<string, number>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeChat = allChats.find(chat => chat.id === activeChatId);
  const visibleChats = allChats.filter(chat => visibleTabIds.includes(chat.id));
  const sidebarChats = allChats.filter(chat => sidebarTabIds.includes(chat.id));

  const calculateTabWidth = () => {
    const tabCount = visibleTabIds.length;
    if (tabCount === 0) return 80;
    return 80 / tabCount;
  };

  const addNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      input: '',
    };
    
    setAllChats(prev => [...prev, newChat]);
    
    if (visibleTabIds.length >= MAX_VISIBLE_TABS) {
      const leftmostTabId = visibleTabIds[0];
      setVisibleTabIds(prev => [...prev.slice(1), newChat.id]);
      setSidebarTabIds(prev => [leftmostTabId, ...prev]);
    } else {
      setVisibleTabIds(prev => [...prev, newChat.id]);
    }
    
    setActiveChatId(newChat.id);
  };

  const closeChat = (chatId: string) => {
    if (allChats.length <= 1) return;

    const isVisible = visibleTabIds.includes(chatId);
    const isSidebar = sidebarTabIds.includes(chatId);
    
    setAllChats(prev => prev.filter(chat => chat.id !== chatId));
    
    if (isVisible) {
      setVisibleTabIds(prev => prev.filter(id => id !== chatId));
      
      if (sidebarTabIds.length > 0 && visibleTabIds.length - 1 < MAX_VISIBLE_TABS) {
        const firstSidebarId = sidebarTabIds[0];
        setVisibleTabIds(prev => [...prev.filter(id => id !== chatId), firstSidebarId]);
        setSidebarTabIds(prev => prev.slice(1));
      }
    } else if (isSidebar) {
      setSidebarTabIds(prev => prev.filter(id => id !== chatId));
    }
    
    if (activeChatId === chatId) {
      const remainingChats = allChats.filter(chat => chat.id !== chatId);
      if (remainingChats.length > 0) {
        const nextActiveId = visibleTabIds.find(id => id !== chatId) || remainingChats[0].id;
        setActiveChatId(nextActiveId);
      }
    }
  };

  const handleTabPress = (chatId: string) => {
    const now = Date.now();
    const lastTap = lastTapTime[chatId] || 0;
    
    if (now - lastTap < 300) {
      startEditingTab(chatId);
    } else {
      setActiveChatId(chatId);
    }
    
    setLastTapTime(prev => ({ ...prev, [chatId]: now }));
  };

  const handleSidebarTabPress = (chatId: string) => {
    if (visibleTabIds.length >= MAX_VISIBLE_TABS) {
      const leftmostTabId = visibleTabIds[0];
      setVisibleTabIds(prev => [...prev.slice(1), chatId]);
      setSidebarTabIds(prev => [leftmostTabId, ...prev.filter(id => id !== chatId)]);
    } else {
      setVisibleTabIds(prev => [...prev, chatId]);
      setSidebarTabIds(prev => prev.filter(id => id !== chatId));
    }
    setActiveChatId(chatId);
  };

  const startEditingTab = (chatId: string) => {
    const chat = allChats.find(c => c.id === chatId);
    if (chat) {
      setEditingTabId(chatId);
      setEditingTitle(chat.title);
    }
  };

  const finishEditingTab = () => {
    if (editingTabId && editingTitle.trim()) {
      updateChatTitle(editingTabId, editingTitle.trim());
    }
    setEditingTabId(null);
    setEditingTitle('');
  };

  const updateChatTitle = (chatId: string, newTitle: string) => {
    setAllChats(prevChats =>
      prevChats.map(chat =>
        chat.id === chatId ? { ...chat, title: newTitle } : chat
      )
    );
  };

  const onSendMessage = (chatId: string, messageText: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setAllChats(prevChats =>
      prevChats.map(chat =>
        chat.id === chatId
          ? { ...chat, messages: [...chat.messages, userMessage], input: '' }
          : chat
      )
    );

    const chat = allChats.find(c => c.id === chatId);
    if (chat && chat.messages.length === 0) {
      const title = messageText.length > 30 
        ? messageText.substring(0, 30) + '...' 
        : messageText;
      updateChatTitle(chatId, title);
    }

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: generateQ2Response(messageText),
        isUser: false,
        timestamp: new Date(),
      };

      setAllChats(prevChats =>
        prevChats.map(chat =>
          chat.id === chatId
            ? { ...chat, messages: [...chat.messages, assistantMessage] }
            : chat
        )
      );
    }, 1000);
  };

  const onInputChange = (chatId: string, text: string) => {
    setAllChats(prevChats =>
      prevChats.map(chat =>
        chat.id === chatId ? { ...chat, input: text } : chat
      )
    );
  };

  const generateQ2Response = (userMessage: string): string => {
    const responses = [
      "I'd be happy to help you with that! Can you provide more details?",
      "That's an interesting question. Let me think about the best approach...",
      "I understand what you're asking. Here's my perspective on that:",
      "Great question! There are several ways to approach this:",
      "I can definitely help you with that. Let me break it down:",
      "That's a thoughtful question. Here's what I would suggest:",
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const renderTab = (chat: Chat) => {
    const isActive = chat.id === activeChatId;
    const isEditing = editingTabId === chat.id;
    const tabWidth = calculateTabWidth();
    const tabBackgroundColor = isActive 
      ? Colors[colorScheme].background 
      : Colors[colorScheme].background + '80';
    
    return (
      <View 
        key={chat.id} 
        style={[
          styles.tab, 
          { 
            backgroundColor: tabBackgroundColor,
            width: `${tabWidth}%`
          }
        ]}
      >
        <TouchableOpacity
          style={styles.tabTouchable}
          onPress={() => handleTabPress(chat.id)}
          activeOpacity={0.8}
          disabled={isEditing}
        >
          <View style={styles.tabContent}>
            {isEditing ? (
              <TextInput
                style={[
                  styles.tabEditInput,
                  { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].tint }
                ]}
                value={editingTitle}
                onChangeText={setEditingTitle}
                onSubmitEditing={finishEditingTab}
                onBlur={finishEditingTab}
                autoFocus
                selectTextOnFocus
                maxLength={50}
              />
            ) : (
              <Text 
                style={[
                  styles.tabTitle, 
                  { color: isActive ? Colors[colorScheme].text : Colors[colorScheme].text + '80' }
                ]}
                numberOfLines={1}
              >
                {chat.title}
              </Text>
            )}
            {!isEditing && (
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: Colors[colorScheme].tint + '20' }]}
                onPress={() => closeChat(chat.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.closeButtonText, { color: Colors[colorScheme].text }]}>X</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSidebarTab = (chat: Chat) => {
    const isActive = chat.id === activeChatId;
    
    return (
      <TouchableOpacity
        key={chat.id}
        style={[
          styles.sidebarTab,
          { 
            backgroundColor: isActive 
              ? Colors[colorScheme].tint + '20' 
              : Colors[colorScheme].background 
          }
        ]}
        onPress={() => handleSidebarTabPress(chat.id)}
        activeOpacity={0.8}
      >
        <Text 
          style={[
            styles.sidebarTabTitle,
            { color: Colors[colorScheme].text }
          ]}
          numberOfLines={1}
        >
          {chat.title}
        </Text>
        <TouchableOpacity
          style={[styles.sidebarCloseButton, { backgroundColor: Colors[colorScheme].tint + '20' }]}
          onPress={() => closeChat(chat.id)}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Text style={[styles.sidebarCloseButtonText, { color: Colors[colorScheme].text }]}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      <View style={styles.topContainer}>
        {sidebarChats.length > 0 && (
          <View style={[
            styles.sidebar,
            { 
              backgroundColor: Colors[colorScheme].background + 'F0',
              borderRightColor: Colors[colorScheme].tint + '30'
            }
          ]}>
            <TouchableOpacity
              style={styles.sidebarHeader}
              onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <Text style={[styles.sidebarChevron, { color: Colors[colorScheme].text }]}>
                {sidebarCollapsed ? '▶' : '▼'}
              </Text>
              <Text style={[styles.sidebarHeaderText, { color: Colors[colorScheme].text }]}>
                More ({sidebarChats.length})
              </Text>
            </TouchableOpacity>
            
            {!sidebarCollapsed && (
              <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
                {sidebarChats.map(renderSidebarTab)}
              </ScrollView>
            )}
          </View>
        )}
        
        <View style={[
          styles.tabBar, 
          { 
            backgroundColor: Colors[colorScheme].background + 'E0', 
            borderBottomColor: Colors[colorScheme].tint + '30' 
          }
        ]}>
          <View style={styles.tabRow}>
            {visibleChats.map(renderTab)}
            
            <TouchableOpacity
              style={[styles.addTabButton, { backgroundColor: Colors[colorScheme].tint + '20' }]}
              onPress={addNewChat}
              activeOpacity={0.7}
            >
              <Text style={[styles.addTabText, { color: Colors[colorScheme].tint }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {activeChat && (
        <ChatView
          chat={activeChat}
          onSendMessage={onSendMessage}
          onInputChange={onInputChange}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topContainer: {
    flexDirection: 'row',
  },
  sidebar: {
    width: 200,
    borderRightWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sidebarChevron: {
    fontSize: 12,
    marginRight: 8,
  },
  sidebarHeaderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sidebarTabTitle: {
    flex: 1,
    fontSize: 14,
    marginRight: 8,
  },
  sidebarCloseButton: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  sidebarCloseButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabBar: {
    flex: 1,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabRow: {
    flexDirection: 'row',
    height: 48,
  },
  tab: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  tabTouchable: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  tabTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  tabEditInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  closeButton: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  addTabButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  addTabText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  messageWrapper: {
    marginBottom: 12,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  assistantMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userMessage: {
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  inputCenterWrapper: {
    alignItems: 'center',
  },
  modernInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: 8,
    width: '100%',
    maxWidth: 700,
    minHeight: 50,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#404040',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
  },
  modernTextInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxHeight: 100,
    textAlignVertical: 'center',
  },
  toolsButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#404040',
    borderRadius: 15,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#404040',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  micText: {
    fontSize: 16,
  },
  audioButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#404040',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  audioText: {
    fontSize: 16,
  },
});