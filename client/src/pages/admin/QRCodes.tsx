import { useState, useRef, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  QrCode,
  Plus,
  Trash2,
  Download,
  Printer,
  Settings2,
  RefreshCw,
  Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "bar_qr_tables";

type TableConfig = {
  id: string;
  tableNo: string;
  label: string;
};

function loadTables(): TableConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  // 默认 8 桌
  return Array.from({ length: 8 }, (_, i) => ({
    id: String(i + 1),
    tableNo: String(i + 1),
    label: `${i + 1} 号桌`,
  }));
}

function saveTables(tables: TableConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
}

const CUSTOM_BASE_URL_KEY = "bar_custom_base_url";

/** 生成带桌号参数的点歌链接 */
function buildUrl(tableNo: string): string {
  const customBase = localStorage.getItem(CUSTOM_BASE_URL_KEY);
  const base = customBase || window.location.origin;
  return `${base}/?table=${encodeURIComponent(tableNo)}`;
}

/** 用 canvas 渲染二维码，返回 data URL */
async function generateQRDataUrl(text: string, size = 300): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    color: { dark: "#1a1008", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}

/** 单个二维码卡片 */
function QRCard({
  table,
  onDelete,
  onLabelChange,
}: {
  table: TableConfig;
  onDelete: () => void;
  onLabelChange: (label: string) => void;
}) {
  const [qrUrl, setQrUrl] = useState<string>("");
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelInput, setLabelInput] = useState(table.label);
  const url = buildUrl(table.tableNo);

  useEffect(() => {
    generateQRDataUrl(url).then(setQrUrl);
  }, [url]);

  const handleDownload = () => {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `点歌二维码-${table.label}.png`;
    a.click();
    toast.success(`${table.label} 二维码已下载`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => toast.success("链接已复制"));
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="glass-card rounded-2xl p-5 flex flex-col items-center gap-3 group"
    >
      {/* 二维码图片 */}
      <div className="relative">
        {qrUrl ? (
          <img
            src={qrUrl}
            alt={`${table.label} 二维码`}
            className="w-40 h-40 rounded-xl border border-border"
          />
        ) : (
          <div className="w-40 h-40 rounded-xl bg-muted flex items-center justify-center">
            <RefreshCw size={24} className="text-muted-foreground animate-spin" />
          </div>
        )}
        {/* 桌号角标 */}
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
          {table.tableNo}
        </div>
      </div>

      {/* 桌号标签（可编辑） */}
      {editingLabel ? (
        <div className="flex gap-1 w-full">
          <Input
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onLabelChange(labelInput);
                setEditingLabel(false);
              }
              if (e.key === "Escape") setEditingLabel(false);
            }}
            className="h-7 text-sm text-center bg-input border-border"
            autoFocus
          />
          <Button
            size="sm"
            className="h-7 px-2 bg-primary text-primary-foreground"
            onClick={() => { onLabelChange(labelInput); setEditingLabel(false); }}
          >
            ✓
          </Button>
        </div>
      ) : (
        <button
          onClick={() => { setLabelInput(table.label); setEditingLabel(true); }}
          className="text-sm font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          {table.label}
          <Settings2 size={11} className="opacity-0 group-hover:opacity-60 transition-opacity" />
        </button>
      )}

      <p className="text-xs text-muted-foreground text-center truncate w-full px-1" title={url}>
        {url.replace(window.location.origin, "...")}
      </p>

      {/* 操作按钮 */}
      <div className="flex gap-1.5 w-full">
        <Button
          size="sm"
          onClick={handleDownload}
          disabled={!qrUrl}
          className="flex-1 bg-primary text-primary-foreground gap-1 text-xs"
        >
          <Download size={12} />
          下载
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="border-border text-muted-foreground hover:text-foreground gap-1 text-xs"
        >
          <Copy size={12} />
          复制链接
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDelete}
          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
        >
          <Trash2 size={13} />
        </Button>
      </div>
    </motion.div>
  );
}

