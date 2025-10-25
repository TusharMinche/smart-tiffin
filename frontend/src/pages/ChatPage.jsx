// ============ src/pages/ChatPage.jsx - ENHANCED VERSION ============
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { fetchConversations, fetchMessages, sendMessage, addMessage } from '../redux/slices/chatSlice';
import socketService from '../services/socketService';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import Loader from '../components/common/Loader';
import { toast } from 'react-toastify';

const ChatPage = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { conversations, loading } = useSelector((state) => state.chat);
  const { isAuthenticated, token } = useSelector((state) => state.auth);

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [filteredConversations, setFilteredConversations] = useState([]);

  // Initialize socket and load conversations
  useEffect(() => {
    if (isAuthenticated && token) {
      // Ensure socket is connected
      if (!socketService.socket) {
        socketService.connect(token);
      }
      
      dispatch(fetchConversations());
      
      // Setup socket listeners
      socketService.on('message:received', handleNewMessage);
      socketService.on('typing:user', handleTyping);
      socketService.on('message:sent', handleMessageSent);
    }

    return () => {
      socketService.off('message:received', handleNewMessage);
      socketService.off('typing:user', handleTyping);
      socketService.off('message:sent', handleMessageSent);
    };
  }, [isAuthenticated, token, dispatch]);

  // Handle provider ID from navigation state (when clicking chat from provider details)
  useEffect(() => {
    if (location.state?.providerId && conversations.length > 0) {
      const providerConversation = conversations.find(
        (conv) => conv.otherUser._id === location.state.providerId
      );
      if (providerConversation) {
        handleSelectConversation(providerConversation);
      }
    }
  }, [location.state, conversations]);

  // Filter conversations based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = conversations.filter((conv) =>
        conv.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations]);

  const handleNewMessage = (data) => {
    dispatch(addMessage(data.message));
    
    // Show notification if message is not from current conversation
    if (selectedConversation?.conversationId !== data.message.conversationId) {
      toast.info(`New message from ${data.message.sender.name}`, {
        autoClose: 3000,
      });
    }
    
    // Refresh conversations to update last message
    dispatch(fetchConversations());
  };

  const handleMessageSent = (data) => {
    if (data.success) {
      dispatch(addMessage(data.message));
    }
  };

  const handleTyping = (data) => {
    if (data.conversationId === selectedConversation?.conversationId) {
      setIsTyping(data.isTyping);
      if (data.isTyping) {
        setTimeout(() => setIsTyping(false), 3000);
      }
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    
    // Load messages for this conversation
    await dispatch(
      fetchMessages({ conversationId: conversation.conversationId })
    );
    
    // Join conversation room
    socketService.emit('join:conversation', conversation.conversationId);
    
    // Mark messages as read
    const unreadMessageIds = conversation.unreadCount > 0 
      ? [] // You would need to get actual unread message IDs
      : [];
    
    if (unreadMessageIds.length > 0) {
      socketService.emit('messages:read', {
        conversationId: conversation.conversationId,
        messageIds: unreadMessageIds,
      });
    }
  };

  const handleSendMessage = async (messageData) => {
    if (!selectedConversation) return;

    try {
      const payload = {
        receiverId: selectedConversation.otherUser._id,
        message: messageData.message,
        messageType: messageData.attachments ? 'file' : 'text',
        attachments: messageData.attachments || [],
      };

      // Emit through socket for real-time delivery
      socketService.emit('message:send', payload);
      
      // Also send through API for persistence
      await dispatch(sendMessage(payload));
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Send message error:', error);
    }
  };

  if (loading && conversations.length === 0) {
    return <Loader fullScreen />;
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gray-50">
      {/* Conversations Sidebar */}
      <ConversationList
        conversations={filteredConversations}
        selectedConversation={selectedConversation}
        onSelectConversation={handleSelectConversation}
        searchQuery={searchQuery}
        onSearchChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Chat Window */}
      <ChatWindow
        conversation={selectedConversation}
        onSendMessage={handleSendMessage}
        isTyping={isTyping}
      />
    </div>
  );
};

export default ChatPage;