import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { notificationService } from '../services/notification.service';

export function initSocketHandlers(io: Server): void {
  // Auth middleware for socket connections
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication token required'));
      }
      const payload = verifyAccessToken(token);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    logger.info(`Socket connected: ${socket.id} | User: ${user?.userId}`);

    // Join user to their personal room
    socket.join(`user:${user.userId}`);
    socket.join(`role:${user.role}`);

    // ── Notification Events ──
    socket.on('notification:read', async (data: { notificationId: string }) => {
      try {
        await notificationService.markAsRead(data.notificationId, user.userId);
        const count = await notificationService.getUnreadCount(user.userId);
        socket.emit('notification:unread_count', { count });
      } catch (error) {
        socket.emit('error', { message: 'Failed to mark notification as read' });
      }
    });

    socket.on('notification:read_all', async () => {
      try {
        await notificationService.markAllAsRead(user.userId);
        socket.emit('notification:unread_count', { count: 0 });
      } catch (error) {
        socket.emit('error', { message: 'Failed to mark all notifications as read' });
      }
    });

    // ── Chat Events ──
    socket.on('chat:join_room', (data: { roomId: string }) => {
      socket.join(`room:${data.roomId}`);
      logger.debug(`User ${user.userId} joined chat room ${data.roomId}`);
    });

    socket.on('chat:leave_room', (data: { roomId: string }) => {
      socket.leave(`room:${data.roomId}`);
    });

    socket.on('chat:message', async (data: { roomId: string; message: string }) => {
      try {
        const { prisma } = await import('../config/database');

        // Auto-create room if it doesn't exist
        let room = await prisma.chatRoom.findUnique({ where: { id: data.roomId } }).catch(() => null);
        if (!room) {
          room = await prisma.chatRoom.create({
            data: { id: data.roomId, name: 'Hostel Chat', isGroup: true },
          });
        }

        const msg = await prisma.chatMessage.create({
          data: {
            roomId: room.id,
            senderId: user.userId,
            message: data.message,
          },
          include: {
            sender: {
              select: {
                id: true,
                role: true,
                studentProfile: { select: { name: true } },
              },
            },
          },
        });

        // Broadcast in shape the client expects
        io.to(`room:${data.roomId}`).emit('chat:new_message', {
          id: msg.id,
          userId: msg.senderId,
          userName: msg.sender.studentProfile?.name || msg.sender.role || 'User',
          message: msg.message,
          createdAt: msg.createdAt.toISOString(),
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('chat:typing', (data: { roomId: string }) => {
      socket.to(`room:${data.roomId}`).emit('chat:user_typing', {
        userId: user.userId,
        roomId: data.roomId,
      });
    });

    // ── Complaint Events ──
    socket.on('complaint:subscribe', (data: { complaintId: string }) => {
      socket.join(`complaint:${data.complaintId}`);
    });

    // ── Attendance Events ──
    socket.on('attendance:qr_scanned', (data: { studentId: string; mealType: string }) => {
      // Notify the student that their attendance was marked
      io.to(`user:${data.studentId}`).emit('attendance:marked', {
        mealType: data.mealType,
        scannedAt: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
}

// Helper to send real-time notification to a user
export function emitNotification(io: Server, userId: string, notification: Record<string, unknown>) {
  io.to(`user:${userId}`).emit('notification:new', notification);
}

// Helper to broadcast to a role
export function emitToRole(io: Server, role: string, event: string, data: unknown) {
  io.to(`role:${role}`).emit(event, data);
}
