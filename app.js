// AI News BI — PWA App

const DATA_BASE = 'data/';
let dailyData = null;
let trendsData = null;
let linkedinData = null;
let reportData = null;
let proposalsData = null;
let predictionsArchiveData = null;
let opportunitiesData = null;
let weeklyCaseData = null;
let bigMarketArchiveData = null;
let dailyChart = null;
let categoryChart = null;
let aiCompanyChart = null;
let sourceChart = null;

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
    setupNav();
    await loadAllData();
    renderHome();
    renderTrends();
    renderPredictions();
    renderWeeklyCase();
    renderOpportunitiesBacklog();
    renderProposalsArchive();
    renderBigMarketArchive();
    initProposalSearch();
    renderLinkedIn();
    renderReport();
    renderPeriodLabels();
});

// 週次まとめ（period_start / period_end 付き）なら「今週」、無ければ従来どおり単日として出す。
// 🚨 表示は必ずデータ側の有無で決める。見出しだけ「今週」に変えると、週次の初回が出るまでの
//    あいだ、前日ぶんの中身が「今週のまとめ」として並ぶ（中身と見出しが食い違う）。
function renderPeriodLabels() {
    const start = dailyData?.period_start, end = dailyData?.period_end;
    const weekly = Boolean(start && end);
    const short = s => String(s).slice(5).replace('-', '/');

    document.getElementById('headerDate').textContent =
        weekly ? `${short(start)}〜${short(end)}` : (dailyData?.date || '');

    const title = document.getElementById('overviewTitle');
    if (title) title.textContent = weekly ? '今週の業界動向' : '今日の業界動向';

    const newsTitle = document.getElementById('topNewsTitle');
    if (newsTitle) newsTitle.textContent = weekly ? '今週の厳選ニュース' : '厳選ニュース';

    // 収集はできたのに分類が1件も無かった日は、まとめの材料が欠けている。黙って出さない。
    const notice = document.getElementById('coverageNotice');
    const missing = dailyData?.coverage?.missing_days || [];
    if (notice && weekly && missing.length) {
        notice.textContent =
            `⚠️ この期間のうち ${missing.map(short).join('・')} は記事の分類ができておらず、`
            + `まとめの材料から抜けています（${dailyData.coverage.classified}/`
            + `${dailyData.coverage.articles}件で作成）`;
        notice.hidden = false;
    } else if (notice) {
        notice.hidden = true;
    }
}

// ── Navigation ──
function setupNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.dataset.tab) return;  // 外部リンク（AI動画など）はそのまま遷移させる
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
            window.scrollTo(0, 0);
        });
    });
}

// ── Data Loading ──
async function loadJSON(path) {
    try {
        const res = await fetch(DATA_BASE + path + '?t=' + Date.now());
        if (!res.ok) return null;
        return await res.json();
    } catch { return null; }
}

async function loadAllData() {
    [dailyData, trendsData, linkedinData, reportData, proposalsData, predictionsArchiveData, opportunitiesData, weeklyCaseData, bigMarketArchiveData] = await Promise.all([
        loadJSON('daily.json'),
        loadJSON('trends.json'),
        loadJSON('linkedin.json'),
        loadJSON('report.json'),
        loadJSON('proposals.json'),
        loadJSON('predictions_archive.json'),
        loadJSON('opportunities.json'),
        loadJSON('weekly_case.json'),
        loadJSON('big_market_archive.json'),
    ]);
}

// ── Render: Home ──
function renderHome() {
    if (!dailyData) {
        document.getElementById('industryOverview').innerHTML = '<div class="empty-state">データを取得中...</div>';
        return;
    }

    // Industry Overview
    document.getElementById('industryOverview').textContent = dailyData.industry_overview || '';

    // Top 8 News
    const newsEl = document.getElementById('topNews');
    const top8 = dailyData.top_8 || [];
    if (top8.length === 0) {
        newsEl.innerHTML = '<div class="empty-state">ニュースなし</div>';
    } else {
        newsEl.innerHTML = top8.map(n => `
            <div class="news-item">
                <div class="news-item-header">
                    <span class="news-source">${esc(n.source || '')}</span>
                </div>
                <div class="news-title"><a href="${esc(n.url || '#')}" target="_blank" rel="noopener">${esc(n.title)}</a></div>
                <div class="news-summary">${esc(n.summary || '')}</div>
                ${n.why_selected ? `<div class="news-why">${esc(n.why_selected)}</div>` : ''}
            </div>
        `).join('');
    }

    // Weekly Actions
    const actionsEl = document.getElementById('weeklyActions');
    const actions = dailyData.weekly_actions || [];
    if (actions.length === 0) {
        actionsEl.innerHTML = '<div class="empty-state">アクションなし</div>';
    } else {
        actionsEl.innerHTML = actions.map((a, i) => `
            <div class="action-item">
                <span class="action-priority priority-${a.priority || 'medium'}">${(a.priority || 'medium').toUpperCase()}</span>
                <div style="flex:1">
                    <div class="action-text">${esc(a.action)}</div>
                    ${a.reason ? `<div class="action-reason">${esc(a.reason)}</div>` : ''}
                    <button class="action-consult-btn" onclick="consultAction(${i})">Claude Codeで相談</button>
                </div>
            </div>
        `).join('');
    }

    // Business Proposals
    const proposalsEl = document.getElementById('businessProposals');
    const proposals = dailyData.business_proposals || [];
    if (proposals.length === 0) {
        proposalsEl.innerHTML = '<div class="empty-state">提案なし</div>';
    } else {
        proposalsEl.innerHTML = proposals.map((p, i) => `
            <div class="proposal-item" onclick="toggleProposal('h${i}')" style="cursor:pointer">
                <div class="proposal-header">
                    <div class="proposal-name">
                        ${p.category ? `<span class="proposal-category-badge ${p.category === '横展開' ? 'category-reuse' : 'category-new'}">${esc(p.category)}</span>` : ''}
                        ${esc(p.service || p.title || '')}
                    </div>
                    <span class="proposal-toggle" id="proposalToggleh${i}">▼</span>
                </div>
                <div class="proposal-desc">${esc(p.description || '')}</div>
                <div class="proposal-meta">
                    ${p.target ? `<span class="proposal-tag">${esc(p.target)}</span>` : ''}
                    ${p.price_range ? `<span class="proposal-tag">${esc(p.price_range)}</span>` : ''}
                    ${p.effort ? `<span class="proposal-tag">${esc(p.effort)}</span>` : ''}
                </div>
                <div class="proposal-detail" id="proposalDetailh${i}" style="display:none">
                    ${p.sales_pitch ? `<div class="proposal-pitch">${esc(p.sales_pitch)}</div>` : ''}
                    ${p.how_to_sell ? `<div class="proposal-how-to-sell"><span class="how-to-sell-label">営業経路</span>${esc(p.how_to_sell)}</div>` : ''}
                    ${p.competitive_advantage ? `<div class="proposal-how-to-sell"><span class="how-to-sell-label">競合優位性</span>${esc(p.competitive_advantage)}</div>` : ''}
                    ${p.example ? `<div class="proposal-example">${esc(p.example)}</div>` : ''}
                    ${(p.how_to_implement && p.how_to_implement.length) ? `
                        <div class="proposal-steps-title">実装ステップ</div>
                        <ol class="proposal-steps">
                            ${p.how_to_implement.map(s => `<li>${esc(s)}</li>`).join('')}
                        </ol>
                    ` : ''}
                    ${(p.tools && p.tools.length) ? `
                        <div class="proposal-tools">
                            ${p.tools.map(t => `<span class="proposal-tool-tag">${esc(t)}</span>`).join('')}
                        </div>
                    ` : ''}
                    ${p.reason ? `<div class="news-why" style="margin-top:8px">${esc(p.reason)}</div>` : ''}
                    <button class="implement-btn" onclick="event.stopPropagation(); implementProposal(${i})">Claude Codeで実装</button>
                </div>
            </div>
        `).join('');
    }

    // Big Market Play（大型市場提案・毎日1件・3軸バッジ付き）
    const bmpEl = document.getElementById('bigMarketPlay');
    if (bmpEl) {
        const bmp = dailyData.big_market_play;
        if (!bmp) {
            bmpEl.innerHTML = '<div class="empty-state">大型市場提案は次回バッチで生成されます</div>';
        } else {
            bmpEl.innerHTML = renderBmpCard(bmp, { implementOnclick: 'implementBigMarketPlay()' });
        }
    }

    // Learning Suggestions
    const learningEl = document.getElementById('learningSuggestions');
    const learning = dailyData.learning_suggestions || [];
    if (learning.length === 0) {
        learningEl.innerHTML = '<div class="empty-state">提案なし</div>';
    } else {
        learningEl.innerHTML = learning.map(l => `
            <div class="learning-item">
                <div class="learning-topic">${esc(l.topic)}</div>
                <div class="learning-why">${esc(l.why || '')}</div>
                ${l.time_estimate ? `<div class="learning-time">${esc(l.time_estimate)}</div>` : ''}
            </div>
        `).join('');
    }
}

