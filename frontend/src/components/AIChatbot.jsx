import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Star, Bed, Users } from 'lucide-react';

export default function AIChatbot({ onSelectRoom, currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Xin chào! Tôi là **Trợ lý Tìm kiếm AI HubHub**. \n\nHãy thử nhập yêu cầu đặt phòng của bạn bằng câu lệnh tự nhiên.\n*Ví dụ: "Tìm phòng sát biển ở Vũng Tàu giá dưới 1.5 triệu cho cuối tuần này" hoặc "Tìm phòng gia đình ở Đà Lạt có sân vườn".*',
      rooms: []
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: query,
      rooms: []
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuery = query;
    setQuery('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser ? String(currentUser.id) : ''
        },
        body: JSON.stringify({ query: currentQuery })
      });

      if (!response.ok) {
        throw new Error('Không thể kết nối đến máy chủ AI.');
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.explanation,
        rooms: data.rooms || []
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'Rất tiếc, máy chủ AI đang bận hoặc có lỗi xảy ra. Vui lòng kiểm tra lại kết nối.',
        rooms: []
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to format Markdown-like bold text in chat messages
  const formatText = (text) => {
    if (!text) return '';
    return text.split('\n').map((line, idx) => {
      // Bold text formatting
      let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Emphasize text formatting
      formattedLine = formattedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
      return <div key={idx} dangerouslySetInnerHTML={{ __html: formattedLine }} style={{ marginBottom: '6px' }} />;
    });
  };

  return (
    <div className={`ai-chat-wrapper ${isOpen ? 'expanded' : ''}`}>
      {/* Floating Chat Bubble */}
      {!isOpen && (
        <button className="chat-bubble-trigger animate-bounce" onClick={() => setIsOpen(true)}>
          <Sparkles className="pulse-icon" size={24} />
          <span className="chat-tooltip">Hỏi Trợ lý AI!</span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="chat-window-panel glass-card-heavy">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-title">
              <Sparkles className="text-blue" size={18} />
              <span>Trợ lý Thông minh AI</span>
              <span className="online-dot"></span>
            </div>
            <button className="chat-close-btn" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Messages Stream */}
          <div className="chat-messages-container">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message-bubble ${msg.sender}`}>
                <div className="message-content">
                  {formatText(msg.text)}
                </div>

                {/* Rooms Recommendations inside Chat */}
                {msg.rooms && msg.rooms.length > 0 && (
                  <div className="chat-rooms-horizontal-carousel">
                    {msg.rooms.map((room) => (
                      <div key={room.id} className="chat-room-card glass-card">
                        <img 
                          src={room.image_url || 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=300&q=80'} 
                          alt={room.name} 
                          className="chat-room-img"
                        />
                        <div className="chat-room-body">
                          <span className="hotel-tag">{room.hotel_name}</span>
                          <h4 className="room-title">{room.name}</h4>
                          
                          <div className="room-features">
                            <span className="feature"><Bed size={12} /> {room.type}</span>
                            <span className="feature"><Users size={12} /> x{room.capacity}</span>
                            <span className="feature"><Star size={12} className="text-yellow" /> {room.hotel_rating}</span>
                          </div>

                          <div className="room-price-row">
                            <div>
                              <span className="price-num">{room.price_per_night.toLocaleString('vi-VN')}đ</span>
                              <span className="price-unit">/đêm</span>
                            </div>
                            <button 
                              className="chat-book-now-btn"
                              onClick={() => {
                                setIsOpen(false);
                                onSelectRoom(room);
                              }}
                            >
                              Đặt ngay
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="chat-message-bubble bot typing">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form className="chat-input-footer" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Nhập yêu cầu tìm phòng của bạn..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" className="chat-send-btn" disabled={!query.trim() || isLoading}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
