import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    path: "/api/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // 加入特定歌手的房间（用于推送该歌手的实时事件）
    socket.on("join:performer", (performerId: number) => {
      socket.join(`performer:${performerId}`);
      console.log(`[Socket.IO] ${socket.id} joined performer:${performerId}`);
    });

    // 加入特定场次的房间
    socket.on("join:session", (sessionId: number) => {
      socket.join(`session:${sessionId}`);
      console.log(`[Socket.IO] ${socket.id} joined session:${sessionId}`);
    });

    socket.on("leave:performer", (performerId: number) => {
      socket.leave(`performer:${performerId}`);
    });

    socket.on("leave:session", (sessionId: number) => {
      socket.leave(`session:${sessionId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  return io;
}

// ─── Emit helpers ─────────────────────────────────────────────────────────────

/** 推送新点歌事件 */
export function emitNewRequest(performerId: number, sessionId: number, data: unknown) {
  if (!io) return;
  io.to(`performer:${performerId}`).emit("queue:new", data);
  io.to(`session:${sessionId}`).emit("queue:new", data);
}

/** 推送点歌状态更新 */
export function emitRequestUpdate(performerId: number, sessionId: number, data: unknown) {
  if (!io) return;
  io.to(`performer:${performerId}`).emit("queue:update", data);
  io.to(`session:${sessionId}`).emit("queue:update", data);
}

/** 推送新打赏事件 */
export function emitNewTip(performerId: number, data: unknown) {
  if (!io) return;
  io.to(`performer:${performerId}`).emit("tip:new", data);
  // 广播给所有观众（用于展示打赏动态）
  io.emit("tip:broadcast", data);
}

/** 推送场次状态变更 */
export function emitSessionUpdate(performerId: number, data: unknown) {
  if (!io) return;
  io.to(`performer:${performerId}`).emit("session:update", data);
  io.emit("session:broadcast", data);
}