// ── Render: Trends ──
function renderTrends() {
    // Trends from daily analysis
    const trendsListEl = document.getElementById('trendsList');
    const trends = dailyData?.trends || [];
    if (trends.length === 0) {
        trendsListEl.innerHTML = '<div class="empty-state">トレンドデータなし</div>';
    } else {
        trendsListEl.innerHTML = trends.map(t => `
            <div class="trend-item">
                <div class="trend-topic">${esc(t.topic)}</div>
                <div class="trend-desc">${esc(t.description || '')}</div>
                ${t.why ? `<div class="trend-why">${esc(t.why)}</div>` : ''}
                ${t.shisto_impact ? `<div class="trend-impact">${esc(t.shisto_impact)}</div>` : ''}
            </div>
        `).join('');
    }

    if (!trendsData) return;

    // Daily article count chart
    const dailyCounts = trendsData.daily_counts || [];
    if (dailyCounts.length > 0) {
        const ctx = document.getElementById('dailyChart').getContext('2d');
        if (dailyChart) dailyChart.destroy();
        dailyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dailyCounts.map(d => d.date.slice(5)),
                datasets: [{
                    label: '記事数',
                    data: dailyCounts.map(d => d.count),
                    borderColor: '#4f8cff',
                    backgroundColor: 'rgba(79,140,255,0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 2,
                }]
            },
            options: chartOptions('記事数'),
        });
    }

    // Category chart
    const catData = trendsData.category_7d || [];
    if (catData.length > 0) {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        if (categoryChart) categoryChart.destroy();
        const colors = ['#4f8cff', '#34d399', '#fbbf24', '#fb923c', '#f87171', '#a78bfa', '#f472b6'];
        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: catData.map(c => c.category || '未分類'),
                datasets: [{
                    data: catData.map(c => c.count),
                    backgroundColor: colors.slice(0, catData.length),
                    borderWidth: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#8892a8', font: { size: 11 }, padding: 8 }
                    }
                }
            },
        });
    }

    // AI Company chart (horizontal bar)
    const aiData = trendsData.ai_company_7d || [];
    if (aiData.length > 0) {
        const ctx = document.getElementById('aiCompanyChart').getContext('2d');
        if (aiCompanyChart) aiCompanyChart.destroy();
        const aiColors = {
            'Claude': '#d4a574', 'Gemini': '#4285f4', 'ChatGPT / GPT': '#10a37f',
            'Copilot': '#00a4ef', 'LLaMA': '#0668e1', 'Grok': '#1d9bf0',
            'DeepSeek': '#4f46e5', 'Mistral': '#f54e42', 'Qwen': '#6366f1',
            'Amazon Bedrock': '#ff9900', 'Hugging Face': '#ffcd00',
            'Stable Diffusion': '#b45eeb', 'Cursor': '#22d3ee', 'Dify': '#4f8cff',
        };
        aiCompanyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: aiData.map(a => a.company),
                datasets: [{
                    data: aiData.map(a => a.count),
                    backgroundColor: aiData.map(a => aiColors[a.company] || '#4f8cff'),
                    borderWidth: 0,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: { ticks: { color: '#8892a8', font: { size: 10 }, stepSize: 1 }, grid: { color: '#1e2a45' }, beginAtZero: true },
                    y: { ticks: { color: '#e4e8f1', font: { size: 12, weight: 'bold' } }, grid: { display: false } },
                },
                plugins: { legend: { display: false } },
            },
        });
    }

    // Source chart (horizontal bar)
    const srcData = trendsData.source_stats_7d || [];
    if (srcData.length > 0) {
        const ctx = document.getElementById('sourceChart').getContext('2d');
        if (sourceChart) sourceChart.destroy();
        const barColors = srcData.map((_, i) => {
            const palette = ['#4f8cff', '#34d399', '#fbbf24', '#fb923c', '#f87171', '#a78bfa', '#f472b6', '#38bdf8', '#818cf8', '#fb7185', '#4ade80', '#facc15', '#e879f9', '#22d3ee', '#f97316'];
            return palette[i % palette.length];
        });
        sourceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: srcData.map(s => s.source),
                datasets: [{
                    data: srcData.map(s => s.count),
                    backgroundColor: barColors,
                    borderWidth: 0,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: { ticks: { color: '#8892a8', font: { size: 10 } }, grid: { color: '#1e2a45' }, beginAtZero: true },
                    y: { ticks: { color: '#e4e8f1', font: { size: 11 } }, grid: { display: false } },
                },
                plugins: { legend: { display: false } },
            },
        });
    }
}

