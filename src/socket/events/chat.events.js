const conversationRepo = require("../../repositories/conversation.repository");
const messageRepo = require("../../repositories/message.repository");
const { createAndEmit } = require('../../services/notification.service');

const registerChatEvents = (io, socket) => {
  const { userId } = socket.data.user;

  // join_room
  // Client joins a conversation room to send/receive messages
  // Frontend calls: socket.emit('join_room', conversationId)
  socket.on("join_room", async (conversationId) => {
    try {
      // Verify user is a participant before letting them join
      const conversation = await conversationRepo.findByIdAndParticipant(
        conversationId,
        userId,
      );

      if (!conversation) {
        return socket.emit("error", {
          message: "Conversation not found or access denied",
        });
      }

      socket.join(conversationId.toString());
      console.log(`[Socket] ${userId} joined conversation ${conversationId}`);

      // Mark messages as read when user joins the room
      const readCount = await messageRepo.markAsRead(conversationId, userId);
      if (readCount > 0) {
        // Notify the other participant their messages were read
        socket.to(conversationId.toString()).emit("messages_read", {
          conversationId,
          readBy: userId,
          readAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("[Socket] join_room error:", error.message);
      socket.emit("error", { message: "Failed to join conversation" });
    }
  });

  // send_message
  // Client sends a message in a conversation
  // Frontend calls: socket.emit('send_message', { conversationId, text })
  socket.on(
    "send_message",
    async ({ conversationId, text, attachments = [] }) => {
      try {
        if (!text?.trim()) {
          return socket.emit("error", { message: "Message text is required" });
        }

        if (text.length > 2000) {
          return socket.emit("error", {
            message: "Message is too long (max 2000 characters)",
          });
        }

        // Verify user is a participant
        const conversation = await conversationRepo.findByIdAndParticipant(
          conversationId,
          userId,
        );

        if (!conversation) {
          return socket.emit("error", {
            message: "Conversation not found or access denied",
          });
        }

        // Save message to MongoDB
        const message = await messageRepo.create({
          conversationId,
          senderId: userId,
          text: text.trim(),
          attachments,
        });

        // Update conversation's last message preview
        await conversationRepo.updateLastMessage(conversationId, {
          text,
          senderId: userId,
        });

        // Broadcast to everyone in the conversation room (including sender)
        // This ensures sender sees confirmation the message was saved
        io.to(conversationId.toString()).emit("new_message", {
          message,
          conversationId,
        });

        // Notify the OTHER participant (not the sender)
        const otherParticipantId = conversation.participants
          .find((p) => p.toString() !== userId.toString());

        if (otherParticipantId) {
          createAndEmit({
            userId:       otherParticipantId,
            type:         'new_message',
            message:      `New message from ${socket.data.user.name}`,
            resourceId:   conversationId,
            resourceType: 'Conversation',
            io,
          }).catch(() => {});
        }

      } catch (error) {
        console.error("[Socket] send_message error:", error.message);
        socket.emit("error", { message: "Failed to send message" });
      }
    },
  );

  //  mark_read
  // Client manually marks messages as read (e.g. on tab focus)
  // Frontend calls: socket.emit('mark_read', { conversationId })
  socket.on("mark_read", async ({ conversationId }) => {
    try {
      const readCount = await messageRepo.markAsRead(conversationId, userId);

      if (readCount > 0) {
        socket.to(conversationId.toString()).emit("messages_read", {
          conversationId,
          readBy: userId,
          readAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("[Socket] mark_read error:", error.message);
    }
  });

  // leave_room
  socket.on("leave_room", (conversationId) => {
    socket.leave(conversationId.toString());
    console.log(`[Socket] ${userId} left conversation ${conversationId}`);
  });
};

module.exports = { registerChatEvents };
