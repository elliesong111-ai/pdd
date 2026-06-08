# 拼多多竞品分析工具

挖掘竞品评论，洞察买家痛点，精准营销方向。

## 功能

- **搜索竞品** — 关键词搜索拼多多商品
- **抓取评论** — 批量获取竞品评论（每件最多 250 条）
- **AI 分析** — 提炼关键词、买家画像、文案模板、营销方向
- **竞品对比** — 多品横向对比，发现市场空白

## 快速开始

```bash
npm install
cp .env.example .env
# 编辑 .env，填入你的 ANTHROPIC_API_KEY
npm start
# 访问 http://localhost:3001
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `ANTHROPIC_API_KEY` | Anthropic API Key（用于 AI 分析） |
| `PORT` | 端口号，默认 3001 |
