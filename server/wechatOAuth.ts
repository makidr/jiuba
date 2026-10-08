import type { Express, Request, Response } from "express";
import axios from "axios";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import * as db from "./db";

const WECHAT_API = "https://api.weixin.qq.com";
const WECHAT_OPEN_API = "https://open.weixin.qq.com";

function getWechatConfig() {
  return {
    appId: process.env.WECHAT_APP_ID ?? "",
    appSecret: process.env.WECHAT_APP_SECRET ?? "",
  };
}

/**
 * 构造微信 OAuth 授权跳转 URL
 * scope=snsapi_userinfo 可获取昵称、头像等信息（需用户同意）
 * scope=snsapi_base 静默授权，只能拿 openid（无需用户同意）
 */
function buildWechatOAuthUrl(redirectUri: string, state: string, scope: "snsapi_userinfo" | "snsapi_base" = "snsapi_userinfo") {
  const { appId } = getWechatConfig();
  const url = new URL(`${WECHAT_OPEN_API}/connect/oauth2/authorize`);
  url.searchParams.set("appid", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);
  return url.toString() + "#wechat_redirect";
}

/**
 * 用 code 换取 access_token 和 openid
 */
async function getWechatAccessToken(code: string) {
  const { appId, appSecret } = getWechatConfig();
  const url = `${WECHAT_API}/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`;
  const { data } = await axios.get(url, { timeout: 8000 });
  if (data.errcode) {
    throw new Error(`WeChat token error: ${data.errmsg} (${data.errcode})`);
  }
  return data as {
    access_token: string;
    openid: string;
    scope: string;
    unionid?: string;
  };
}

/**
 * 用 access_token + openid 获取用户信息
 */
async function getWechatUserInfo(accessToken: string, openid: string) {
  const url = `${WECHAT_API}/sns/userinfo?access_token=${accessToken}&openid=${openid}&lang=zh_CN`;
  const { data } = await axios.get(url, { timeout: 8000 });
  if (data.errcode) {
    throw new Error(`WeChat userinfo error: ${data.errmsg} (${data.errcode})`);
  }
  return data as {
    openid: string;
    nickname: string;
    headimgurl: string;
    unionid?: string;
  };
}

export function registerWechatOAuthRoutes(app: Express) {
  /**
   * 入口：前端调用此接口发起微信授权
   * GET /api/wechat/oauth/redirect?returnPath=/
   */
  app.get("/api/wechat/oauth/redirect", (req: Request, res: Response) => {
    const { appId } = getWechatConfig();

    if (!appId) {
      // 未配置微信 AppID，提示需要配置
      return res.status(503).json({
        error: "WeChat OAuth not configured",
        message: "请在系统设置中配置 WECHAT_APP_ID 和 WECHAT_APP_SECRET",
      });
    }

    const returnPath = (req.query.returnPath as string) || "/";
    // 回调地址：本服务的 callback 路由
    const callbackUrl = `${req.protocol}://${req.get("host")}/api/wechat/oauth/callback`;
    // state 中编码 returnPath，回调后跳回原页面
    const state = Buffer.from(JSON.stringify({ returnPath })).toString("base64url");

    const authUrl = buildWechatOAuthUrl(callbackUrl, state, "snsapi_userinfo");
    return res.redirect(302, authUrl);
  });

  /**
   * 回调：微信授权后跳回此地址
   * GET /api/wechat/oauth/callback?code=xxx&state=xxx
   */
  app.get("/api/wechat/oauth/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code) {
      return res.status(400).send("Missing code from WeChat OAuth");
    }

    // 解析 returnPath
    let returnPath = "/";
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
      returnPath = decoded.returnPath || "/";
    } catch (_) {}

    try {
      // 1. 换取 access_token
      const tokenData = await getWechatAccessToken(code);

      // 2. 获取用户信息（昵称、头像）
      let nickname = `微信用户_${tokenData.openid.slice(-6)}`;
      let headimgurl = "";

      if (tokenData.scope === "snsapi_userinfo") {
        try {
          const userInfo = await getWechatUserInfo(tokenData.access_token, tokenData.openid);
          nickname = userInfo.nickname || nickname;
          headimgurl = userInfo.headimgurl || "";
        } catch (e) {
          console.warn("[WechatOAuth] Failed to get userinfo, using openid fallback", e);
        }
      }

      // 3. 写入/更新数据库（openId 使用 wechat_ 前缀区分）
      const openId = `wechat_${tokenData.openid}`;
      await db.upsertUser({
        openId,
        name: nickname,
        loginMethod: "wechat",
        wechatNickname: nickname,
        wechatAvatar: headimgurl || null,
        lastSignedIn: new Date(),
      });

      // 4. 签发 session token（复用现有 JWT 机制）
      const sessionToken = await sdk.createSessionToken(openId, {
        name: nickname,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // 5. 跳回原页面
      return res.redirect(302, returnPath);
    } catch (error) {
      console.error("[WechatOAuth] Callback failed:", error);
      return res.redirect(302, `/?wechat_error=1`);
    }
  });

  /**
   * 检查微信 OAuth 是否已配置
   * GET /api/wechat/status
   */
  app.get("/api/wechat/status", (_req: Request, res: Response) => {
    const { appId } = getWechatConfig();
    return res.json({ configured: !!appId });
  });
}
