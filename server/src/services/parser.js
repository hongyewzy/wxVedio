const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 解析视频链接，获取无水印视频地址
 */
async function parseVideo(url) {
  // 检测视频平台
  const platform = detectPlatform(url);
  
  switch (platform) {
    case 'douyin':
      return await parseDouyin(url);
    case 'kuaishou':
      return await parseKuaishou(url);
    case 'bilibili':
      return await parseBilibili(url);
    case 'xiaohongshu':
      return await parseXiaohongshu(url);
    default:
      throw new Error('不支持的视频平台');
  }
}

/**
 * 检测视频平台
 */
function detectPlatform(url) {
  if (url.includes('douyin.com')) return 'douyin';
  if (url.includes('kuaishou.com')) return 'kuaishou';
  if (url.includes('bilibili.com')) return 'bilibili';
  if (url.includes('xiaohongshu.com')) return 'xiaohongshu';
  return 'unknown';
}

/**
 * 解析抖音视频
 */
async function parseDouyin(url) {
  try {
    // 尝试从抖音API获取无水印视频
    const videoId = extractDouyinId(url);
    if (!videoId) throw new Error('无效的抖音链接');
    
    // 使用第三方API解析抖音视频
    const apiUrl = `https://api.douyinvlog.com/aweme/v1/web/aweme/detail/?aweme_id=${videoId}`;
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.data?.data?.aweme_info?.video?.play_addr?.url_list) {
      return {
        platform: 'douyin',
        title: response.data.data.aweme_info.desc || '抖音视频',
        videoUrl: response.data.data.aweme_info.video.play_addr.url_list[0],
        cover: response.data.data.aweme_info.video.cover_url_list[0]
      };
    }
    
    // 备用方案：使用其他解析服务
    return await parseWithThirdParty(url, 'douyin');
  } catch (error) {
    console.error('抖音解析失败:', error.message);
    return await parseWithThirdParty(url, 'douyin');
  }
}

/**
 * 解析快手视频
 */
async function parseKuaishou(url) {
  try {
    const videoId = extractKuaishouId(url);
    if (!videoId) throw new Error('无效的快手链接');
    
    const apiUrl = `https://api2.ciajs.com/kuaishou?video_url=${encodeURIComponent(url)}`;
    const response = await axios.get(apiUrl);
    
    if (response.data?.data?.url) {
      return {
        platform: 'kuaishou',
        title: response.data.data.title || '快手视频',
        videoUrl: response.data.data.url
      };
    }
    
    return await parseWithThirdParty(url, 'kuaishou');
  } catch (error) {
    console.error('快手解析失败:', error.message);
    return await parseWithThirdParty(url, 'kuaishou');
  }
}

/**
 * 解析B站视频
 */
async function parseBilibili(url) {
  try {
    const videoId = extractBilibiliId(url);
    if (!videoId) throw new Error('无效的B站链接');
    
    const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${videoId}`;
    const response = await axios.get(apiUrl);
    
    if (response.data?.data?.bvid) {
      const data = response.data.data;
      return {
        platform: 'bilibili',
        title: data.title,
        videoUrl: `https://bilibili.com/video/${data.bvid}`,
        description: data.desc
      };
    }
    
    throw new Error('B站视频解析失败');
  } catch (error) {
    console.error('B站解析失败:', error.message);
    throw error;
  }
}

/**
 * 解析小红书视频
 */
async function parseXiaohongshu(url) {
  try {
    // 小红书解析需要特殊处理
    return await parseWithThirdParty(url, 'xiaohongshu');
  } catch (error) {
    console.error('小红书解析失败:', error.message);
    throw error;
  }
}

/**
 * 使用第三方解析服务
 */
async function parseWithThirdParty(url, platform) {
  // 尝试多个第三方解析接口
  const apis = [
    `https://api.xingyuequan.com/api/?type=parse&url=${encodeURIComponent(url)}`,
    `https://api.k coil.xyz/v1/parse?url=${encodeURIComponent(url)}`
  ];
  
  for (const apiUrl of apis) {
    try {
      const response = await axios.get(apiUrl, { timeout: 10000 });
      if (response.data?.data?.url || response.data?.url) {
        return {
          platform,
          title: `${platform}视频`,
          videoUrl: response.data.data?.url || response.data.url
        };
      }
    } catch (e) {
      console.log(`API ${apiUrl} 失败:`, e.message);
    }
  }
  
  throw new Error('暂无可用的解析服务');
}

/**
 * 提取抖音视频ID
 */
function extractDouyinId(url) {
  // 匹配各种抖音链接格式
  const patterns = [
    /douyin\.com\/(\w+)/,
    /douyin\.com\/video\/(\d+)/,
    /v\.douyin\.com\/(\w+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * 提取快手视频ID
 */
function extractKuaishouId(url) {
  const patterns = [
    /kuaishou\.com\/short\/(\d+)/,
    /kuaishou\.com\/video\/(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * 提取B站视频ID
 */
function extractBilibiliId(url) {
  const patterns = [
    /bilibili\.com\/video\/(B\w+)/,
    /b23\.tv\/(\w+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

module.exports = { parseVideo };
