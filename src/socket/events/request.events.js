// These are helper functions called from HTTP controllers — not from socket client events.
// The controllers import getIO() and use these to emit to the right rooms.

// Emit to all sellers in a category when a new request is posted
const emitNewRequest = (io, { requestId, category, summary, budget }) => {
  // All sellers who joined the category room receive this
  io.to(category).emit('new_request', {
    requestId,
    category,
    summary,
    budget,
    timestamp: new Date().toISOString(),
  });
};

// Emit to the student who owns the request when a seller submits an offer
const emitNewOffer = (io, { requestId, offerId, price, sellerName, studentUserId }) => {
  // The student's personal room: 'user:<userId>'
  io.to(`user:${studentUserId}`).emit('new_offer', {
    offerId,
    requestId,
    price,
    sellerName,
    timestamp: new Date().toISOString(),
  });

  // Also emit to the request room (if student has the request page open)
  io.to(requestId.toString()).emit('new_offer', {
    offerId,
    requestId,
    price,
    sellerName,
    timestamp: new Date().toISOString(),
  });
};

// Register any socket-level listeners (currently none for requests)
const registerRequestEvents = (io, socket) => {
  // Student joins a request room to get live offer updates
  socket.on('watch_request', (requestId) => {
    socket.join(requestId.toString());
    console.log(`[Socket] ${socket.data.user.userId} watching request ${requestId}`);
  });

  socket.on('unwatch_request', (requestId) => {
    socket.leave(requestId.toString());
  });
};

module.exports = { emitNewRequest, emitNewOffer, registerRequestEvents };