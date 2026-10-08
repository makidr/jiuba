import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGuest } from "@/contexts/GuestContext";
import { GuestNameDialog } from "@/components/GuestNameDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Search, Music2, Clock, Heart, Gift, CheckCircle2, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";

function formatDuration(seconds?: number | null) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const TIP_AMOUNTS = [6, 18, 38, 66, 88, 188];

export default function PerformerDetail() {
  const { id } = useParams<{ id: string }>();
  const performerId = Number(id);
  const { guestName, guestToken, hasName } = useGuest();
  const utils = trpc.useUtils();

  const [searchQuery, setSearchQuery] = useState("");
  const [requestSong, setRequestSong] = useState<{ id: number; title: string; artist: string | null } | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [tipOpen, setTipOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState(18);
  const [tipMessage, setTipMessage] = useState("");
  const [tipSuccess, setTipSuccess] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<"request" | "tip" | null>(null);
  const [flyTips, setFlyTips] = useState<{ id: number; text: string }[]>([]);
  const [sessionEnded, setSessionEnded] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const { data: performer } = trpc.performer.get.useQuery({ id: performerId });
  const { data: activeSession, refetch: refetchSession } = trpc.session.getActive.useQuery(
    { performerId },
    { refetchInterval: 15000 }
  );
  const { data: songs = [], isLoading: songsLoading } = trpc.song.listByPerformer.useQuery({ performerId });
  const { data: searchResults = [] } = trpc.song.search.useQuery(
    { performerId, query: searchQuery },
    { enabled: searchQuery.length > 0 }
  );

  const displaySongs = searchQuery.length > 0 ? searchResults : songs;

  // WebSocket
  useEffect(() => {
    const socket = io({ path: "/api/socket.io" });
    socketRef.current = socket;
    socket.emit("join:performer", performerId);

    socket.on("tip:new", (data: { tipperName: string; amount: string }) => {
      const id = Date.now();
      setFlyTips((prev) => [...prev, { id, text: `${data.tipperName} 打赏了 ¥${data.amount}` }]);
      setTimeout(() => setFlyTips((prev) => prev.filter((t) => t.id !== id)), 2500);
    });

    socket.on("session:broadcast", (data: { status: string; performerId: number }) => {
      if (data.performerId !== performerId) return;
      if (data.status === "ended") {
        setSessionEnded(true);
        toast.info("演出已结束，感谢今晚的陪伴！");
        utils.performer.list.invalidate();
        refetchSession();
      }
      if (data.status === "active") {
        setSessionEnded(false);
        refetchSession();
      }
    });

    return () => { socket.disconnect(); };
  }, [performerId]);

  const requestMutation = trpc.request.create.useMutation({
    onSuccess: () => {
      toast.success("点歌成功！已加入队列");
      setRequestSong(null);
      setRequestMessage("");
    },
    onError: (e) => toast.error(e.message),
  });

  // 美团支付创建订单
  const meiTuanPayMutation = trpc.meiTuanPay.create.useMutation({
    onSuccess: (data) => {
      // 跳转到美团支付页面
      window.location.href = data.paymentUrl;
    },
    onError: (e) => toast.error("创建支付订单失败: " + e.message),
  });

  const handleClickRequest = (song: { id: number; title: string; artist: string | null }) => {
    if (sessionEnded || !activeSession) { toast.info("演出已结束，暂不接受点歌"); return; }
    if (!hasName) { setPendingAction("request"); setRequestSong(song); setShowNameDialog(true); return; }
    setRequestSong(song);
  };

  const handleClickTip = () => {
    if (!hasName) { setPendingAction("tip"); setShowNameDialog(true); return; }
    setTipOpen(true);
  };

  const handleNameConfirmed = () => {
    if (pendingAction === "tip") setTipOpen(true);
    setPendingAction(null);
  };

  const handleRequest = () => {
    if (!requestSong || !activeSession) return;
    const tableNo = new URLSearchParams(window.location.search).get("table") || undefined;
    requestMutation.mutate({
      sessionId: activeSession.id,
      performerId,
      songId: requestSong.id,
      message: requestMessage || undefined,
      guestName: guestName || "匿名观众",
      guestToken,
      tableNo,
    });
  };

  const handleTip = () => {
    // 调用美团支付创建订单
    // 金额转换为分
    meiTuanPayMutation.mutate({
      performerId,
      amount: tipAmount * 100,
      guestName: guestName || "热心观众",
      tableNo: new URLSearchParams(window.location.search).get("table") || undefined,
    });
  };

  if (!performer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const canRequest = !sessionEnded && !!activeSession;

  return (
    <div className="min-h-screen bg-background">
      {/* Floating tip notifications */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none space-y-2">
        <AnimatePresence>
          {flyTips.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 0, scale: 0.8 }}
              animate={{ opacity: 1, y: -20, scale: 1 }}
              exit={{ opacity: 0, y: -60, scale: 1.1 }}
              className="bg-primary/90 text-primary-foreground text-sm px-4 py-2 rounded-full shadow-lg whitespace-nowrap"
            >
              🎉 {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-serif font-semibold text-foreground">{performer.name}</h1>
          </div>
          {sessionEnded ? (
            <Badge variant="outline" className="text-xs border-border text-muted-foreground">已结束</Badge>
          ) : activeSession ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">演出中</Badge>
          ) : null}
        </div>
      </header>

      {/* 演出结束横幅 */}
      {sessionEnded && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border text-sm text-muted-foreground">
            <AlertCircle size={16} className="text-muted-foreground shrink-0" />
            <span>演出已结束，感谢今晚的陪伴！</span>
            <Link href="/" className="ml-auto text-primary text-xs hover:underline shrink-0">返回首页</Link>
          </div>
        </div>
      )}

      {/* Performer Info */}
      <div className="max-w-lg mx-auto px-4 pt-4 pb-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-serif text-primary shrink-0">
              {performer.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold">{performer.name}</h2>
              {performer.bio && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{performer.bio}</p>}
              {!activeSession && !sessionEnded && (
                <p className="text-xs text-muted-foreground mt-1">暂无进行中的场次</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              className={`flex-1 gap-2 ${canRequest ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              disabled={!canRequest}
              onClick={() => !canRequest && toast.info(sessionEnded ? "演出已结束" : "暂无进行中的场次")}
            >
              <Music2 size={15} />
              {sessionEnded ? "演出已结束" : canRequest ? "选歌点歌" : "暂未开场"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-primary/50 text-primary hover:bg-primary/10 gap-2"
              onClick={handleClickTip}
            >
              <Gift size={15} />
              打赏
            </Button>
          </div>
        </div>
      </div>

      {/* Song List */}
      <div className="max-w-lg mx-auto px-4 pb-8 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索歌曲..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {searchQuery ? "搜索结果" : "歌曲列表"}
          </h3>
          {!searchQuery && <span className="text-xs text-muted-foreground">{songs.length} 首</span>}
        </div>

        {songsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-xl bg-card animate-pulse" />)}
          </div>
        ) : displaySongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Music2 size={36} className="mb-3 opacity-30" />
            <p className="text-sm">{searchQuery ? "未找到相关歌曲" : "暂无歌曲"}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {displaySongs.map((song, idx) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border transition-all ${
                  canRequest
                    ? "hover:border-primary/30 active:scale-[0.98] cursor-pointer"
                    : "opacity-60 cursor-not-allowed"
                }`}
                onClick={() => canRequest && handleClickRequest({ id: song.id, title: song.title, artist: song.artist })}
              >
                {song.coverUrl ? (
                  <img src={song.coverUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Music2 size={16} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{song.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[song.artist, song.album].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {song.duration && (
                  <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                    <Clock size={10} />
                    {formatDuration(song.duration)}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 昵称弹窗 */}
      <GuestNameDialog
        open={showNameDialog}
        onClose={() => { setShowNameDialog(false); setPendingAction(null); }}
        onConfirm={handleNameConfirmed}
      />

      {/* Request Dialog */}
      <Dialog open={!!requestSong && !showNameDialog} onOpenChange={(v) => !v && setRequestSong(null)}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">确认点歌</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Music2 size={16} className="text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{requestSong?.title}</p>
                <p className="text-xs text-muted-foreground">{requestSong?.artist || "未知艺人"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>点歌人：</span>
              <span className="text-primary font-medium">{guestName || "匿名观众"}</span>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">留言给歌手（可选）</label>
              <Textarea
                placeholder="写下你想说的话..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                className="bg-input border-border resize-none text-sm"
                rows={2}
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRequestSong(null)} className="border-border">取消</Button>
            <Button
              onClick={handleRequest}
              disabled={requestMutation.isPending}
              className="bg-primary text-primary-foreground flex-1"
            >
              {requestMutation.isPending ? "提交中..." : "确认点歌"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tip Dialog */}
      <Dialog open={tipOpen} onOpenChange={setTipOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              {tipSuccess ? "打赏成功！" : `打赏 ${performer.name}`}
            </DialogTitle>
          </DialogHeader>
          {tipSuccess ? (
            <div className="flex flex-col items-center py-6 space-y-3">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-primary" />
              </motion.div>
              <p className="text-muted-foreground text-sm">感谢你的支持！</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>打赏人：</span>
                <span className="text-primary font-medium">{guestName || "热心观众"}</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">选择打赏金额</p>
                <div className="grid grid-cols-3 gap-2">
                  {TIP_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTipAmount(amount)}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        tipAmount === amount
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/30 text-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      ¥{amount}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">留言（可选）</label>
                <Input
                  placeholder="写下祝福..."
                  value={tipMessage}
                  onChange={(e) => setTipMessage(e.target.value)}
                  className="bg-input border-border text-sm"
                  maxLength={50}
                />
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 text-xs text-muted-foreground">
                <Heart size={12} className="text-primary shrink-0" />
                <span>打赏将直接支持歌手的演出</span>
              </div>
            </div>
          )}
          {!tipSuccess && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setTipOpen(false)} className="border-border">取消</Button>
              <Button
                onClick={handleTip}
                disabled={meiTuanPayMutation.isPending}
                className="bg-primary text-primary-foreground flex-1 gap-2"
              >
                <Gift size={14} />
                {meiTuanPayMutation.isPending ? "处理中..." : `打赏 ¥${tipAmount}`}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
