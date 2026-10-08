import { and, desc, eq, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  Performer,
  Session,
  Song,
  SongRequest,
  Tip,
  performers,
  sessions,
  songRequests,
  songs,
  tips,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const fields = ["name", "email", "loginMethod", "wechatNickname", "wechatAvatar"] as const;
  for (const f of fields) {
    const v = user[f as keyof InsertUser];
    if (v !== undefined) {
      (values as Record<string, unknown>)[f] = v ?? null;
      updateSet[f] = v ?? null;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Performers ───────────────────────────────────────────────────────────────
export async function getAllPerformers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(performers).orderBy(performers.name);
}

export async function getActivePerformers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(performers).where(eq(performers.isActive, true)).orderBy(performers.name);
}

export async function getPerformerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(performers).where(eq(performers.id, id)).limit(1);
  return result[0];
}

export async function createPerformer(data: Omit<typeof performers.$inferInsert, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(performers).values(data);
  return result[0];
}

export async function updatePerformer(id: number, data: Partial<Omit<Performer, "id" | "createdAt">>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(performers).set(data).where(eq(performers.id, id));
}

export async function deletePerformer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(performers).set({ isActive: false }).where(eq(performers.id, id));
}

// ─── Songs ────────────────────────────────────────────────────────────────────
export async function getSongsByPerformer(performerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(songs)
    .where(and(eq(songs.performerId, performerId), eq(songs.isActive, true)))
    .orderBy(songs.title);
}

export async function searchSongs(performerId: number, query: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(songs)
    .where(
      and(
        eq(songs.performerId, performerId),
        eq(songs.isActive, true),
        like(songs.title, `%${query}%`)
      )
    )
    .limit(20);
}

export async function getSongById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
  return result[0];
}

export async function createSong(data: Omit<typeof songs.$inferInsert, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(songs).values(data);
  return result[0];
}

export async function bulkCreateSongs(data: Omit<typeof songs.$inferInsert, "id" | "createdAt" | "updatedAt">[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.length === 0) return;
  await db.insert(songs).values(data).onDuplicateKeyUpdate({ set: { isActive: true } });
}

export async function updateSong(id: number, data: Partial<Omit<Song, "id" | "createdAt">>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(songs).set(data).where(eq(songs.id, id));
}

export async function deleteSong(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(songs).set({ isActive: false }).where(eq(songs.id, id));
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
export async function getAllSessions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sessions).orderBy(desc(sessions.createdAt));
}

export async function getActiveSession(performerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.performerId, performerId), eq(sessions.status, "active")))
    .limit(1);
  return result[0];
}

export async function getSessionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return result[0];
}

export async function createSession(data: Omit<typeof sessions.$inferInsert, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(sessions).values(data);
  return result[0];
}

export async function updateSession(id: number, data: Partial<Omit<Session, "id" | "createdAt">>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sessions).set(data).where(eq(sessions.id, id));
}

// ─── Song Requests ────────────────────────────────────────────────────────────
export async function getQueueBySession(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      request: songRequests,
      song: songs,
      performer: performers,
    })
    .from(songRequests)
    .innerJoin(songs, eq(songRequests.songId, songs.id))
    .innerJoin(performers, eq(songRequests.performerId, performers.id))
    .where(eq(songRequests.sessionId, sessionId))
    .orderBy(songRequests.queueOrder, songRequests.createdAt);
}

export async function getRequestsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      request: songRequests,
      song: songs,
      performer: performers,
    })
    .from(songRequests)
    .innerJoin(songs, eq(songRequests.songId, songs.id))
    .innerJoin(performers, eq(songRequests.performerId, performers.id))
    .where(eq(songRequests.userId, userId))
    .orderBy(desc(songRequests.createdAt))
    .limit(50);
}

export async function getRequestsByGuestToken(guestToken: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      request: songRequests,
      song: songs,
      performer: performers,
    })
    .from(songRequests)
    .innerJoin(songs, eq(songRequests.songId, songs.id))
    .innerJoin(performers, eq(songRequests.performerId, performers.id))
    .where(eq(songRequests.guestToken, guestToken))
    .orderBy(desc(songRequests.createdAt))
    .limit(50);
}

export async function countPendingRequests(sessionId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(songRequests)
    .where(
      and(
        eq(songRequests.sessionId, sessionId),
        eq(songRequests.status, "pending")
      )
    );
  return Number(result[0]?.count ?? 0);
}

export async function createSongRequest(data: Omit<typeof songRequests.$inferInsert, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(songRequests).values(data);
  return result[0];
}

export async function updateSongRequest(id: number, data: Partial<Omit<SongRequest, "id" | "createdAt">>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(songRequests).set(data).where(eq(songRequests.id, id));
}

// ─── Tips ─────────────────────────────────────────────────────────────────────
export async function getAllTips(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      tip: tips,
      performer: performers,
    })
    .from(tips)
    .innerJoin(performers, eq(tips.performerId, performers.id))
    .orderBy(desc(tips.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getTipsByPerformer(performerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(tips)
    .where(and(eq(tips.performerId, performerId), eq(tips.paymentStatus, "paid")))
    .orderBy(desc(tips.createdAt));
}

export async function getTipsBySession(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      tip: tips,
    })
    .from(tips)
    .where(and(eq(tips.sessionId, sessionId), eq(tips.paymentStatus, "paid")))
    .orderBy(desc(tips.createdAt));
}

export async function createTip(data: Omit<typeof tips.$inferInsert, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tips).values(data);
  return result[0];
}

export async function updateTip(id: number, data: Partial<Omit<Tip, "id" | "createdAt">>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(tips).set(data).where(eq(tips.id, id));
}

export async function getRevenueStats() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      performerId: tips.performerId,
      performerName: performers.name,
      total: sql<string>`SUM(CAST(${tips.amount} AS DECIMAL(10,2)))`,
      count: sql<number>`COUNT(*)`,
      date: sql<string>`DATE(${tips.createdAt})`,
    })
    .from(tips)
    .innerJoin(performers, eq(tips.performerId, performers.id))
    .where(eq(tips.paymentStatus, "paid"))
    .groupBy(tips.performerId, performers.name, sql`DATE(${tips.createdAt})`)
    .orderBy(desc(sql`DATE(${tips.createdAt})`));
}
