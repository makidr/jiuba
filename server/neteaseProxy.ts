import type { Express } from "express";
import axios from "axios";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  Referer: "https://music.163.com/",
  Cookie: "os=ios; osver=16.0; appver=8.20.20; channel=distribution",
};

interface NeteaseSong {
  id: number;
  name: string;
  ar?: { name: string }[];
  artists?: { name: string }[];
  al?: { name: string; picUrl?: string };
  album?: { name: string; picUrl?: string };
  dt?: number; // ms
  duration?: number; // ms
}

function normalizeSong(track: NeteaseSong) {
  const artists = track.ar || track.artists || [];
  const album = track.al || track.album;
  return {
    neteaseId: String(track.id),
    title: track.name,
    artist: artists.map((a) => a.name).join(" / ") || "",
    album: album?.name || "",
    coverUrl: album?.picUrl || null,
    duration: Math.floor(((track.dt || track.duration) ?? 0) / 1000),
  };
}

export function registerNeteaseProxy(app: Express) {
  // 获取歌单信息
  app.get("/api/netease/playlist/:id", async (req, res) => {
    const { id } = req.params;
    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid playlist ID" });
    }

    // 策略1: v6 API
    try {
      const r = await axios.post(
        `https://music.163.com/weapi/v6/playlist/detail`,
        `csrf_token=&id=${id}&n=1000`,
        {
          headers: {
            ...HEADERS,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 10000,
        }
      );
      if (r.data?.playlist?.tracks?.length > 0) {
        const pl = r.data.playlist;
        return res.json({
          name: pl.name,
          tracks: pl.tracks.map(normalizeSong),
        });
      }
    } catch (_) {}

    // 策略2: v3 API
    try {
      const r = await axios.get(
        `https://music.163.com/api/v3/playlist/detail?id=${id}&n=1000`,
        { headers: HEADERS, timeout: 10000 }
      );
      if (r.data?.playlist) {
        const pl = r.data.playlist;
        const tracks = pl.tracks || pl.trackIds?.map((t: { id: number }) => ({ id: t.id, name: "未知歌曲", ar: [], al: {} })) || [];
        return res.json({
          name: pl.name,
          tracks: tracks.map(normalizeSong),
        });
      }
    } catch (_) {}

    // 策略3: 旧版 API
    try {
      const r = await axios.get(
        `https://music.163.com/api/playlist/detail?id=${id}`,
        { headers: HEADERS, timeout: 10000 }
      );
      if (r.data?.result?.tracks) {
        const pl = r.data.result;
        return res.json({
          name: pl.name,
          tracks: pl.tracks.map(normalizeSong),
        });
      }
    } catch (_) {}

    return res.status(502).json({ error: "无法获取歌单，请检查歌单是否公开，或稍后重试" });
  });

  // 搜索歌曲
  app.get("/api/netease/search", async (req, res) => {
    const { q, limit = "20" } = req.query as { q?: string; limit?: string };
    if (!q) return res.status(400).json({ error: "Query required" });

    try {
      const r = await axios.get(
        `https://music.163.com/api/search/get?s=${encodeURIComponent(q)}&type=1&limit=${limit}&offset=0`,
        { headers: HEADERS, timeout: 8000 }
      );
      const songs = r.data?.result?.songs || [];
      return res.json({
        songs: songs.map(normalizeSong),
      });
    } catch (err) {
      console.error("[NeteaseProxy] Search error:", err);
      return res.status(502).json({ error: "搜索失败，请稍后重试" });
    }
  });
}
