const express = require('express');
const router = express.Router();
const scraper = require('../services/scraper');
const analyzer = require('../services/analyzer');

// SSE helper
function sseStream(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  return {
    send: (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
    end: () => res.end(),
  };
}

// Search products
router.get('/api/pdd/search', async (req, res) => {
  const { keyword, size = 20 } = req.query;
  if (!keyword) return res.status(400).json({ error: '请提供关键词' });
  try {
    const products = await scraper.searchProducts(keyword, Number(size));
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch reviews (SSE stream for progress)
router.get('/api/pdd/reviews/fetch', async (req, res) => {
  const { goods_id, pages = 5 } = req.query;
  if (!goods_id) return res.status(400).json({ error: '请提供 goods_id' });

  const sse = sseStream(res);
  sse.send('start', { goods_id });

  try {
    const reviews = await scraper.fetchReviews(
      goods_id,
      Number(pages),
      (total, page) => sse.send('progress', { total, page })
    );
    sse.send('done', { total: reviews.length });
  } catch (err) {
    sse.send('error', { message: err.message });
  }
  sse.end();
});

// Get stored reviews
router.get('/api/pdd/reviews', (req, res) => {
  const { goods_id, limit = 50 } = req.query;
  if (!goods_id) return res.status(400).json({ error: '请提供 goods_id' });
  const reviews = scraper.getStoredReviews(goods_id).slice(0, Number(limit));
  res.json({ success: true, reviews, total: reviews.length });
});

// Get stored products
router.get('/api/pdd/products', (req, res) => {
  const { keyword } = req.query;
  const products = scraper.getStoredProducts(keyword);
  res.json({ success: true, products });
});

// Analyze reviews with AI
router.post('/api/pdd/analyze', async (req, res) => {
  const { goods_id, product_name } = req.body;
  if (!goods_id) return res.status(400).json({ error: '请提供 goods_id' });

  const reviews = scraper.getStoredReviews(goods_id);
  if (!reviews.length) return res.status(400).json({ error: '该商品没有评论数据，请先抓取评论' });

  try {
    const result = await analyzer.analyzeReviews(goods_id, reviews, product_name);
    res.json({ success: true, result, review_count: reviews.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get past analyses
router.get('/api/pdd/analyses', (req, res) => {
  const { goods_id } = req.query;
  if (!goods_id) return res.status(400).json({ error: '请提供 goods_id' });
  const analyses = scraper.getAnalyses(goods_id);
  res.json({ success: true, analyses: analyses.map(a => ({ ...a, result: JSON.parse(a.result) })) });
});

// Compare multiple products
router.post('/api/pdd/compare', async (req, res) => {
  const { goods_ids, keyword } = req.body;
  if (!Array.isArray(goods_ids) || goods_ids.length < 2) {
    return res.status(400).json({ error: '请提供至少2个商品ID进行对比' });
  }
  try {
    const result = await analyzer.compareProducts(goods_ids, keyword);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
