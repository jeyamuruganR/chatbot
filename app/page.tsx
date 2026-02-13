'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import Image from 'next/image';
import './chat.css';

interface ChatMetadata {
  createdAt?: string;
  form?: Record<string, unknown>;
  formRequest?: boolean;
}

interface ChatMessageWithMeta {
  id: string;
  role: 'user' | 'assistant';
  parts: { type: 'text'; text: string }[];
  metadata?: ChatMetadata;
}

export default function Chat() {
  const [input, setInput] = useState<string>('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    inquiryType: '',
    message: '',
    contactMethod: '',
    bestTime: 'Any time',
    agree: false,
    newsletter: false,
  });

  const [emailError, setEmailError] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const { messages, sendMessage, status, setMessages } = useChat();
  const loading = status === 'submitted' || status === 'streaming';
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Typing indicator
  useEffect(() => {
    if (input) {
      setIsTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    } else {
      setIsTyping(false);
    }
  }, [input]);

  const formatTime = (dateString?: string): string => {
    const date = dateString ? new Date(dateString) : new Date();
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sendChatMessage = async () => {
    if (!input.trim()) return;

    await sendMessage({
      text: input,
      metadata: { createdAt: new Date().toISOString() },
    });

    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (e.target instanceof HTMLInputElement && e.target.type === "checkbox") {
      const target = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: target.checked,
      }));
      return;
    }

    if (name === "fullName") {
      const lettersOnly = value.replace(/[^a-zA-Z\s]/g, "");
      setFormData(prev => ({ ...prev, [name]: lettersOnly }));
      return;
    }

    if (name === "phone") {
      const numbersOnly = value.replace(/[^0-9]/g, "");
      // Format phone number
      const formatted = numbersOnly.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
      setFormData(prev => ({ ...prev, [name]: formatted }));
      return;
    }

    if (name === "email") {
      setFormData(prev => ({ ...prev, [name]: value }));
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        setEmailError("Please enter a valid email address");
      } else {
        setEmailError("");
      }
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const submitForm = async () => {
    if (!formData.fullName.trim() || !formData.email.trim()) return;

    // Show loading state
    const loadingMessage: ChatMessageWithMeta = {
      id: 'loading-' + Date.now().toString(),
      role: 'assistant',
      parts: [{ type: 'text', text: 'Processing your request...' }],
      metadata: { createdAt: new Date().toISOString() },
    };

    setMessages((prev) => [...prev, loadingMessage]);

    await sendMessage({
      text: `Customer Follow-Up Form submitted`,
      metadata: { form: formData },
    });

    // Remove loading message and add thank you
    setMessages((prev) => {
      const filtered = prev.filter(msg => !msg.id.startsWith('loading-'));
      const thankYouMessage: ChatMessageWithMeta = {
        id: Date.now().toString(),
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: `✨ Thank you ${formData.fullName}! Your inquiry has been received. One of our representatives will contact you within 24 hours.`
          }
        ],
        metadata: { createdAt: new Date().toISOString() },
      };
      return [...filtered, thankYouMessage];
    });

    setFormData({
      fullName: '',
      email: '',
      phone: '',
      company: '',
      inquiryType: '',
      message: '',
      contactMethod: '',
      bestTime: 'Any time',
      agree: false,
      newsletter: false,
    });
  };

  const requestForm = () => {
    const formRequestMessage: ChatMessageWithMeta = {
      id: Date.now().toString(),
      role: 'assistant',
      parts: [{ 
        type: 'text', 
        text: "I'd be happy to help you! Please fill out this quick form and I'll assist you right away. 👇" 
      }],
      metadata: { createdAt: new Date().toISOString(), formRequest: true },
    };

    setMessages((prev) => [...prev, formRequestMessage]);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleEmojiSelect = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const emojis = ['😊', '👍', '❤️', '😂', '🎉', '🤔', '👋', '🙏', '✨', '🔥', '💯', '✅'];

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="header-content">
          <div className="avatar-wrapper">
            <Image
              src="/techmuruganlogo.png"
              alt="Assistant"
              className="avatar"
              width={44}
              height={44}
            />
          </div>
          <div className="header-text">
            <div className="assistant-name">TechMurugan Assistant</div>
            <div className="status">
              {status === 'streaming' ? 'Typing...' : isTyping ? 'User typing...' : 'Online'}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="welcome-message">
            <div className="welcome-avatar">
              <Image
                src="/techmuruganlogo.png"
                alt="Assistant"
                width={60}
                height={60}
              />
            </div>
            <div className="welcome-text">
              <h3>👋 Hello! I'm TechMurugan Assistant</h3>
              <p>How can I help you today? Feel free to ask me anything!</p>
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message-row ${message.role === 'user' ? 'user' : 'assistant'}`}
          >
            {message.role === 'assistant' && (
              <Image
                src="/techmuruganlogo.png"
                alt="Assistant"
                className="message-avatar"
                width={32}
                height={32}
              />
            )}

            <div className={`message-bubble ${message.role === 'user' ? 'user' : 'assistant'}`}>
              {/* Normal text */}
              {message.parts
                .filter((part) => part.type === 'text')
                .map((part, i) => (
                  <div key={`${message.id}-${i}`}>{part.text}</div>
                ))}

              {/* Inline Form inside assistant bubble */}
              {(message as ChatMessageWithMeta).metadata?.formRequest && (
                <div className="inline-contact-form">
                  <h4>📋 Contact Information</h4>

                  <div className="form-grid">
                    <input
                      type="text"
                      name="fullName"
                      placeholder="Full Name *"
                      value={formData.fullName}
                      onChange={handleFormChange}
                      required
                    />
                    <input
                      type="email"
                      name="email"
                      placeholder="Email Address *"
                      value={formData.email}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  {emailError && (
                    <p style={{ 
                      color: 'var(--error-color)', 
                      fontSize: '0.75rem',
                      margin: '0 0 0.5rem 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <span>⚠️</span> {emailError}
                    </p>
                  )}

                  <input
                    type="text"
                    name="phone"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={handleFormChange}
                  />
                  <input
                    type="text"
                    name="company"
                    placeholder="Company Name"
                    value={formData.company}
                    onChange={handleFormChange}
                  />

                  <select name="inquiryType" value={formData.inquiryType} onChange={handleFormChange}>
                    <option value="">Select Inquiry Type</option>
                    <option value="support">🛠️ Support</option>
                    <option value="sales">💰 Sales</option>
                    <option value="general">📝 General</option>
                  </select>

                  <textarea
                    name="message"
                    placeholder="Your message..."
                    value={formData.message}
                    onChange={handleFormChange}
                    rows={3}
                  ></textarea>
                  
                  <div className="form-grid">
                    <select name="contactMethod" value={formData.contactMethod} onChange={handleFormChange}>
                      <option value="">Preferred Contact Method</option>
                      <option value="email">📧 Email</option>
                      <option value="phone">📞 Phone</option>
                    </select>

                    <select name="bestTime" value={formData.bestTime} onChange={handleFormChange}>
                      <option value="Any time">🕐 Any time</option>
                      <option value="Morning">🌅 Morning</option>
                      <option value="Afternoon">☀️ Afternoon</option>
                      <option value="Evening">🌙 Evening</option>
                    </select>
                  </div>

                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input type="checkbox" name="agree" checked={formData.agree} onChange={handleFormChange} />
                      <span className="checkmark"></span>
                      I agree to be contacted
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="newsletter" checked={formData.newsletter} onChange={handleFormChange} />
                      <span className="checkmark"></span>
                      I'd like to receive news and offers
                    </label>
                  </div>

                  <div className="form-actions">
                    <button
                      className="submit-button"
                      onClick={submitForm}
                      disabled={!formData.fullName || !formData.email}
                    >
                      {!formData.fullName || !formData.email ? 'Fill required fields' : 'Submit ✨'}
                    </button>
                  </div>
                </div>
              )}

              <div className="message-time">
                {formatTime((message as ChatMessageWithMeta).metadata?.createdAt)}
              </div>
            </div>

            {message.role === 'user' && (
              <div className="message-avatar user-avatar">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="message-row assistant">
            <Image
              src="/techmuruganlogo.png"
              alt="Assistant"
              className="message-avatar"
              width={32}
              height={32}
            />
            <div className="message-bubble assistant">
              <div className="loading-dots">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat input */}
      <div className="chat-input-container">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            value={input}
            placeholder="Type a message... (Shift + Enter for new line)"
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button 
            className="send-button tooltip"
            onClick={sendChatMessage}
            disabled={!input.trim()}
          >
            <span className="tooltip-text">Send message</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
        <button className="form-button" onClick={requestForm}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
          </svg>
          Provide Contact Info
        </button>
      </div>
    </div>
  );
}