function chartOptions(yLabel) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { ticks: { color: '#8892a8', font: { size: 10 } }, grid: { color: '#1e2a45' } },
            y: { ticks: { color: '#8892a8', font: { size: 10 } }, grid: { color: '#1e2a45' }, beginAtZero: true },
        },
        plugins: { legend: { display: false } },
    };
}

// ── Render: Predictions ──
function renderPredictions() {
    // 今日の予測
    const predictions = dailyData?.predictions || {};
    renderPredictionList('shortTermPredictions', predictions.short_term || []);
    renderPredictionList('midTermPredictions', predictions.mid_term || []);
    renderPredictionList('longTermPredictions', predictions.long_term || []);

    // 予測アーカイブ
    const archiveEl = document.getElementById('predictionsArchive');
    const archive = predictionsArchiveData || [];
    if (archive.length === 0) {
        archiveEl.innerHTML = '<div class="empty-state">アーカイブなし</div>';
    } else {
        archiveEl.innerHTML = archive.map((day, di) => {
            const preds = day.predictions || {};
            const total = (preds.short_term || []).length + (preds.mid_term || []).length + (preds.long_term || []).length;
            return `
                <div class="archive-day">
                    <div class="archive-date" onclick="togglePredArchive(${di})" style="cursor:pointer">
                        <span>${esc(day.date)}</span>
                        <span class="proposal-count">${total}件</span>
                        <span class="proposal-toggle" id="predArchiveToggle${di}">${di === 0 ? '▲' : '▼'}</span>
                    </div>
                    <div id="predArchiveDay${di}" style="display:${di === 0 ? 'block' : 'none'}; padding:4px 0">
                        ${renderArchivePredSection('短期', preds.short_term || [])}
                        ${renderArchivePredSection('中期', preds.mid_term || [])}
                        ${renderArchivePredSection('長期', preds.long_term || [])}
                    </div>
                </div>
            `;
        }).join('');
    }
}

function renderArchivePredSection(label, items) {
    if (items.length === 0) return '';
    return `<div style="margin-bottom:8px">
        <div style="font-size:12px;color:var(--accent);font-weight:600;margin-bottom:4px">${label}</div>
        ${items.map(p => {
            const confClass = p.confidence === '高' ? 'high' : p.confidence === '中' ? 'mid' : 'low';
            return `<div class="prediction-item">
                <span class="prediction-confidence confidence-${confClass}">${esc(p.confidence || '中')}</span>
                <div class="prediction-text">${esc(p.prediction)}</div>
            </div>`;
        }).join('')}
    </div>`;
}

function togglePredArchive(index) {
    const el = document.getElementById(`predArchiveDay${index}`);
    const toggle = document.getElementById(`predArchiveToggle${index}`);
    if (el.style.display === 'none') {
        el.style.display = 'block';
        toggle.textContent = '▲';
    } else {
        el.style.display = 'none';
        toggle.textContent = '▼';
    }
}

function renderPredictionList(elId, items) {
    const el = document.getElementById(elId);
    if (items.length === 0) {
        el.innerHTML = '<div class="empty-state">予測データなし</div>';
        return;
    }
    el.innerHTML = items.map(p => {
        const confClass = p.confidence === '高' ? 'high' : p.confidence === '中' ? 'mid' : 'low';
        return `
            <div class="prediction-item">
                <span class="prediction-confidence confidence-${confClass}">${esc(p.confidence || '中')}</span>
                <div class="prediction-text">${esc(p.prediction)}</div>
                ${p.evidence ? `<div class="prediction-evidence">${esc(p.evidence)}</div>` : ''}
                ${p.shisto_implication ? `<div class="prediction-implication">${esc(p.shisto_implication)}</div>` : ''}
            </div>
        `;
    }).join('');
}

// ── Render: Proposals Archive ──
function initProposalSearch() {
    const input = document.getElementById('proposalSearchInput');
    const categoryFilter = document.getElementById('proposalCategoryFilter');
    const run = () => filterProposals();
    input.addEventListener('input', run);
    categoryFilter.addEventListener('change', run);
}

function filterProposals() {
    const query = (document.getElementById('proposalSearchInput').value || '').trim().toLowerCase();
    const category = document.getElementById('proposalCategoryFilter').value;
    const statusEl = document.getElementById('proposalSearchStatus');
    const archive = proposalsData || [];

    if (!query && !category) {
        statusEl.textContent = '';
        renderProposalsArchive();
        return;
    }

    // 全提案をフラット化して検索
    const matches = [];
    for (const day of archive) {
        for (const p of day.proposals) {
            if (category && p.category !== category) continue;
            if (query) {
                const text = [
                    p.service, p.description, p.target, p.price_range,
                    p.reason, p.how_to_sell, p.sales_pitch, p.example,
                    p.category, ...(p.tools || []),
                ].filter(Boolean).join(' ').toLowerCase();
                if (!text.includes(query)) continue;
            }
            matches.push({ date: day.date, proposal: p });
        }
    }

    statusEl.textContent = `${matches.length}件`;
    renderProposalSearchResults(matches);
}

// ── マネタイズ系の追加フィールド描画（アーカイブ・検索の両方で共用） ──
function readinessBadge(p) {
    const r = p && p.monetization_readiness;
    if (!r) return '';
    const cls = r >= 4 ? 'readiness-high' : (r >= 3 ? 'readiness-mid' : 'readiness-low');
    return `<span class="proposal-tag ${cls}" title="マネタイズ準備度（自己採点1-5）">準備度 ${esc(String(r))}/5</span>`;
}
function reachabilityBadge(p) {
    const v = p && p.reachability;
    if (v === 'now') return `<span class="proposal-tag" title="leads.md/兄3社の実在の相手が宛先">今週動ける</span>`;
    if (v === 'new_market') return `<span class="proposal-tag" title="現ネットワーク外・要チャネル構築">新市場開拓</span>`;
    return '';
}

