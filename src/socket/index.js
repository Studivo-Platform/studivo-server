const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { redis } = require("../config/redis");
const { socketAuth } = require("./middleware/socket.auth");
const { registerChatEvents } = require("./events/chat.events");
const { registerRequestEvents } = require("./events/request.events");

let io; // Singleton — exported and used across the app

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
    // How long to wait before considering a connection dead
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Redis Adapter
  // Requires two separate Redis connections:
  // pubClient: publishes events
  // subClient: subscribes to events from other server instances
  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();

  io.adapter(createAdapter(pubClient, subClient));

  // Auth Middleware
  // Runs before every connection is established
  io.use(socketAuth);

  // Connection Handler
  io.on("connection", (socket) => {
    const { userId, role } = socket.data.user;
    console.log(
      `[Socket] Connected: ${userId} (${role}) — socket: ${socket.id}`,
    );

    // Join a personal room using userId
    // This allows us to send notifications directly to a specific user
    socket.join(`user:${userId}`);

    // If seller: join category rooms based on their profile
    // In Sprint 5 we'll refine this — for now join all categories
    if (role === "seller") {
      const categories = [
        "electronics",
        "housing",
        "books",
        "services",
        "transport",
        "food",
        "other",
      ];
      categories.forEach((cat) => socket.join(cat));
    }

    // Register event handlers
    registerChatEvents(io, socket);
    registerRequestEvents(io, socket);

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnected: ${userId} — reason: ${reason}`);
    });
  });

  console.log("[Socket] Socket.IO server initialized");
  return io;
};

// Getter — use this in controllers to emit events
const getIO = () => {
  if (!io) 
    throw new Error("Socket.IO not initialized. Call initSocket first.");
  return io;
};

module.exports = { initSocket, getIO };
