import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  index,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // WeChat specific
  wechatNickname: varchar("wechatNickname", { length: 128 }),
  wechatAvatar: text("wechatAvatar"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Performers (歌手) ────────────────────────────────────────────────────────
export const performers = mysqlTable("performers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  gender: mysqlEnum("gender", ["male", "female", "other"]).default("other").notNull(),
  bio: text("bio"),
  avatar: text("avatar"),
  // 每场表演时长（分钟），默认 45
  performDuration: int("performDuration").default(45).notNull(),
  // 每场最多点歌数，默认 6
  maxSongsPerSession: int("maxSongsPerSession").default(6).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Performer = typeof performers.$inferSelect;
export type InsertPerformer = typeof performers.$inferInsert;

// ─── Songs (歌曲) ─────────────────────────────────────────────────────────────
export const songs = mysqlTable(
  "songs",
  {
    id: int("id").autoincrement().primaryKey(),
    performerId: int("performerId").notNull(),
    title: varchar("title", { length: 256 }).notNull(),
    artist: varchar("artist", { length: 128 }),
    album: varchar("album", { length: 256 }),
    duration: int("duration"), // seconds
    coverUrl: text("coverUrl"),
    // 网易云歌曲 ID
    neteaseId: varchar("neteaseId", { length: 64 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("idx_songs_performer").on(t.performerId)]
);

export type Song = typeof songs.$inferSelect;
export type InsertSong = typeof songs.$inferInsert;

// ─── Sessions (演出场次) ───────────────────────────────────────────────────────
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  performerId: int("performerId").notNull(),
  title: varchar("title", { length: 256 }),
  // 场次状态
  status: mysqlEnum("status", ["upcoming", "active", "ended"]).default("upcoming").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  startedAt: timestamp("startedAt"),
  endedAt: timestamp("endedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

// ─── Song Requests (点歌记录) ─────────────────────────────────────────────────
export const songRequests = mysqlTable(
  "song_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionId: int("sessionId").notNull(),
    performerId: int("performerId").notNull(),
    songId: int("songId").notNull(),
    userId: int("userId").notNull(),
    // 点歌人显示名
    requesterName: varchar("requesterName", { length: 128 }),
    message: text("message"),
    status: mysqlEnum("status", ["pending", "playing", "done", "skipped"])
      .default("pending")
      .notNull(),
    // 队列顺序
    queueOrder: int("queueOrder").default(0).notNull(),
    // 匿名用户标识 token
    guestToken: varchar("guestToken", { length: 64 }),
    // 桌号
    tableNo: varchar("tableNo", { length: 32 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("idx_requests_session").on(t.sessionId),
    index("idx_requests_user").on(t.userId),
  ]
);

export type SongRequest = typeof songRequests.$inferSelect;
export type InsertSongRequest = typeof songRequests.$inferInsert;

// ─── Tips (打赏记录) ──────────────────────────────────────────────────────────
export const tips = mysqlTable(
  "tips",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionId: int("sessionId"),
    performerId: int("performerId").notNull(),
    userId: int("userId").notNull(),
    // 打赏人显示名
    tipperName: varchar("tipperName", { length: 128 }),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    message: text("message"),
    // 支付状态
    paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "failed", "refunded"])
      .default("pending")
      .notNull(),
    // 微信支付订单号
    wechatOrderId: varchar("wechatOrderId", { length: 128 }),
    // 内部流水号
    tradeNo: varchar("tradeNo", { length: 64 }).unique(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("idx_tips_performer").on(t.performerId),
    index("idx_tips_user").on(t.userId),
  ]
);

export type Tip = typeof tips.$inferSelect;
export type InsertTip = typeof tips.$inferInsert;

/**
 * 支付订单表，用于美团支付、微信支付等第三方支付
 */
export const paymentOrders = mysqlTable("payment_orders", {
  id: int("id").autoincrement().primaryKey(),
  /** 订单号，唯一标识 */
  orderId: varchar("orderId", { length: 64 }).notNull().unique(),
  /** 关联的打赏记录 ID */
  tipId: int("tipId").notNull().references(() => tips.id, { onDelete: "cascade" }),
  /** 支付渠道：meituan, wechat, alipay */
  channel: mysqlEnum("channel", ["meituan", "wechat", "alipay"]).notNull(),
  /** 支付金额（分） */
  amount: int("amount").notNull(),
  /** 支付状态：pending, success, failed, refund */
  status: mysqlEnum("status", ["pending", "success", "failed", "refund"]).default("pending").notNull(),
  /** 第三方支付返回的交易号 */
  transactionId: varchar("transactionId", { length: 128 }),
  /** 支付完成时间 */
  paidAt: timestamp("paidAt"),
  /** 创建时间 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新时间 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentOrder = typeof paymentOrders.$inferSelect;
export type InsertPaymentOrder = typeof paymentOrders.$inferInsert;
