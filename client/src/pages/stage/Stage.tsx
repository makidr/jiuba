import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Music2,
  Gift,
  Mic2,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";

type QueueItem = {
  request: {
    id: number;
    status: "pending" | "playing" | "done" | "skipped";
    requesterName: string | null;
    message: string | null;
    queueOrder: number;
    createdAt: Date;
    sessionId: number;
    performerId: number;
    songId: number;
    userId: number;
    tableNo?: string | null;
  };
  song: {
    id: number;
    title: string;
    artist: string | null;
    album: string | null;
    coverUrl: string | null;
    duration: number | null;
  };
  performer: { id: number; name: string };
};

type TipItem = {
  id: number;
  tipperName: string | null;
  amount: string;
  message: string | null;
  createdAt: Date;
};

const statusLabel = {
  pending: { text: "等待中", cls: "status-pending" },
  playing: { text: "演唱中", cls: "status-playing" },
  done: { text: "已唱", cls: "status-done" },
  skipped: { text: "已跳过", cls: "status-skipped" },
};

export default function Stage() {
  // ── 所有 hooks 在顶部 ──────────────────────────────────────────────────────
  const [selectedPerformerId, setSelectedPerformerId] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [realtimeTips, setRealtimeTips] = useState<TipItem[]>([]);
  const [realtimeQueue, setRealtimeQueue] = useState<QueueItem[] | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // 只获取有 active 场次的歌手（与观众端一致）
  const { data: activePerformers = [], refetch: refetchPerformers } = trpc.performer.list.useQuery(
    undefined,
    { refetchInterval: 15000 }
  );

  const { data: activeSession, refetch: refetchSession } = trpc.session.getActive.useQuery(
    { performerId: selectedPerformerId! },
    { enabled: !!selectedPerformerId, refetchInterval: 10000 }
  );

  const { data: queueData = [], isLoading: queueLoading } = trpc.request.getQueue.useQuery(
    { sessionId: activeSession?.id! },
    { enabled: !!activeSession?.id, refetchInterval: 8000 }
  );

  const { data: sessionTips = [] } = trpc.tip.listBySession.useQuery(
    { sessionId: activeSession?.id! },
    { enabled: !!activeSession?.id }
  );

  // WebSocket
  useEffect(() => {
    if (!selectedPerformerId) return;

    const socket = io({ path: "/api/socket.io" });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.emit("join:performer", selectedPerformerId);

    socket.on("queue:new", (data: { queue: QueueItem[] }) => {
      setRealtimeQueue(data.queue);
      toast.success("新点歌请求！", { duration: 3000 });
    });

    socket.on("queue:update", (data: { id: number; status: string }) => {
      setRealtimeQueue((prev) => {
        if (!prev) return prev;
        return prev.map((q) =>
          q.request.id === data.id
            ? { ...q, request: { ...q.request, status: data.status as QueueItem["request"]["status"] } }
            : q
        );
      });
    });

    socket.on("tip:new", (data: TipItem) => {
      setRealtimeTips((prev) => [{ ...data, createdAt: new Date() }, ...prev].slice(0, 30));
      toast.success(`🎉 ${data.tipperName} 打赏了 ¥${data.amount}！`, { duration: 5000 });
    });

    // 监听场次结束事件
    socket.on("session:broadcast", (data: { status: string; performerId: number }) => {
      if (data.status === "ended" && data.performerId === selectedPerformerId) {
        toast.info("演出已结束，感谢今晚的精彩表演！", { duration: 4000 });
        refetchPerformers();
        // 自动返回歌手选择页
        setTimeout(() => setSelectedPerformerId(null), 2000);
      }
      if (data.status === "active" && data.performerId === selectedPerformerId) {
        refetchSession();
      }
    });

    return () => {
      socket.disconnect();
      setConnected(false);
      setRealtimeQueue(null);
    };
  }, [selectedPerformerId]);

  useEffect(() => {
    setRealtimeQueue(null);
  }, [activeSession?.id]);

  // ── 条件渲染 ───────────────────────────────────────────────────────────────

  // 歌手选择页（只显示演出中的歌手）
  if (!selectedPerformerId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-center space-y-2 mb-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Mic2 size={28} className="text-primary" />
          </div>
          <h1 className="text-3xl font-serif text-foreground">歌手工作台</h1>
          <p className="text-muted-foreground text-sm">选择你的名字进入工作台</p>
        </div>

        {activePerformers.length === 0 ? (
          <div className="text-center space-y-3 py-8">
            <p className="text-muted-foreground text-sm">当前没有进行中的演出</p>
            <p className="text-xs text-muted-foreground">请管理员在管理端开始场次后，歌手名字将显示在此处</p>
            <button
              onClick={() => refetchPerformers()}
              className="text-xs text-primary hover:underline flex items-center gap-1 mx-auto"
            >
              <RefreshCw size={11} />
              刷新
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
            {activePerformers.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPerformerId(p.id)}
                className="glass-card rounded-2xl p-5 text-left hover:gold-glow transition-all duration-300 active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-xl font-serif text-primary mb-3">
                  {p.name.charAt(0)}
                </div>
                <h3 className="font-semibold text-foreground">{p.name}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-xs text-green-400">演出中</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── 主工作台界面 ───────────────────────────────────────────────────────────
  const performer = activePerformers.find((p) => p.id === selectedPerformerId);
  const queue = realtimeQueue ?? queueData;
  const pendingQueue = queue.filter((q) => q.request.status === "pending");
  const playingQueue = queue.filter((q) => q.request.status === "playing");
  const doneQueue = queue.filter((q) => q.request.status === "done" || q.request.status === "skipped");

  const tips = [
    ...realtimeTips,
    ...sessionTips.map(({ tip }) => ({
      id: tip.id,
      tipperName: tip.tipperName,
      amount: String(tip.amount),
      message: tip.message,
      createdAt: tip.createdAt,
    })),
  ]
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 30);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-sidebar border-b border-sidebar-border px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg font-serif text-primary">
            {performer?.name.charAt(0) ?? "?"}
          </div>
          <div>
            <h1 className="text-lg font-serif font-semibold text-foreground">
              {performer?.name ?? "歌手工作台"}
            </h1>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                演出中
              </Badge>
              <span className={`flex items-center gap-1 text-xs ${connected ? "text-green-400" : "text-muted-foreground"}`}>
                {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
                {connected ? "实时连接" : "连接中..."}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setSelectedPerformerId(null)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={13} />
          切换
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Queue（只读） */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-semibold flex items-center gap-2">
              <Music2 size={18} className="text-primary" />
              点歌队列
              {pendingQueue.length > 0 && (
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                  {pendingQueue.length}
                </Badge>
              )}
            </h2>
            <span className="text-xs text-muted-foreground">只读展示</span>
          </div>

          {!activeSession ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Music2 size={40} className="mb-3 opacity-30" />
              <p className="text-sm">等待管理端开始场次...</p>
            </div>
          ) : queueLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {/* 演唱中 */}
              {playingQueue.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">演唱中</p>
                  {playingQueue.map((item) => <ReadonlyQueueCard key={item.request.id} item={item} highlight />)}
                </div>
              )}

              {/* 等待中 */}
              {pendingQueue.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">等待演唱</p>
                  <AnimatePresence>
                    {pendingQueue.map((item, idx) => (
                      <motion.div
                        key={item.request.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: idx * 0.04 }}
                      >
                        <ReadonlyQueueCard item={item} index={idx + 1} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : playingQueue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Music2 size={36} className="mb-3 opacity-30" />
                  <p className="text-sm">队列为空，等待观众点歌</p>
                </div>
              ) : null}

              {/* 已完成 */}
              {doneQueue.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">已完成</p>
                  {doneQueue.slice(0, 5).map((item) => <ReadonlyQueueCard key={item.request.id} item={item} dimmed />)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Tips */}
        <div className="w-72 xl:w-80 border-l border-border overflow-auto p-5 space-y-4 shrink-0 hidden md:block">
          <h2 className="text-lg font-serif font-semibold flex items-center gap-2">
            <Gift size={18} className="text-primary" />
            打赏记录
          </h2>
          {tips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Gift size={32} className="mb-3 opacity-30" />
              <p className="text-sm">暂无打赏</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {tips.map((tip, idx) => (
                  <motion.div
                    key={tip.id}
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`p-3 rounded-xl border transition-all ${
                      idx === 0 && realtimeTips[0]?.id === tip.id
                        ? "bg-primary/10 border-primary/30 gold-glow"
                        : "bg-card border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-medium shrink-0">
                          {(tip.tipperName || "?").charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{tip.tipperName || "匿名"}</p>
                          {tip.message && (
                            <p className="text-xs text-muted-foreground italic truncate">"{tip.message}"</p>
                          )}
                        </div>
                      </div>
                      <span className="text-base font-bold text-primary shrink-0">¥{tip.amount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {new Date(tip.createdAt).toLocaleTimeString()}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 只读队列卡片，无操作按钮 */
function ReadonlyQueueCard({
  item,
  highlight = false,
  dimmed = false,
  index,
}: {
  item: QueueItem;
  highlight?: boolean;
  dimmed?: boolean;
  index?: number;
}) {
  const { request, song } = item;
  const cfg = statusLabel[request.status];

  return (
    <div
      className={`rounded-xl p-4 border transition-all ${
        highlight
          ? "bg-primary/10 border-primary/30 gold-glow"
          : dimmed
          ? "bg-muted/10 border-border opacity-50"
          : "bg-card border-border"
      }`}
    >
      <div className="flex items-center gap-3">
        {index !== undefined && (
          <span className="text-xl font-bold text-primary w-8 text-center shrink-0">{index}</span>
        )}
        {song.coverUrl ? (
          <img src={song.coverUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Music2 size={18} className="text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base truncate">{song.title}</p>
          <p className="text-sm text-muted-foreground truncate">
            {[song.artist, song.album].filter(Boolean).join(" · ")}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">{request.requesterName || "匿名"}</span>
            {request.tableNo && (
              <span className="text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium">
                📍 {request.tableNo}号桌
              </span>
            )}
            {request.message && (
              <span className="text-xs text-muted-foreground italic truncate max-w-32">
                "{request.message}"
              </span>
            )}
          </div>
        </div>
        <Badge className={`text-xs shrink-0 ${cfg.cls}`}>{cfg.text}</Badge>
      </div>
    </div>
  );
}
