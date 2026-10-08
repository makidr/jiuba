import crypto from "crypto";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { paymentOrders, tips } from "../drizzle/schema";

/**
 * 美团支付服务
 * 文档：https://developer.meituan.com
 */

interface MeiTuanPayConfig {
  merchantId: string;
  appId: string;
  appSecret: string;
}

interface CreateOrderParams {
  tipId: number;
  amount: number; // 金额，单位：分
  performerId: number;
  guestName: string;
  tableNo?: string;
}

interface MeiTuanPaymentResponse {
  orderId: string;
  paymentUrl: string;
}

interface MeiTuanCallbackData {
  orderId: string;
  transactionId: string;
  amount: number;
  status: "success" | "failed";
  timestamp: number;
  sign: string;
}

/**
 * 生成美团支付签名
 */
function generateSignature(data: Record<string, any>, appSecret: string): string {
  // 按键排序
  const keys = Object.keys(data).sort();
  const signStr = keys.map((key) => `${key}=${data[key]}`).join("&");
  const fullStr = `${signStr}&key=${appSecret}`;
  return crypto.createHash("md5").update(fullStr).digest("hex");
}

/**
 * 验证美团回调签名
 */
function verifySignature(data: Record<string, any>, sign: string, appSecret: string): boolean {
  const expectedSign = generateSignature(data, appSecret);
  return expectedSign === sign;
}

/**
 * 创建支付订单
 */
export async function createMeiTuanPaymentOrder(
  orderParams: CreateOrderParams,
  config: MeiTuanPayConfig
): Promise<MeiTuanPaymentResponse> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const orderId = `MT${Date.now()}${nanoid(8)}`;

  // 保存订单到数据库
  await db.insert(paymentOrders).values({
    orderId,
    tipId: orderParams.tipId,
    channel: "meituan",
    amount: orderParams.amount,
    status: "pending",
  });

  // 构建美团支付请求数据
  const paymentData = {
    merchantId: config.merchantId,
    appId: config.appId,
    orderId,
    amount: orderParams.amount,
    timestamp: Math.floor(Date.now() / 1000),
    notifyUrl: `${process.env.MEITUAN_CALLBACK_URL || "https://example.com"}/api/meituan/pay/callback`,
  };

  // 生成签名
  const sign = generateSignature(paymentData, config.appSecret);

  // 构建美团支付链接
  // 实际环境中应该调用美团 API 获取支付链接
  // 这里为演示，使用模拟链接
  const urlParams = new URLSearchParams();
  Object.entries({ ...paymentData, sign }).forEach(([key, value]) => {
    urlParams.append(key, String(value));
  });
  const paymentUrl = `https://pay.meituan.com/checkout?${urlParams.toString()}`;

  return {
    orderId,
    paymentUrl,
  };
}

/**
 * 处理美团支付回调
 */
export async function handleMeiTuanCallback(
  callbackData: MeiTuanCallbackData,
  config: MeiTuanPayConfig
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 验证签名
  const { sign, ...dataToVerify } = callbackData;
  if (!verifySignature(dataToVerify, sign, config.appSecret)) {
    return { success: false, message: "Invalid signature" };
  }

  // 查找订单
  const order = await db
    .select()
    .from(paymentOrders)
    .where(eq(paymentOrders.orderId, callbackData.orderId))
    .limit(1);

  if (order.length === 0) {
    return { success: false, message: "Order not found" };
  }

  const paymentOrder = order[0];

  // 更新订单状态
  if (callbackData.status === "success") {
    await db
      .update(paymentOrders)
      .set({
        status: "success",
        transactionId: callbackData.transactionId,
        paidAt: new Date(),
      })
      .where(eq(paymentOrders.id, paymentOrder.id));

    // 关联的打赏记录已在 tips 表中，此处无需更新
    // 如需追踪支付状态，可在 tips 表添加 paymentStatus 字段

    return { success: true, message: "Payment confirmed" };
  } else {
    await db
      .update(paymentOrders)
      .set({ status: "failed" })
      .where(eq(paymentOrders.id, paymentOrder.id));

    return { success: true, message: "Payment failed" };
  }
}

/**
 * 查询订单状态
 */
export async function queryMeiTuanPaymentStatus(orderId: string): Promise<{
  status: string;
  amount: number;
  transactionId?: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const order = await db
    .select()
    .from(paymentOrders)
    .where(eq(paymentOrders.orderId, orderId))
    .limit(1);

  if (order.length === 0) {
    throw new Error("Order not found");
  }

  const paymentOrder = order[0];
  return {
    status: paymentOrder.status,
    amount: paymentOrder.amount,
    transactionId: paymentOrder.transactionId || undefined,
  };
}
