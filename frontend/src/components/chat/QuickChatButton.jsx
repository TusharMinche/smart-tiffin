// ============ src/components/chat/QuickChatButton.jsx ============
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiMessageSquare, FiX } from 'react-icons/fi';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { chatApi } from '../../api/chatApi';
import { toast } from 'react-toastify';

const QuickChatButton = ({ providerId, providerName }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuickChat = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setLoading(true);
    try {
      await chatApi.sendMessage({
        receiverId: providerId,
        message: message.trim(),
        messageType: 'text',
      });

      toast.success('Message sent successfully!');
      setShowModal(false);
      setMessage('');
      
      // Navigate to chat page
      setTimeout(() => {
        navigate('/chat', { state: { providerId } });
      }, 500);
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          if (isAuthenticated) {
            setShowModal(true);
          } else {
            navigate('/login');
          }
        }}
      >
        <FiMessageSquare className="mr-2" />
        Quick Chat
      </Button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Message ${providerName}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi, I'm interested in your tiffin service..."
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Mention your meal preferences, dietary restrictions, 
              or any questions about their service.
            </p>
          </div>

          <div className="flex space-x-3">
            <Button
              fullWidth
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button fullWidth onClick={handleQuickChat} loading={loading}>
              Send Message
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default QuickChatButton;