import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Send,
  X,
  MapPin,
  User,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Trash2,
  ExternalLink,
  PhoneCall,
  Search,
  ChevronRight,
  Calendar,
  Users,
  Building,
  Mail,
  CreditCard,
  ClipboardList
} from 'lucide-react';
import apiClient from '../../core/api/client';

interface HotelCard {
  id: string;
  name: string;
  province: string;
  district: string;
  starRating: number;
  priceFrom: number;
  originalPriceFrom?: number;
  averageRating: number;
  images: { url: string }[];
}

interface BookingSlots {
  city?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  nights?: number | null;
  adults?: number | null;
  children?: number | null;
  roomCount?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  starRating?: number | null;
  propertyType?: string | null;
  amenities?: string[];
  landmark?: string | null;
  sortBy?: string | null;
}

interface AiAnalysis {
  intent: 'SEARCH' | 'FAQ' | 'BOOKING_STATUS' | 'GENERAL';
  replyText?: string;
  slots?: BookingSlots;
  needsClarification?: boolean;
  missingSlots?: string[];
  clarificationPrompt?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  hotels?: HotelCard[];
  aiAnalysis?: AiAnalysis;
  pagination?: PaginationInfo;
  timestamp: string;
}

const CATEGORIZED_SUGGESTIONS = [
  {
    category: 'Tìm chỗ ở',
    icon: <Search className="w-3 h-3 text-blue-600 inline mr-1" strokeWidth={2} />,
    items: [
      'Tìm resort ở Đà Nẵng 3 ngày 2 đêm từ ngày mai',
      'Villa Đà Lạt có hồ bơi cho 4 người lớn 2 trẻ em',
      'Khách sạn Cà Mau giá rẻ nhất'
    ]
  },
  {
    category: 'Booking của tôi',
    icon: <ClipboardList className="w-3 h-3 text-emerald-600 inline mr-1" strokeWidth={2} />,
    items: [
      'Kiểm tra đơn đặt phòng cá nhân của tôi',
      'Lịch trình booking sắp tới',
      'Phòng tôi đã đặt'
    ]
  },
  {
    category: 'Thanh toán & Hỗ trợ',
    icon: <CreditCard className="w-3 h-3 text-purple-600 inline mr-1" strokeWidth={2} />,
    items: [
      'Hệ thống hỗ trợ thanh toán bằng những cách nào?',
      'Chính sách hủy phòng và hoàn tiền ra sao?',
      'Liên hệ tổng đài hỗ trợ CSKH'
    ]
  }
];

