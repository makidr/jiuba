import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGuest } from "@/contexts/GuestContext";
import { GuestNameDialog } from "@/components/GuestNameDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic2, ChevronRight, Music2, Clock, ListMusic, User, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";

export default function AudienceHome() {
  const { guestName, hasName } = useGuest();
  const [showNameDialog, setShowNameDialog] = useState(false);
  // 读取桌号参数
  const tableNo = new URLSearchParams(window.location.search).get("table");
  const socketRef = useRef<Socket | null>(null);
  const utils = trpc.useUtils();

  const { data: performers = [], isLoading, refetch } = trpc.performer.list.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  // 监听演出状态变化，实时刷新歌手列表
  useEffect(() => {
    const socket = io({ path: "/api/socket.io" });
    socketRef.current = socket;

    socket.on("session:broadcast", () => {
      // 演出开始或结束时，刷新歌手列表
      utils.performer.list.invalidate();
    });

    return () => { socket.disconnect(); };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Mic2 size={16} className="text-primary" />
            </div>
            <span className="font-serif font-semibold text-foreground">点歌台</span>
          </div>
          <div className="flex items-center gap-2">
            {hasName ? (
              <button
                onClick={() => setShowNameDialog(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-medium">
                  {guestName.charAt(0)}
                </div>
                <span>{guestName}</span>
              </button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-muted-foreground hover:text-primary text-xs"
                onClick={() => setShowNameDialog(true)}
              >
                <User size={14} />
                设置昵称
              </Button>
            )}
            <Link href="/my-requests">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground text-xs">
                <ListMusic size={14} />
                我的点歌
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="max-w-lg mx-auto px-4 pt-8 pb-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <h1 className="text-3xl font-serif text-foreground">今晚，为你点一首歌</h1>
            <p className="text-muted-foreground text-sm">选择你喜欢的歌手，点播专属歌曲</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4">
            {tableNo && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary mb-2">
                <span>📍</span>
                <span>{tableNo} 号桌</span>
              </div>
            )}
          {hasName ? (
              <p className="text-sm text-primary">欢迎，{guestName} 👋</p>
            ) : (
              <Button onClick={() => setShowNameDialog(true)} className="bg-primary text-primary-foreground gap-2 px-6">
                <User size={15} />
                设置昵称开始点歌
              </Button>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4">
        <div className="divider-gold" />
      </div>

      {/* Performers */}
      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            今晚演出中的歌手
          </h2>
          <button onClick={() => refetch()} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
            <RefreshCw size={11} />
            刷新
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-28 rounded-2xl bg-card animate-pulse" />)}
          </div>
        ) : performers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Mic2 size={40} className="mb-3 opacity-30" />
            <p className="text-sm">今晚暂无演出</p>
            <p className="text-xs mt-1 opacity-70">演出开始后歌手将显示在这里</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {performers.map((p, idx) => (
                <PerformerCard key={p.id} performer={p} index={idx} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="pb-safe h-8" />

      <GuestNameDialog open={showNameDialog} onClose={() => setShowNameDialog(false)} />
    </div>
  );
}

function PerformerCard({
  performer,
  index,
}: {
  performer: { id: number; name: string; gender: string; bio: string | null; avatar: string | null; performDuration: number; maxSongsPerSession: number };
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.08 }}
    >
      <Link href={`/performer/${performer.id}`}>
        <div className="glass-card rounded-2xl p-4 cursor-pointer hover:gold-glow transition-all duration-300 active:scale-[0.98]">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {performer.avatar ? (
                <img src={performer.avatar} alt={performer.name} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-serif text-primary">
                  {performer.name.charAt(0)}
                </div>
              )}
              {/* 演出中绿点 */}
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">{performer.name}</h3>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs px-1.5 py-0">
                  演出中
                </Badge>
              </div>
              {performer.bio && <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{performer.bio}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock size={10} />{performer.performDuration}分钟</span>
                <span className="flex items-center gap-1"><Music2 size={10} />每场最多{performer.maxSongsPerSession}首</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground shrink-0" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
