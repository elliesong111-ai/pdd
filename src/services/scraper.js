const axios = require('axios');
const db = require('../db');

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.38',
  'Referer': 'https://mobile.yangkeduo.com/',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function searchProducts(keyword, pageSize = 20) {
  const url = 'https://apiv2.yangkeduo.com/search_result';
  const params = {
    q: keyword,
    page_sn: 10032,
    size: pageSize,
    sort: 0,
    with_category_filter: 1,
    hd_thumbnail_ratio: '3:4',
  };

  try {
    const resp = await axios.get(url, { params, headers: BASE_HEADERS, timeout: 15000 });
    const items = resp.data?.goods_list || [];

    const products = items.map(item => ({
      goods_id: String(item.goods_id || item.id),
      name: item.goods_name || item.name || '',
      shop_name: item.mall_name || item.shop_name || '',
      price: (item.min_group_price || item.price || 0) / 100,
      sales_count: item.sales_tip ? parseSalesTip(item.sales_tip) : (item.sold_quantity || 0),
      keyword,
    }));

    const insert = db.prepare(`
      INSERT OR REPLACE INTO pdd_products (goods_id, name, shop_name, price, sales_count, keyword)
      VALUES (@goods_id, @name, @shop_name, @price, @sales_count, @keyword)
    `);
    const insertMany = db.transaction(rows => rows.forEach(r => insert.run(r)));
    insertMany(products);

    return products;
  } catch (err) {
    throw new Error(`搜索商品失败: ${err.message}`);
  }
}

function parseSalesTip(tip) {
  if (!tip) return 0;
  const m = tip.match(/[\d.]+([万千]?)/);
  if (!m) return 0;
  let n = parseFloat(m[0]);
  if (tip.includes('万')) n *= 10000;
  if (tip.includes('千')) n *= 1000;
  return Math.floor(n);
}

async function fetchReviews(goodsId, maxPages = 5, onProgress) {
  const allReviews = [];

  for (let page = 0; page < maxPages; page++) {
    const url = 'https://apiv2.yangkeduo.com/api/reviews/product/list';
    const params = {
      goods_id: goodsId,
      page,
      size: 50,
      sort: 0, // 0=综合, 1=最新, 2=好评, 3=差评
    };

    try {
      const resp = await axios.get(url, { params, headers: BASE_HEADERS, timeout: 15000 });
      const data = resp.data;
      const reviews = data?.list || data?.result?.list || [];

      if (!reviews.length) break;

      const mapped = reviews.map(r => ({
        goods_id: String(goodsId),
        review_id: String(r.id || r.order_sn || `${goodsId}_${page}_${Math.random()}`),
        content: r.comment_info || r.content || r.review_content || '',
        rating: r.order_score || r.score || 5,
        user_name: r.user_name || r.nickname || '',
        user_gender: r.user_gender === 1 ? '男' : r.user_gender === 2 ? '女' : '',
        user_age: r.user_age_range || '',
        sku_name: r.sku_name || r.sub_goods_name || '',
        reply_count: r.reply_count || 0,
        like_count: r.like_count || r.useful_count || 0,
        created_at: r.comment_time || r.created_at || '',
      })).filter(r => r.content.trim().length > 0);

      const insert = db.prepare(`
        INSERT OR IGNORE INTO pdd_reviews
          (goods_id, review_id, content, rating, user_name, user_gender, user_age, sku_name, reply_count, like_count, created_at)
        VALUES
          (@goods_id, @review_id, @content, @rating, @user_name, @user_gender, @user_age, @sku_name, @reply_count, @like_count, @created_at)
      `);
      db.transaction(rows => rows.forEach(r => insert.run(r)))(mapped);
      allReviews.push(...mapped);

      if (onProgress) onProgress(allReviews.length, page + 1);

      if (reviews.length < 50) break;
      await sleep(800 + Math.random() * 500);
    } catch (err) {
      if (page === 0) throw new Error(`获取评论失败: ${err.message}`);
      break;
    }
  }

  return allReviews;
}

function getStoredReviews(goodsId) {
  return db.prepare('SELECT * FROM pdd_reviews WHERE goods_id = ? ORDER BY fetched_at DESC').all(goodsId);
}

function getStoredProducts(keyword) {
  const q = keyword ? 'SELECT * FROM pdd_products WHERE keyword = ? ORDER BY sales_count DESC' : 'SELECT * FROM pdd_products ORDER BY fetched_at DESC LIMIT 100';
  return keyword ? db.prepare(q).all(keyword) : db.prepare(q).all();
}

function getAnalyses(goodsId) {
  return db.prepare('SELECT * FROM pdd_analyses WHERE goods_id = ? ORDER BY created_at DESC').all(goodsId);
}

module.exports = { searchProducts, fetchReviews, getStoredReviews, getStoredProducts, getAnalyses };
