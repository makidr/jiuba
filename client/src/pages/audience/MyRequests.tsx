import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGuest } from "@/contexts/GuestContext";
import { GuestNameDialog } from "@/components/GuestNameDialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Music2, Clock } from "lucide-react";
import { motion } from "framer-motion";

const statusConfig = {
  pending: { label: "等待中", className: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10" },
  playing: { label: "演唱中", className: "border-green-500/30 text-green-400 bg-green-500/10" },
  done: { label: "已完成", className: "border-border text-muted-foreground bg-muted/20" },
  skipped: { label: "已跳过", className: "border-red-500/30 text-red-400 bg-red-500/10" },
};

export default function MyRequests() {
  const { guestToken, guestName, hasName } = useGuest();
  const [showNameDialog, setShowNameDialog] = useState(false);

  const { data: requests = [], isLoading } = trpc.request.myRequestsByToken.useQuery(
    { guestToken },
    { enabled: !!guestToken }
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <h1 className="font-serif font-semibold text-foreground flex-1">我的点歌</h1>
          {hasName && (
            <button
              onClick={() => setShowNameDialog(true)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {guestName}
            </button>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Music2 size={40} className="mb-3 opacity-30" />
            <p className="text-sm">暂无点歌记录</p>
            <Link href="/">
              <Button variant="ghost" size="sm" className="mt-3 text-primary">
                去点歌
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">共 {requests.length} 条记录</p>
            <div className="space-y-2">
              {requests.map(({ request, song, performer }, idx) => {
                const cfg = statusConfig[request.status];
                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="glass-card rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      {song.coverUrl ? (
                        <img src={song.coverUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Music2 size={18} className="text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{song.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {[song.artist, song.album].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <Badge className={`text-xs shrink-0 ${cfg.className}`}>
                            {cfg.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>歌手：{performer.name}</span>
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(request.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {request.message && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            "{request.message}"
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="pb-safe h-8" />

      <GuestNameDialog
        open={showNameDialog}
        onClose={() => setShowNameDialog(false)}
      />
    </div>
  );
}
