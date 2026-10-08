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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Music, Clock, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type PerformerForm = {
  name: string;
  gender: "male" | "female" | "other";
  bio: string;
  performDuration: number;
  maxSongsPerSession: number;
};

const defaultForm: PerformerForm = {
  name: "",
  gender: "other",
  bio: "",
  performDuration: 45,
  maxSongsPerSession: 6,
};

export default function AdminPerformers() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<PerformerForm>(defaultForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: performers = [], isLoading } = trpc.performer.listAll.useQuery();

  const createMutation = trpc.performer.create.useMutation({
    onSuccess: () => {
      utils.performer.listAll.invalidate();
      utils.performer.list.invalidate();
      toast.success("歌手已创建");
      setOpen(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.performer.update.useMutation({
    onSuccess: () => {
      utils.performer.listAll.invalidate();
      utils.performer.list.invalidate();
      toast.success("歌手信息已更新");
      setOpen(false);
      setEditId(null);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.performer.delete.useMutation({
    onSuccess: () => {
      utils.performer.listAll.invalidate();
      utils.performer.list.invalidate();
      toast.success("歌手已删除");
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error("请输入歌手姓名");
    if (editId) {
      updateMutation.mutate({ id: editId, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const openEdit = (p: (typeof performers)[0]) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      gender: p.gender,
      bio: p.bio || "",
      performDuration: p.performDuration,
      maxSongsPerSession: p.maxSongsPerSession,
    });
    setOpen(true);
  };

  const genderLabel = { male: "男", female: "女", other: "其他" };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-foreground">歌手管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理驻场歌手信息与演出设置</p>
        </div>
        <Button
          onClick={() => { setEditId(null); setForm(defaultForm); setOpen(true); }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
        >
          <Plus size={16} />
          添加歌手
        </Button>
      </div>

      {/* Divider */}
      <div className="divider-gold" />

      {/* Performers Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-card animate-pulse" />
          ))}
        </div>
      ) : performers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Music size={48} className="mb-4 opacity-30" />
          <p className="text-lg">暂无歌手</p>
          <p className="text-sm mt-1">点击「添加歌手」开始创建</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {performers.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card rounded-xl p-5 space-y-4 group hover:gold-glow transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-serif text-lg font-semibold">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{p.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                          {genderLabel[p.gender]}
                        </Badge>
                        {!p.isActive && (
                          <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">
                            已停用
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(p.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {p.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{p.bio}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border">
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-primary" />
                    {p.performDuration} 分钟/场
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} className="text-primary" />
                    最多 {p.maxSongsPerSession} 首/场
                  </span>
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
              {editId ? "编辑歌手" : "添加歌手"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>姓名 *</Label>
              <Input
                placeholder="歌手姓名"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label>性别</Label>
              <Select
                value={form.gender}
                onValueChange={(v) => setForm({ ...form, gender: v as "male" | "female" | "other" })}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="male">男</SelectItem>
                  <SelectItem value="female">女</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>表演时长（分钟）</Label>
                <Input
                  type="number"
                  min={1}
                  max={300}
                  value={form.performDuration}
                  onChange={(e) => setForm({ ...form, performDuration: Number(e.target.value) })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label>每场最多点歌数</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={form.maxSongsPerSession}
                  onChange={(e) => setForm({ ...form, maxSongsPerSession: Number(e.target.value) })}
                  className="bg-input border-border"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>简介</Label>
              <Textarea
                placeholder="歌手简介（可选）"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="bg-input border-border resize-none"
                rows={3}
              />
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
              {editId ? "保存修改" : "创建歌手"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm py-2">
            删除后歌手将不再显示在观众端，相关数据仍会保留。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="border-border">
              取消
            </Button>
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
    </div>
  );
}
