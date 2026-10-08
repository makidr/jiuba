import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, DollarSign, Users, Gift } from "lucide-react";

const COLORS = [
  "oklch(0.78 0.14 80)",
  "oklch(0.65 0.18 200)",
  "oklch(0.72 0.15 150)",
  "oklch(0.68 0.20 320)",
  "oklch(0.70 0.18 50)",
];

export default function AdminRevenue() {
  const { data: stats = [], isLoading } = trpc.tip.revenueStats.useQuery();
  const { data: allTips = [], isLoading: tipsLoading } = trpc.tip.list.useQuery({ limit: 100, offset: 0 });

  // 按日期聚合
  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    stats.forEach((s) => {
      const date = s.date || "";
      map.set(date, (map.get(date) || 0) + parseFloat(s.total || "0"));
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, total]) => ({
        date: date.slice(5), // MM-DD
        total: parseFloat(total.toFixed(2)),
      }));
  }, [stats]);

  // 按歌手聚合
  const performerData = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    stats.forEach((s) => {
      const key = s.performerName || "未知";
      const existing = map.get(key) || { name: key, total: 0, count: 0 };
      map.set(key, {
        name: key,
        total: existing.total + parseFloat(s.total || "0"),
        count: existing.count + Number(s.count || 0),
      });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [stats]);

  const totalRevenue = performerData.reduce((sum, p) => sum + p.total, 0);
  const totalTips = performerData.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif text-foreground">收益统计</h1>
        <p className="text-sm text-muted-foreground mt-1">打赏数据汇总与趋势分析</p>
      </div>

      <div className="divider-gold" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">总打赏金额</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  ¥{totalRevenue.toFixed(2)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <DollarSign size={18} className="text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">打赏次数</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalTips}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Gift size={18} className="text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">参与歌手</p>
                <p className="text-2xl font-bold text-foreground mt-1">{performerData.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Users size={18} className="text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Trend */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              近 14 天打赏趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-48 bg-muted/30 rounded animate-pulse" />
            ) : dailyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                暂无数据
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 270)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "oklch(0.55 0.01 80)", fontSize: 11 }}
                    axisLine={{ stroke: "oklch(0.28 0.01 270)" }}
                  />
                  <YAxis
                    tick={{ fill: "oklch(0.55 0.01 80)", fontSize: 11 }}
                    axisLine={{ stroke: "oklch(0.28 0.01 270)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.18 0.01 270)",
                      border: "1px solid oklch(0.28 0.01 270)",
                      borderRadius: "8px",
                      color: "oklch(0.93 0.01 80)",
                    }}
                    formatter={(v: number) => [`¥${v}`, "打赏金额"]}
                  />
                  <Bar dataKey="total" fill="oklch(0.78 0.14 80)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Performer Pie */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Gift size={16} className="text-primary" />
              歌手收益占比
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-48 bg-muted/30 rounded animate-pulse" />
            ) : performerData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                暂无数据
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={performerData}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    strokeWidth={0}
                  >
                    {performerData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.18 0.01 270)",
                      border: "1px solid oklch(0.28 0.01 270)",
                      borderRadius: "8px",
                      color: "oklch(0.93 0.01 80)",
                    }}
                    formatter={(v: number) => [`¥${v.toFixed(2)}`, "打赏金额"]}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: "oklch(0.75 0.01 80)", fontSize: 11 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performer Ranking */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">歌手打赏排行</CardTitle>
        </CardHeader>
        <CardContent>
          {performerData.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {performerData.map((p, idx) => (
                <div key={p.name} className="flex items-center gap-3 py-2">
                  <span className={`text-sm font-bold w-6 text-center ${idx < 3 ? "text-primary" : "text-muted-foreground"}`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{p.name}</span>
                      <span className="text-sm text-primary font-semibold">¥{p.total.toFixed(2)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${totalRevenue > 0 ? (p.total / totalRevenue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                    {p.count} 次
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Tips */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">最近打赏记录</CardTitle>
        </CardHeader>
        <CardContent>
          {tipsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />)}
            </div>
          ) : allTips.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">暂无打赏记录</p>
          ) : (
            <div className="space-y-1">
              {allTips.map(({ tip, performer }) => (
                <div key={tip.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-medium">
                    {(tip.tipperName || "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tip.tipperName || "匿名观众"}</p>
                    <p className="text-xs text-muted-foreground">打赏给 {performer.name}</p>
                  </div>
                  {tip.message && (
                    <p className="text-xs text-muted-foreground italic max-w-32 truncate">"{tip.message}"</p>
                  )}
                  <span className="text-sm font-semibold text-primary">¥{tip.amount}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${tip.paymentStatus === "paid" ? "border-green-500/30 text-green-400" : "border-border text-muted-foreground"}`}
                  >
                    {tip.paymentStatus === "paid" ? "已支付" : tip.paymentStatus}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
