import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Globe,
  Copy,
  ExternalLink,
  CheckCircle2,
  Settings,
  QrCode,
  Link2,
} from "lucide-react";

const CUSTOM_BASE_URL_KEY = "bar_custom_base_url";

export default function AdminSiteSettings() {
  const [currentOrigin] = useState(() => window.location.origin);
  const [customUrl, setCustomUrl] = useState(() => {
    return localStorage.getItem(CUSTOM_BASE_URL_KEY) || "";
  });
  const [inputUrl, setInputUrl] = useState(customUrl);
  const [saved, setSaved] = useState(false);

  const effectiveUrl = customUrl || currentOrigin;

  const handleSave = () => {
    let url = inputUrl.trim();
    // 规范化：去掉末尾斜杠
    if (url.endsWith("/")) url = url.slice(0, -1);
    // 如果没有协议头，自动补充
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    localStorage.setItem(CUSTOM_BASE_URL_KEY, url);
    setCustomUrl(url);
    setInputUrl(url);
    setSaved(true);
    toast.success("网址已保存，二维码将使用新网址生成");
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClear = () => {
    localStorage.removeItem(CUSTOM_BASE_URL_KEY);
    setCustomUrl("");
    setInputUrl("");
    toast.success("已恢复使用默认网址");
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => toast.success("已复制"));
  };

  const routes = [
    { label: "观众点歌首页", path: "/", desc: "观众扫码进入的主页面" },
    { label: "歌手工作台", path: "/stage", desc: "歌手查看点歌队列" },
    { label: "管理后台", path: "/admin", desc: "管理演出场次和歌手" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif text-foreground">网址设置</h1>
        <p className="text-sm text-muted-foreground mt-1">
          设置系统对外使用的网址，影响二维码生成和链接分享
        </p>
      </div>

      <div className="divider-gold" />

      {/* 当前网址 */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Globe size={15} className="text-primary" />
          当前使用网址
        </h2>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
          <span className="flex-1 text-sm font-mono text-foreground break-all">{effectiveUrl}</span>
          {customUrl ? (
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs shrink-0">自定义</Badge>
          ) : (
            <Badge variant="outline" className="text-xs border-border text-muted-foreground shrink-0">默认</Badge>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-primary shrink-0"
            onClick={() => copyUrl(effectiveUrl)}
          >
            <Copy size={13} />
          </Button>
        </div>
      </div>

      {/* 自定义网址 */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Settings size={15} className="text-primary" />
          自定义网址
        </h2>
        <p className="text-xs text-muted-foreground">
          如果你已绑定自定义域名（如 www.barsong.vip），在此输入后，生成的二维码和分享链接将使用该域名。
        </p>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">自定义域名</Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://www.barsong.vip"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="bg-input border-border font-mono text-sm flex-1"
            />
            <Button
              onClick={handleSave}
              className={`gap-1.5 shrink-0 ${saved ? "bg-green-600 hover:bg-green-700" : "bg-primary text-primary-foreground"}`}
            >
              {saved ? <CheckCircle2 size={14} /> : null}
              {saved ? "已保存" : "保存"}
            </Button>
            {customUrl && (
              <Button
                variant="outline"
                onClick={handleClear}
                className="border-border text-muted-foreground shrink-0"
              >
                恢复默认
              </Button>
            )}
          </div>
        </div>

        {/* 绑定域名说明 */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2 text-sm">
          <p className="font-medium text-foreground flex items-center gap-2">
            <Link2 size={14} className="text-primary" />
            如何绑定自定义域名？
          </p>
          <ol className="space-y-1.5 text-muted-foreground text-xs list-decimal list-inside">
            <li>点击右上角「Publish」发布网站</li>
            <li>在管理面板右侧找到「Settings → Domains」</li>
            <li>输入你的域名（如 barsong.vip），按提示配置 DNS 解析</li>
            <li>域名生效后，回到此页面填写域名并保存</li>
          </ol>
          <p className="text-xs text-muted-foreground pt-1">
            当前已绑定域名：
            <span className="text-primary ml-1">www.barsong.vip · barsong.vip</span>
          </p>
        </div>
      </div>

      {/* 各端链接预览 */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          <QrCode size={15} className="text-primary" />
          各端链接预览
        </h2>
        <div className="space-y-2">
          {routes.map((r) => {
            const fullUrl = effectiveUrl + r.path;
            return (
              <div key={r.path} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                  <p className="text-xs font-mono text-primary mt-0.5 truncate">{fullUrl}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={() => copyUrl(fullUrl)}
                    title="复制链接"
                  >
                    <Copy size={12} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={() => window.open(fullUrl, "_blank")}
                    title="在新标签打开"
                  >
                    <ExternalLink size={12} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
