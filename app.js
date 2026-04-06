// AI News BI — PWA App

const DATA_BASE = 'data/';
let dailyData = null;
let trendsData = null;
let linkedinData = null;
let reportData = null;
let proposalsData = null;
let predictionsArchiveData = null;
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
    renderProposalsArchive();
    renderLinkedIn();
    renderReport();
    document.getElementById('headerDate').textContent = dailyData?.date || '';
});

// ── Navigation ──
function setupNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
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
    [dailyData, trendsData, linkedinData, reportData, proposalsData, predictionsArchiveData] = await Promise.all([
        loadJSON('daily.json'),
        loadJSON('trends.json'),
        loadJSON('linkedin.json'),
        loadJSON('report.json'),
        loadJSON('proposals.json'),
        loadJSON('predictions_archive.json'),
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
        actionsEl.innerHTML = actions.map(a => `
            <div class="action-item">
                <span class="action-priority priority-${a.priority || 'medium'}">${(a.priority || 'medium').toUpperCase()}</span>
                <div>
                    <div class="action-text">${esc(a.action)}</div>
                    ${a.reason ? `<div class="action-reason">${esc(a.reason)}</div>` : ''}
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
    // 過去予測レビュー
    const reviewEl = document.getElementById('predictionReview');
    const reviews = dailyData?.prediction_review || [];
    if (reviews.length === 0) {
        reviewEl.innerHTML = '<div class="empty-state">レビューデータなし（明日以降に検証結果が表示されます）</div>';
    } else {
        reviewEl.innerHTML = reviews.map(r => {
            const statusClass = r.status === '的中' ? 'hit' : r.status === '外れ' ? 'miss' : 'pending';
            return `
                <div class="review-item review-${statusClass}">
                    <div class="review-header">
                        <span class="review-status status-${statusClass}">${esc(r.status)}</span>
                        <span class="review-date">${esc(r.original_date)}</span>
                    </div>
                    <div class="review-prediction">${esc(r.prediction)}</div>
                    <div class="review-comment">${esc(r.review)}</div>
                    ${r.lesson ? `<div class="review-lesson">${esc(r.lesson)}</div>` : ''}
                </div>
            `;
        }).join('');
    }

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
                        </div>
                        <div class="proposal-detail" id="proposalDetaila${uid}" style="display:none">
                            ${p.sales_pitch ? `<div class="proposal-pitch">${esc(p.sales_pitch)}</div>` : ''}
                            ${p.how_to_sell ? `<div class="proposal-how-to-sell"><span class="how-to-sell-label">営業経路</span>${esc(p.how_to_sell)}</div>` : ''}
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

    const prompt = `以下の活用提案の実装を検討しています。

${p.category ? `【カテゴリ】${p.category}` : ''}
【サービス名】${p.service || ''}
【説明】${p.description || ''}
【ターゲット】${p.target || ''}
【価格帯】${p.price_range || ''}
【工数】${p.effort || ''}
【提案理由】${p.reason || ''}
${p.how_to_sell ? `【営業経路】${p.how_to_sell}` : ''}
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
            ${data.next_week ? `
                <div class="report-section">
                    <div class="report-section-title">来週の予測とアクション</div>
                    ${(data.next_week.predictions || []).map(p => `<div style="margin-bottom:4px">- ${esc(p)}</div>`).join('')}
                    ${(data.next_week.actions || []).map(a => `
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
    if (detail.style.display === 'none') {
        detail.style.display = 'block';
        toggle.textContent = '▲';
    } else {
        detail.style.display = 'none';
        toggle.textContent = '▼';
    }
}

// ── Implement Proposal ──
function implementProposal(index) {
    const p = dailyData.business_proposals[index];
    if (!p) return;

    const steps = (p.how_to_implement || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
    const tools = (p.tools || []).join(', ');

    const prompt = `以下の活用提案の実装を検討しています。

${p.category ? `【カテゴリ】${p.category}` : ''}
【サービス名】${p.service || ''}
【説明】${p.description || ''}
【ターゲット】${p.target || ''}
【価格帯】${p.price_range || ''}
【工数】${p.effort || ''}
【提案理由】${p.reason || ''}
${p.how_to_sell ? `【営業経路】${p.how_to_sell}` : ''}
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
