# 选股任务1 · 存档与网站

美股主板公司(市盈率 15–50 倍)的逐家分析存档,按市值从高到低推进。

**网站:** https://alaricodi.github.io/stocks/

## 目录

| 路径 | 内容 |
|---|---|
| `docs/` | 渲染出的网页,GitHub Pages 从这里发布 |
| `分析/` | 每家公司的分析原文(Markdown) |
| `状态/` | 断点续做用的完成标记 |
| `进度.json` | 待分析队列与已完成清单 |
| `评级.json` | 每家公司的篮子归类(便宜 / 公道 / 偏贵 / 很贵 / ⭐观察) |

## 更新网站

在项目根目录运行:

```
powershell -ExecutionPolicy Bypass -File 发布.ps1
```

一两分钟后 https://alaricodi.github.io/stocks/ 就是最新的。
