import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGuest } from "@/contexts/GuestContext";
import { Mic2, User } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  /** 确认昵称后的回调，传入昵称 */
  onConfirm?: (name: string) => void;
};

export function GuestNameDialog({ open, onClose, onConfirm }: Props) {
  const { guestName, setGuestName } = useGuest();
  const [input, setInput] = useState(guestName || "");

  const handleConfirm = () => {
    const name = input.trim();
    if (!name) return;
    setGuestName(name);
    onConfirm?.(name);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border text-foreground max-w-sm mx-4">
        <DialogHeader>
          <div className="flex flex-col items-center gap-3 pb-2">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <Mic2 size={24} className="text-primary" />
            </div>
            <DialogTitle className="font-serif text-xl text-center">
              欢迎来到点歌台
            </DialogTitle>
            <p className="text-sm text-muted-foreground text-center">
              请输入你的昵称，让歌手知道是谁在点歌
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="输入你的昵称"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              className="pl-9 bg-input border-border text-base"
              maxLength={20}
              autoFocus
            />
          </div>
          <Button
            onClick={handleConfirm}
            disabled={!input.trim()}
            className="w-full bg-primary text-primary-foreground text-base py-5"
          >
            进入点歌台
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
