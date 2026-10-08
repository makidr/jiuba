import { useState } from "react";
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
import { Plus, Pencil, Trash2, Music2, Download, Search, Clock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function formatDuration(seconds?: number | null) {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type SongForm = {
  title: string;
  artist: string;
  album: string;
  duration: string;
};

const defaultForm: SongForm = { title: "", artist: "", album: "", duration: "" };

export default function AdminSongs() {
  const utils = trpc.useUtils();
  const [selectedPerformerId, setSelectedPerformerId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<SongForm>(defaultForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<{ name: string; tracks: { neteaseId: string; title: string; artist: string; album: string; duration: number; coverUrl: string | null }[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: performers = [] } = trpc.performer.listAll.useQuery();
  const { data: songs = [], isLoading: songsLoading } = trpc.song.listByPerformer.useQuery(
    { performerId: selectedPerformerId! },
    { enabled: !!selectedPerformerId }
  );

  const createMutation = trpc.song.create.useMutation({
    onSuccess: () => {
      if (selectedPerformerId) utils.song.listByPerformer.invalidate({ performerId: selectedPerformerId });
      toast.success("歌曲已添加");
      setOpen(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.song.update.useMutation({
    onSuccess: () => {
      if (selectedPerformerId) utils.song.listByPerformer.invalidate({ performerId: selectedPerformerId });
      toast.success("歌曲已更新");
      setOpen(false);
      setEditId(null);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.song.delete.useMutation({
    onSuccess: () => {
      if (selectedPerformerId) utils.song.listByPerformer.invalidate({ performerId: selectedPerformerId });
      toast.success("歌曲已删除");
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkImportMutation = trpc.song.bulkImport.useMutation({
    onSuccess: (data) => {
      if (selectedPerformerId) utils.song.listByPerformer.invalidate({ performerId: selectedPerformerId });
      toast.success(`成功导入 ${data.imported} 首歌曲`);
      setImportOpen(false);
      setImportPreview(null);
      setPlaylistUrl("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!selectedPerformerId) return toast.error("请先选择歌手");
    if (!form.title.trim()) return toast.error("请输入歌曲名称");
    const data = {
      performerId: selectedPerformerId,
      title: form.title,
      artist: form.artist || undefined,
      album: form.album || undefined,
      duration: form.duration ? Number(form.duration) * 60 : undefined,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const fetchPlaylist = async () => {
    if (!playlistUrl.trim()) return toast.error("请输入歌单链接");
    const match = playlistUrl.match(/id=(\d+)/) || playlistUrl.match(/\/(\d+)$/);
    const id = match?.[1];
    if (!id) return toast.error("无法识别歌单 ID，请粘贴完整的网易云歌单链接");

    setImportLoading(true);
    try {
      const res = await fetch(`/api/netease/playlist/${id}`);
      if (!res.ok) throw new Error("获取歌单失败");
      const data = await res.json();
      setImportPreview(data);
    } catch (e) {
      toast.error("获取歌单失败，请检查链接或稍后重试");
    } finally {
      setImportLoading(false);
    }
  };

  const handleImport = () => {
    if (!selectedPerformerId || !importPreview) return;
    bulkImportMutation.mutate({
      performerId: selectedPerformerId,
      songs: importPreview.tracks.map(t => ({ ...t, coverUrl: t.coverUrl ?? undefined })),
    });
  };

  const filteredSongs = songs.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.artist || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-foreground">歌曲管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理歌手曲库，支持网易云歌单批量导入</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            disabled={!selectedPerformerId}
            className="border-border gap-2"
          >
            <Download size={16} />
            导入歌单
          </Button>
          <Button
            onClick={() => { setEditId(null); setForm(defaultForm); setOpen(true); }}
            disabled={!selectedPerformerId}
            className="bg-primary text-primary-foreground gap-2"
          >
            <Plus size={16} />
            添加歌曲
          </Button>
        </div>
      </div>

      <div className="divider-gold" />

      {/* Performer Selector */}
      <div className="flex items-center gap-4">
        <Label className="text-muted-foreground shrink-0">选择歌手</Label>
        <Select
          value={selectedPerformerId?.toString() || ""}
          onValueChange={(v) => setSelectedPerformerId(Number(v))}
        >
          <SelectTrigger className="w-48 bg-input border-border">
            <SelectValue placeholder="请选择歌手" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {performers.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedPerformerId && (
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索歌曲..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-input border-border"
            />
          </div>
        )}
      </div>

      {/* Songs List */}
      {!selectedPerformerId ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Music2 size={48} className="mb-4 opacity-30" />
          <p>请先选择一位歌手</p>
        </div>
      ) : songsLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-card animate-pulse" />
          ))}
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Music2 size={40} className="mb-3 opacity-30" />
          <p>{searchQuery ? "未找到匹配歌曲" : "该歌手暂无歌曲"}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground px-2 pb-1">
            共 {filteredSongs.length} 首歌曲
          </div>
          <AnimatePresence>
            {filteredSongs.map((song, idx) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card border border-border hover:border-primary/30 group transition-all"
              >
                <span className="text-xs text-muted-foreground w-6 text-center">{idx + 1}</span>
                {song.coverUrl ? (
                  <img src={song.coverUrl} alt="" className="w-10 h-10 rounded object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                    <Music2 size={16} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{song.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[song.artist, song.album].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock size={11} />
                  {formatDuration(song.duration)}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={() => {
                      setEditId(song.id);
                      setForm({
                        title: song.title,
                        artist: song.artist || "",
                        album: song.album || "",
                        duration: song.duration ? String(Math.floor(song.duration / 60)) : "",
                      });
                      setOpen(true);
                    }}
                  >
                    <Pencil size={12} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(song.id)}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editId ? "编辑歌曲" : "添加歌曲"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>歌曲名称 *</Label>
              <Input
                placeholder="歌曲名称"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label>歌手/艺人</Label>
              <Input
                placeholder="歌手或艺人名"
                value={form.artist}
                onChange={(e) => setForm({ ...form, artist: e.target.value })}
                className="bg-input border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>专辑</Label>
                <Input
                  placeholder="专辑名"
                  value={form.album}
                  onChange={(e) => setForm({ ...form, album: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label>时长（分钟）</Label>
                <Input
                  type="number"
                  placeholder="如：4"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-border">
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-primary text-primary-foreground"
            >
              {editId ? "保存修改" : "添加歌曲"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm py-2">删除后该歌曲将不再显示在点歌列表中。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="border-border">取消</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) { setImportPreview(null); setPlaylistUrl(""); } }}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">导入网易云歌单</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>网易云歌单链接</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://music.163.com/playlist?id=..."
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  className="bg-input border-border flex-1"
                />
                <Button
                  onClick={fetchPlaylist}
                  disabled={importLoading}
                  variant="outline"
                  className="border-border shrink-0"
                >
                  {importLoading ? "获取中..." : "获取"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                支持格式：https://music.163.com/playlist?id=XXXXXX
              </p>
            </div>

            {importPreview && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-primary">
                    《{importPreview.name}》
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {importPreview.tracks.length} 首歌曲
                  </Badge>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg bg-muted/30 p-2">
                  {importPreview.tracks.slice(0, 20).map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1">
                      <span className="text-muted-foreground w-5 text-right">{i + 1}</span>
                      <span className="flex-1 truncate">{t.title}</span>
                      <span className="text-muted-foreground truncate max-w-24">{t.artist}</span>
                    </div>
                  ))}
                  {importPreview.tracks.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      ...还有 {importPreview.tracks.length - 20} 首
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setImportOpen(false); setImportPreview(null); setPlaylistUrl(""); }}
              className="border-border"
            >
              取消
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importPreview || bulkImportMutation.isPending}
              className="bg-primary text-primary-foreground"
            >
              {bulkImportMutation.isPending ? "导入中..." : `导入全部 ${importPreview?.tracks.length || 0} 首`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