export const AIChatbox: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'live'>('ai');
  const [input, setInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(0);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Xin chào! Tôi là Trợ lý AI Tìm kiếm & Tư vấn Du lịch Cloud Booking. Bạn muốn tìm phòng nghỉ, kiểm tra đơn đặt hay giải đáp thắc mắc gì hôm nay?',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [sessionId, setSessionId] = useState<string>(() => 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState<string | null>(null);

  // Voice AI States
  const [isListening, setIsListening] = useState(false);
  const [_isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  // Render Markdown bold & inline code thành HTML đẹp mắt không bị lộ ký tự *
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');

    return lines.map((line, lineIdx) => {
      const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);

      return (
        <React.Fragment key={lineIdx}>
          {lineIdx > 0 && <br />}
          {parts.map((part, partIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={partIdx} className="font-bold text-blue-900 bg-blue-50/80 px-1 py-0.5 rounded">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <code key={partIdx} className="bg-slate-100 text-pink-600 font-mono text-[11px] px-1.5 py-0.5 rounded border border-slate-200">
                  {part.slice(1, -1)}
                </code>
              );
            }
            const cleanPart = part.replace(/\*/g, '');
            return <span key={partIdx}>{cleanPart}</span>;
          })}
        </React.Fragment>
      );
    });
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'vi-VN';

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          handleSendMessage(transcript);
        }
        setIsListening(false);
      };

      rec.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Trình duyệt của bạn không hỗ trợ tính năng nhận diện giọng nói (Web Speech API). Hãy thử xài Chrome hoặc Edge!');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Voice start error:', err);
      }
    }
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    if (!speechEnabled) return;

    const cleanText = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeechOutput = () => {
    const nextState = !speechEnabled;
    setSpeechEnabled(nextState);
    if (!nextState) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleClearHistory = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSessionId('session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
    setMessages([
      {
        id: Date.now().toString(),
        sender: 'ai',
        text: 'Lịch sử trò chuyện đã được làm mới. Tôi có thể giúp gì thêm cho bạn?',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleNavigateToSearch = (analysis?: AiAnalysis) => {
    setIsOpen(false);
    const slots = analysis?.slots;
    const params = new URLSearchParams();

    if (slots?.city) params.set('city', slots.city);
    if (slots?.checkInDate) params.set('checkInDate', slots.checkInDate);
    if (slots?.checkOutDate) params.set('checkOutDate', slots.checkOutDate);
    if (slots?.adults) params.set('adults', slots.adults.toString());
    if (slots?.children) params.set('children', slots.children.toString());
    if (slots?.propertyType) params.set('propertyType', slots.propertyType);
    if (slots?.priceMin) params.set('priceMin', slots.priceMin.toString());
    if (slots?.priceMax) params.set('priceMax', slots.priceMax.toString());
    if (slots?.starRating) params.set('starRating', slots.starRating.toString());
    if (slots?.amenities && slots.amenities.length > 0) {
      params.set('amenities', slots.amenities.join(','));
    }

    navigate(`/search-results?${params.toString()}`);
  };

  const handleLoadMore = async (msgId: string, currentMessage: Message) => {
    if (!currentMessage.pagination || !currentMessage.aiAnalysis) return;
    const nextPage = currentMessage.pagination.page + 1;

    setIsLoadingMore(msgId);

    try {
      const response = await apiClient.post('/ai/search', {
        message: currentMessage.text,
        page: nextPage,
        limit: currentMessage.pagination.limit,
        sessionId
      });

      const { success, data } = response.data;
      if (success) {
        const { hotels, pagination } = data;

        setMessages(prev =>
          prev.map(m => {
            if (m.id === msgId) {
              return {
                ...m,
                hotels: [...(m.hotels || []), ...(hotels || [])],
                pagination
              };
            }
            return m;
          })
        );
      }
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      setIsLoadingMore(null);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsgId = Date.now().toString();
    const newUserMessage: Message = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    const historyPayload = updatedMessages.slice(-6).map(m => ({
      sender: m.sender,
      text: m.text
    }));

    try {
      const response = await apiClient.post('/ai/search', {
        message: textToSend,
        history: historyPayload,
        page: 1,
        limit: 5,
        sessionId
      });
      const { success, data } = response.data;

      if (success) {
        const { aiAnalysis, replyText, hotels, pagination } = data;

        const aiNewMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: replyText,
          hotels: hotels && hotels.length > 0 ? hotels : undefined,
          aiAnalysis,
          pagination,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, aiNewMessage]);

        if (speechEnabled) {
          speakText(replyText);
        }
      }
    } catch (error) {
      console.error('AI Search API error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          sender: 'ai',
          text: 'Rất tiếc, đã có sự cố kết nối tới hệ thống AI. Vui lòng thử lại sau giây lát.',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    const aiQuery = searchParams.get('aiQuery');
    if (aiQuery) {
      setIsOpen(true);
      handleSendMessage(aiQuery);

      const newParams = new URLSearchParams(searchParams);
      newParams.delete('aiQuery');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage(input);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 80 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 80 }}
            transition={{ type: 'spring', damping: 25, stiffness: 240 }}
            className={`${isExpanded
              ? 'w-[92vw] max-w-[850px] h-[82vh] max-h-[750px]'
              : 'w-[380px] sm:w-[430px] h-[600px]'
              } rounded-2xl border border-slate-200/80 shadow-2xl bg-white flex flex-col overflow-hidden mb-4 transition-all duration-300 ease-in-out`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-600 px-4 py-3 text-white flex justify-between items-center shadow-lg relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md overflow-hidden border border-white/30 shadow-inner flex items-center justify-center p-0.5 shrink-0">
                  <img src="/ai-bot-avatar.png" alt="AI Robot Mascot" className="w-full h-full object-contain drop-shadow-md" />
                </div>
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-1.5 text-white tracking-wide">
                    Cloud AI Travel Agent
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" strokeWidth={1.75} />
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-blue-100">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Powered by Cloudbooking
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={toggleSpeechOutput}
                  title={speechEnabled ? 'Tắt đọc giọng nói' : 'Bật đọc giọng nói'}
                  className={`p-1.5 rounded-lg transition-colors ${speechEnabled ? 'bg-amber-400/30 text-amber-200' : 'hover:bg-white/10 text-white/80'
                    }`}
                >
                  {speechEnabled ? <Volume2 className="w-4 h-4" strokeWidth={1.75} /> : <VolumeX className="w-4 h-4" strokeWidth={1.75} />}
                </button>

                <button
                  onClick={handleClearHistory}
                  title="Xóa lịch sử chat"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 transition-colors"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                </button>

                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Thu nhỏ' : 'Phóng to'}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 transition-colors hidden sm:block"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" strokeWidth={1.75} /> : <Maximize2 className="w-4 h-4" strokeWidth={1.75} />}
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 transition-colors ml-1"
                >
                  <X className="w-5 h-5" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-slate-100/80 border-b border-slate-200/60 px-3 py-1.5 flex gap-2">
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'ai'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} /> Trợ lý AI
              </button>
              <button
                onClick={() => setActiveTab('live')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'live'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-600" /> Hỗ trợ Trực tiếp (24/7)
              </button>
            </div>

            {/* Tab 2: Live Support View */}
            {activeTab === 'live' ? (
              <div className="flex-1 p-6 bg-slate-50 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                  <PhoneCall className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 text-base">Tổng Đài Hỗ Trợ Trực Tiếp</h4>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Đội ngũ Chăm sóc khách hàng Cloud Booking luôn lắng nghe và giải đáp mọi vấn đề 24/7.
                  </p>
                </div>

                <div className="w-full space-y-2 pt-2">
                  <a
                    href="tel:19006868"
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <PhoneCall className="w-4 h-4" /> Gọi Hotline: 1900 6868
                  </a>
                  <a
                    href="mailto:support@cloudbooking.com"
                    className="w-full py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Mail className="w-4 h-4 text-blue-600" /> Email: support@cloudbooking.com
                  </a>
                </div>
              </div>
            ) : (
              /* Tab 1: AI Assistant View */
              <>
                {/* Chat Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'ai' && (
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm p-0.5">
                          <img src="/ai-bot-avatar.png" alt="AI Robot" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div className="max-w-[85%] space-y-2">
                        <div
                          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.sender === 'user'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-md shadow-blue-500/10'
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-sm'
                            }`}
                        >
                          <div className="text-sm">
                            {renderFormattedText(msg.text)}
                          </div>
                          <span
                            className={`block text-[9px] mt-1.5 text-right font-medium ${msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                              }`}
                          >
                            {msg.timestamp}
                          </span>
                        </div>

                        {/* Thẻ tóm tắt Slot Filters (City, Check-in/out, Guests, PropertyType) */}
                        {msg.aiAnalysis?.slots && (msg.aiAnalysis.slots.city || msg.aiAnalysis.slots.checkInDate || msg.aiAnalysis.slots.adults || msg.aiAnalysis.slots.propertyType) && (
                          <div className="bg-blue-50/90 border border-blue-200/80 rounded-xl p-2.5 space-y-1.5 text-xs shadow-2xs">
                            <div className="flex flex-wrap gap-1.5">
                              {msg.aiAnalysis.slots.city && (
                                <span className="bg-white text-blue-800 font-medium px-2 py-0.5 rounded-lg border border-blue-200 flex items-center gap-1 text-[10px]">
                                  <MapPin className="w-3 h-3 text-blue-600" /> {msg.aiAnalysis.slots.city}
                                </span>
                              )}
                              {msg.aiAnalysis.slots.checkInDate && (
                                <span className="bg-white text-emerald-800 font-medium px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1 text-[10px]">
                                  <Calendar className="w-3 h-3 text-emerald-600" /> {msg.aiAnalysis.slots.checkInDate} ({msg.aiAnalysis.slots.nights || 1} đêm)
                                </span>
                              )}
                              {msg.aiAnalysis.slots.adults && (
                                <span className="bg-white text-purple-800 font-medium px-2 py-0.5 rounded-lg border border-purple-200 flex items-center gap-1 text-[10px]">
                                  <Users className="w-3 h-3 text-purple-600" /> {msg.aiAnalysis.slots.adults} người lớn{msg.aiAnalysis.slots.children ? `, ${msg.aiAnalysis.slots.children} trẻ em` : ''}
                                </span>
                              )}
                              {msg.aiAnalysis.slots.propertyType && (
                                <span className="bg-white text-amber-800 font-medium px-2 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1 text-[10px]">
                                  <Building className="w-3 h-3 text-amber-600" /> {msg.aiAnalysis.slots.propertyType}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* CTA Button */}
                        {msg.aiAnalysis?.slots && (msg.aiAnalysis.slots.city || msg.aiAnalysis.slots.priceMax || msg.aiAnalysis.slots.amenities?.length) && (
                          <div className="pt-1">
                            <button
                              onClick={() => handleNavigateToSearch(msg.aiAnalysis)}
                              className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
                            >
                              <Search className="w-3.5 h-3.5" /> Xem tất cả kết quả trên trang Tìm kiếm
                              <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                            </button>
                          </div>
                        )}

                        {/* Hotel Cards Carousel */}
                        {msg.hotels && msg.hotels.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-slate-300">
                              {msg.hotels.map((hotel) => (
                                <div
                                  key={hotel.id}
                                  className="w-[210px] bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-sm shrink-0 flex flex-col justify-between hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer"
                                  onClick={() => {
                                    setIsOpen(false);
                                    navigate(`/hotel/${hotel.id}`);
                                  }}
                                >
                                  <div className="relative">
                                    <img
                                      src={
                                        hotel.images[0]?.url ||
                                        'https://images.unsplash.com/photo-1566073771259-6a8506099945'
                                      }
                                      alt={hotel.name}
                                      className="w-full h-26 object-cover"
                                    />
                                    <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-amber-300 font-bold text-[10px] px-2 py-0.5 rounded-full border border-white/20 flex items-center gap-0.5">
                                      ★ {hotel.starRating} sao
                                    </span>
                                  </div>

                                  <div className="p-2.5 space-y-2 flex-1 flex flex-col justify-between">
                                    <div>
                                      <h4 className="font-bold text-xs text-slate-800 line-clamp-1">
                                        {hotel.name}
                                      </h4>
                                      <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="truncate">
                                          {hotel.district}, {hotel.province}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                                      <div>
                                        <span className="text-[9px] text-slate-400 block">Giá từ</span>
                                        <p className="font-bold text-xs text-red-600">
                                          {hotel.priceFrom.toLocaleString('vi-VN')} đ
                                        </p>
                                      </div>
                                      <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-lg">
                                        Xem ngay
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Load More Button */}
                            {msg.pagination?.hasMore && (
                              <div className="text-center pt-1">
                                <button
                                  onClick={() => handleLoadMore(msg.id, msg)}
                                  disabled={isLoadingMore === msg.id}
                                  className="py-1.5 px-4 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-xl shadow-2xs transition-all inline-flex items-center gap-1.5"
                                >
                                  {isLoadingMore === msg.id ? (
                                    <>Đang tải thêm kết quả...</>
                                  ) : (
                                    <>
                                      Tải thêm chỗ ở ({msg.pagination.total - msg.hotels.length} chỗ nữa)
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {msg.sender === 'user' && (
                        <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-sm">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex gap-2.5 justify-start">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                        <img src="/ai-bot-avatar.png" alt="AI Robot" className="w-full h-full object-contain" />
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 shadow-sm items-center">
                        <span className="text-xs text-slate-500 font-medium mr-2">Trợ lí đang tìm kiếm</span>
                        <span
                          className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        ></span>
                        <span
                          className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        ></span>
                        <span
                          className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        ></span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Categorized Suggestions */}
                {messages.length <= 2 && !isTyping && (
                  <div className="px-3 py-2 bg-slate-100/90 border-t border-slate-200/70 space-y-1.5">
                    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                      {CATEGORIZED_SUGGESTIONS.map((cat, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedCategory(idx)}
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-1 ${selectedCategory === idx
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200/60'
                            }`}
                        >
                          {cat.icon}
                          {cat.category}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIZED_SUGGESTIONS[selectedCategory].items.map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(sug)}
                          className="text-[11px] text-blue-700 bg-white hover:bg-blue-50 border border-blue-200/70 rounded-xl px-2.5 py-1 text-left transition-colors font-medium shadow-2xs"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Form */}
                <div className="p-3 border-t border-slate-200 bg-white flex gap-2 items-center">
                  <button
                    onClick={toggleVoiceInput}
                    title={isListening ? 'Đang lắng nghe... Bấm để dừng' : 'Nói bằng giọng nói (Tiếng Việt)'}
                    className={`p-2.5 rounded-xl transition-all ${isListening
                      ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={
                      isListening
                        ? 'Đang lắng nghe bạn nói...'
                        : 'Ví dụ: Resort Đà Nẵng 3 ngày 2 đêm từ ngày mai cho 4 người'
                    }
                    className="flex-1 bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />

                  <button
                    onClick={() => handleSendMessage(input)}
                    disabled={!input.trim() || isTyping}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.12, y: -5 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-28 h-34 flex items-center justify-center relative cursor-pointer group focus:outline-none bg-transparent border-0 p-0"
        title={isOpen ? 'Đóng Chatbox' : 'Mở Trợ lý AI Du Lịch Cloud Booking'}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src="/ai-bot-avatar.png"
            alt="AI Robot Mascot"
            className="w-full h-full object-contain filter drop-shadow-2xl group-hover:drop-shadow-[0_18px_30px_rgba(37,99,235,0.5)] transition-all duration-300"
          />
          {isOpen ? (
            <span className="absolute top-1 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-xl font-bold text-xs">
              <X className="w-4.5 h-4.5" strokeWidth={1.75} />
            </span>
          ) : (
            <span className="absolute top-0 right-2 w-7 h-7 bg-gradient-to-r from-amber-400 to-amber-500 text-blue-950 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
              <Sparkles className="w-4 h-4 text-blue-950" strokeWidth={1.75} />
            </span>
          )}
        </div>
      </motion.button>
    </div>
  );
};

export default AIChatbox;
