import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

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
  const [inputHeight, setInputHeight] = useState(40);


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
            <ThemedText type="title" style={styles.emptyTitle}>What the hell are you working on?</ThemedText>
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
        <View style={styles.modernInputWrapper}>
          
          <View style={styles.inputSection}>
            <TouchableOpacity style={styles.addButton}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.modernTextInput, { height: inputHeight }]}
              value={chat.input}
              onChangeText={(text) => onInputChange(chat.id, text)}
              placeholder="Ask anything"
              placeholderTextColor="#b5b4b3"
              multiline
              maxLength={1000}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
              scrollEnabled={true}
              textAlignVertical='top'
              onContentSizeChange={(e) => {
                const newHeight = e.nativeEvent.contentSize.height;
                const minHeight = 40;
                const maxHeight = 160;
                setInputHeight(Math.min(Math.max(newHeight, minHeight), maxHeight));
              }}
            />
            
            <TouchableOpacity style={styles.toolsButton}>
              <Text style={styles.toolsText}>🔧 Tools</Text>
            </TouchableOpacity>
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
  const [chats, setChats] = useState<Chat[]>([
    {
      id: '1',
      title: 'New Chat',
      messages: [],
      input: '',
    },
  ]);
  
  const [activeChatId, setActiveChatId] = useState('1');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [lastTapTime, setLastTapTime] = useState<Record<string, number>>({});

  const activeChat = chats.find(chat => chat.id === activeChatId);

  const addNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      input: '',
    };
    setChats([...chats, newChat]);
    setActiveChatId(newChat.id);
  };

  const closeChat = (chatId: string) => {
    if (chats.length <= 1) return;

    const newChats = chats.filter(chat => chat.id !== chatId);
    setChats(newChats);
    
    if (activeChatId === chatId) {
      setActiveChatId(newChats[0].id);
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

  const startEditingTab = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
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

  const cancelEditingTab = () => {
    setEditingTabId(null);
    setEditingTitle('');
  };

  const updateChatTitle = (chatId: string, newTitle: string) => {
    setChats(prevChats =>
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

    setChats(prevChats =>
      prevChats.map(chat =>
        chat.id === chatId
          ? { ...chat, messages: [...chat.messages, userMessage], input: '' }
          : chat
      )
    );

    const chat = chats.find(c => c.id === chatId);
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

      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === chatId
            ? { ...chat, messages: [...chat.messages, assistantMessage] }
            : chat
        )
      );
    }, 1000);
  };

  const onInputChange = (chatId: string, text: string) => {
    setChats(prevChats =>
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
    // const tabBackgroundColor = isActive 
    //   ? Colors[colorScheme].background 
    //   : Colors[colorScheme].background + '80';
    
    return (
      <View key={chat.id} style={[styles.tab, isActive && styles.activeTab]}>
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
            {chats.length > 1 && !isEditing && (
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: Colors[colorScheme].tint + '20' }]}
                onPress={() => closeChat(chat.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.closeButtonText, { color: Colors[colorScheme].text }]}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      <View style={[
        styles.tabBar, 
        { 
          backgroundColor: Colors[colorScheme].background + 'E0', 
          borderBottomColor: Colors[colorScheme].tint + '30' 
        }
      ]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabScrollView}
          contentContainerStyle={styles.tabScrollContent}
        >
          {chats.map(renderTab)}
          
          <TouchableOpacity
            style={[styles.addTabButton, { backgroundColor: Colors[colorScheme].tint + '20' }]}
            onPress={addNewChat}
            activeOpacity={0.7}
          >
            <Text style={[styles.addTabText, { color: Colors[colorScheme].tint }]}>+</Text>
          </TouchableOpacity>
        </ScrollView>
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabScrollView: {
    flex: 1,
  },
  tabScrollContent: {
    alignItems: 'flex-end',
  },
  tab: {
    marginTop: 5,
    marginRight: 2,
    marginLeft: 5,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    minWidth: 120,
    maxWidth: 200,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    backgroundColor: '#39393d80'
  },
  activeTab: {
    backgroundColor: '#39393d',
    borderColor: '#5b5b60',
    borderWidth: 1
  },
  tabTouchable: {
    flex: 1
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 40,
  },
  tabTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  tabEditInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    width: 200,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  closeButton: {
    marginLeft: 8,
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
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginRight: 8,
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
    padding: 20,
    width: '80%',
    alignSelf: 'center'
  },
  modernInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444447',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#676769',
    paddingHorizontal: 30,
    paddingVertical: 10,
    gap: 8,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#404040',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputSection: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'red',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modernTextInput: {
    flex: 1,
    flexDirection: 'column',
    fontSize: 20,
    color: 'white',
    borderWidth: 1,
    borderColor: 'green',
    paddingVertical: 2,
    paddingHorizontal: 12,
    // alignContent: 'center',
    minHeight: 40,       // 1 line
    maxHeight: 160,      // ~5–8 lines depending on line spacing
    overflowY: 'auto',  // enables scroll when needed
  },
  toolsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#404040',
    borderRadius: 15,
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
  },
  audioText: {
    fontSize: 16,
  },
});