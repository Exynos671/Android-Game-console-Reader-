<div align="center">

# 掌上阅读器 · Handheld Reader

**为安卓掌机（Odin / Retroid Pocket / Miyoo / RG353 / Steam Deck / Konkr Pocket 等）优化的电子书阅读器**

An e-reader built for Android handheld game consoles — EPUB / MOBI / TXT / PDF / CBZ with gamepad page turns, themes and immersive mode.

[![Release](https://img.shields.io/github/v/release/Exynos671/Android-Game-console-Reader-?label=release)](https://github.com/Exynos671/Android-Game-console-Reader-/releases)

</div>

---

## 功能特性 / Features

- **多格式支持**：EPUB、MOBI、TXT、PDF、CBZ（漫画）导入与阅读，支持**批量导入**。
- **手柄操作**：RB/LB 翻页，方向键 / 摇杆滚动与导航，按键映射可自定义（主/备用双绑定），长按 B 退出设置。
- **阅读主题**：OLED 纯黑、深灰、暖黄、纸张、GameBoy、GBA 点阵屏；非 OLED 屏幕自动禁用纯黑主题。
- **排版**：字号 / 行距 / 页边距 / 字体（含点阵字体）/ 翻页动画 / 图片显示方式（居中缩放、全屏平移）。
- **界面适配**：全局「界面大小」缩放，屏幕边缘自动留白，黑夜模式高对比。
- **阅读模式**：分页阅读、连续滚动、漫画（从右往左）、条漫。
- **沉浸模式**：隐藏安卓状态栏 / 导航栏，并自动修复失效。
- **离线可用**：PWA Service Worker 缓存。
- **中英双语**。

## 下载 / Download

所有版本 APK 见 [Releases](https://github.com/Exynos671/Android-Game-console-Reader-/releases)。

| 版本 | 说明 |
| --- | --- |
| v3.4.0 | 全屏书架、批量导入、三击 B 退出、旧 WebView 颜色兼容等 |
| v3.3.0 | 界面大小、OLED 屏幕保护、黑夜模式对比、滑杆防误触等 |
| v3.2.0 | 图片显示方式、双绑定、LB/RB 肩键导航、页码缓存 |
| v3.1.0 | 精简示例书籍 |
| v3.0.0 | GBA 主题、整本书页码统计 |
| v2.0.0 | 手柄映射、专注模式、PWA 安装 |
| v1.0.0 | 首个版本 |

## 从源码构建 / Build from source

前置：Node.js 18+，JDK 21，Android SDK 36。

```bash
# 1. 安装依赖
npm install

# 2. 构建 Web 资源
npm run build

# 3. 同步到原生工程
npx cap sync android

# 4. 编译 Release APK
cd android
./gradlew assembleRelease
# 产物：android/app/build/outputs/apk/release/app-release.apk
```

本地开发：`npm run dev`（默认 http://localhost:3000）。

> 签名：将你的 keystore 放到 `Release/` 并在 `Release/keystore.properties`
> 中配置 `storeFile/storePassword/keyAlias/keyPassword`。**这两个文件已被
> `.gitignore` 排除，请勿提交。**

## 兼容性说明 / Compatibility

部分掌机（如 Konkr Pocket Advance）的 WebView 内核较旧（Chrome 110），不支持
Tailwind v4 默认使用的 `oklch()` / `color-mix()`。构建流程内置了一个 Vite 插件，
会在打包时把颜色降级为 `rgb()` / `rgba()`，确保界面颜色在旧内核上正常显示。

## 键位 / Controls（默认）

| 手柄 | 功能 |
| --- | --- |
| RB / LB | 下一页 / 上一页 |
| 右摇杆 | 连续滚动 |
| Y | 专注模式 |
| X | 切换主题 |
| Start | 阅读菜单 / 设置 |
| Select | 目录 |
| A | 书签 |
| B | 返回（书中连按两下退出；书架连按三下退出应用） |

## 许可证 / License

[MIT](LICENSE) © Exynos671
