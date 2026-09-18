# PAN YIRAN — Interactive Portfolio

React + Vite 单页作品集。视觉与内容依据 `docs/` 和 `reference/`，直接引用 `assets/` 原始 SVG / PNG；reference 图片不参与网页渲染。

## 本地运行

```sh
npm install
npm run dev
```

## 验证与构建

```sh
npm run build
npm test
```

浏览器测试使用本机 Google Chrome。`npm run preview` 可预览生产构建。

## 结构

- `src/components`：加载、导航、岛屿、原生 dialog 侧栏。
- `src/sections`：Hero、探索、About、Contact。
- `src/data/projects.js`：六个项目内容与外部链接。
- `src/data/assets.js`：原有素材的 Vite URL 映射，不修改或搬移源素材。
- `src/styles.css`：布局、响应式和 CSS 动画。

## 第一阶段动画

Loading：0–0.45s 窗户出现；0.45–3.45s 五个项目元素依次探出；3.45s 关窗；4s 切换黑色空间并重新开窗，月亮位于窗框后；5.35s 同位置衔接 Hero，月亮离开窗户。可跳过，支持减少动态效果设置。

Hero：大字居中浮现并停留，光标闪烁 → 逐字下沉、旋转和拉伸汇入窗户 → 窗户与原有水流素材展开。完整 Hero 时间线约 12 秒。此阶段没有 SVG path morph。页面顺序为 Home / Project Space → About → Work → Contact。

项目默认灰色，仅文字与图形之间的局部区域触发 hover / 键盘 focus；显色时原手机或网页 mockup 叠加在岛屿上。点击在当前页面打开曲线帘幕 Sidebar。侧栏支持 Escape、遮罩关闭、焦点约束与焦点恢复。手机直接显示项目简介。

## 内容待确认

- `docs/content.md` 把 SHUNSHI Prototype 放在三山项目下；目前按链接标题和目标将它归到顺时，三山链接待补充。
- 其他缺失链接显示禁用的“待添加”按钮。
- 联系信息与 About 补充文字取自对应 reference。
- 其它尝试没有项目图片，侧栏仅展示现有文本，不生成补图。
- 原目录不存在 `assets/projects`，展示图使用 `assets/content/work`。
