# 成绩计算器 - 打包指南

## 本地开发运行

```bash
# 开发模式（会自动打开开发者工具）
npm run electron-dev
```

## 打包成独立程序

### macOS
```bash
# 一键打包成DMG和ZIP
npm run electron-build
```

打包完成后，你会在 `release/` 文件夹中找到：
- `成绩计算器-x.x.x.dmg` - 可安装的DMG文件
- `成绩计算器-x.x.x.zip` - ZIP压缩包

### Windows
```bash
# 在Windows上打包
npm run electron-build
```

打包完成后，你会在 `release/` 文件夹中找到：
- `成绩计算器 Setup x.x.x.exe` - 安装程序
- `成绩计算器-x.x.x-portable.exe` - 便携式可执行文件

## 打包后使用

### macOS
1. 下载DMG文件
2. 双击打开
3. 将"成绩计算器"拖到"应用程序"文件夹
4. 从应用程序文件夹中双击运行

### Windows
1. 下载EXE文件
2. 双击运行安装程序或便携版本即可使用

## 项目结构

```
├── src/              # Vue应用源码
│   └── App.vue      # 主组件
├── dist/            # 打包后的前端文件（npm run build生成）
├── electron/        # Electron主进程
│   ├── main.cjs     # 主进程文件
│   └── preload.cjs  # 预加载脚本
├── public/          # 静态资源
└── package.json     # 项目配置
```

## 注意事项

- 首次打包可能需要下载一些文件，请耐心等待
- 打包输出在 `release/` 目录中
- 每次修改代码后，需要重新运行 `npm run electron-build` 来生成新的应用

## 自动更新（可选）

如果需要实现自动更新功能，可以参考 Electron Updater 文档。
