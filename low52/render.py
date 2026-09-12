#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把 low52/data.json 嵌进 template.html,产出:
  ../docs/52w/index.html   GitHub Pages 页面(内嵌一份数据快照,打开先显示快照,再去 data 分支拉最新)
  ../docs/52w/data.json    同一份快照(备用)
  ./artifact.html          claude.ai Artifact 版(去掉 doctype/html/head/body 外壳)
用法: python render.py
"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "docs", "52w")
os.makedirs(OUT, exist_ok=True)
data = json.load(open(os.path.join(HERE, "data.json"), encoding="utf-8"))
tpl = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
html = tpl.replace("/*__DATA__*/null", json.dumps(data, ensure_ascii=False))
open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(html)
json.dump(data, open(os.path.join(OUT, "data.json"), "w", encoding="utf-8"), ensure_ascii=False)

body = re.sub(r"(?s)^.*?<head>\s*(<meta[^>]*>\s*)*", "", html)
body = re.sub(r"</head>\s*<body>", "", body)
body = re.sub(r"</body>\s*</html>\s*$", "", body).rstrip() + "\n"
open(os.path.join(HERE, "artifact.html"), "w", encoding="utf-8").write(body)
print("docs/52w/index.html 写好,", data["meta"]["hits"], "家, 阈值 ±%s%%" % data["meta"]["pct"])
