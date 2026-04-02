# 微信小程序转换方案

## 📱 推荐方案：Taro 3 框架

Taro 是京东开源的跨平台开发框架，支持用 Vue 3 一次编写，编译到：
- ✅ 微信小程序
- ✅ 支付宝小程序
- ✅ Web 应用
- ✅ App（iOS/Android）

## 🚀 快速开始

### 1. 安装 Taro CLI
```bash
npm install -g @tarojs/cli
```

### 2. 初始化小程序项目
```bash
taro init wechat-grade-calculator
# 选择 Vue 3
# 选择编译类型为 Webpack 5
```

### 3. 迁移现有代码

**项目结构对比：**

| 文件 | Web Vue | 小程序 Taro |
|------|---------|-----------|
| 组件 | `.vue` | `.vue` |
| 样式 | CSS | CSS（部分限制） |
| 页面路由 | vue-router | Taro pages |
| 存储 | localStorage | Taro.setStorage |

### 4. 主要改动

#### ① 路由改造
**Web版本：** 用 vue-router 切换场景
**小程序版本：** 用 Taro 页面结构

```
src/
├── pages/
│   ├── setup/
│   │   └── index.vue       # 设置页面
│   └── calculator/
│       └── index.vue       # 计算器页面
└── app.vue
```

#### ② 存储改造
```javascript
// Web (当前)
localStorage.setItem('key', JSON.stringify(data))

// 小程序 (改为)
import Taro from '@tarojs/taro'
Taro.setStorage({ key: 'key', data })
```

#### ③ 样式适配
- 小程序不支持一些 CSS 特性（如 `backdrop-filter`）
- 建议用 rpx 单位（响应式像素）
- 需要逐一兼容测试

---

## 📋 迁移工作量评估

| 任务 | 工作量 | 难度 |
|------|--------|------|
| 项目初始化 | 15分钟 | 🟢 简单 |
| 页面结构改造 | 30分钟 | 🟢 简单 |
| 存储接口改造 | 20分钟 | 🟢 简单 |
| 样式兼容 | 1小时 | 🟡 中等 |
| 测试调试 | 1-2小时 | 🟡 中等 |
| **总计** | **3-4小时** | 🟡 中等 |

---

## 🔧 详细迁移步骤

### Step 1: 创建项目
```bash
taro init wechat-grade-calculator
cd wechat-grade-calculator
npm install
```

### Step 2: 配置 app.vue
```vue
<template>
  <div id="app">
    <!-- 小程序自动处理路由 -->
  </div>
</template>

<script setup>
import { useLaunch } from '@tarojs/taro'

useLaunch(() => {
  console.log('App launched')
})
</script>
```

### Step 3: 配置路由（taroConfigApp）
```javascript
// taro.config.js
export default {
  pages: [
    'pages/setup/index',
    'pages/calculator/index'
  ],
  // ...
}
```

### Step 4: 改造存储调用
```javascript
// 从这个：
const saveConfig = () => {
  localStorage.setItem(configStorageKey, JSON.stringify(config))
}

// 改为这个：
import Taro from '@tarojs/taro'

const saveConfig = async () => {
  try {
    await Taro.setStorage({
      key: configStorageKey,
      data: config
    })
  } catch (err) {
    console.error('存储失败', err)
  }
}
```

### Step 5: 样式去掉不兼容特性
```css
/* 删除这些在小程序不支持的 */
backdrop-filter: blur(10px);  /* ❌ 删除 */
box-shadow: ...;               /* ⚠️ 仅支持部分 */
```

---

## 🎯 我可以帮你做什么

选择一个方案：

### 方案 A：完全自动化打包（推荐）
```
花时间: 2-3小时
我帮你：迁移代码 → 配置项目 → 生成可上传的小程序包
你需要：微信开发者账号
结果：可直接上传到微信后台
```

### 方案 B：给你迁移指南
```
花时间: 10分钟
我给你：详细文档 + 代码示例
你做：自己改造
```

### 方案 C：混合方案
```
我帮你：设置项目框架 + 改造页面
你做：测试 + 微调样式
```

---

## 📋 所需条件

1. **微信开发者账号**
   - 个人/企业账号都可以
   - 注册地址：https://mp.weixin.qq.com

2. **微信开发者工具**
   - 免费下载：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

3. **AppID** 
   - 从微信后台获取用于开发

---

## ⏰ 建议时间表

- **今天**: 注册微信开发者账号
- **明天**: 我帮你迁移代码（2-3小时）
- **后天**: 测试 + 上传到微信

---

**你想要哪个方案？** 我可以立即帮你开始！
