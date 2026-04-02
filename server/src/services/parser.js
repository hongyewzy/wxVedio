const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 解析视频链接，获取无水印视频地址
 */
async function parseVideo(url) {
  // 清理URL，提取真实链接
  url = extractUrl(url);
  
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
 * 从文本中提取URL
 */
function extractUrl(text) {
  // 匹配常见URL格式
  const urlPatterns = [
    /https?:\/\/v\.douyin\.com\/\w+/i,
    /https?:\/\/www\.douyin\.com\/\S+/i,
    /https?:\/\/www\.kuaishou\.com\/\S+/i,
    /https?:\/\/bilibili\.com\/\S+/i,
    /https?:\/\/b23\.tv\/\S+/i,
    /https?:\/\/www\.xiaohongshu\.com\/\S+/i
  ];
  
  for (const pattern of urlPatterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  
  return text.trim();
}

/**
 * 检测视频平台
 */
function detectPlatform(url) {
  if (url.includes('douyin.com') || url.includes('v.douyin.com')) return 'douyin';
  if (url.includes('kuaishou.com')) return 'kuaishou';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) return 'xiaohongshu';
  return 'unknown';
}

/**
 * 解析抖音视频
 */
async function parseDouyin(url) {
  try {
    // 如果是短链接，先获取真实URL
    if (url.includes('v.douyin.com')) {
      url = await resolveShortUrl(url);
    }
    
    // 提取视频ID
    const videoId = extractDouyinId(url);
    if (!videoId) throw new Error('无效的抖音链接');
    
    // 使用抖音官方API
    const apiUrl = `https://www.iesdouyin.com/share/video/${videoId}/`;
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      },
      timeout: 15000
    });
    
    // 从HTML中提取视频信息
    const html = response.data;
    
    // 尝试多种方式提取无水印链接
    let videoUrl = null;
    let cover = null;
    let title = '抖音视频';
    
    // 方式1: 从RENDER_DATA中提取
    const renderMatch = html.match(/<script id="RENDER_DATA" type="application\/json">([^<]+)<\/script>/);
    if (renderMatch) {
      try {
        const decoded = decodeURIComponent(renderMatch[1]);
        const data = JSON.parse(decoded);
        const awemeDetail = data.aweme?.detail;
        if (awemeDetail) {
          videoUrl = awemeDetail.video?.playAddr?.url_list?.[0] || 
                     awemeDetail.video?.downloadAddr?.url_list?.[0];
          cover = awemeDetail.video?.cover?.url_list?.[0];
          title = awemeDetail.desc || title;
        }
      } catch (e) {
        console.log('RENDER_DATA解析失败');
      }
    }
    
    // 方式2: 直接正则匹配
    if (!videoUrl) {
      const patterns = [
        /playAddr.*?url_list":\["([^"]+)"/,
        /play_addr.*?url_list.*?\["([^"]+)"/,
        /https?:\/\/aweme\.snssdk\.com\/aweme\/v1\/[^"]*sign=[^"]*/,
        /https?:\/\/v\d+-ec\.douyinvod\.com\/[^"']+\.mp4/
      ];
      
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          videoUrl = match[1] || match[0];
          break;
        }
      }
    }
    
    // 方式3: 使用第三方API
    if (!videoUrl) {
      return await parseWithThirdPartyApi(url, 'douyin');
    }
    
    // 清理URL中的水印参数
    videoUrl = cleanWatermarkParams(videoUrl);
    
    return {
      platform: 'douyin',
      title: title,
      videoUrl: videoUrl,
      cover: cover
    };
  } catch (error) {
    console.error('抖音解析失败:', error.message);
    // 备用方案
    try {
      return await parseWithThirdPartyApi(url, 'douyin');
    } catch (e) {
      throw new Error('抖音视频解析失败，请检查链接是否正确');
    }
  }
}

/**
 * 解析快手视频
 */
