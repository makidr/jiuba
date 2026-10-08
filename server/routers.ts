import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getDb,
  getAllPerformers,
  getActivePerformers,
  getPerformerById,
  createPerformer,
  updatePerformer,
  deletePerformer,
  getSongsByPerformer,
  searchSongs,
  getSongById,
  createSong,
  bulkCreateSongs,
  updateSong,
  deleteSong,
  getAllSessions,
  getActiveSession,
  getSessionById,
  createSession,
  updateSession,
  getQueueBySession,
  getRequestsByUser,
  countPendingRequests,
  createSongRequest,
  updateSongRequest,
  getAllTips,
  getTipsByPerformer,
  getTipsBySession,
  createTip,
  updateTip,
  getRevenueStats,
  getRequestsByGuestToken,
} from "./db";
import { tips } from "../drizzle/schema";
import {
  emitNewRequest,
  emitRequestUpdate,
  emitNewTip,
  emitSessionUpdate,
} from "./socket";
import { eq } from "drizzle-orm";

// ─── Admin guard（暂时关闭，无需登录）─────────────────────────────────────
const adminProcedure = publicProcedure;

// ─── Performers router ────────────────────────────────────────────────────────
const performerRouter = router({
  // 只返回当前有 active 场次的歌手（观众端使用）
  list: publicProcedure.query(async () => {
    const allPerformers = await getActivePerformers();
    const allSessions = await getAllSessions();
    const activePerfIds = new Set(
      allSessions.filter(s => s.status === "active").map(s => s.performerId)
    );
    return allPerformers.filter(p => activePerfIds.has(p.id));
  }),
  // 管理端获取所有歌手（包括未开场的）
  listAll: adminProcedure.query(() => getAllPerformers()),
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const performer = await getPerformerById(input.id);
      return performer ?? null;
    }),
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(128),
      gender: z.enum(["male", "female", "other"]).default("other"),
      bio: z.string().optional(),
      avatar: z.string().optional(),
      performDuration: z.number().min(1).max(300).default(45),
      maxSongsPerSession: z.number().min(1).max(50).default(6),
    }))
    .mutation(({ input }) => createPerformer(input)),
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(128).optional(),
      gender: z.enum(["male", "female", "other"]).optional(),
      bio: z.string().optional(),
      avatar: z.string().optional(),
      performDuration: z.number().min(1).max(300).optional(),
      maxSongsPerSession: z.number().min(1).max(50).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(({ input }) => { const { id, ...data } = input; return updatePerformer(id, data); }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deletePerformer(input.id)),
});

// ─── Songs router ─────────────────────────────────────────────────────────────
const songRouter = router({
  listByPerformer: publicProcedure
    .input(z.object({ performerId: z.number() }))
    .query(({ input }) => getSongsByPerformer(input.performerId)),
  search: publicProcedure
    .input(z.object({ performerId: z.number(), query: z.string() }))
    .query(({ input }) => searchSongs(input.performerId, input.query)),
  create: adminProcedure
    .input(z.object({
      performerId: z.number(),
      title: z.string().min(1).max(256),
      artist: z.string().optional(),
      album: z.string().optional(),
      duration: z.number().optional(),
      coverUrl: z.string().optional(),
      neteaseId: z.string().optional(),
    }))
    .mutation(({ input }) => createSong(input)),
  bulkImport: adminProcedure
    .input(z.object({
      performerId: z.number(),
      songs: z.array(z.object({
        title: z.string(),
        artist: z.string().optional(),
        album: z.string().optional(),
        duration: z.number().optional(),
        coverUrl: z.string().optional(),
        neteaseId: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const data = input.songs.map((s) => ({ ...s, performerId: input.performerId, isActive: true as const }));
      await bulkCreateSongs(data);
      return { imported: data.length };
    }),
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(256).optional(),
      artist: z.string().optional(),
      album: z.string().optional(),
      duration: z.number().optional(),
      coverUrl: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(({ input }) => { const { id, ...data } = input; return updateSong(id, data); }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteSong(input.id)),
});

// ─── Sessions router ──────────────────────────────────────────────────────────
const sessionRouter = router({
  list: publicProcedure.query(() => getAllSessions()),
  getActive: publicProcedure
    .input(z.object({ performerId: z.number() }))
    .query(async ({ input }) => {
      const session = await getActiveSession(input.performerId);
      return session ?? null;
    }),
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const session = await getSessionById(input.id);
      return session ?? null;
    }),
  create: adminProcedure
    .input(z.object({
      performerId: z.number(),
      title: z.string().optional(),
      scheduledAt: z.date().optional(),
    }))
    .mutation(({ input }) => createSession({ ...input, status: "upcoming" })),
  start: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const session = await getSessionById(input.id);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      const startedAt = new Date();
      await updateSession(input.id, { status: "active", startedAt });
      const performer = await getPerformerById(session.performerId);
      // 广播开始事件：包含 performerId、歌手名、开始时间、表演时长
      emitSessionUpdate(session.performerId, {
        id: input.id,
        status: "active",
        performerId: session.performerId,
        performerName: performer?.name,
        startedAt: startedAt.toISOString(),
        performDuration: performer?.performDuration ?? 45,
      });
      return { success: true };
    }),
  end: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const session = await getSessionById(input.id);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      await updateSession(input.id, { status: "ended", endedAt: new Date() });
      // 广播结束事件：包含 performerId、歌手名
      const performer = await getPerformerById(session.performerId);
      emitSessionUpdate(session.performerId, {
        id: input.id,
        status: "ended",
        performerId: session.performerId,
        performerName: performer?.name,
      });
      return { success: true };
    }),
});

