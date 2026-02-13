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

  // ✅ FIXED: Timeout ref must start with null
  const typingTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
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
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    if (
      e.target instanceof HTMLInputElement &&
      e.target.type === 'checkbox'
    ) {
      const target = e.target as HTMLInputElement;
      setFormData((prev) => ({
        ...prev,
        [name]: target.checked,
      }));
      return;
    }

    if (name === 'fullName') {
      const lettersOnly = value.replace(/[^a-zA-Z\s]/g, '');
      setFormData((prev) => ({ ...prev, [name]: lettersOnly }));
      return;
    }

    if (name === 'phone') {
      const numbersOnly = value.replace(/[^0-9]/g, '');
      const formatted = numbersOnly.replace(
        /(\d{3})(\d{3})(\d{4})/,
        '($1) $2-$3'
      );
      setFormData((prev) => ({ ...prev, [name]: formatted }));
      return;
    }

    if (name === 'email') {
      setFormData((prev) => ({ ...prev, [name]: value }));

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        setEmailError('Please enter a valid email address');
      } else {
        setEmailError('');
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submitForm = async () => {
    if (!formData.fullName.trim() || !formData.email.trim()) return;

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

    setMessages((prev) => {
      const filtered = prev.filter((msg) => !msg.id.startsWith('loading-'));

      const thankYouMessage: ChatMessageWithMeta = {
        id: Date.now().toString(),
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: `✨ Thank you ${formData.fullName}! Your inquiry has been received. One of our representatives will contact you within 24 hours.`,
          },
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
      parts: [
        {
          type: 'text',
          text: "I'd be happy to help you! Please fill out this quick form and I'll assist you right away. 👇",
        },
      ],
      metadata: { createdAt: new Date().toISOString(), formRequest: true },
    };

    setMessages((prev) => [...prev, formRequestMessage]);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
              {status === 'streaming'
                ? 'Typing...'
                : isTyping
                ? 'User typing...'
                : 'Online'}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="chat-input-container">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={input}
          placeholder="Type a message..."
          onChange={(e) => setInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
        />

        <button onClick={sendChatMessage} disabled={!input.trim()}>
          Send
        </button>

        <button onClick={requestForm}>Provide Contact Info</button>
      </div>
    </div>
  );
}
