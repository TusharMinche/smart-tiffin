// ============ src/pages/ChatPage.jsx ============
import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiSend, FiPaperclip, FiSearch, FiMoreVertical } from 'react-icons/fi';
import { fetchConversations, fetchMessages, sendMessage, addMessage } from '../redux/slices/chatSlice';
import socketService from '../services/socketService';
import { formatRelativeTime } from '../utils/formatters';
import { getInitials, generateAvatarColor } from '../utils/helpers';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

const ChatPage = () => {
  const dispatch = useDispatch();
  const { conversations, messages, currentConversation } = useSelector((state) => state.chat);
  const { user } = useSelector((state) => state.auth);

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    dispatch(fetchConversations());

    // Socket listeners
    socketService.on('message:received', handleNewMessage);
    socketService.on('typing:user', handleTyping);

    return () => {
      socketService.off('message:received', handleNewMessage);
      socketService.off('typing:user', handleTyping);
    };
  }, [dispatch]);

  useEffect(() => {
    if (selectedConversation) {
      dispatch(fetchMessages({ conversationId: selectedConversation.conversationId }));
      socketService.emit('join:conversation', selectedConversation.conversationId);
    }
  }, [selectedConversation, dispatch]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewMessage = (data) => {
    dispatch(addMessage(data.message));
  };

  const handleTyping = (data) => {
    if (data.conversationId === selectedConversation?.conversationId) {
      setIsTyping(data.isTyping);
      if (data.isTyping) {
        setTimeout(() => setIsTyping(false), 3000);
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;

    const messageData = {
      receiverId: selectedConversation.otherUser._id,
      message: messageText,
      messageType: 'text',
    };

    await dispatch(sendMessage(messageData));
    setMessageText('');
    socketService.emit('typing:stop', {
      receiverId: selectedConversation.otherUser._id,
      conversationId: selectedConversation.conversationId,
    });
  };

  const handleInputChange = (e) => {
    setMessageText(e.target.value);
    
    if (selectedConversation) {
      socketService.emit('typing:start', {
        receiverId: selectedConversation.otherUser._id,
        conversationId: selectedConversation.conversationId,
      });

      // Auto-stop typing after 1 second of inactivity
      setTimeout(() => {
        socketService.emit('typing:stop', {
          receiverId: selectedConversation.otherUser._id,
          conversationId: selectedConversation.conversationId,
        });
      }, 1000);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-white">
      {/* Conversations List */}
      <div className="w-full md:w-96 border-r border-gray-200 flex flex-col">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={FiSearch}
          />
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.conversationId}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation?.conversationId === conversation.conversationId
                    ? 'bg-primary-50'
                    : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`h-12 w-12 rounded-full ${generateAvatarColor(
                      conversation.otherUser.name
                    )} flex items-center justify-center text-white font-semibold flex-shrink-0`}
                  >
                    {getInitials(conversation.otherUser.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {conversation.otherUser.name}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(conversation.lastMessage.createdAt)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.lastMessage.message}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ml-2">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No conversations yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`h-10 w-10 rounded-full ${generateAvatarColor(
                    selectedConversation.otherUser.name
                  )} flex items-center justify-center text-white font-semibold`}
                >
                  {getInitials(selectedConversation.otherUser.name)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedConversation.otherUser.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedConversation.otherUser.role}
                  </p>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <FiMoreVertical className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.map((message) => {
                const isSent = message.sender._id === user._id;
                return (
                  <div
                    key={message._id}
                    className={`flex mb-4 ${isSent ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isSent && (
                      <div
                        className={`h-8 w-8 rounded-full ${generateAvatarColor(
                          message.sender.name
                        )} flex items-center justify-center text-white text-sm font-semibold mr-2 flex-shrink-0`}
                      >
                        {getInitials(message.sender.name)}
                      </div>
                    )}
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isSent
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <p>{message.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isSent ? 'text-primary-100' : 'text-gray-500'
                        }`}
                      >
                        {formatRelativeTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <span className="text-sm">typing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiPaperclip className="h-5 w-5 text-gray-600" />
                </button>
                <input
                  type="text"
                  value={messageText}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Button type="submit" disabled={!messageText.trim()}>
                  <FiSend className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FiSearch className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;