// ─── Song Requests router (支持匿名) ──────────────────────────────────────────
const requestRouter = router({
  getQueue: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(({ input }) => getQueueBySession(input.sessionId)),

  // 已登录用户查询自己的记录
  myRequests: protectedProcedure.query(({ ctx }) => getRequestsByUser(ctx.user.id)),

  // 匿名用户通过 guestToken 查询自己的记录
  myRequestsByToken: publicProcedure
    .input(z.object({ guestToken: z.string() }))
    .query(({ input }) => getRequestsByGuestToken(input.guestToken)),

  // 点歌：支持匿名（guestName + guestToken）和已登录用户
  create: publicProcedure
    .input(z.object({
      sessionId: z.number(),
      performerId: z.number(),
      songId: z.number(),
      message: z.string().max(200).optional(),
      // 匿名用户字段
      guestName: z.string().max(50).optional(),
      guestToken: z.string().optional(),
      // 桌号
      tableNo: z.string().max(32).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 检查场次
      const session = await getSessionById(input.sessionId);
      if (!session || session.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "场次未开始或已结束" });
      }

      // 检查点歌上限
      const performer = await getPerformerById(input.performerId);
      if (!performer) throw new TRPCError({ code: "NOT_FOUND" });

      const pendingCount = await countPendingRequests(input.sessionId);
      if (pendingCount >= performer.maxSongsPerSession) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `当前队列已满（最多 ${performer.maxSongsPerSession} 首）`,
        });
      }

      // 检查歌曲
      const song = await getSongById(input.songId);
      if (!song || !song.isActive) {
        throw new TRPCError({ code: "NOT_FOUND", message: "歌曲不存在" });
      }

      // 确定点歌人信息
      const userId = ctx.user?.id ?? 0; // 匿名用户 userId = 0
      const requesterName = ctx.user
        ? (ctx.user.wechatNickname || ctx.user.name || "匿名观众")
        : (input.guestName || "匿名观众");

      const requestData = {
        sessionId: input.sessionId,
        performerId: input.performerId,
        songId: input.songId,
        userId,
        requesterName,
        message: input.message,
        status: "pending" as const,
        queueOrder: pendingCount + 1,
        guestToken: input.guestToken || null,
        tableNo: input.tableNo || null,
      };

      await createSongRequest(requestData);

      // 推送实时更新
      const queue = await getQueueBySession(input.sessionId);
      emitNewRequest(input.performerId, input.sessionId, {
        queue,
        newRequest: { ...requestData, song, performer },
      });

      return { success: true };
    }),

  updateStatus: adminProcedure
    .input(z.object({ id: z.number(), status: z.enum(["pending", "playing", "done", "skipped"]) }))
    .mutation(async ({ input }) => {
      await updateSongRequest(input.id, { status: input.status });
      const db = await (await import("./db")).getDb();
      if (db) {
        const { songRequests } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const result = await db.select().from(songRequests).where(eq(songRequests.id, input.id)).limit(1);
        if (result[0]) {
          emitRequestUpdate(result[0].performerId, result[0].sessionId, { id: input.id, status: input.status });
        }
      }
      return { success: true };
    }),

  updateStatusByPerformer: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["pending", "playing", "done", "skipped"]) }))
    .mutation(async ({ input }) => {
      await updateSongRequest(input.id, { status: input.status });
      const db = await (await import("./db")).getDb();
      if (db) {
        const { songRequests } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const result = await db.select().from(songRequests).where(eq(songRequests.id, input.id)).limit(1);
        if (result[0]) {
          emitRequestUpdate(result[0].performerId, result[0].sessionId, { id: input.id, status: input.status });
        }
      }
      return { success: true };
    }),
});

