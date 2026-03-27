import React, { useState, useEffect, useRef } from 'react';
import { AdminUser } from '../types';
import api from '../services/api';
import { User, Eye, ShieldCheck, Wifi, X, Smile, MessageCircle, Send } from 'lucide-react';

interface OnlineUsersProps {
  currentUser: AdminUser;
}

const EMOJIS = ['👋', '❤️', '😂', '👍', '🎉', '☕', '🔥', '✨'];

const OnlineUsers: React.FC<OnlineUsersProps> = ({ currentUser }) => {
  const [onlineUsers, setOnlineUsers] = useState<Partial<AdminUser>[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeUserForEmoji, setActiveUserForEmoji] = useState<string | null>(null);
  const [activeUserForChat, setActiveUserForChat] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [receivedEmojis, setReceivedEmojis] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  
  const intervalRef = useRef<number | null>(null);
  const emojiIntervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Preload cute notification sound
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.5;

    // Click outside to close
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveUserForEmoji(null);
        setActiveUserForChat(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchOnlineUsers = async () => {
    try {
      const users = await api.getOnlineUsers();
      setOnlineUsers(users);
    } catch (error) {
      // Ignore errors for polling
    }
  };

  const sendHeartbeat = async () => {
    try {
      await api.heartbeat(currentUser.id);
    } catch (error) {
      // Ignore
    }
  };

  const fetchEmojis = async () => {
    try {
      const newEmojis = await api.getEmojis(currentUser.id);
      if (newEmojis && newEmojis.length > 0) {
        setReceivedEmojis(prev => [...prev, ...newEmojis]);
        // Play sound
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(e => console.error("Audio play failed:", e));
        }
      }
    } catch (error) {
      // Ignore
    }
  };

  useEffect(() => {
    // Initial fetch
    sendHeartbeat();
    fetchOnlineUsers();
    fetchEmojis();

    // Poll online users every 30 seconds
    intervalRef.current = window.setInterval(() => {
        sendHeartbeat();
        fetchOnlineUsers();
    }, 30000);
    
    // Poll emojis every 5 seconds
    emojiIntervalRef.current = window.setInterval(fetchEmojis, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (emojiIntervalRef.current) clearInterval(emojiIntervalRef.current);
    };
  }, []);

  const handleSendEmoji = async (receiverId: string, emoji: string) => {
    if (isSending) return;
    setIsSending(true);
    try {
      await api.sendEmoji(currentUser.id, currentUser.name, receiverId, emoji);
      setActiveUserForEmoji(null);
    } catch (error) {
      console.error("Failed to send emoji", error);
    } finally {
      setIsSending(false);
    }
  };

  const removeReceivedEmoji = (id: string) => {
    setReceivedEmojis(prev => prev.filter(e => e.id !== id));
  };

  return (
    <>
      {/* Received Emojis Popups */}
      <div className="fixed top-20 right-4 z-[10000] flex flex-col gap-3 pointer-events-none">
        {receivedEmojis.map((emojiObj) => {
          const isMessage = emojiObj.emoji.length > 2;
          return (
            <div 
              key={emojiObj.id} 
              className="pointer-events-auto bg-white/90 backdrop-blur-md border border-gray-200 shadow-2xl rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-right-8 fade-in duration-300 max-w-sm"
            >
              <div className={`flex-shrink-0 ${isMessage ? 'text-blue-500 bg-blue-50 p-2 rounded-full' : 'text-4xl animate-bounce'}`}>
                {isMessage ? <MessageCircle className="w-6 h-6" /> : emojiObj.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">{emojiObj.senderName}</p>
                {isMessage ? (
                  <p className="text-sm text-gray-600 break-words mt-1">{emojiObj.emoji}</p>
                ) : (
                  <p className="text-xs text-gray-500">ส่งอีโมจิให้คุณ!</p>
                )}
              </div>
              <button 
                onClick={() => removeReceivedEmoji(emojiObj.id)}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Online Users Widget */}
      <div className="fixed bottom-4 left-4 z-[9999] font-sans no-print" ref={widgetRef}>
        <div className="relative group">
          {/* Collapsed Pill */}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-xl rounded-full px-4 py-2 flex items-center gap-3 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs font-bold text-gray-700">
               {onlineUsers.length} คนออนไลน์
            </span>
          </button>

          {/* Expanded List (Tooltip style) */}
          {isOpen && (
            <div className="absolute bottom-full left-0 mb-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 animate-in slide-in-from-bottom-2 fade-in duration-200 origin-bottom-left">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Wifi className="w-3 h-3" /> ผู้ใช้งานขณะนี้
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {onlineUsers.map((user) => {
                   const isMe = user.id === currentUser.id;
                   const isSuper = user.role === 'SUPER_ADMIN';
                   const isViewer = user.role === 'VIEWER';
                   const showEmojiPicker = activeUserForEmoji === user.id;
                   const showChatInput = activeUserForChat === user.id;
                   
                   return (
                     <div key={user.id} className="flex flex-col gap-1">
                       <div className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${isMe ? 'bg-blue-50' : 'hover:bg-gray-50 group/user'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${
                              isSuper ? 'bg-black' : isViewer ? 'bg-gray-400' : 'bg-gradient-to-tr from-emerald-500 to-teal-600'
                          }`}>
                              {isViewer ? <Eye className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">
                                  {user.name} {isMe && <span className="text-blue-600">(คุณ)</span>}
                              </p>
                              <p className="text-[10px] text-gray-400 font-medium truncate">{user.role}</p>
                          </div>
                          
                          {!isMe && (
                            <div className="flex items-center gap-1 opacity-0 group-hover/user:opacity-100 transition-all">
                              <button 
                                onClick={() => {
                                  setActiveUserForEmoji(showEmojiPicker ? null : user.id as string);
                                  setActiveUserForChat(null);
                                }}
                                className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 transition-all"
                                title="ส่งอีโมจิ"
                              >
                                <Smile className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setActiveUserForChat(showChatInput ? null : user.id as string);
                                  setActiveUserForEmoji(null);
                                  setChatMessage('');
                                }}
                                className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 transition-all"
                                title="ส่งข้อความ"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                       </div>

                       {/* Emoji Picker for this user */}
                       {showEmojiPicker && (
                         <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-xl animate-in slide-in-from-top-1 fade-in duration-150">
                           {EMOJIS.map(emoji => (
                             <button
                               key={emoji}
                               disabled={isSending}
                               onClick={() => handleSendEmoji(user.id as string, emoji)}
                               className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white hover:shadow-sm rounded-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50 cursor-pointer"
                             >
                               {emoji}
                             </button>
                           ))}
                         </div>
                       )}

                       {/* Chat Input for this user */}
                       {showChatInput && (
                         <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl animate-in slide-in-from-top-1 fade-in duration-150">
                           <input
                             type="text"
                             value={chatMessage}
                             onChange={(e) => setChatMessage(e.target.value.slice(0, 50))} // Max 50 chars
                             placeholder="พิมพ์ข้อความ..."
                             className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                             onKeyDown={(e) => {
                               if (e.key === 'Enter' && chatMessage.trim()) {
                                 handleSendEmoji(user.id as string, chatMessage.trim());
                                 setChatMessage('');
                                 setActiveUserForChat(null);
                               }
                             }}
                           />
                           <button
                             disabled={isSending || !chatMessage.trim()}
                             onClick={() => {
                               handleSendEmoji(user.id as string, chatMessage.trim());
                               setChatMessage('');
                               setActiveUserForChat(null);
                             }}
                             className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                           >
                             <Send className="w-4 h-4" />
                           </button>
                         </div>
                       )}
                     </div>
                   );
                })}
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-100 text-[10px] text-gray-400 text-center">
                  อัปเดตอัตโนมัติทุก 30 วินาที
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OnlineUsers;
