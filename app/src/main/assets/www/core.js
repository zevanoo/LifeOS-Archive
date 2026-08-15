'use strict';
/* LifeOS core: storage, dates, markdown, palette. Pure logic (testable in node). */
(function (global) {
  const LS_KEY = 'lifeos.v1';
  const mem = {};
  const ls = (typeof localStorage !== 'undefined' && localStorage)
    ? localStorage
    : { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };

  function defaults() {
    return {
      v: 1,
      folders: [{ id: 'root', name: 'Utama', parent: null }],
      notes: [],
      lists: [{ id: 'inbox', name: 'Inbox', color: '#6750A4' }],
      tasks: [],
      journal: {},                                        // { 'YYYY-MM-DD': {mood,did[],todo[],text} }
      tx: [],
      cats: { in: ['Gaji', 'Bonus', 'Jualan', 'Lainnya'], out: ['Makan', 'Transport', 'Tagihan', 'Belanja', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya'] },
      reminders: [],
      theme: { seed: '#6750A4', mode: 'system', density: 'nyaman' },
      lang: 'id',
      budget: {},
      created: Date.now()
    };
  }
  function hasData() { return ls.getItem(LS_KEY) != null; }
  function load() {
    const d = defaults();
    try {
      const raw = ls.getItem(LS_KEY);
      if (!raw) return d;
      const parsed = JSON.parse(raw);
      // shallow-merge so future schema additions don't break old saves
      for (const k of Object.keys(d)) if (!(k in parsed)) parsed[k] = d[k];
      return parsed;
    } catch (e) { return d; }
  }
  function save(s) { ls.setItem(LS_KEY, JSON.stringify(s)); }
  function reset() { ls.removeItem(LS_KEY); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ---- dates ---- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function dateISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayISO() { return dateISO(new Date()); }
  function parseISO(iso) { const p = String(iso).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(iso, n) { const d = parseISO(iso); d.setDate(d.getDate() + n); return dateISO(d); }
  function monthKey(iso) { return String(iso).slice(0, 7); }
  function addMonths(key, n) { const p = String(key).split('-').map(Number); const d = new Date(p[0], p[1] - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  const I18N = {
    id: {
      DAY: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
      DAY_SHORT: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
      MON: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
      MON_FULL: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    },
    en: {
      DAY: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      DAY_SHORT: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      MON: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      MON_FULL: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    }
  };
  let LANG = 'id';
  function setLang(l) { if (I18N[l]) LANG = l; }
  function L10N() { return I18N[LANG]; }
  function monthLabel(key) { const p = String(key).split('-').map(Number); return L10N().MON_FULL[p[1] - 1] + ' ' + p[0]; }
  function fmtDate(iso) { if (!iso) return ''; const d = parseISO(iso); const n = L10N(); const day = n.DAY[d.getDay()], mon = n.MON[d.getMonth()]; return LANG === 'en' ? day + ', ' + mon + ' ' + d.getDate() + ' ' + d.getFullYear() : day + ', ' + d.getDate() + ' ' + mon + ' ' + d.getFullYear(); }
  function fmtDateShort(iso) { if (!iso) return ''; const d = parseISO(iso); const n = L10N(); const day = n.DAY_SHORT[d.getDay()], mon = n.MON[d.getMonth()]; return LANG === 'en' ? day + ', ' + mon + ' ' + d.getDate() : day + ', ' + d.getDate() + ' ' + mon; }
  function fmtDateTime(dt) { if (!dt) return ''; const p = String(dt).split('T'); return fmtDateShort(p[0]) + ' • ' + p[1]; }
  function fmtIDR(n) {
    try { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n); }
    catch (e) { return 'Rp ' + n; }
  }

  /* ---- markdown (safe: escape HTML first) ---- */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function inline(s) {
    let o = esc(s);
    o = o.replace(/`([^`]+)`/g, '<code>$1</code>');
    o = o.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    o = o.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    o = o.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    o = o.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return o;
  }
  function mdToHtml(src) {
    const lines = String(src == null ? '' : src).replace(/\r\n?/g, '\n').split('\n');
    const out = []; let i = 0; let listType = null;
    const closeList = () => { if (listType) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); listType = null; } };
    while (i < lines.length) {
      const ln = lines[i];
      const fence = ln.match(/^```(\w*)/);
      if (fence) {
        closeList(); const lang = fence[1]; const buf = ['<pre><code' + (lang ? ' class="lang-' + lang + '"' : '') + '>'];
        i++; while (i < lines.length && !/^```/.test(lines[i])) { buf.push(esc(lines[i])); i++; } i++;
        buf.push('</code></pre>'); out.push(buf.join('\n')); continue;
      }
      const h = ln.match(/^(#{1,6})\s+(.*)/);
      if (h) { closeList(); out.push('<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>'); i++; continue; }
      if (/^\s*(-{3,}|\*{3,})\s*$/.test(ln)) { closeList(); out.push('<hr>'); i++; continue; }
      if (/^\s*>\s?/.test(ln)) {
        closeList(); const buf = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(inline(lines[i].replace(/^\s*>\s?/, ''))); i++; }
        out.push('<blockquote>' + buf.join('<br>') + '</blockquote>'); continue;
      }
      if (ln.trim().startsWith('|')) {
        closeList(); const rows = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i]); i++; }
        const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const head = cells(rows[0]);
        const body = rows.slice(1).filter(r => !/^\s*\|?[\s:|-]+\|?\s*$/.test(r));
        let html = '<table><thead><tr>' + head.map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>';
        html += body.map(r => '<tr>' + cells(r).map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('');
        out.push(html + '</tbody></table>'); continue;
      }
      const ul = ln.match(/^\s*[-*+]\s+(.*)/);
      const ol = ln.match(/^\s*(\d+)[.)]\s+(.*)/);
      if (ul || ol) {
        const isUl = !!ul; const content = isUl ? ul[1] : ol[2];
        if (!listType || (listType === 'ul') !== isUl) { closeList(); listType = isUl ? 'ul' : 'ol'; out.push(listType === 'ul' ? '<ul>' : '<ol>'); }
        const cb = content.match(/^\[([ xX])\]\s+(.*)/);
        if (cb) { const done = cb[1].toLowerCase() === 'x'; out.push('<li><span class="md-cb' + (done ? ' done' : '') + '"></span>' + inline(cb[2]) + '</li>'); }
        else { out.push('<li>' + inline(content) + '</li>'); }
        i++; continue;
      }
      if (ln.trim() === '') { closeList(); i++; continue; }
      closeList();
      const buf = [inline(ln)]; i++;
      while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6})\s/.test(lines[i]) && !/^```/.test(lines[i]) &&
        !/^\s*[-*+]\s/.test(lines[i]) && !/^\s*\d+[.)]\s/.test(lines[i]) && !lines[i].trim().startsWith('|') &&
        !/^\s*>\s?/.test(lines[i]) && !/^\s*(-{3,}|\*{3,})\s*$/.test(lines[i])) {
        buf.push('<br>' + inline(lines[i])); i++;
      }
      out.push('<p>' + buf.join('') + '</p>');
    }
    closeList();
    return out.join('\n');
  }

  /* ---- material-ish tonal palette from a seed color ---- */
  function hexToHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let hh = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) hh = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) hh = (b - r) / d + 2; else hh = (r - g) / d + 4;
      hh /= 6;
    }
    return [hh * 360, s, l];
  }
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360; const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    const to = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return '#' + to(r) + to(g) + to(b);
  }
  function shade(hex, l) { const [h, s] = hexToHsl(hex); return hslToHex(h, s, l / 100); }
  function shiftHue(hex, d) { const [h, s, l] = hexToHsl(hex); return hslToHex(h + d, s, l); }
  function palette(seed, dark) {
    const p = dark ? 80 : 40, pc = dark ? 30 : 90;
    const sec = shiftHue(seed, 25), ter = shiftHue(seed, -30);
    return {
      primary: shade(seed, p),
      onPrimary: dark ? shade(seed, 10) : '#FFFFFF',
      primaryContainer: shade(seed, pc),
      onPrimaryContainer: dark ? '#FFFFFF' : shade(seed, 10),
      secondary: shade(sec, p),
      secondaryContainer: shade(sec, pc),
      onSecondaryContainer: dark ? '#FFFFFF' : shade(sec, 10),
      tertiary: shade(ter, p),
      // VSCode-ish code token colors derived from theme seed
      tokKw: shade(seed, dark ? 78 : 32),
      tokStr: shade(shiftHue(seed, 75), dark ? 68 : 30),
      tokNum: shade(shiftHue(seed, 165), dark ? 72 : 26),
      tokFn: shade(shiftHue(seed, -50), dark ? 75 : 26),
      tokTag: shade(shiftHue(seed, -85), dark ? 70 : 30),
      tokTy: shade(shiftHue(seed, 40), dark ? 76 : 34),
      tokProp: dark ? '#CAC4D0' : '#49454F',
      tokCom: hslToHex(hexToHsl(seed)[0], 0.12, dark ? 66 : 46),
      surface: dark ? '#131316' : shade(seed, 98),
      onSurface: dark ? '#E6E1E9' : '#1C1B1F',
      surfaceContainer: dark ? '#1E1D22' : '#F3EDF7',
      surfaceContainerHigh: dark ? '#29272E' : '#ECE6F0',
      surfaceVariant: dark ? '#2A2831' : '#E7E0EC',
      onSurfaceVariant: dark ? '#CAC4D0' : '#49454F',
      outline: dark ? '#938F99' : '#79747E',
      outlineVariant: dark ? '#49454F' : '#CAC4D0',
      error: dark ? '#F2B8B5' : '#B3261E',
      onError: dark ? '#601410' : '#FFFFFF',
      errorContainer: dark ? '#8C1D18' : '#F9DEDC',
      onErrorContainer: dark ? '#F9DEDC' : '#410E0B',
      background: dark ? '#0F1013' : shade(seed, 99),
      onBackground: dark ? '#E6E1E9' : '#1C1B1F',
      shadow: dark ? 'rgba(0,0,0,.55)' : 'rgba(0,0,0,.16)'
    };
  }

  /* ---- syntax highlighting (VSCode-like token colors from theme) ---- */
  const LANG_GROUP = { js: 'c', javascript: 'c', jsx: 'c', ts: 'c', typescript: 'c', tsx: 'c', json: 'c', c: 'c', cpp: 'c', cxx: 'c', h: 'c', hpp: 'c', java: 'c', php: 'c', csharp: 'c', cs: 'c', go: 'c', rust: 'c', rs: 'c', swift: 'c', kt: 'c', kotlin: 'c', dart: 'c', rb: 'c', ruby: 'c', py: 'py', python: 'py', html: 'html', xml: 'html', svg: 'html', vue: 'html', css: 'css', scss: 'css', less: 'css', sql: 'sql', sh: 'sh', bash: 'sh', shell: 'sh', zsh: 'sh', md: 'md', markdown: 'md' };
  const KW_C = 'const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|super|import|export|from|default|try|catch|finally|throw|async|await|typeof|instanceof|in|of|delete|void|this|null|undefined|true|false|yield|static|get|set|require|module|interface|implements|public|private|protected|readonly|enum|namespace|type|declare|abstract';
  const KW_PY = 'def|class|return|if|elif|else|for|while|import|from|as|try|except|finally|with|lambda|yield|global|nonlocal|pass|break|continue|raise|assert|del|in|is|not|and|or|None|True|False|self|print|async|await|match|case';
  const KW_SQL = 'select|from|where|insert|into|values|update|set|delete|create|table|drop|alter|add|column|join|left|right|inner|outer|cross|on|group|by|order|having|limit|offset|and|or|not|null|as|distinct|count|sum|avg|min|max|primary|key|foreign|references|default|index|between|like|in|exists|case|when|then|else|end|union|all|desc|asc|with|replace|view|database|if|is';
  const KW_SH = 'if|then|else|elif|fi|for|while|do|done|case|esac|function|return|export|local|read|echo|printf|exit|source|set|unset|alias|true|false|cd|ls|mkdir|rm|cp|mv|touch|cat|grep|sed|awk|sudo|chmod|chown|curl|wget|tar|git|npm|node|python|pip|pnpm|yarn';
  const RULES = {
    c: [
      ['str', "'(?:\\\\.|[^'\\\\\\n])*'|\"(?:\\\\.|[^\"\\\\\\n])*\"|`(?:\\\\.|[^`\\\\])*`"],
      ['com', '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|#[^\\n]*'],
      ['num', '\\b0[xX][\\da-fA-F]+\\b|\\b\\d+(?:\\.\\d+)?\\b'],
      ['kw', '\\b(?:' + KW_C + ')\\b'],
      ['ty', '\\b(?:string|number|boolean|any|void|never|unknown|Promise|Array|Map|Set|Date|Error|Object|Record|HTMLElement)\\b'],
      ['fn', '[A-Za-z_$][\\w$]*(?=\\s*\\()']
    ],
    py: [
      ['str', "'(?:\\\\.|[^'\\\\\\n])*'|\"(?:\\\\.|[^\"\\\\\\n])*\""],
      ['com', '#[^\\n]*'],
      ['num', '\\b0[xX][\\da-fA-F]+\\b|\\b\\d+(?:\\.\\d+)?\\b'],
      ['kw', '\\b(?:' + KW_PY + ')\\b'],
      ['fn', '[A-Za-z_][\\w]*(?=\\s*\\()']
    ],
    html: [
      ['com', '<!--[\\s\\S]*?-->'],
      ['str', "'(?:\\\\.|[^'\\\\\\n])*'|\"(?:\\\\.|[^\"\\\\\\n])*\""],
      ['tag', '<\\/?[a-zA-Z][\\w-]*(?:\\s[^<>]*?)?/?>']
    ],
    css: [
      ['com', '\\/\\*[\\s\\S]*?\\*\\/'],
      ['prop', '[a-z-]+(?=\\s*:)'],
      ['num', '\\b\\d+(?:\\.\\d+)?(?:px|em|rem|%|vh|vw|s|ms|fr|deg)?\\b'],
      ['kw', '@[a-z-]+|!important|\\b(?:color|background|margin|padding|display|position|flex|grid|border|font|width|height|top|left|right|bottom|transition|animation|transform|opacity|z-index|overflow|align|justify|gap)\\b']
    ],
    sql: [
      ['com', '--[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/'],
      ['str', "'[^'\\n]*'"],
      ['num', '\\b\\d+(?:\\.\\d+)?\\b'],
      ['kw', '\\b(?:' + KW_SQL + ')\\b'],
      ['fn', '[A-Za-z_][\\w]*(?=\\s*\\()']
    ],
    sh: [
      ['com', '#[^\\n]*'],
      ['str', "'[^'\\n]*'|\"(?:\\\\.|[^\"\\\\\\n])*\""],
      ['num', '\\b\\d+\\b'],
      ['kw', '\\b(?:' + KW_SH + ')\\b'],
      ['fn', '[A-Za-z_][\\w]*(?=\\s*\\()']
    ],
    md: [
      ['com', '<!--[\\s\\S]*?-->'],
      ['kw', '^#{1,6}[^\\n]*'],
      ['str', '`[^`\\n]*`']
    ]
  };
  function highlightCode(code, lang) {
    const group = LANG_GROUP[(lang || '').toLowerCase()];
    if (!group) return esc(code);
    const rules = RULES[group];
    const re = new RegExp(rules.map(r => '(' + r[1] + ')').join('|'), 'gm');
    let out = '', last = 0, m;
    while ((m = re.exec(code))) {
      if (m.index > last) out += esc(code.slice(last, m.index));
      for (let i = 1; i <= rules.length; i++) {
        if (m[i] !== undefined) { out += '<span class="tok-' + rules[i - 1][0] + '">' + esc(m[i]) + '</span>'; break; }
      }
      last = m.index + m[0].length;
    }
    out += esc(code.slice(last));
    return out;
  }

  global.LifeOS = {
    LS_KEY, hasData, load, save, reset, uid,
    setLang,
    dateISO, todayISO, addDays, monthKey, addMonths, monthLabel,
    fmtDate, fmtDateShort, fmtDateTime, fmtIDR,
    mdToHtml, highlightCode, palette, DAY: I18N.id.DAY, DAY_SHORT: I18N.id.DAY_SHORT, MON: I18N.id.MON, MON_FULL: I18N.id.MON_FULL
  };
})(typeof window !== 'undefined' ? window : globalThis);