// ─── Tips router (支持匿名) ───────────────────────────────────────────────────
const tipRouter = router({
  list: adminProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(({ input }) => getAllTips(input.limit, input.offset)),

  listByPerformer: publicProcedure
    .input(z.object({ performerId: z.number() }))
    .query(({ input }) => getTipsByPerformer(input.performerId)),

  listBySession: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(({ input }) => getTipsBySession(input.sessionId)),

  // 打赏：支持匿名
  create: publicProcedure
    .input(z.object({
      performerId: z.number(),
      sessionId: z.number().optional(),
      amount: z.number().min(1).max(9999),
      message: z.string().max(100).optional(),
      guestName: z.string().max(50).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const tradeNo = nanoid(32);
      const tipperName = ctx.user
        ? (ctx.user.wechatNickname || ctx.user.name || "热心观众")
        : (input.guestName || "热心观众");

      const tipData = {
        performerId: input.performerId,
        sessionId: input.sessionId,
        userId: ctx.user?.id ?? 0,
        tipperName,
        amount: String(input.amount),
        message: input.message,
        paymentStatus: "pending" as const,
        tradeNo,
      };

      await createTip(tipData);
      return { tradeNo, amount: input.amount, paymentParams: null };
    }),

  // 模拟支付确认（匿名用户通过 tradeNo 确认）
  confirmPayment: publicProcedure
    .input(z.object({ tradeNo: z.string() }))
    .mutation(async ({ input }) => {
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { tips: tipsTable } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const result = await db.select().from(tipsTable).where(eq(tipsTable.tradeNo, input.tradeNo)).limit(1);

      const tip = result[0];
      if (!tip) throw new TRPCError({ code: "NOT_FOUND" });

      await updateTip(tip.id, { paymentStatus: "paid" });

      const performer = await getPerformerById(tip.performerId);
      emitNewTip(tip.performerId, {
        id: tip.id,
        tipperName: tip.tipperName,
        amount: tip.amount,
        message: tip.message,
        performerName: performer?.name,
        createdAt: new Date(),
      });

      return { success: true };
    }),

  revenueStats: adminProcedure.query(() => getRevenueStats()),
});

// ─── App router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  performer: performerRouter,
  song: songRouter,
  session: sessionRouter,
  request: requestRouter,
  tip: tipRouter,
  meiTuanPay: router({
    /**
     * 创建支付订单
     * 前端调用此接口获得支付链接，然后跳转
     */
    create: publicProcedure
      .input(
        z.object({
          performerId: z.number(),
          amount: z.number().min(1), // 金额，单位：分
          guestName: z.string(),
          tableNo: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // 创建打赏记录
        const tipResult = await db.insert(tips).values({
          performerId: input.performerId,
          userId: 0, // 匿名用户
          amount: String(input.amount / 100), // 转换为元
          tipperName: input.guestName,
          paymentStatus: "pending",
        });

        const tipId = tipResult[0].insertId;

        // 创建支付订单
        const { createMeiTuanPaymentOrder } = await import("./meiTuanPay");
        const config = {
          merchantId: process.env.MEITUAN_MERCHANT_ID || "",
          appId: process.env.MEITUAN_APP_ID || "",
          appSecret: process.env.MEITUAN_APP_SECRET || "",
        };

        if (!config.merchantId || !config.appId || !config.appSecret) {
          throw new Error("Meituan payment config not set");
        }

        const paymentOrder = await createMeiTuanPaymentOrder(
          {
            tipId: Number(tipId),
            amount: input.amount,
            performerId: input.performerId,
            guestName: input.guestName,
            tableNo: input.tableNo,
          },
          config
        );

        return {
          orderId: paymentOrder.orderId,
          paymentUrl: paymentOrder.paymentUrl,
        };
      }),

    /**
     * 查询订单状态
     */
    queryStatus: publicProcedure
      .input(z.object({ orderId: z.string() }))
      .query(async ({ input }) => {
        const { queryMeiTuanPaymentStatus } = await import("./meiTuanPay");
        return await queryMeiTuanPaymentStatus(input.orderId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