function proposalDetailExtraHtml(p) {
    if (!p) return '';
    let h = '';
    if (Array.isArray(p.offer_package) && p.offer_package.length) {
        h += `<div class="proposal-steps-title">オファー（松竹梅）</div><ul class="proposal-steps">` +
            p.offer_package.map(t => `<li><b>${esc(t.tier || '')}</b> ${esc(t.price || '')} — ${esc(t.scope || '')}</li>`).join('') + `</ul>`;
    }
    if (Array.isArray(p.deliverables) && p.deliverables.length) {
        h += `<div class="proposal-steps-title">納品物</div><ul class="proposal-steps">` +
            p.deliverables.map(d => `<li>${esc(d)}</li>`).join('') + `</ul>`;
    }
    if (p.outreach_message) {
        h += `<div class="proposal-how-to-sell"><span class="how-to-sell-label">送れる文面</span>${esc(p.outreach_message)}` +
            ` <button class="implement-btn" style="margin-top:6px" onclick="event.stopPropagation(); copyPlainText(${jsArg(p.outreach_message)})">この文面をコピー</button></div>`;
    }
    if (Array.isArray(p.objection_handling) && p.objection_handling.length) {
        h += `<div class="proposal-steps-title">想定の断り → 切り返し</div><ul class="proposal-steps">` +
            p.objection_handling.map(o => `<li><b>「${esc(o.objection || '')}」</b> → ${esc(o.response || '')}</li>`).join('') + `</ul>`;
    }
    if (Array.isArray(p.proof_assets) && p.proof_assets.length) {
        h += `<div class="proposal-tools">` + p.proof_assets.map(a => `<span class="proposal-tool-tag">${esc(a)}</span>`).join('') + `</div>`;
    }
    if (p.first_week_action) {
        h += `<div class="proposal-how-to-sell"><span class="how-to-sell-label">今週の一手</span>${esc(p.first_week_action)}</div>`;
    }
    return h;
}

// インラインonclick（属性は二重引用符）に文字列を安全に埋め込むためのJSリテラル化
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

// ── Render: 今週の案件化パッケージ ──
function renderWeeklyCase() {
    const el = document.getElementById('weeklyCase');
    if (!el) return;
    const c = weeklyCaseData;
    if (!c || typeof c !== 'object') {
        el.innerHTML = '<div class="empty-state">まだ案件化パッケージがありません（週次で生成されます）</div>';
        return;
    }
    const seq = Array.isArray(c.outreach_sequence) ? c.outreach_sequence : [];
    const obj = Array.isArray(c.objection_responses) ? c.objection_responses : [];
    const outline = Array.isArray(c.one_pager_outline) ? c.one_pager_outline : [];
    const actions = Array.isArray(c.first_week_actions) ? c.first_week_actions : [];
    const src = c.source_opportunity || {};
    el.innerHTML = `
        <div class="proposal-item">
            <div class="proposal-header">
                <div class="proposal-name">${esc(c.headline || (src.service || '案件化パッケージ'))}</div>
                <span style="font-size:11px;color:var(--text-muted)">${esc(c.generated_date || '')}</span>
            </div>
            ${src.service ? `<div class="proposal-desc">出典提案: ${esc(src.service)} ${src.from_date ? `(${esc(src.from_date)})` : ''} ${src.monetization_readiness ? `／準備度 ${esc(String(src.monetization_readiness))}/5` : ''}</div>` : ''}
            ${c.offer_doc ? `<div class="proposal-example" style="white-space:pre-wrap">${esc(c.offer_doc)}</div>` : ''}
            ${c.pricing_rationale ? `<div class="proposal-how-to-sell"><span class="how-to-sell-label">価格の根拠</span>${esc(c.pricing_rationale)}</div>` : ''}
            ${seq.length ? `<div class="proposal-steps-title">アウトリーチ手順</div>` + seq.map(s => `
                <div class="proposal-how-to-sell">
                    <span class="how-to-sell-label">${esc(s.step || '')}${s.channel ? ` / ${esc(s.channel)}` : ''}</span>${esc(s.message || '')}
                    <button class="implement-btn" style="margin-top:6px" onclick="copyPlainText(${jsArg(s.message || '')})">この文面をコピー</button>
                </div>`).join('') : ''}
            ${obj.length ? `<div class="proposal-steps-title">想定の断り → 切り返し</div><ul class="proposal-steps">` + obj.map(o => `<li><b>「${esc(o.objection || '')}」</b> → ${esc(o.response || '')}</li>`).join('') + `</ul>` : ''}
            ${c.demo_script ? `<div class="proposal-how-to-sell"><span class="how-to-sell-label">デモ台本</span><span style="white-space:pre-wrap">${esc(c.demo_script)}</span></div>` : ''}
            ${outline.length ? `<div class="proposal-steps-title">1枚提案の骨子 <button class="implement-btn" onclick="copyPlainText(${jsArg(outline.join('\n'))})">骨子をコピー</button></div><ol class="proposal-steps">` + outline.map(o => `<li>${esc(o)}</li>`).join('') + `</ol>` : ''}
            ${actions.length ? `<div class="proposal-steps-title">今週のアクション</div><ul class="proposal-steps">` + actions.map(a => `<li>${esc(a.action || '')}${a.deadline ? ` <span style="color:var(--text-muted)">（${esc(a.deadline)}）</span>` : ''}</li>`).join('') + `</ul>` : ''}
        </div>`;
}

// ── Render: 案件バックログ（リード台帳） ──
const OPP_STATUSES = ['新規', '検討中', '提案済', '商談中', '受注', '見送り'];
const OPP_STATUS_ORDER = ['商談中', '提案済', '検討中', '新規', '受注', '見送り'];

function getOppStatusOverrides() {
    try { return JSON.parse(localStorage.getItem('opp_status') || '{}') || {}; }
    catch { return {}; }
}
function setOppStatus(id, status) {
    const m = getOppStatusOverrides();
    m[id] = status;
    localStorage.setItem('opp_status', JSON.stringify(m));
    renderOpportunitiesBacklog();
}
function exportOppStatus() {
    const m = getOppStatusOverrides();
    const txt = JSON.stringify(m, null, 2);
    copyPlainText(txt);
    showToast('ステータスをコピー — pwa/data/opportunity_status.json に貼って commit してください');
}

