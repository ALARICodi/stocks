/* 用户自己的东西:文件夹 + 每只股票的备注。
 * 全部存在浏览器 localStorage(键 stocks_user_v1),不经过任何服务器。
 * 首页(index.html)和每家公司页都加载这个文件:
 *   - 首页:填每张卡片右上角 .side(备注 + 📁 按钮),填筛选条第三行 #frow,
 *          并向 render.py 的筛选脚本提供 window.userFilterOk。
 *   - 公司页:填顶部 .mine(备注 + 📁 按钮)。
 * 数据结构:{ folders:[{id,name,t:[代号...]}], notes:{代号:"备注"} }
 */
(function () {
  var KEY = 'stocks_user_v1';
  var S = load();
  var D = 'all';           // 第三维筛选:all | noted | 某个文件夹 id

  function load() {
    var j = {};
    try { j = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { j = {}; }
    if (!Array.isArray(j.folders)) j.folders = [];
    if (!j.notes || typeof j.notes !== 'object') j.notes = {};
    j.folders.forEach(function (f) { if (!Array.isArray(f.t)) f.t = []; });
    return j;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { alert('保存失败:浏览器不允许本地存储(隐私模式?)'); }
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function byId(id) { for (var i = 0; i < S.folders.length; i++) if (S.folders[i].id === id) return S.folders[i]; return null; }
  function foldersOf(t) { return S.folders.filter(function (f) { return f.t.indexOf(t) >= 0; }); }

  /* ---------- 底部弹层 ---------- */
  var sheet = null;
  function openSheet(html) {
    closeSheet();
    sheet = document.createElement('div');
    sheet.className = 'sh-bg';
    sheet.innerHTML = '<div class="sh">' + html + '</div>';
    sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });
    document.body.appendChild(sheet);
    return sheet.firstChild;
  }
  function closeSheet() { if (sheet) { sheet.parentNode.removeChild(sheet); sheet = null; } }
  function actOf(e) {
    var el = e.target;
    while (el && el !== sheet) { if (el.dataset && el.dataset.a) return el.dataset.a; el = el.parentNode; }
    return null;
  }

  /* ---------- 备注 ---------- */
  function editNote(t) {
    var cur = S.notes[t] || '';
    var el = openSheet(
      '<div class="sh-h">' + esc(t) + ' · 我的备注</div>' +
      '<textarea class="sh-ta" placeholder="例如:石油,可以,巴菲特投资了">' + esc(cur) + '</textarea>' +
      '<div class="sh-tip">会显示在这只股票卡片的右上角。</div>' +
      '<div class="sh-btns">' +
      (cur ? '<button class="fb" data-a="del">清除备注</button>' : '') +
      '<span style="flex:1"></span>' +
      '<button class="fb" data-a="cancel">取消</button>' +
      '<button class="fb" data-a="save" aria-pressed="true">保存</button></div>');
    var ta = el.querySelector('textarea');
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    el.addEventListener('click', function (e) {
      var a = actOf(e); if (!a) return;
      if (a === 'save') { var v = ta.value.trim(); if (v) S.notes[t] = v; else delete S.notes[t]; save(); }
      if (a === 'del') { delete S.notes[t]; save(); }
      closeSheet(); refresh();
    });
  }

  /* ---------- 把一只股票放进/移出文件夹 ---------- */
  function pickFolders(t) {
    function body() {
      var rows = S.folders.map(function (f) {
        var on = f.t.indexOf(t) >= 0;
        return '<label class="sh-row"><input type="checkbox" data-id="' + f.id + '"' + (on ? ' checked' : '') + '>' +
          '<span>📁 ' + esc(f.name) + '</span><span class="sh-n">' + f.t.length + ' 只</span></label>';
      }).join('');
      if (!rows) rows = '<div class="sh-empty">还没有文件夹,先在下面新建一个,' + esc(t) + ' 会自动放进去。</div>';
      return '<div class="sh-h">' + esc(t) + ' · 放进文件夹</div>' + rows +
        '<div class="sh-new"><input class="sh-in" placeholder="新文件夹名字,如「石油股」">' +
        '<button class="fb" data-a="new">新建</button></div>' +
        '<div class="sh-btns"><span style="flex:1"></span><button class="fb" data-a="done" aria-pressed="true">完成</button></div>';
    }
    var el = openSheet(body());
    function createNew() {
      var inp = el.querySelector('.sh-in'); var n = inp.value.trim(); if (!n) { inp.focus(); return; }
      S.folders.push({ id: uid(), name: n, t: [t] }); save();
      el.innerHTML = body(); refresh();
    }
    el.addEventListener('change', function (e) {
      var id = e.target.dataset && e.target.dataset.id; if (!id) return;
      var f = byId(id); if (!f) return;
      var i = f.t.indexOf(t);
      if (e.target.checked && i < 0) f.t.push(t);
      if (!e.target.checked && i >= 0) f.t.splice(i, 1);
      save(); refresh();
      var n = el.querySelector('input[data-id="' + id + '"]').parentNode.querySelector('.sh-n');
      if (n) n.textContent = f.t.length + ' 只';
    });
    el.addEventListener('click', function (e) {
      var a = actOf(e);
      if (a === 'new') createNew();
      if (a === 'done') closeSheet();
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.classList.contains('sh-in')) { e.preventDefault(); createNew(); }
    });
  }

  /* ---------- 文件夹本身:新建 / 重命名 / 删除 ---------- */
  function askName(title, cur, cb) {
    var el = openSheet(
      '<div class="sh-h">' + title + '</div>' +
      '<div class="sh-new"><input class="sh-in" value="' + esc(cur || '') + '" placeholder="文件夹名字"></div>' +
      '<div class="sh-btns"><span style="flex:1"></span>' +
      '<button class="fb" data-a="cancel">取消</button>' +
      '<button class="fb" data-a="ok" aria-pressed="true">确定</button></div>');
    var inp = el.querySelector('.sh-in'); inp.focus(); inp.select();
    function ok() { var n = inp.value.trim(); if (!n) { inp.focus(); return; } closeSheet(); cb(n); }
    el.addEventListener('click', function (e) {
      var a = actOf(e); if (a === 'ok') ok(); if (a === 'cancel') closeSheet();
    });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ok(); } });
  }

  /* ---------- 备份 / 恢复(换手机用) ---------- */
  function backup() {
    var el = openSheet(
      '<div class="sh-h">备份 / 恢复</div>' +
      '<div class="sh-tip">文件夹和备注只存在这台设备的浏览器里。换手机或换浏览器时:' +
      '在旧设备点「复制」,把文字发给自己;在新设备粘贴到下面框里,点「导入」。</div>' +
      '<textarea class="sh-ta" spellcheck="false">' + esc(JSON.stringify(S)) + '</textarea>' +
      '<div class="sh-btns"><button class="fb" data-a="copy">复制</button>' +
      '<button class="fb" data-a="import">导入</button><span style="flex:1"></span>' +
      '<button class="fb" data-a="close" aria-pressed="true">关闭</button></div>');
    var ta = el.querySelector('textarea');
    el.addEventListener('click', function (e) {
      var a = actOf(e); if (!a) return;
      if (a === 'close') closeSheet();
      if (a === 'copy') {
        ta.select();
        var done = false;
        try { done = document.execCommand('copy'); } catch (err) { }
        if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(function () { }, function () { });
        e.target.textContent = done || navigator.clipboard ? '已复制' : '请长按全选复制';
      }
      if (a === 'import') {
        var j;
        try { j = JSON.parse(ta.value); } catch (err) { alert('这段文字不是有效的备份内容'); return; }
        if (!j || typeof j !== 'object') { alert('这段文字不是有效的备份内容'); return; }
        var nf = Array.isArray(j.folders) ? j.folders.length : 0;
        var nn = j.notes && typeof j.notes === 'object' ? Object.keys(j.notes).length : 0;
        if (!confirm('导入 ' + nf + ' 个文件夹、' + nn + ' 条备注,会覆盖本机现有的内容,确定?')) return;
        S = j; if (!Array.isArray(S.folders)) S.folders = []; if (!S.notes || typeof S.notes !== 'object') S.notes = {};
        S.folders.forEach(function (f) { if (!Array.isArray(f.t)) f.t = []; if (!f.id) f.id = uid(); });
        save(); D = 'all'; closeSheet(); refresh();
      }
    });
  }

  /* ---------- 卡片右上角 / 公司页顶部 ---------- */
  function sideHTML(t) {
    var note = S.notes[t];
    var fs = foldersOf(t);
    var h = '';
    if (note) h += '<button class="mynote" data-act="note" data-t="' + esc(t) + '" title="点击修改备注">' + esc(note) + '</button>';
    h += '<div class="row2">';
    if (!note) h += '<button class="nb" data-act="note" data-t="' + esc(t) + '">✎ 备注</button>';
    h += '<button class="nb' + (fs.length ? ' on' : '') + '" data-act="folder" data-t="' + esc(t) + '" title="放进文件夹">📁' +
      (fs.length ? ' ' + esc(fs.map(function (f) { return f.name; }).join(' · ')) : '') + '</button>';
    h += '</div>';
    return h;
  }
  function fillSides() {
    var sides = document.querySelectorAll('.card[data-t] .side, .mine[data-t]');
    for (var i = 0; i < sides.length; i++) {
      var box = sides[i];
      var t = box.dataset.t || box.parentNode.parentNode.dataset.t;
      box.innerHTML = sideHTML(t);
    }
  }
  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el !== document) {
      if (el.dataset && el.dataset.act) {
        e.preventDefault(); e.stopPropagation();
        if (el.dataset.act === 'note') editNote(el.dataset.t);
        if (el.dataset.act === 'folder') pickFolders(el.dataset.t);
        return;
      }
      el = el.parentNode;
    }
  });

  /* ---------- 首页筛选条第三行 ---------- */
  function renderFolderRow() {
    var row = document.getElementById('frow'); if (!row) return;
    if (D !== 'all' && D !== 'noted' && !byId(D)) D = 'all';
    var h = '<button class="fb" data-d="all">📁 全部</button>' +
      '<button class="fb" data-d="noted">📝 有备注 <small>' + Object.keys(S.notes).length + '</small></button>';
    S.folders.forEach(function (f) {
      h += '<button class="fb" data-d="' + f.id + '">📁 ' + esc(f.name) + ' <small>' + f.t.length + '</small></button>';
    });
    h += '<button class="fb fb-new" data-d="__new">＋ 新建文件夹</button>' +
      '<button class="fb fb-new" data-d="__backup">备份</button>';
    var f = byId(D);
    if (f) {
      h += '<div class="fmg"><span>文件夹「' + esc(f.name) + '」 · ' + f.t.length + ' 只</span>' +
        '<button class="fb" data-d="__rename">重命名</button>' +
        '<button class="fb" data-d="__delete">删除文件夹</button></div>';
    }
    row.innerHTML = h;
    var bs = row.querySelectorAll('.fb[data-d]');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', bs[i].dataset.d === D);
  }
  (function bindRow() {
    var row = document.getElementById('frow'); if (!row) return;
    row.addEventListener('click', function (e) {
      var b = e.target; while (b && b !== row && !(b.dataset && b.dataset.d)) b = b.parentNode;
      if (!b || b === row) return;
      var d = b.dataset.d;
      if (d === '__new') { askName('新建文件夹', '', function (n) { var f = { id: uid(), name: n, t: [] }; S.folders.push(f); save(); D = f.id; refresh(); }); return; }
      if (d === '__backup') { backup(); return; }
      if (d === '__rename') { var f = byId(D); if (!f) return; askName('重命名文件夹', f.name, function (n) { f.name = n; save(); refresh(); }); return; }
      if (d === '__delete') {
        var g = byId(D); if (!g) return;
        if (!confirm('删除文件夹「' + g.name + '」?里面的 ' + g.t.length + ' 只股票本身不会被删,备注也保留。')) return;
        S.folders = S.folders.filter(function (x) { return x.id !== g.id; }); save(); D = 'all'; refresh(); return;
      }
      D = d; refresh();
    });
  })();

  window.userFilterOk = function (c) {
    var t = c.dataset.t;
    if (D === 'all') return true;
    if (D === 'noted') return !!S.notes[t];
    var f = byId(D);
    return f ? f.t.indexOf(t) >= 0 : true;
  };

  function refresh() {
    fillSides();
    renderFolderRow();
    if (window.applyFilters) window.applyFilters();
  }
  refresh();
})();
