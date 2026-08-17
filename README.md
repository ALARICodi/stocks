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

## 更新永久网站

平时做任务1只发临时隧道网址,**不推送**。只有明确要更新永久网址时才在项目根目录运行:

```
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

一两分钟后 https://alaricodi.github.io/stocks/ 就是最新的。
