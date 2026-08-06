import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import dotenv from 'dotenv';
import prisma from './config/database';
import socketService from './infrastructure/services/socket.service';

// Load biến môi trường
dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Khởi tạo Socket.io Server
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Cho phép tất cả origin kết nối ở local / dev
      callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['polling', 'websocket'],
});

socketService.init(io);

io.on('connection', (socket) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Socket.io]: Thiết bị kết nối thành công: ${socket.id}`);
  }

  // Người dùng tham gia phòng cá nhân của họ
  socket.on('joinUser', (userId: string) => {
    socket.join(`user-${userId}`);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Socket.io]: Socket ${socket.id} tham gia phòng user-${userId}`);
    }
  });

  // Khách hàng hoặc Owner tham gia phòng của khách sạn để nhận update phòng/lịch giá
  socket.on('joinHotel', (hotelId: string) => {
    socket.join(`hotel-${hotelId}`);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Socket.io]: Socket ${socket.id} tham gia phòng hotel-${hotelId}`);
    }
  });

  // Người dùng tham gia phòng chat
  socket.on('joinConversation', (conversationId: string) => {
    socket.join(conversationId);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Socket.io]: Socket ${socket.id} tham gia phòng chat: ${conversationId}`);
    }
  });

  // Nhận và phát tán tin nhắn, đồng thời lưu vào DB
  socket.on('sendMessage', async (data: { conversationId: string; senderId: string; content: string }) => {
    try {
      const message = await prisma.message.create({
        data: {
          conversationId: data.conversationId,
          senderId: data.senderId,
          content: data.content,
        },
        include: {
          sender: { select: { id: true, fullName: true, avatarUrl: true } }
        }
      });

      // Cập nhật Conversation & lấy ID người nhận
      const conv = await prisma.conversation.update({
        where: { id: data.conversationId },
        data: { updatedAt: new Date() }
      });

      // Broadcast tới tất cả mọi người trong phòng hội thoại
      io.to(data.conversationId).emit('receiveMessage', message);
      io.to(data.conversationId).emit('newMessage', message);

      // Đồng thời phát tin nhắn tới phòng cá nhân người nhận để họ nhận được ngay tức thì
      if (conv) {
        const recipientId = data.senderId === conv.customerId ? conv.hotelOwnerId : conv.customerId;
        io.to(`user-${recipientId}`).emit('receiveMessage', message);
        io.to(`user-${recipientId}`).emit('newMessage', message);
        io.to(`user-${recipientId}`).emit('conversationUpdated', conv);
      }
    } catch (err) {
      console.error('[Socket.io Error] Gửi tin nhắn thất bại:', err);
    }
  });

  socket.on('disconnect', () => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Socket.io]: Thiết bị ngắt kết nối: ${socket.id}`);
    }
  });
});

import bookingUseCase from './use-cases/booking/booking.use-case';

// Tự động quét và hủy các đơn phòng PENDING hết hạn (quá 10 phút) mỗi 30 giây
setInterval(() => {
  bookingUseCase.cleanupExpiredBookings().catch(err => {
    console.error('[Cron] Auto cleanup expired bookings failed:', err);
  });
}, 30 * 1000);

server.listen(PORT, () => {
  console.log(`[System Server]: Đang chạy cổng ${PORT} dưới chế độ ${process.env.NODE_ENV || 'development'}`);
});
