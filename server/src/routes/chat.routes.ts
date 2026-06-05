import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// GET /chat/:roomId/messages — fetch recent messages for a room
router.get('/:roomId/messages', async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);

    // Ensure the chat room exists (create if not)
    let room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) {
      // Also try by name for the general room
      room = await prisma.chatRoom.findFirst({ where: { name: roomId } });
    }
    if (!room) {
      // Auto-create general hostel chat room
      room = await prisma.chatRoom.create({
        data: { id: roomId, name: 'Hostel General Chat', isGroup: true },
      });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'asc' },
      take: limit,
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

    const shaped = messages.map((m) => ({
      id: m.id,
      userId: m.senderId,
      userName:
        m.sender.studentProfile?.name ||
        m.sender.role ||
        'User',
      message: m.message,
      createdAt: m.createdAt.toISOString(),
    }));

    res.json({ success: true, data: shaped });
  } catch (err) {
    next(err);
  }
});

export default router;
