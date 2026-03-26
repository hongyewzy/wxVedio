// app.js
App({
  onLaunch() {
    // 小程序启动时检查网络
    wx.onNetworkStatusChange((res) => {
      if (!res.isConnected) {
        wx.showToast({
          title: '网络不可用',
          icon: 'none'
        });
      }
    });
  },
  
  globalData: {
    apiBase: 'http://localhost:3000/api',
    userInfo: null
  }
});
