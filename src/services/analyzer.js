const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `你是一位资深电商运营顾问，专精于拼多多平台竞品分析和消费者洞察。
你的任务是分析商品评论数据，帮助卖家制定精准的营销策略。
请用中文回答，输出结构清晰、可直接使用的分析报告。`;

async function analyzeReviews(goodsId, reviews, productName = '') {
  if (!reviews.length) throw new Error('没有评论数据可分析');

  // 采样：优先取高互动评论，最多200条
  const sorted = [...reviews].sort((a, b) => (b.like_count + b.reply_count) - (a.like_count + a.reply_count));
  const sample = sorted.slice(0, 200);

  const reviewText = sample.map((r, i) =>
    `[${i + 1}] 评分:${r.rating}星 性别:${r.user_gender || '未知'} 规格:${r.sku_name || '默认'}\n内容:${r.content}`
  ).join('\n\n');

  const prompt = `
## 商品：${productName || goodsId}
## 评论总量：${reviews.length} 条（本次分析样本：${sample.length} 条）

---
${reviewText}
---

请从以上评论中输出以下六个维度的分析，严格按照 JSON 格式返回：

{
  "keywords": {
    "positive": ["高频好评关键词，数组，每项格式为 {word: '关键词', count: 出现次数}，取前15个"],
    "negative": ["高频差评关键词，同上格式，取前10个"],
    "product_features": ["消费者最关注的产品特性，纯字符串数组，取前10个"]
  },
  "buyer_persona": {
    "gender_ratio": "男女比例描述，如 '女性为主，约占70%'",
    "age_range": "年龄区间推断，如 '25-35岁为主'",
    "usage_scenarios": ["购买场景/用途，数组，如 '自用日常' '送礼' '宝宝用品' 等，取前6个"],
    "purchase_triggers": ["购买决策触发点，如 '价格实惠' '朋友推荐' 等，取前6个"],
    "pain_points": ["目标人群的核心痛点，取前5个"]
  },
  "marketing_insights": {
    "core_selling_points": ["最能打动买家的卖点，按优先级排序，取前5个"],
    "content_angles": ["适合做内容/短视频的切入角度，取前5个，每项含标题建议"],
    "target_platforms": ["适合推广的平台，如 '抖音' '小红书' '拼多多站内' 等，附理由"],
    "copy_templates": ["基于高频正面评论提炼的文案模板，3条，直接可用"]
  },
  "risk_alerts": {
    "common_complaints": ["最常见的投诉点，取前5个"],
    "return_reasons": ["退货/差评原因推断，取前3个"],
    "competitor_advantages": ["竞品相对于自身的潜在优势（从差评中反推）"]
  },
  "summary": "200字以内的整体分析摘要，包含最重要的一个营销方向建议"
}

只返回 JSON，不要有任何其他文字。`;

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = msg.content[0].text.trim();
  const jsonStr = raw.startsWith('{') ? raw : raw.match(/```json\n?([\s\S]+?)\n?```/)?.[1] || raw;
  const result = JSON.parse(jsonStr);

  db.prepare(`
    INSERT INTO pdd_analyses (goods_id, keyword, review_count, result)
    VALUES (?, ?, ?, ?)
  `).run(String(goodsId), productName, reviews.length, JSON.stringify(result));

  return result;
}

async function compareProducts(goodsIds, keyword = '') {
  const allData = goodsIds.map(id => {
    const reviews = db.prepare('SELECT * FROM pdd_reviews WHERE goods_id = ?').all(id);
    const product = db.prepare('SELECT * FROM pdd_products WHERE goods_id = ?').get(id);
    return { id, name: product?.name || id, reviews };
  }).filter(d => d.reviews.length > 0);

  if (!allData.length) throw new Error('没有找到可对比的评论数据');

  const summaries = allData.map(d => {
    const contents = d.reviews.slice(0, 50).map(r => r.content).join('\n');
    return `【${d.name}】（${d.reviews.length}条评论）\n${contents}`;
  }).join('\n\n========\n\n');

  const prompt = `
我有以下 ${allData.length} 个竞品的评论数据，关键词：${keyword || '未指定'}

${summaries}

请输出竞品对比分析 JSON：
{
  "comparison_table": [
    {
      "product_name": "商品名",
      "core_strengths": ["核心优势，3条"],
      "core_weaknesses": ["核心劣势，3条"],
      "target_audience": "目标客群描述",
      "price_positioning": "价格定位描述"
    }
  ],
  "market_gaps": ["市场空白/机会点，发现3-5个"],
  "differentiation_suggestions": ["差异化建议，3-5条，直接可操作"],
  "winning_strategy": "100字以内，针对这个市场的整体制胜策略"
}

只返回 JSON。`;

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = msg.content[0].text.trim();
  const jsonStr = raw.startsWith('{') ? raw : raw.match(/```json\n?([\s\S]+?)\n?```/)?.[1] || raw;
  return JSON.parse(jsonStr);
}

module.exports = { analyzeReviews, compareProducts };
