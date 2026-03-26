const express = require('express');
const router = express.Router();
const { parseVideo } = require('../services/parser');

// 解析视频链接
router.post('/parse', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: '请提供视频链接' });
    }

    const result = await parseVideo(url);
    res.json(result);
  } catch (error) {
    console.error('解析错误:', error);
    res.status(500).json({ error: error.message || '解析失败，请检查链接是否正确' });
  }
});

module.exports = router;
