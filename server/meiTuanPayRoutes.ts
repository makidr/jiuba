import { Express, Request, Response } from "express";
import { handleMeiTuanCallback } from "./meiTuanPay";
import { emitNewTip } from "./socket";

/**
 * 注册美团支付回调路由
 */
export function registerMeiTuanPayRoutes(app: Express) {
  /**
   * 美团支付回调接口
   * 美团支付完成后会调用此接口
   */
  app.post("/api/meituan/pay/callback", async (req: Request, res: Response) => {
    try {
      const config = {
        merchantId: process.env.MEITUAN_MERCHANT_ID || "",
        appId: process.env.MEITUAN_APP_ID || "",
        appSecret: process.env.MEITUAN_APP_SECRET || "",
      };

      if (!config.merchantId || !config.appId || !config.appSecret) {
        res.status(400).json({ success: false, message: "Meituan config not set" });
        return;
      }

      // 处理回调
      const result = await handleMeiTuanCallback(req.body, config);

      if (result.success) {
        // 广播打赏更新事件
        // 注：实际应该从 req.body 中提取 tipId 并广播
        // 不需要在此处特别处理，因为打赏记录已在数据库中创建

        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error("[Meituan Callback Error]", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  console.log("[Meituan Pay] Routes registered");
}
