# 酒吧点歌系统

全 Web 酒吧点歌、歌手工作台和管理后台。

## 目录结构

- `client/`：前端代码（React、页面、组件和样式）
- `server/`：后端代码（tRPC、业务路由、数据库访问、WebSocket 和支付回调）
- `drizzle/`：数据库结构、关系定义和 Drizzle SQL 迁移文件
- `shared/`：前后端共享类型与常量
- `package.json` / `pnpm-lock.yaml`：依赖与构建配置
- `vite.config.ts` / `tsconfig.json`：开发与 TypeScript 配置

## 本次导出说明

本仓库不包含 Manus 平台运行时文件、数据库查询缓存、`node_modules`、构建产物或任何真实密钥。数据库目录包含的是 schema 和迁移文件，不包含线上数据库数据。

## 本地运行

```bash
pnpm install
cp .env.example .env
pnpm dev
```

请在 `.env` 中填入实际的数据库、OAuth 和平台 API 配置；不要将 `.env` 提交到 Git。
