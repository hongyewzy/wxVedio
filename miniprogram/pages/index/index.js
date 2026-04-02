// index.js
const app = getApp();
const API_BASE = 'https://claw-vedio-238922-10-1317485080.sh.run.tcloudbase.com/api';

Page({
  data: {
    videoUrl: '',
    loading: false
  },

  onInputChange(e) {
    this.setData({
      videoUrl: e.detail.value
    });
  },

  // 粘贴链接
  async onPaste() {
    try {
      const res = await wx.getClipboardData();
      if (res.data) {
        this.setData({
          videoUrl: res.data
        });
        wx.showToast({
          title: '已粘贴',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: '剪贴板为空',
          icon: 'none'
        });
      }
    } catch (err) {
      wx.showToast({
        title: '粘贴失败',
        icon: 'none'
      });
    }
  },

  // 解析视频
  async onParse() {
    const { videoUrl } = this.data;
    
    if (!videoUrl) {
      wx.showToast({
        title: '请输入视频链接',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      const res = await wx.request({
        url: `${API_BASE}/video/parse`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        data: { url: videoUrl }
      });

      if (res.data && !res.data.error) {
        // 保存解析结果到全局
        wx.setStorageSync('lastVideo', res.data);
        
        wx.navigateTo({
          url: `/pages/result/result?data=${encodeURIComponent(JSON.stringify(res.data))}`
        });
      } else {
        wx.showToast({
          title: res.data?.error || '解析失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('解析错误:', err);
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
