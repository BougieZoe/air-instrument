<div align="center">

# 🎵 Air Instrument

**用双手在空气中演奏音乐。**

一个本地优先的浏览器音乐合成器 —— 举起手，手指就是你的控制器。

[![Live Demo](https://img.shields.io/badge/LIVE-DEMO-blue?style=for-the-badge&logo=vercel&logoColor=white)](https://air-instrument-repo.vercel.app)

![Air Instrument Screenshot](https://opencode.ai/uploads/3f4581e9f1a54f839b355c5f79a4c430)

</div>

---

## ✨ 核心特性

| | |
|---|---|
| 🖐️ **全手追踪** | 5 根手指独立控制，支持和弦与多指鼓点 |
| 🎹 **10 个流派** | 320 个采样 —— Trap, Boom Bap, Drill, Lo-Fi, Reggaeton, House, Glitch, 8-Bit, Beatbox, Funk |
| 🔊 **模拟建模** | 电子管饱和、磁带压缩、电路噪声，每个采样都有模拟质感 |
| 🎹 **钢琴合成** | 8 次谐波泛音 + 速度敏感 ADSR，不是采样，是实时合成 |
| 🎛️ **Web MIDI** | 直接发送 MIDI 到 Ableton、FL Studio、Logic Pro |
| 📦 **零后端** | 数据不离开你的设备，完全本地运行 |

---

## 🚀 快速开始

```bash
npm install
npm run dev
```

打开 `http://localhost:5173` → 点击 **START** → 允许摄像头访问。

> 手势追踪基于 Chrome/Chromium 内核，推荐使用最新版 Chrome。

---

## 🎮 两种乐器模式

### Air Sampler
8×4 浮动采样垫，10 个流派包，共 320 个声音。手指对准采样垫并按住即可触发，每个流派使用完全不同的合成技术。

### Air Piano
3 个八度复音钢琴键盘（C3–C6，22 个键），手指滑过琴键演奏旋律。支持导入本地音频文件作为伴奏循环播放。

---

## 🧠 技术架构

```
摄像头 → MediaPipe Hand Landmarker → 自适应平滑 → 坐标映射
  → 命中检测 → 交互状态机（HOVER / PRESS）
    → Web Audio API（采样 / 合成 / 伴奏）
```

**关键技术栈：**

- **手势识别** — MediaPipe Tasks Vision，设备端推理
- **自适应校准** — 自动测量手部尺寸，精确手势分类
- **6 种手势** — 捏合、指向、张开、握拳、比耶、竖大拇指
- **交互状态机** — 每根手指独立的悬停/按下/释放状态
- **模拟建模** — 5 种风格（warm/hot/clean/dirty/vintage），每种流派自动匹配
- **音频引擎** — Web Audio API，低延迟采样回放 + 实时合成

---

## 🎵 10 个流派包

| 流派 | 风格 |
|------|------|
| **Trap Pro** | 808 滑音、清脆 hi-hat、有力鼓组 |
| **Boom Bap** | 复古 lo-fi、温暖饱和度、黑胶质感 |
| **Drill** | 滑动 808、快速 hi-hat、暗黑纹理 |
| **Lo-Fi** | 磁带饱和度、黑胶底噪、抖动 |
| **Reggaeton** | Dembow 节奏、拉丁打击乐、热带感 |
| **House** | 4/4 拍、909 鼓机、电子 stab |
| **Glitch** | 比特破碎、颗粒合成、FM、故障艺术 |
| **8-Bit** | 芯片音乐、方波、琶机、NES 风格 |
| **Beatbox** | 人声打击乐、共振峰合成、呼吸噪声 |
| **Funk** | Slap 贝斯、哇音吉他、铜管 stab、clavinet |

---

## 🛠️ 技术栈

```
React 19 + TypeScript + Vite
MediaPipe Tasks Vision (Hand Landmarker)
Web Audio API + Web MIDI API
```

---

## 📦 自定义音乐

点击 **IMPORT AUDIO** 加载任意 `.mp3`、`.wav` 或 `.m4a` 文件，音乐将作为伴奏循环播放，你可以在上面即兴演奏。

---

## 🔍 调试模式

点击右上角 **◎ DEBUG** 查看实时追踪数据：FPS、检测到的手势、指尖坐标、置信度分数和当前交互状态。

---

## 📄 License

MIT
