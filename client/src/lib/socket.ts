import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = useAuthStore.getState().accessToken;
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    socket.on('notification:new', (notification) => {
      useNotificationStore.getState().addNotification(notification);
    });

    socket.on('notification:unread_count', ({ count }: { count: number }) => {
      useNotificationStore.getState().setUnreadCount(count);
    });

    socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error.message);
    });
  }

  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinRoom(roomId: string): void {
  getSocket().emit('chat:join_room', { roomId });
}

export function leaveRoom(roomId: string): void {
  getSocket().emit('chat:leave_room', { roomId });
}

export function sendChatMessage(roomId: string, message: string): void {
  getSocket().emit('chat:message', { roomId, message });
}

export function emitTyping(roomId: string): void {
  getSocket().emit('chat:typing', { roomId });
}