export default function AdminQRCodes() {
  const [tables, setTables] = useState<TableConfig[]>(loadTables);
  const [batchCount, setBatchCount] = useState("8");
  const [batchPrefix, setBatchPrefix] = useState("");
  const [customTableNo, setCustomTableNo] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  // 持久化
  useEffect(() => { saveTables(tables); }, [tables]);

  const addTable = () => {
    const no = customTableNo.trim() || String(tables.length + 1);
    const label = customLabel.trim() || `${no} 号桌`;
    if (tables.some((t) => t.tableNo === no)) {
      toast.error(`桌号 ${no} 已存在`);
      return;
    }
    setTables((prev) => [...prev, { id: Date.now().toString(), tableNo: no, label }]);
    setCustomTableNo("");
    setCustomLabel("");
    toast.success(`已添加 ${label}`);
  };

  const batchGenerate = () => {
    const count = Math.min(Math.max(1, Number(batchCount) || 8), 100);
    const prefix = batchPrefix.trim();
    const newTables: TableConfig[] = Array.from({ length: count }, (_, i) => {
      const no = prefix ? `${prefix}${i + 1}` : String(i + 1);
      const label = `${no} 号桌`;
      return { id: `${Date.now()}_${i}`, tableNo: no, label };
    });
    setTables(newTables);
    toast.success(`已生成 ${count} 个桌号二维码`);
  };

  const deleteTable = (id: string) => {
    setTables((prev) => prev.filter((t) => t.id !== id));
  };

  const updateLabel = (id: string, label: string) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, label } : t)));
  };

  const downloadAll = async () => {
    toast.info("正在生成所有二维码，请稍候...");
    for (const table of tables) {
      const url = buildUrl(table.tableNo);
      const dataUrl = await generateQRDataUrl(url, 400);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `点歌二维码-${table.label}.png`;
      a.click();
      await new Promise((r) => setTimeout(r, 200));
    }
    toast.success(`已下载 ${tables.length} 个二维码`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-foreground">桌号二维码</h1>
          <p className="text-sm text-muted-foreground mt-1">
            为每张桌子生成专属点歌二维码，观众扫码即可进入点歌台
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="border-border gap-2"
          >
            <Printer size={15} />
            打印全部
          </Button>
          <Button
            onClick={downloadAll}
            disabled={tables.length === 0}
            className="bg-primary text-primary-foreground gap-2"
          >
            <Download size={15} />
            下载全部
          </Button>
        </div>
      </div>

      <div className="divider-gold" />

      {/* 批量生成 */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          <QrCode size={15} className="text-primary" />
          批量生成
        </h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">桌号前缀（可选）</Label>
            <Input
              placeholder="如：A、VIP"
              value={batchPrefix}
              onChange={(e) => setBatchPrefix(e.target.value)}
              className="w-32 h-8 text-sm bg-input border-border"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">生成数量</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={batchCount}
              onChange={(e) => setBatchCount(e.target.value)}
              className="w-24 h-8 text-sm bg-input border-border"
            />
          </div>
          <Button
            onClick={batchGenerate}
            size="sm"
            className="bg-primary text-primary-foreground gap-1.5"
          >
            <RefreshCw size={13} />
            批量生成
          </Button>
          <p className="text-xs text-muted-foreground self-end pb-1">
            将生成 {batchPrefix || ""}{1} ~ {batchPrefix || ""}{batchCount} 号桌
          </p>
        </div>
      </div>

      {/* 单独添加 */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Plus size={15} className="text-primary" />
          单独添加桌号
        </h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">桌号</Label>
            <Input
              placeholder="如：VIP1、包厢A"
              value={customTableNo}
              onChange={(e) => setCustomTableNo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTable()}
              className="w-36 h-8 text-sm bg-input border-border"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">显示名称（可选）</Label>
            <Input
              placeholder="如：VIP包厢1号"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTable()}
              className="w-40 h-8 text-sm bg-input border-border"
            />
          </div>
          <Button onClick={addTable} size="sm" variant="outline" className="border-border gap-1.5">
            <Plus size={13} />
            添加
          </Button>
        </div>
      </div>

      {/* 二维码网格 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            共 {tables.length} 个桌号
          </h2>
          {tables.length > 0 && (
            <button
              onClick={() => { if (confirm("确认清空所有桌号？")) setTables([]); }}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              清空全部
            </button>
          )}
        </div>

        {tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <QrCode size={48} className="mb-4 opacity-30" />
            <p>暂无桌号，请使用上方工具生成</p>
          </div>
        ) : (
          <div
            ref={printRef}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          >
            <AnimatePresence>
              {tables.map((table) => (
                <QRCard
                  key={table.id}
                  table={table}
                  onDelete={() => deleteTable(table.id)}
                  onLabelChange={(label) => updateLabel(table.id, label)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 打印样式 */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
