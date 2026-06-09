// AI動画ランキング — 単体ページ（ai-news-bi の配管を流用・データは data/video_ranking.json）

const DATA_BASE = 'data/';
let videoRankingData = null;

document.addEventListener('DOMContentLoaded', async () => {
    videoRankingData = await loadJSON('video_ranking.json');
    renderVideoRanking();
});

async function loadJSON(path) {
    try {
        const res = await fetch(DATA_BASE + path + '?t=' + Date.now());
        if (!res.ok) return null;
        return await res.json();
    } catch { return null; }
}

// ── Render ──
function renderVideoRanking() {
    const ctrl = document.getElementById('videoControls');
    if (!ctrl) return;
    const data = videoRankingData;
    if (!data || !Array.isArray(data.dates) || data.dates.length === 0) {
        ctrl.innerHTML = '<div class="empty-state">まだ動画ランキングがありません（翌朝の自動更新で生成されます）</div>';
        const body = document.getElementById('videoRankingDay');
        if (body) body.innerHTML = '';
        return;
    }
    const opts = data.dates.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('');
    ctrl.innerHTML = `
        <div class="video-controls">
            <span style="font-size:12px;color:var(--text-muted)">日付</span>
            <select id="videoDateSelect" class="search-select" onchange="renderVideoRankingDay(this.value)">${opts}</select>
            <span style="font-size:11px;color:var(--text-muted)">勢い＝再生数÷公開からの日数</span>
        </div>`;
    renderVideoRankingDay(data.latest_date || data.dates[0]);
}

function renderVideoRankingDay(date) {
    const el = document.getElementById('videoRankingDay');
    const data = videoRankingData;
    if (!el || !data) return;
    const day = (data.rankings || {})[date] || {};
    const cats = data.categories || [];
    const html = cats.map(c => {
        const cd = day[c.key] || { jp: [], world: [] };
        return `<div class="section-card">
            <h2 class="section-title">${esc(c.label)}</h2>
            ${renderVideoRegion('🇯🇵 日本', cd.jp || [])}
            ${renderVideoRegion('🌍 世界', cd.world || [])}
        </div>`;
    }).join('');
    el.innerHTML = html || '<div class="section-card"><div class="empty-state">この日のデータはありません</div></div>';
}

function renderVideoRegion(label, list) {
    if (!list.length) {
        return `<div class="video-region"><div class="video-region-label">${label}</div><div class="empty-state">該当なし</div></div>`;
    }
    return `<div class="video-region">
        <div class="video-region-label">${label}</div>
        ${list.map(v => `
            <div class="video-item">
                <span class="video-rank">${v.rank}</span>
                <div class="video-body">
                    <div class="video-title"><a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.title)}</a></div>
                    <div class="video-meta">
                        ${v.channel ? `<span>${esc(v.channel)}</span>` : ''}
                        <span>${formatViews(v.views)}回</span>
                        <span>勢い ${formatViews(Math.round(v.velocity || 0))}/日</span>
                        <span>${formatVideoAge(v.published_at)}</span>
                    </div>
                    <button class="video-copy-btn" onclick="copyPlainText(${jsArg(v.url)})">URLをコピー（Gem用）</button>
                </div>
            </div>
        `).join('')}
    </div>`;
}

function formatViews(n) {
    n = Number(n) || 0;
    if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '億';
    if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
    return n.toLocaleString('ja-JP');
}

function formatVideoAge(iso) {
    if (!iso) return '';
    const then = new Date(iso);
    if (isNaN(then.getTime())) return '';
    const days = Math.floor((Date.now() - then.getTime()) / 86400000);
    if (days <= 0) return '今日';
    if (days === 1) return '1日前';
    return days + '日前';
}

// ── Util（app.js から共用ロジックを移植）──
function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function jsArg(s) {
    return "'" + String(s == null ? '' : s)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r/g, '')
        .replace(/\n/g, '\\n')
        .replace(/</g, '\\x3C')
        .replace(/"/g, '&quot;') + "'";
}

function copyPlainText(text) {
    const t = String(text == null ? '' : text);
    const done = () => showToast('コピーしました');
    if (navigator.clipboard) {
        navigator.clipboard.writeText(t).then(done).catch(() => fallbackCopy(t, done));
    } else { fallbackCopy(t, done); }
}

function fallbackCopy(t, done) {
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if (done) done();
}

function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Service Worker（メインと共用）──
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
