# 酒吧点歌系统 TODO

## 数据库 & 后端基础
- [x] 设计并迁移数据库 Schema（歌手、歌曲、场次、点歌记录、打赏记录）
- [x] 歌手 CRUD API（tRPC）
- [x] 歌曲 CRUD API（tRPC）
- [x] 场次管理 API（tRPC）
- [x] 点歌 API（创建、查询、更新状态）
- [x] 打赏 API（创建、查询）
- [x] 网易云歌单代理 API（服务端 fetch 歌单数据）
- [x] WebSocket 服务（socket.io）实时推送点歌/打赏事件
- [x] 微信 OAuth 登录接口（使用 Manus OAuth）
- [ ] 微信支付集成（需配置商户号、密钥、回调地址，预留了打赏流程框架，目前为模拟支付）

## 管理端（/admin）
- [x] 管理端布局与导航（侧边栏）
- [x] 歌手列表页：新增、编辑、删除歌手
- [x] 歌手详情：姓名、性别、表演时长、每场最多点歌数
- [x] 歌曲管理页：歌手歌曲新增、编辑、删除
- [x] 网易云歌单导入对话框（输入歌单 URL/ID，批量导入）
- [x] 打赏记录页：分页列表
- [x] 收益统计页：图表展示（按天趋势+歌手占比）
- [x] 场次管理页：创建、开始、结束场次

## 歌手工作台端（/stage）
- [x] 工作台布局（平板友好，大字体，简洁）
- [x] 实时点歌队列（WebSocket 推送，可标记已演唱）
- [x] 实时打赏记录（WebSocket 推送，动态展示）
- [x] 歌手身份选择/登录页

## 观众端（/）
- [x] 首页：歌手列表与当前场次信息
- [x] 微信 OAuth 登录（获取微信名，无需注册）
- [x] 歌手详情页：歌曲列表、搜索
- [x] 点歌功能（选歌 → 确认 → 提交）
- [x] 我的点歌记录页
- [x] 打赏功能（选择金额 → 模拟支付）
- [x] 移动端适配（全面屏、安全区域）

## UI & 体验
- [x] 全局设计系统：优雅精致风格，深色主题，金色点缀
- [x] 字体引入（Noto Serif SC + Inter）
- [x] 动效与过渡（framer-motion）
- [x] 空状态、加载态、错误态设计
- [x] 响应式布局（移动端 / 平板 / 桌面）

## 测试
- [x] 后端 API 单元测试（vitest）- 7 tests passed
- [x] WebSocket 连接测试（手动验证）

## 微信登录改造（已暂缓，改为匿名模式）
- [x] 后端：实现微信公众号 OAuth 路由框架（/api/wechat/oauth/redirect 和 /api/wechat/oauth/callback）
- [x] 后端：获取微信用户 openid/nickname/headimgurl，写入 session 和数据库
- [x] 前端：观众端改为匿名模式（无需登录，输入昵称即可）
- [x] 前端：main.tsx 全局未授权跳转仅对 /admin 和 /stage 生效
- [ ] 配置：待配置 WECHAT_APP_ID 和 WECHAT_APP_SECRET 后可切换为微信 OAuth 登录

## 匿名模式改造
- [x] 后端：点歌、打赏接口支持匿名（不强制登录），从请求体中读取 guestName
- [x] 后端：新增 guestToken 机制（nanoid 存 localStorage），用于标识匿名用户查询自己的记录
- [x] 前端：观众端去掉所有登录跳转，首次使用弹出昵称输入框
- [x] 前端：昵称持久化到 localStorage，后续直接使用
- [x] 前端：main.tsx 全局未授权跳转仅对管理端生效
- [x] 管理端/工作台：保留 Manus 登录保护不变

## 三端演出状态联动改造
- [x] 后端：session.start/end 广播 session:broadcast 事件，携带 performerId 和 status
- [x] 管理端：场次页显示倒计时（基于 performDuration），倒计时结束自动调用 session.end
- [x] 管理端：开始/结束按鈕样式优化，清晰展示当前演出状态
- [x] 歌手工作台：只显示 status=active 的场次对应歌手，其他歌手不显示
- [x] 歌手工作台：去掉操作按鈕，队列只读展示
- [x] 歌手工作台：收到 session:broadcast ended 事件后自动退出工作台
- [x] 观众端：performer.list 只返回有 active 场次的歌手
- [x] 观众端：收到 session:broadcast ended 事件后，歌手详情页提示演出已结束并禁用点歌


## 美团支付集成
- [x] 后端：添加支付订单表（payment_orders）
- [x] 后端：实现 tRPC meiTuanPay.create 创建支付订单接口
- [x] 后端：实现 POST /api/meituan/pay/callback 美团回调接口
- [x] 后端：实现 tRPC meiTuanPay.queryStatus 查询订单状态接口
- [ ] 后端：配置 MEITUAN_MERCHANT_ID、MEITUAN_APP_ID、MEITUAN_APP_SECRET 环境变量（待商户提供）
- [x] 前端：修改打赏流程，改为跳转美团支付
- [x] 前端：支付完成后自动返回
- [ ] 测试：验证支付流程、回调、WebSocket 推送（待配置参数）
