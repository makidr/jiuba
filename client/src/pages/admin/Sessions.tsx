import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Play, Square, Calendar, Clock, Timer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const statusConfig = {
  upcoming: { label: "待开始", className: "border-yellow-500/30 text-yellow-400" },
  active: { label: "演出中", className: "border-green-500/30 text-green-400" },
  ended: { label: "已结束", className: "border-border text-muted-foreground" },
};

/** 格式化秒数为 mm:ss */
function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** 倒计时 Hook */
function useCountdown(startedAt: Date | null, durationMinutes: number, onEnd: () => void) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!startedAt) { setRemaining(null); return; }
    const totalMs = durationMinutes * 60 * 1000;
    const tick = () => {
      const elapsed = Date.now() - new Date(startedAt).getTime();
      const left = Math.max(0, Math.floor((totalMs - elapsed) / 1000));
      setRemaining(left);
      if (left === 0) onEnd();
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [startedAt, durationMinutes]);

  return remaining;
}

function SessionCard({
  session,
  performerName,
  performDuration,
  onStart,
  onEnd,
  startPending,
  endPending,
}: {
  session: { id: number; status: "upcoming" | "active" | "ended"; title: string | null; startedAt: Date | null; endedAt: Date | null; createdAt: Date };
  performerName: string;
  performDuration: number;
  onStart: () => void;
  onEnd: () => void;
  startPending: boolean;
  endPending: boolean;
}) {
  const cfg = statusConfig[session.status];
  const [autoEnded, setAutoEnded] = useState(false);

  const handleAutoEnd = useCallback(() => {
    if (!autoEnded && session.status === "active") {
      setAutoEnded(true);
      onEnd();
      toast.info(`${performerName} 表演时间到，已自动结束演出`);
    }
  }, [autoEnded, session.status, onEnd, performerName]);

  const remaining = useCountdown(
    session.status === "active" ? session.startedAt : null,
    performDuration,
    handleAutoEnd
  );

  const isUrgent = remaining !== null && remaining <= 300; // 最后5分钟变红

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card rounded-xl p-5 border transition-all ${
        session.status === "active" ? "border-green-500/30 gold-glow" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">
              {session.title || `场次 #${session.id}`}
            </h3>
            <Badge variant="outline" className={`text-xs shrink-0 ${cfg.className}`}>
              {cfg.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            歌手：<span className="text-foreground font-medium">{performerName}</span>
            <span className="mx-2 text-border">·</span>
            <span className="flex items-center gap-1 inline-flex">
              <Timer size={11} />
              表演时长 {performDuration} 分钟
            </span>
          </p>
          {session.status === "active" && session.startedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              开始于 {new Date(session.startedAt).toLocaleTimeString()}
            </p>
          )}
          {session.status === "ended" && session.endedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              结束于 {new Date(session.endedAt).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* 倒计时 */}
        {session.status === "active" && remaining !== null && (
          <div className={`text-center shrink-0 px-3 py-2 rounded-lg ${
            isUrgent ? "bg-red-500/20 border border-red-500/30" : "bg-primary/10 border border-primary/20"
          }`}>
            <p className="text-xs text-muted-foreground mb-0.5">剩余时间</p>
            <p className={`text-2xl font-mono font-bold tabular-nums ${
              isUrgent ? "text-red-400" : "text-primary"
            }`}>
              {formatCountdown(remaining)}
            </p>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 mt-4">
        {session.status === "upcoming" && (
          <Button
            onClick={onStart}
            disabled={startPending}
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            <Play size={14} />
            {startPending ? "开始中..." : "开始演出"}
          </Button>
        )}
        {session.status === "active" && (
          <Button
            variant="outline"
            onClick={onEnd}
            disabled={endPending}
            className="border-red-500/50 text-red-400 hover:bg-red-500/10 gap-2"
          >
            <Square size={14} />
            {endPending ? "结束中..." : "手动结束演出"}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export default function AdminSessions() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ performerId: "", title: "" });

  const { data: sessions = [], isLoading } = trpc.session.list.useQuery();
  const { data: performers = [] } = trpc.performer.listAll.useQuery();

  const createMutation = trpc.session.create.useMutation({
    onSuccess: () => {
      utils.session.list.invalidate();
      toast.success("场次已创建");
      setOpen(false);
      setForm({ performerId: "", title: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const startMutation = trpc.session.start.useMutation({
    onSuccess: () => {
      utils.session.list.invalidate();
      utils.performer.list.invalidate();
      toast.success("演出已开始！歌手端和观众端已同步更新");
    },
    onError: (e) => toast.error(e.message),
  });

  const endMutation = trpc.session.end.useMutation({
    onSuccess: () => {
      utils.session.list.invalidate();
      utils.performer.list.invalidate();
      toast.success("演出已结束，歌手端和观众端已同步关闭");
    },
    onError: (e) => toast.error(e.message),
  });

  // 按状态排序：active > upcoming > ended
  const sortedSessions = [...sessions].sort((a, b) => {
    const order = { active: 0, upcoming: 1, ended: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-foreground">场次管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            创建场次并控制演出开始/结束，系统将自动同步到歌手端和观众端
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="bg-primary text-primary-foreground gap-2"
        >
          <Plus size={16} />
          新建场次
        </Button>
      </div>

      <div className="divider-gold" />

      {/* 说明卡片 */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-muted-foreground space-y-1">
        <p className="text-foreground font-medium flex items-center gap-2">
          <Clock size={14} className="text-primary" />
          演出流程说明
        </p>
        <p>1. 新建场次 → 选择歌手和场次标题</p>
        <p>2. 点击「开始演出」→ 歌手端显示该歌手，观众端开放点歌，倒计时开始</p>
        <p>3. 倒计时结束自动结束演出，或点击「手动结束演出」提前结束</p>
        <p>4. 结束后歌手端和观众端自动同步关闭该歌手</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-28 rounded-xl bg-card animate-pulse" />)}
        </div>
      ) : sortedSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Calendar size={48} className="mb-4 opacity-30" />
          <p>暂无场次，点击「新建场次」开始</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {sortedSessions.map((s) => {
              const performer = performers.find((p) => p.id === s.performerId);
              return (
                <SessionCard
                  key={s.id}
                  session={s as any}
                  performerName={performer?.name || "未知歌手"}
                  performDuration={performer?.performDuration ?? 45}
                  onStart={() => startMutation.mutate({ id: s.id })}
                  onEnd={() => endMutation.mutate({ id: s.id })}
                  startPending={startMutation.isPending}
                  endPending={endMutation.isPending}
                />
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">新建场次</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>歌手 *</Label>
              <Select value={form.performerId} onValueChange={(v) => setForm({ ...form, performerId: v })}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="选择歌手" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {performers.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name}（{p.performDuration}分钟/场）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>场次标题（可选）</Label>
              <Input
                placeholder="如：周五夜场"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-input border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-border">取消</Button>
            <Button
              onClick={() => {
                if (!form.performerId) return toast.error("请选择歌手");
                createMutation.mutate({
                  performerId: Number(form.performerId),
                  title: form.title || undefined,
                });
              }}
              disabled={createMutation.isPending}
              className="bg-primary text-primary-foreground"
            >
              创建场次
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
