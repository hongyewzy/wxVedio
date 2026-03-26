// result.js
Page({
  data: {
    videoData: {},
    platformName: '',
    downloading: false
  },

  onLoad(options) {
    if (options.data) {
      try {
        const videoData = JSON.parse(decodeURIComponent(options.data));
        this.setData({
          videoData,
          platformName: this.getPlatformName(videoData.platform)
        });
      } catch (err) {
        console.error('解析数据失败:', err);
      }
    }
  },

  getPlatformName(platform) {
    const names = {
      douyin: '抖音',
      kuaishou: '快手',
      bilibili: 'B站',
      xiaohongshu: '小红书'
    };
    return names[platform] || '未知平台';
  },

  // 下载视频
  async onDownload() {
    const { videoData } = this.data;
    if (!videoData.videoUrl) {
      wx.showToast({
        title: '无效的视频链接',
        icon: 'none'
      });
      return;
    }

    this.setData({ downloading: true });

    try {
      // 下载视频文件
      const downloadTask = wx.downloadFile({
        url: videoData.videoUrl,
        success: (res) => {
          if (res.statusCode === 200) {
            // 保存到相册
            wx.saveVideoToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => {
                wx.showToast({
                  title: '保存成功',
                  icon: 'success'
                });
              },
              fail: (err) => {
                console.error('保存失败:', err);
                if (err.errMsg.includes('auth deny')) {
                  wx.showModal({
                    title: '提示',
                    content: '需要授权保存到相册',
                    success: (modalRes) => {
                      if (modalRes.confirm) {
                        wx.openSetting();
                      }
                    }
                  });
                } else {
                  wx.showToast({
                    title: '保存失败',
                    icon: 'none'
                  });
                }
              }
            });
          } else {
            wx.showToast({
              title: '下载失败',
              icon: 'none'
            });
          }
        },
        fail: (err) => {
          console.error('下载错误:', err);
          wx.showToast({
            title: '网络错误',
            icon: 'none'
          });
        }
      });

      downloadTask.onProgressUpdate((res) => {
        wx.showLoading({
          title: `下载中 ${res.progress}%`,
          mask: true
        });
        
        if (res.progress === 100) {
          wx.hideLoading();
        }
      });
    } catch (err) {
      console.error('下载错误:', err);
      wx.hideLoading();
      wx.showToast({
        title: '下载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ downloading: false });
    }
  },

  // 分享
  onShareAppMessage() {
    const { videoData } = this.data;
    return {
      title: videoData.title || '视频去水印',
      path: '/pages/index/index'
    };
  },

  goBack() {
    wx.navigateBack();
  }
});
