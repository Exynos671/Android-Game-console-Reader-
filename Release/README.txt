========================================
  掌上阅读器 Handheld Reader — Android 安装包 (Release)
  最新版本: 3.4.0  (versionCode 7)
  包名: com.handheld.reader
  构建时间: 2026-11-21
  构建工具: Capacitor 8 + Gradle 8.14.3 / AGP 8.13 / JDK 21 / SDK 36
========================================

【本文件夹内容】
- HandheldReader-3.4.0.apk   可安装的 Android APK（release 签名，可直接侧载安装）
- HandheldReader-3.4.0.apk.sha256  APK 的 SHA-256 校验值
- HandheldReader-3.3.0 / 3.2.0 / 3.1.0 / 3.0.0 / 2.0.0 / 1.0.0  旧版本（保留备查）
- handheld-reader-release.keystore  签名密钥库（务必妥善保管）
- keystore.properties                签名配置（storeFile/storePassword/keyAlias/keyPassword）

【v3.4.0 更新内容】
★ 重要底层修复：部分掌机（如 Konkr Pocket Advance，WebView 110）不支持
  CSS 的 oklch()/color-mix()，导致背景透明、文字发黑、按钮无色。本版本在
  构建时将全部颜色降级为 rgb()/rgba()，从此颜色在旧 WebView 上也能正确显示。
1. 修复底部进度条与翻页按钮重叠：底部控制栏改为两行（进度行 + 按钮行）。
2. 底部进度 / 电量 / 时间信息栏改为透明背景，直接融入书页，并随阅读主题自动
   适配文字颜色，不再像悬浮的独立条。
3. 修复阅读设置顶栏“阅读设置”一栏发灰的问题（面板改为不透明 + 颜色降级修复）。
4. 书架改为全屏单本展示：一本书占满书架区域，大幅封面 + 完整简介；使用十字键
   ←→ 或左摇杆左右即可流畅切换书籍（带滑动动画），也可点两侧箭头。
5. 打开书籍时加入缩放淡入动画，不再生硬跳转。
6. 修复阅读界面按 B 弹出的提示框黑底黑字不可读的问题（强制高对比配色）。
7. 支持一次选择多个不同格式的书籍批量导入（EPUB / MOBI / TXT / PDF / CBZ）。
8. 修复整页图片有时需要翻很多页才能过去的 bug（图片限制在单页高度内）。
9. 全屏图片模式下可用十字键上下滚动图片（此前仅支持摇杆）。
10. 连续滚动模式下同样应用图片显示方式：全屏=页边距内铺满，居中=完整合适大小。
11. 沉浸模式自动修复：在窗口聚焦 / 可见性变化 / 尺寸变化 / 触摸后及每 4 秒
    重新应用，避免状态栏偶尔自己弹回。
12. 书架界面连按三次 B 退出应用；每次按下弹出提示小窗，600ms 内没有继续按则渐隐。
13. 新增「屏幕关闭时间」设置：2 / 5 / 10 分钟或「无」（始终不息屏），默认 2 分钟；
    翻页、手柄按键、摇杆滚动与触摸操作都会重新计时。

【安装方法】
1. 将 HandheldReader-3.4.0.apk 传到安卓掌机（数据线 / 网盘 / 微信均可）。
2. 在设备上打开该文件，允许“安装未知来源应用”后安装。
   或使用 ADB：adb install -r HandheldReader-3.4.0.apk

【重新构建（可选）】
前置: JDK 21+、Android SDK 36 与 build-tools。
- Web 端构建:     npm run build
- 同步原生资源:   npx cap sync android
- 编译:           cd android && gradlew assembleRelease
- 产物:           android/app/build/outputs/apk/release/app-release.apk
- 发布:           复制为 Release/HandheldReader-<版本>.apk 并生成 sha256

注意: Release 下的 keystore 与 keystore.properties 必须与正式签名一致；
密钥丢失将无法对同一包名发布升级。
SHA-256 校验值见 HandheldReader-3.4.0.apk.sha256。
========================================
