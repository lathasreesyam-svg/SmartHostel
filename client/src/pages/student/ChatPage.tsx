import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuthStore } from '../../stores/authStore';
import { getSocket, connectSocket, joinRoom, sendChatMessage } from '../../lib/socket';

const ROOM_ID = 'general-hostel-chat';

interface Message {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
}

export default function ChatPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    connectSocket();
    const socket = getSocket();

    const handleConnect = () => { setConnected(true); joinRoom(ROOM_ID); };
    const handleDisconnect = () => setConnected(false);
    const handleMessage = (msg: any) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat:new_message', handleMessage);

    if (socket.connected) { setConnected(true); joinRoom(ROOM_ID); }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chat:new_message', handleMessage);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !connected) return;
    sendChatMessage(ROOM_ID, text);
    // Optimistic update
    setMessages(prev => [...prev, {
      id: `local-${Date.now()}`,
      userId: user?.id || '',
      userName: user?.profile?.name || user?.email || 'You',
      message: text,
      createdAt: new Date().toISOString(),
    }]);
    setInput('');
  };

  const isMe = (msg: Message) => msg.userId === user?.id || msg.id.startsWith('local-');

  return (
    <DashboardLayout>
      <div className="page" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--navbar-height) - 48px)' }}>
        <div className="page-header" style={{ marginBottom: 16 }}>
          <h1 className="page-title">Chat</h1>
          <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#10b981' : '#ef4444', display: 'inline-block' }} />
            {connected ? 'Connected — Hostel General Chat' : 'Connecting...'}
          </p>
        </div>

        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--color-text-muted)' }}>
                <MessageCircle size={36} style={{ marginBottom: 10, opacity: 0.3 }} />
                <p style={{ fontSize: 14 }}>No messages yet. Say hello! 👋</p>
              </div>
            )}
            {messages.map(msg => {
              const me = isMe(msg);
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '72%' }}>
                    {!me && (
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3, marginLeft: 4 }}>
                        {msg.userName}
                      </div>
                    )}
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: me ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: me ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.06)',
                      color: me ? 'white' : 'var(--color-text-primary)',
                      fontSize: 14,
                      lineHeight: 1.5,
                      border: me ? 'none' : '1px solid var(--color-border)',
                    }}>
                      {msg.message}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 3, textAlign: me ? 'right' : 'left', marginRight: me ? 4 : 0, marginLeft: me ? 0 : 4 }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 10 }}>
            <input
              className="form-input"
              style={{ flex: 1 }}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={connected ? 'Type a message...' : 'Connecting...'}
              disabled={!connected}
            />
            <button
              className="btn btn-primary"
              style={{ padding: '0 18px', flexShrink: 0 }}
              onClick={handleSend}
              disabled={!input.trim() || !connected}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
