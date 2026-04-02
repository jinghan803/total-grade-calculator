const { contextBridge } = require('electron');

// 暴露安全的API到渲染进程
contextBridge.exposeInMainWorld('electron', {
  app: 'grade-calculator'
});