async function parseKuaishou(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      timeout: 15000
    });
    
    const html = response.data;
    const patterns = [
      /src="(https:\/\/v\d+\.kuaishoupay\.com\/[^"]+\.mp4[^"]*)"/,
      /https?:\/\/v\d+\.kuaishoupay\.com\/[^"']+\.mp4/
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return {
          platform: 'kuaishou',
          title: '快手视频',
          videoUrl: match[1] || match[0]
        };
      }
    }
    
    return await parseWithThirdPartyApi(url, 'kuaishou');
  } catch (error) {
    console.error('快手解析失败:', error.message);
    return await parseWithThirdPartyApi(url, 'kuaishou');
  }
}

/**
 * 解析B站视频
 */
async function parseBilibili(url) {
  try {
    const bvid = extractBilibiliId(url);
    if (!bvid) throw new Error('无效的B站链接');
    
    // B站视频API
    const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
    const response = await axios.get(apiUrl);
    
    if (response.data?.code === 0 && response.data?.data) {
      const data = response.data.data;
      const cid = data.cid;
      
      // 获取无水印播放链接
      const playUrl = `https://api.bilibili.com/x/playurl?avid=${data.aid}&cid=${cid}&bvid=${bvid}&qn=80&fnval=0`;
      const playResponse = await axios.get(playUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://www.bilibili.com'
        }
      });
      
      if (playResponse.data?.data?.durl?.[0]?.url) {
        return {
          platform: 'bilibili',
          title: data.title,
          videoUrl: playResponse.data.data.durl[0].url
        };
      }
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
    // 小红书需要特殊处理，通常需要模拟手机端访问
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.0',
        'Referer': 'https://www.xiaohongshu.com/'
      },
      timeout: 15000
    });
    
    const html = response.data;
    
    // 提取视频URL
    const patterns = [
      /"stream":\["([^"]+)"/,
      /https?:\/\/snsd\d+\.xseme\.com\/[^"']+\.mp4[^"']*/
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return {
          platform: 'xiaohongshu',
          title: '小红书视频',
          videoUrl: match[1] || match[0]
        };
      }
    }
    
    return await parseWithThirdPartyApi(url, 'xiaohongshu');
  } catch (error) {
    console.error('小红书解析失败:', error.message);
    return await parseWithThirdPartyApi(url, 'xiaohongshu');
  }
}

/**
 * 解析短链接
 */
async function resolveShortUrl(url) {
  try {
    const response = await axios.get(url, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 300 && status < 400,
      timeout: 10000
    });
    return response.headers.location || url;
  } catch (error) {
    if (error.response?.headers?.location) {
      return error.response.headers.location;
    }
    return url;
  }
}

/**
 * 清理水印参数
 */
function cleanWatermarkParams(url) {
  if (!url) return url;
  return url.replace(/watermark=\d/g, 'watermark=0')
            .replace(/log_parent_rate=\d+/g, 'log_parent_rate=0');
}

/**
 * 使用第三方API解析
 */
async function parseWithThirdPartyApi(url, platform) {
  // 尝试多个第三方API
  const apis = [
    { url: `https://api.tikmate.app/api/lookup?url=${encodeURIComponent(url)}` },
    { url: `https://tiktok-downloader-download-tiktok-videos-without-watermark.p.rapidapi.com/index?id=${encodeURIComponent(url)}`, header: 'x-rapidapi-host' }
  ];
  
  for (const api of apis) {
    try {
      const options = {
        url: api.url,
        method: 'GET',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      };
      
      const response = await axios(options);
      const data = response.data;
      
      // 尝试提取视频URL
      let videoUrl = data?.data?.play || data?.data?.video || data?.video_url || data?.mp4;
      if (videoUrl) {
        return {
          platform,
          title: data?.data?.title || `${platform}视频`,
          videoUrl: videoUrl
        };
      }
    } catch (e) {
      console.log(`第三方API失败:`, e.message);
    }
  }
  
  throw new Error(`${platform}视频解析服务暂不可用`);
}

/**
 * 提取抖音视频ID
 */
function extractDouyinId(url) {
  const patterns = [
    /douyin\.com\/video\/(\d+)/,
    /douyin\.com\/(\d+)/,
    /\/video\/(\d+)/
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