function renderOpportunitiesBacklog() {
    const el = document.getElementById('opportunitiesBacklog');
    if (!el) return;
    const rows = Array.isArray(opportunitiesData) ? opportunitiesData.slice() : [];
    if (rows.length === 0) {
        el.innerHTML = '<div class="empty-state">まだ案件バックログがありません（提案生成とともに蓄積されます）</div>';
        return;
    }
    const overrides = getOppStatusOverrides();
    rows.forEach(r => { if (overrides[r.id]) r._status = overrides[r.id]; else r._status = r.status || '新規'; });
    rows.sort((a, b) => {
        const sa = OPP_STATUS_ORDER.indexOf(a._status); const sb = OPP_STATUS_ORDER.indexOf(b._status);
        if (sa !== sb) return (sa < 0 ? 99 : sa) - (sb < 0 ? 99 : sb);
        if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
        return (b.last_seen || '').localeCompare(a.last_seen || '');
    });
    el.innerHTML = `
        <div style="margin-bottom:10px"><button class="implement-btn" onclick="exportOppStatus()">ステータスをエクスポート(JSON)</button>
        <span class="search-status" style="font-size:11px;margin-left:8px">ステータスはこの端末に保存されます。永続化はエクスポートして opportunity_status.json に貼ってください</span></div>
        ` + rows.map((r, i) => {
        const uid = `opp_${i}`;
        const p = r.payload || {};
        return `
        <div class="proposal-item">
            <div class="proposal-header">
                <div class="proposal-name" onclick="toggleProposal('${uid}')" style="cursor:pointer">
                    ${r.category ? `<span class="proposal-category-badge ${r.category === '横展開' ? 'category-reuse' : 'category-new'}">${esc(r.category)}</span>` : ''}
                    ${esc(r.service || '')} <span class="proposal-toggle" id="proposalToggle${uid}">▼</span>
                </div>
                <select onchange="setOppStatus(${jsArg(r.id)}, this.value)" onclick="event.stopPropagation()" style="font-size:12px">
                    ${OPP_STATUSES.map(s => `<option value="${s}" ${s === r._status ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
            <div class="proposal-meta">
                ${r.target ? `<span class="proposal-tag">${esc(r.target)}</span>` : ''}
                ${reachabilityBadge(p)}
                ${r.score ? `<span class="proposal-tag">準備度 ${esc(String(r.score))}/5</span>` : ''}
                <span class="proposal-tag">${esc(String(r.times_seen || 1))}回登場</span>
                <span class="proposal-tag">最終 ${esc(r.last_seen || '')}</span>
            </div>
            <div class="proposal-detail" id="proposalDetail${uid}" style="display:none">
                ${p.description ? `<div class="proposal-desc">${esc(p.description)}</div>` : ''}
                ${p.price_range ? `<div class="proposal-how-to-sell"><span class="how-to-sell-label">価格</span>${esc(p.price_range)}</div>` : ''}
                ${p.how_to_sell ? `<div class="proposal-how-to-sell"><span class="how-to-sell-label">営業経路</span>${esc(p.how_to_sell)}</div>` : ''}
                ${proposalDetailExtraHtml(p)}
                ${p.competitive_advantage ? `<div class="proposal-how-to-sell"><span class="how-to-sell-label">競合優位性</span>${esc(p.competitive_advantage)}</div>` : ''}
            </div>
        </div>`;
    }).join('');
}

function renderProposalSearchResults(matches) {
    const el = document.getElementById('proposalsArchive');
    if (matches.length === 0) {
        el.innerHTML = '<div class="empty-state">該当する提案が見つかりませんでした</div>';
        return;
    }
    el.innerHTML = matches.map((m, i) => {
        const p = m.proposal;
        const uid = `ps_${i}`;
        return `
        <div class="proposal-item" onclick="toggleProposal('${uid}')" style="cursor:pointer">
            <div class="proposal-header">
                <div class="proposal-name">
                    ${p.category ? `<span class="proposal-category-badge ${p.category === '横展開' ? 'category-reuse' : 'category-new'}">${esc(p.category)}</span>` : ''}
                    ${esc(p.service || '')}
                </div>
                <span style="font-size:11px;color:var(--text-muted)">${esc(m.date)}</span>
            </div>
            <div class="proposal-desc">${esc(p.description || '')}</div>
            <div class="proposal-meta">
                ${p.target ? `<span class="proposal-tag">${esc(p.target)}</span>` : ''}
                ${p.price_range ? `<span class="proposal-tag">${esc(p.price_range)}</span>` : ''}
                ${p.effort ? `<span class="proposal-tag">${esc(p.effort)}</span>` : ''}
                ${reachabilityBadge(p)}${readinessBadge(p)}
            </div>
            <div class="proposal-detail" id="proposalDetail${uid}" style="display:none">
                ${p.sales_pitch ? `<div class="proposal-pitch">${esc(p.sales_pitch)}</div>` : ''}
                ${p.how_to_sell ? `<div class="proposal-how-to-sell"><span class="how-to-sell-label">営業経路</span>${esc(p.how_to_sell)}</div>` : ''}
                ${proposalDetailExtraHtml(p)}
                ${p.competitive_advantage ? `<div class="proposal-how-to-sell"><span class="how-to-sell-label">競合優位性</span>${esc(p.competitive_advantage)}</div>` : ''}
                ${p.example ? `<div class="proposal-example">${esc(p.example)}</div>` : ''}
                ${(p.how_to_implement && p.how_to_implement.length) ? `
                    <div class="proposal-steps-title">実装ステップ</div>
                    <ol class="proposal-steps">
                        ${p.how_to_implement.map(s => `<li>${esc(s)}</li>`).join('')}
                    </ol>
                ` : ''}
                ${(p.tools && p.tools.length) ? `
                    <div class="proposal-tools">
                        ${p.tools.map(t => `<span class="proposal-tool-tag">${esc(t)}</span>`).join('')}
                    </div>
                ` : ''}
                ${p.reason ? `<div class="news-why" style="margin-top:8px">${esc(p.reason)}</div>` : ''}
            </div>
        </div>`;
    }).join('');
}

function renderProposalsArchive() {
    const el = document.getElementById('proposalsArchive');
    const archive = proposalsData || [];
    if (archive.length === 0) {
        el.innerHTML = '<div class="empty-state">提案データなし</div>';
        return;
    }
    el.innerHTML = archive.map((day, di) => `
        <div class="archive-day">
            <div class="archive-date" onclick="toggleArchiveDay(${di})" style="cursor:pointer">
                <span>${esc(day.date)}</span>
                <span class="proposal-count">${day.proposals.length}件</span>
                <span class="proposal-toggle" id="archiveToggle${di}">${di === 0 ? '▲' : '▼'}</span>
            </div>
            <div class="archive-proposals" id="archiveDay${di}" style="display:${di === 0 ? 'block' : 'none'}">
                ${day.proposals.map((p, pi) => {
                    const uid = `${di}_${pi}`;
                    return `
                    <div class="proposal-item" onclick="toggleProposal('a${uid}')" style="cursor:pointer">
                        <div class="proposal-header">
                            <div class="proposal-name">
                                ${p.category ? `<span class="proposal-category-badge ${p.category === '横展開' ? 'category-reuse' : 'category-new'}">${esc(p.category)}</span>` : ''}
                                ${esc(p.service || p.title || '')}
                            </div>
                            <span class="proposal-toggle" id="proposalTogglea${uid}">▼</span>
                        </div>
                        <div class="proposal-desc">${esc(p.description || '')}</div>
                        <div class="proposal-meta">
                            ${p.target ? `<span class="proposal-tag">${esc(p.target)}</span>` : ''}
                            ${p.price_range ? `<span class="proposal-tag">${esc(p.price_range)}</span>` : ''}
                            ${p.effort ? `<span class="proposal-tag">${esc(p.effort)}</span>` : ''}
                            ${reachabilityBadge(p)}${readinessBadge(p)}
                        </div>
                        <div class="proposal-detail" id="proposalDetaila${uid}" style="display:none">
                            ${p.sales_pitch ? `<div class="proposal-pitch">${esc(p.sales_pitch)}</div>` : ''}
                            ${p.how_to_sell ? `<div class="proposal-how-to-sell"><span class="how-to-sell-label">営業経路</span>${esc(p.how_to_sell)}</div>` : ''}
                            ${proposalDetailExtraHtml(p)}
                            ${p.competitive_advantage ? `<div class="proposal-how-to-sell"><span class="how-to-sell-label">競合優位性</span>${esc(p.competitive_advantage)}</div>` : ''}
                            ${p.example ? `<div class="proposal-example">${esc(p.example)}</div>` : ''}
                            ${(p.how_to_implement && p.how_to_implement.length) ? `
                                <div class="proposal-steps-title">実装ステップ</div>
                                <ol class="proposal-steps">
                                    ${p.how_to_implement.map(s => `<li>${esc(s)}</li>`).join('')}
                                </ol>
                            ` : ''}
                            ${(p.tools && p.tools.length) ? `
                                <div class="proposal-tools">
                                    ${p.tools.map(t => `<span class="proposal-tool-tag">${esc(t)}</span>`).join('')}
                                </div>
                            ` : ''}
                            ${p.reason ? `<div class="news-why" style="margin-top:8px">${esc(p.reason)}</div>` : ''}
                            <button class="implement-btn" onclick="event.stopPropagation(); implementArchiveProposal(${di}, ${pi})">Claude Codeで実装</button>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>
    `).join('');
}

function implementArchiveProposal(dayIndex, propIndex) {
    const day = (proposalsData || [])[dayIndex];
    if (!day) return;
    const p = day.proposals[propIndex];
    if (!p) return;

    const steps = (p.how_to_implement || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
    const tools = (p.tools || []).join(', ');

    const prompt = `【AIニュースBIの活用提案より（${day.date}）】
以下はAI業界ニュースの自動分析から生成された活用提案です。
背景の分析は ai-news-bi/pwa/data/daily.json を参照してください。
この提案の実装を検討しています。

${p.category ? `【カテゴリ】${p.category}` : ''}
【サービス名】${p.service || ''}
【説明】${p.description || ''}
【ターゲット】${p.target || ''}
【価格帯】${p.price_range || ''}
【工数】${p.effort || ''}
【提案理由】${p.reason || ''}
${p.how_to_sell ? `【営業経路】${p.how_to_sell}` : ''}
${p.competitive_advantage ? `【競合優位性】${p.competitive_advantage}` : ''}
【営業ピッチ】${p.sales_pitch || ''}
【具体例】${p.example || ''}
【使用ツール】${tools}
【実装ステップ案】
${steps}

---
いきなり実装に入らないでください。
まず「この提案はこんな感じで実装します」と計画を提示し、
何か補足や修正はありますか？と確認してから進めてください。`;

    const escaped = prompt.replace(/'/g, "'\\''");
    const cmd = `claude '${escaped}'`;

    navigator.clipboard.writeText(cmd).then(() => {
        showToast('コマンドをコピーしました — ターミナルに貼り付けてください');
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = cmd;
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('コマンドをコピーしました — ターミナルに貼り付けてください');
    });
}

function toggleArchiveDay(index) {
    const el = document.getElementById(`archiveDay${index}`);
    const toggle = document.getElementById(`archiveToggle${index}`);
    if (el.style.display === 'none') {
        el.style.display = 'block';
        toggle.textContent = '▲';
    } else {
        el.style.display = 'none';
        toggle.textContent = '▼';
    }
}

// ── Render: LinkedIn ──
function renderLinkedIn() {
    const el = document.getElementById('linkedinPosts');
    const posts = linkedinData?.posts || [];
    if (posts.length === 0) {
        el.innerHTML = '<div class="empty-state">投稿案なし</div>';
        return;
    }
    const dayMap = { monday: '月曜', wednesday: '水曜', friday: '金曜' };
    el.innerHTML = posts.map((p, i) => `
        <div class="linkedin-post">
            <div class="linkedin-day">${dayMap[p.post_day] || p.post_day || `投稿${i+1}`}</div>
            <div class="linkedin-body">${esc(p.body)}</div>
            <div class="linkedin-hashtags">${(p.hashtags || []).join(' ')}</div>
            <button class="linkedin-copy" onclick="copyPost(this, ${i})">コピー</button>
        </div>
    `).join('');
}

function copyPost(btn, index) {
    const post = linkedinData.posts[index];
    const text = post.body + '\n\n' + (post.hashtags || []).join(' ');
    navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'コピー済み';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = 'コピー';
            btn.classList.remove('copied');
        }, 2000);
    });
}

// ── Render: Report ──
function renderReport() {
    const el = document.getElementById('reportContent');
    const titleEl = document.getElementById('reportTitle');

    if (!reportData) {
        el.innerHTML = '<div class="empty-state">レポートなし</div>';
        return;
    }

    const type = reportData.type;
    const data = reportData.data;
    titleEl.textContent = type === 'monthly' ? '月次レポート' : '週次レポート';

    if (type === 'weekly') {
        el.innerHTML = `
            <div class="report-section">
                <div class="report-section-title">${esc(data.period || '')}</div>
                <div style="white-space:pre-wrap">${esc(data.overview || '')}</div>
            </div>
            ${data.trend_changes ? `
                <div class="report-section">
                    <div class="report-section-title">トレンド変化</div>
                    ${data.trend_changes.map(t => `
                        <div class="trend-item">
                            <div class="trend-topic">${esc(t.topic)} <span style="color:var(--yellow)">[${esc(t.direction)}]</span></div>
                            <div class="trend-desc">${esc(t.detail)}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            ${data.top_5_news ? `
                <div class="report-section">
                    <div class="report-section-title">注目ニュースTOP5</div>
                    ${data.top_5_news.map(n => `
                        <div class="news-item">
                            <div class="news-title"><a href="${esc(n.url || '#')}" target="_blank">${esc(n.title)}</a></div>
                            <div class="news-source">${esc(n.source || '')}</div>
                            <div class="news-why">${esc(n.why || '')}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            ${(data.top_5_proposals && data.top_5_proposals.length) ? `
                <div class="report-section">
                    <div class="report-section-title">今週の提案ベスト5</div>
                    ${data.top_5_proposals.map(p => `
                        <div class="proposal-item" style="cursor:default">
                            <div class="proposal-header">
                                <div class="proposal-name">
                                    <span style="color:var(--accent);font-weight:700;margin-right:6px">#${p.rank}</span>
                                    ${p.category ? `<span class="proposal-category-badge ${p.category === '横展開' ? 'category-reuse' : 'category-new'}">${esc(p.category)}</span>` : ''}
                                    ${esc(p.service || '')}
                                </div>
                            </div>
                            <div class="proposal-meta">
                                ${p.target ? `<span class="proposal-tag">${esc(p.target)}</span>` : ''}
                                ${p.price_range ? `<span class="proposal-tag">${esc(p.price_range)}</span>` : ''}
                            </div>
                            ${p.how_to_sell ? `<div class="proposal-how-to-sell"><span class="how-to-sell-label">営業経路</span>${esc(p.how_to_sell)}</div>` : ''}
                            ${p.weekly_comment ? `<div class="news-why" style="margin-top:6px">${esc(p.weekly_comment)}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    } else {
        // Monthly
        el.innerHTML = `
            <div class="report-section">
                <div class="report-section-title">${esc(data.period || '')}</div>
                <div style="white-space:pre-wrap">${esc(data.summary || '')}</div>
            </div>
            ${data.business_impact ? `
                <div class="report-section">
                    <div class="report-section-title">事業への影響</div>
                    <div style="margin-bottom:8px"><strong style="color:var(--green)">チャンス:</strong></div>
                    ${(data.business_impact.opportunities || []).map(o => `<div style="margin-left:12px;margin-bottom:4px">- ${esc(o)}</div>`).join('')}
                    <div style="margin-bottom:8px;margin-top:8px"><strong style="color:var(--red)">脅威:</strong></div>
                    ${(data.business_impact.threats || []).map(t => `<div style="margin-left:12px;margin-bottom:4px">- ${esc(t)}</div>`).join('')}
                </div>
            ` : ''}
            ${data.next_month_strategy ? `
                <div class="report-section">
                    <div class="report-section-title">来月の戦略</div>
                    ${(data.next_month_strategy.actions || []).map(a => `
                        <div class="action-item">
                            <span class="action-priority priority-${a.priority || 'medium'}">${(a.priority || '').toUpperCase()}</span>
                            <div>
                                <div class="action-text">${esc(a.action)}</div>
                                <div class="action-reason">${esc(a.reason || '')}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    }
}

// ── Toggle Proposal Detail ──
function toggleProposal(id) {
    const detail = document.getElementById(`proposalDetail${id}`);
    const toggle = document.getElementById(`proposalToggle${id}`);
    if (!detail) return;
    if (detail.style.display === 'none') {
        detail.style.display = 'block';
        if (toggle) toggle.textContent = '▲';
    } else {
        detail.style.display = 'none';
        if (toggle) toggle.textContent = '▼';
    }
}

// ── Implement Proposal ──
function implementProposal(index) {
    const p = dailyData.business_proposals[index];
    if (!p) return;

    const date = dailyData.date || '';
    const steps = (p.how_to_implement || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
    const tools = (p.tools || []).join(', ');

    const prompt = `【AIニュースBIの活用提案より（${date}）】
以下はAI業界ニュースの自動分析から生成された活用提案です。
背景の分析は ai-news-bi/pwa/data/daily.json を参照してください。
この提案の実装を検討しています。

${p.category ? `【カテゴリ】${p.category}` : ''}
【サービス名】${p.service || ''}
【説明】${p.description || ''}
【ターゲット】${p.target || ''}
【価格帯】${p.price_range || ''}
【工数】${p.effort || ''}
【提案理由】${p.reason || ''}
${p.how_to_sell ? `【営業経路】${p.how_to_sell}` : ''}
${p.competitive_advantage ? `【競合優位性】${p.competitive_advantage}` : ''}
【営業ピッチ】${p.sales_pitch || ''}
【具体例】${p.example || ''}
【使用ツール】${tools}
【実装ステップ案】
${steps}

---
いきなり実装に入らないでください。
まず「この提案はこんな感じで実装します」と計画を提示し、
何か補足や修正はありますか？と確認してから進めてください。`;

    // シェルセーフにエスケープ（シングルクォートをエスケープ）
    const escaped = prompt.replace(/'/g, "'\\''");
    const cmd = `claude '${escaped}'`;

    navigator.clipboard.writeText(cmd).then(() => {
        showToast('コマンドをコピーしました — ターミナルに貼り付けてください');
    }).catch(() => {
        // フォールバック: テキストエリアで手動コピー
        const ta = document.createElement('textarea');
        ta.value = cmd;
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('コマンドをコピーしました — ターミナルに貼り付けてください');
    });
}

// 大型市場提案カードの共通描画（ホームのbigMarketPlayとアーカイブで共用）
function renderBmpCard(bmp, opts = {}) {
    const tp = bmp.target_persona || '';
    const comp = bmp.competition || {};
    const stage = bmp.stage || '';
    const stageColor = stage.includes('実行候補') ? '#34c759'
                     : stage.includes('要検証') ? '#ff9f0a'
                     : stage.includes('観察') ? '#8e8e93'
                     : '#ff9f0a';
    const scoreDot = (n) => {
        const filled = '●'.repeat(Math.max(0, Math.min(5, n)));
        const empty = '○'.repeat(5 - Math.max(0, Math.min(5, n)));
        return filled + empty;
    };
    const bmpBadge = (label, n, reason) => n == null ? '' : `
        <div style="display:inline-block;margin-right:14px;margin-bottom:6px">
            <span style="font-size:11px;color:var(--muted)">${esc(label)}</span>
            <span style="font-size:13px;margin-left:6px;letter-spacing:2px">${scoreDot(n)}</span>
            <span style="font-size:11px;color:var(--muted);margin-left:4px">${n}/5</span>
            ${reason ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;max-width:280px">${esc(reason)}</div>` : ''}
        </div>
    `;
    const implBtn = opts.implementOnclick
        ? `<button class="implement-btn" onclick="${opts.implementOnclick}">Claude Codeで実装</button>`
        : '';
    return `
        <div class="proposal-item" style="border-left:3px solid ${stageColor}">
            <div class="proposal-header">
                <div class="proposal-name">
                    ${stage ? `<span class="proposal-category-badge" style="background:${stageColor};color:#000">${esc(stage)}</span>` : ''}
                    ${tp ? `<span class="proposal-category-badge category-new">${esc(tp)}</span>` : ''}
                    ${esc(bmp.service || '')}
                </div>
            </div>
            <div style="margin:10px 0 12px 0;padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:6px">
                ${bmpBadge('ブルーオーシャン度', bmp.blue_ocean_score, bmp.blue_ocean_reason)}
                ${bmpBadge('実現性', bmp.feasibility_score, bmp.feasibility_reason)}
                ${bmpBadge('期待月収', bmp.expected_revenue_score, bmp.expected_revenue_reason)}
            </div>
            <div class="proposal-desc">${esc(bmp.target_description || '')}</div>
            <div class="proposal-meta">
                ${bmp.business_model ? `<span class="proposal-tag">${esc(bmp.business_model)}</span>` : ''}
                ${bmp.market_size_estimate ? `<span class="proposal-tag">${esc(bmp.market_size_estimate)}</span>` : ''}
                ${bmp.monetization_path ? `<span class="proposal-tag">${esc(bmp.monetization_path)}</span>` : ''}
            </div>
            ${bmp.market_signal ? `<div class="proposal-how-to-sell"><span class="how-to-sell-label">需要シグナル</span>${esc(bmp.market_signal)}</div>` : ''}
            ${(comp.direct || comp.indirect || comp.why_big_player_absent) ? `
                <div class="proposal-how-to-sell">
                    <span class="how-to-sell-label">競合状況</span>
                    ${comp.direct ? `<div>直接競合: ${esc(comp.direct)}</div>` : ''}
                    ${comp.indirect ? `<div>間接競合: ${esc(comp.indirect)}</div>` : ''}
                    ${comp.why_big_player_absent ? `<div>大手未参入の理由: ${esc(comp.why_big_player_absent)}</div>` : ''}
                </div>
            ` : ''}
            ${bmp.mvp_scope ? `<div class="proposal-how-to-sell"><span class="how-to-sell-label">MVP範囲</span>${esc(bmp.mvp_scope)}</div>` : ''}
            ${bmp.go_to_market ? `<div class="proposal-how-to-sell"><span class="how-to-sell-label">獲得戦略</span>${esc(bmp.go_to_market)}</div>` : ''}
            ${bmp.first_milestone ? `<div class="proposal-how-to-sell"><span class="how-to-sell-label">最初のマイルストーン</span>${esc(bmp.first_milestone)}</div>` : ''}
            ${(bmp.risks && bmp.risks.length) ? `
                <div class="proposal-steps-title">想定リスク</div>
                <ul class="proposal-steps">${bmp.risks.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
            ` : ''}
            ${implBtn}
        </div>
    `;
}

function renderBigMarketArchive() {
    const el = document.getElementById('bigMarketArchive');
    if (!el) return;
    const archive = bigMarketArchiveData || [];
    if (archive.length === 0) {
        el.innerHTML = '<div class="empty-state">アーカイブなし</div>';
        return;
    }
    el.innerHTML = archive.map((day, di) => `
        <div class="archive-day">
            <div class="archive-day-header" onclick="toggleBmpArchiveDay(${di})">
                <span class="archive-date">${esc(day.date)}</span>
                <span class="proposal-count">${esc(day.big_market_play.service || '(無題)')}</span>
                <span class="archive-toggle" id="bmpArchiveToggle${di}">${di === 0 ? '▲' : '▼'}</span>
            </div>
            <div class="archive-proposals" id="bmpArchiveDay${di}" style="display:${di === 0 ? 'block' : 'none'}">
                ${renderBmpCard(day.big_market_play, { implementOnclick: `implementBigMarketArchive(${di})` })}
            </div>
        </div>
    `).join('');
}

function toggleBmpArchiveDay(di) {
    const body = document.getElementById(`bmpArchiveDay${di}`);
    const toggle = document.getElementById(`bmpArchiveToggle${di}`);
    if (!body) return;
    const isOpen = body.style.display === 'block';
    body.style.display = isOpen ? 'none' : 'block';
    if (toggle) toggle.textContent = isOpen ? '▼' : '▲';
}

function buildBmpClaudeCommand(bmp, date) {
    const comp = bmp.competition || {};
    const risks = (bmp.risks || []).map((r, i) => `${i + 1}. ${r}`).join('\n');

    const prompt = `【AIニュースBIの大型市場提案より（${date}）】
以下はAI業界ニュースの自動分析から生成された大型市場提案（market_size／feasibility／blue_ocean を最優先に毎日1件生成される枠）です。
背景の分析は ai-news-bi/pwa/data/daily.json の big_market_play を参照してください。
この提案の実装を検討しています。

【ステージ】${bmp.stage || ''}
【サービス名】${bmp.service || ''}
【ターゲットペルソナ】${bmp.target_persona || ''}
【ターゲット詳細】${bmp.target_description || ''}
【ビジネスモデル】${bmp.business_model || ''}
【市場規模】${bmp.market_size_estimate || ''}
【マネタイズ経路】${bmp.monetization_path || ''}

【3軸自己評価】
- ブルーオーシャン度 ${bmp.blue_ocean_score ?? '-'}/5 — ${bmp.blue_ocean_reason || ''}
- 実現性 ${bmp.feasibility_score ?? '-'}/5 — ${bmp.feasibility_reason || ''}
- 期待月収 ${bmp.expected_revenue_score ?? '-'}/5 — ${bmp.expected_revenue_reason || ''}

【需要シグナル】${bmp.market_signal || ''}
【競合状況】
- 直接競合: ${comp.direct || ''}
- 間接競合: ${comp.indirect || ''}
- 大手未参入の理由: ${comp.why_big_player_absent || ''}

【MVP範囲】${bmp.mvp_scope || ''}
【獲得戦略】${bmp.go_to_market || ''}
【最初のマイルストーン】${bmp.first_milestone || ''}
${risks ? `【想定リスク】\n${risks}` : ''}

---
いきなり実装に入らないでください。
まず「この提案はこんな感じで実装します」と計画を提示し、
何か補足や修正はありますか？と確認してから進めてください。`;

    const escaped = prompt.replace(/'/g, "'\\''");
    return `claude '${escaped}'`;
}

function copyBmpCommand(cmd) {
    navigator.clipboard.writeText(cmd).then(() => {
        showToast('コマンドをコピーしました — ターミナルに貼り付けてください');
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = cmd;
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('コマンドをコピーしました — ターミナルに貼り付けてください');
    });
}

function implementBigMarketPlay() {
    const bmp = dailyData.big_market_play;
    if (!bmp) return;
    copyBmpCommand(buildBmpClaudeCommand(bmp, dailyData.date || ''));
}

function implementBigMarketArchive(dayIndex) {
    const day = (bigMarketArchiveData || [])[dayIndex];
    if (!day || !day.big_market_play) return;
    copyBmpCommand(buildBmpClaudeCommand(day.big_market_play, day.date || ''));
}

function consultAction(index) {
    const a = dailyData.weekly_actions[index];
    if (!a) return;

    const date = dailyData.date || '';
    const prompt = `【AIニュースBIの今週のアクションより（${date}）】
以下はAI業界ニュースの自動分析から生成された推奨アクションです。
背景の分析は ai-news-bi/pwa/data/daily.json を参照してください。
このアクションを実行したいです。

【アクション】${a.action || ''}
【優先度】${a.priority || ''}
【理由】${a.reason || ''}

---
まずこのアクションの具体的な実行手順を提示してください。
不明点があれば質問してから進めてください。`;

    const escaped = prompt.replace(/'/g, "'\\''");
    const cmd = `claude '${escaped}'`;

    navigator.clipboard.writeText(cmd).then(() => {
        showToast('コマンドをコピーしました — ターミナルに貼り付けてください');
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = cmd;
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('コマンドをコピーしました — ターミナルに貼り付けてください');
    });
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

// ── Util ──
function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}



// ── Service Worker ──
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
