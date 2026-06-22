// ============================================================
        // HELPERS (escapeHTML and sanitizeURL from shared.js)
        // ============================================================

        // Status classification constants (module-level for performance)
        const OK_SET   = new Set(['OK','NOMINAL','LOW','NORMAL','CLOSED','UNLOCKED','ACTIVE','ONLINE','HEALTHY','STABLE','FULL','OPEN_GOOD','PASS','RUNNING','CONSISTENT']);
        const WARN_SET = new Set(['WARNING','MODERATE','DEGRADED','STRESSED','MEDIUM','ALERT','SATURATED','STALE']);
        const ERR_SET  = new Set(['CRITICAL','HIGH','TIMEOUT','OVERHEATED','LOCKED','OPEN','OFFLINE','ERROR','DOWN','FAILED','UNREACHABLE','FAIL','UNHEALTHY','UNAVAILABLE','STOPPED']);

        function chipClass(val) {
            if (!val) return 'neutral';
            const v = String(val).toUpperCase().trim();
            if (OK_SET.has(v))   return 'ok';
            if (WARN_SET.has(v)) return 'warn';
            if (ERR_SET.has(v))  return 'err';
            
            // For custom numeric latencies (e.g. "45ms"), check if it contains "ms"
            if (v.includes('MS')) {
                const num = parseFloat(v);
                if (!isNaN(num)) {
                    if (num > 300) return 'err';
                    if (num > 150) return 'warn';
                }
                return 'ok';
            }
            return 'neutral';
        }

        function setChip(id, text) {
            const el = document.getElementById(id);
            if (!el) return;
            const cls = chipClass(text);
            el.className = `chip ${cls}`;
            el.innerHTML = `<span class="dot-sm"></span>${escapeHTML(text)}`;
        }

        function setVal(id, text) {
            const el = document.getElementById(id);
            if (el) el.textContent = text || '—';
        }

        // Keep setBar smooth and proportional
        // skipBadge: when true, only set bar width — caller handles badge with domain logic
        function setBar(id, pct, skipBadge) {
            const el = document.getElementById(id);
            if (!el) return;
            const clamped = Math.min(100, Math.max(0, pct || 0));
            el.style.width = clamped + '%';
            
            if (skipBadge) return;

            const badgeId = id.replace('-bar', '-badge');
            if (id === 'v-n8n-bar') {
                if (clamped >= 50) {
                    setChip(badgeId, 'HEALTHY');
                } else {
                    setChip(badgeId, 'ERROR');
                }
            } else {
                if (clamped >= 80) {
                    setChip(badgeId, 'CRITICAL');
                } else if (clamped >= 50) {
                    setChip(badgeId, 'WARNING');
                } else {
                    setChip(badgeId, 'NOMINAL');
                }
            }
        }

        function parsePct(str) {
            if (!str) return 0;
            return parseFloat(String(str).replace('%','')) || 0;
        }

        /**
         * Format an ISO timestamp to a human-readable local string.
         * Falls back to the raw string if parsing fails.
         */
        function formatTimestamp(ts) {
            if (!ts) return '—';
            try {
                const d = new Date(ts);
                if (isNaN(d.getTime())) return ts;
                return d.toLocaleString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    hour12: false
                });
            } catch(_) { return ts; }
        }

        /**
         * Format an ISO timestamp as relative time (e.g. "3m ago", "2h ago").
         */
        function formatRelative(ts) {
            if (!ts) return '—';
            try {
                const d = new Date(ts);
                if (isNaN(d.getTime())) return '';
                const diffMs = Date.now() - d.getTime();
                if (diffMs < 0) return ''; // future
                const mins = Math.floor(diffMs / 60000);
                if (mins < 1) return 'just now';
                if (mins < 60) return `${mins}m ago`;
                const hrs = Math.floor(mins / 60);
                if (hrs < 24) return `${hrs}h ago`;
                const days = Math.floor(hrs / 24);
                if (days < 7) return `${days}d ago`;
                return '';
            } catch(_) { return ''; }
        }

        /**
         * Combined format: relative time + absolute (e.g. "3m ago · Jun 22, 12:00:00")
         */
        function formatTimestampWithRelative(ts) {
            const abs = formatTimestamp(ts);
            const rel = formatRelative(ts);
            return rel ? `${rel} · ${abs}` : abs;
        }

        /**
         * Format a number with commas for readability.
         */
        function formatNumber(n) {
            if (n == null || isNaN(n)) return '—';
            return Number(n).toLocaleString('en-US');
        }

        // Initialize screen reader support
        document.addEventListener('DOMContentLoaded', () => {
            initScreenReaderAnnouncer();
            
            // Add a11y attributes to dynamic numbers
            const a11yElements = ['header-health-badge', 'v-cpu', 'v-ram', 'v-n8n'];
            a11yElements.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.setAttribute('aria-live', 'polite');
            });
        });

        // ============================================================
        // MAIN UPDATE
        // ============================================================
        let firstLoad = true;
        let updateTimeout;
        let currentDay = 'live';  // 'live' or '1'-'6' for history days
        let liveData = null;      // cached live snapshot

        /**
         * Format a short date label for history tabs (e.g. "Jun 12").
         */
        function shortDateLabel(daysAgo) {
            const d = new Date();
            d.setDate(d.getDate() - daysAgo);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        // Tab bar: set date labels + click handlers
        document.addEventListener('DOMContentLoaded', () => {
            const tabs = document.querySelectorAll('.day-tab');
            tabs.forEach(tab => {
                // Replace generic "Day -N" labels with real dates
                const day = tab.dataset.day;
                if (day !== 'live') {
                    const n = parseInt(day);
                    tab.textContent = n === 1
                        ? `Yesterday · ${shortDateLabel(1)}`
                        : shortDateLabel(n);
                }

                tab.addEventListener('click', async () => {
                    if (day === currentDay) return;
                    if (tab.classList.contains('missing')) return;

                    // Update active tab
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    currentDay = day;

                    // Fetch and render
                    if (day === 'live') {
                        if (liveData) renderDashboard(liveData);
                    } else {
                        await loadHistoryDay(parseInt(day));
                    }
                });
            });

            // Preflight: check which history files exist, gray out missing tabs
            preflightHistoryTabs();

            // Keyboard shortcuts: ← → to switch day tabs
            document.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                const allTabs = Array.from(document.querySelectorAll('.day-tab'));
                const activeIdx = allTabs.findIndex(t => t.classList.contains('active'));
                if (activeIdx === -1) return;
                let nextIdx;
                if (e.key === 'ArrowLeft') nextIdx = Math.max(0, activeIdx - 1);
                else nextIdx = Math.min(allTabs.length - 1, activeIdx + 1);
                if (nextIdx === activeIdx) return;
                const nextTab = allTabs[nextIdx];
                if (nextTab.classList.contains('missing')) return;
                nextTab.click();
            });
        });

        async function preflightHistoryTabs() {
            const historyTabs = document.querySelectorAll('.day-tab:not([data-day="live"])');
            const checks = Array.from(historyTabs).map(async tab => {
                const n = parseInt(tab.dataset.day);
                const date = new Date();
                date.setDate(date.getDate() - n);
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                const dateStr = `${yyyy}-${mm}-${dd}`;
                try {
                    const res = await fetch(`history/${dateStr}.json`, { method: 'HEAD' });
                    if (!res.ok) tab.classList.add('missing');
                } catch(e) {
                    tab.classList.add('missing');
                }
            });
            await Promise.all(checks);
        }

        async function loadHistoryDay(daysAgo) {
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            try {
                const data = await fetchWithFallback(`history/${dateStr}.json?v=${Date.now()}`, null, 1);
                if (data) {
                    renderDashboard(data);
                    // Mark tab as available
                    const tab = document.querySelector(`.day-tab[data-day="${daysAgo}"]`);
                    if (tab) tab.classList.remove('missing');
                } else {
                    showHistoryEmpty(daysAgo, dateStr);
                }
            } catch (err) {
                console.error('[Fray] history fetch error', err);
                showHistoryEmpty(daysAgo, dateStr);
            }
        }

        function showHistoryEmpty(daysAgo, dateStr) {
            // Gray out tab
            const tab = document.querySelector(`.day-tab[data-day="${daysAgo}"]`);
            if (tab) tab.classList.add('missing');

            // Show empty state in panels
            setVal('banner-timestamp', `No data for ${dateStr}`);
            document.querySelectorAll('#dash-content .panel-body').forEach(el => {
                el.innerHTML = `<div class="history-empty">No snapshot available for ${dateStr}</div>`;
            });
            const auditBody = document.getElementById('audit-table-body');
            if (auditBody) auditBody.innerHTML = `<tr><td colspan="4" class="history-empty-fleet">No fleet data for ${dateStr}</td></tr>`;
        }

        async function updateDashboard() {
            const loader  = document.getElementById('dash-loading');
            const content = document.getElementById('dash-content');
            const tsEl = document.getElementById('banner-timestamp');

            // Sync indicator: pulse timestamp while fetching
            if (tsEl) tsEl.classList.add('syncing');

            try {
                // Fetch the raw snapshot directly (no more normalization layer)
                const data = await fetchWithFallback(`dashboard-snapshot.json?v=${Date.now()}`, null, 2);
                if (!data) throw new Error('Null or invalid payload received.');
                
                liveData = data;  // cache for tab switching
                if (currentDay === 'live') renderDashboard(data);

                // Show content
                if (firstLoad) {
                    loader.style.display  = 'none';
                    content.style.display = 'block';
                    firstLoad = false;
                }

                // Trigger Accessibility Announcement
                announceToScreenReader('Fray system telemetry state synchronized successfully.');
            } catch (err) {
                console.error('[Fray] fetch error', err);
                if (firstLoad) {
                    loader.style.display = 'none';
                    content.style.display = 'none';

                    // Safely render error UI fallback
                    const errDivId = 'dashboard-error-container';
                    let errDiv = document.getElementById(errDivId);
                    if (!errDiv) {
                        errDiv = document.createElement('div');
                        errDiv.id = errDivId;
                        errDiv.style.margin = '2rem auto';
                        errDiv.style.maxWidth = '600px';
                        loader.parentNode.appendChild(errDiv);
                    }
                    errDiv.innerHTML = createErrorUI('Connection to Fray telemetry endpoint lost.', () => {
                        firstLoad = true;
                        if (errDiv) errDiv.remove();
                        loader.style.display = 'block';
                        clearTimeout(updateTimeout);
                        updateDashboard();
                    });
                } else {
                    // Graceful degradation: Keep dashboard, mark offline
                    setChip('header-health-badge', 'OFFLINE');
                    setVal('banner-timestamp', 'Connection Lost - Retrying...');
                    announceToScreenReader('Connection to Fray telemetry endpoint lost.');
                }
            } finally {
                // Remove sync indicator
                if (tsEl) tsEl.classList.remove('syncing');
                // Recursive polling
                clearTimeout(updateTimeout);
                updateTimeout = setTimeout(updateDashboard, 30000);
            }
        }

        function renderDashboard(data) {
            // ---- EXTRACT TOP-LEVEL SECTIONS ----
            const observer   = data.observer   || {};
            const sage       = data.sage       || {};
            const outsider   = data.outsider   || {};
            const historian  = data.historian  || {};
            const archivist  = data.archivist  || {};
            const companion  = data.companion  || {};
            const gateway    = observer.gateway  || {};

            // ---- BANNER TIMESTAMP ----
            const rootTs = data.timestamp || observer.timestamp || sage.timestamp || '—';
            setVal('banner-timestamp', formatTimestampWithRelative(rootTs));

            // ============================================================
            // OVERALL HEALTH — derive from observer + sage critical alerts
            // ============================================================
            let overallHealth = 'STABLE';

            // Check n8n heartbeat
            const n8nStatus = String(observer.n8n_heartbeat?.status || '').toLowerCase();
            const n8nHealth = String(observer.n8n_heartbeat?.health || '').toLowerCase();
            if (n8nStatus.includes('error') || n8nHealth.includes('error')) {
                overallHealth = 'ERROR';
            }

            // Check gateway health
            const gwHealth = String(gateway.health || '').toLowerCase();
            const gwProcess = String(gateway.process || '').toLowerCase();
            const gwLogFresh = gateway.log_fresh !== false;
            if (gwHealth === 'zombie' || !gwLogFresh) {
                overallHealth = 'CRITICAL';  // zombie = silent Telegram blackout
            } else if (gwHealth.includes('unhealthy') || gwProcess === 'stopped') {
                overallHealth = 'DEGRADED';
            }

            // Check sage critical alerts — any critical alert downgrades overall health
            if (Array.isArray(sage.alerts)) {
                const hasCritical = sage.alerts.some(a => a && a.severity === 'critical');
                const hasWarning  = sage.alerts.some(a => a && a.severity === 'warning');
                if (hasCritical) overallHealth = 'CRITICAL';
                else if (hasWarning && overallHealth === 'STABLE') overallHealth = 'WARNING';
            }

            // Header title
            setVal('header-agent-text', 'FRAY-ORCHESTRATION');

            const healthEl = document.getElementById('header-health-badge');
            if (healthEl) {
                healthEl.className = `health-badge ${chipClass(overallHealth)}`;
                healthEl.innerHTML = `<span class="dot"></span><span id="header-health-text">${escapeHTML(overallHealth)}</span>`;
            }

            // ============================================================
            // COMPONENTS RENDER — each wrapped in try-catch to prevent
            // one broken panel from blanking the entire dashboard
            // ============================================================
            const renderFns = [
                ['vitals',   () => renderVitals(observer)],
                ['sage',     () => renderSagePanel(sage)],
                ['outsider', () => renderOutsiderPanel(outsider)],
                ['companion',() => renderCompanionPanel(companion)],
                ['historian',() => renderHistorianPanel(historian)],
                ['fleet',    () => renderFleetTable(archivist)],
            ];
            renderFns.forEach(([name, fn]) => {
                try { fn(); }
                catch(err) {
                    console.error(`[Fray] render error in ${name}:`, err);
                }
            });
        }

        function renderVitals(observer) {
            // --- CPU ---
            const cpuUsage = observer.cpu_percent || 0;
            setVal('v-cpu', `${cpuUsage.toFixed(1)}%`);
            setVal('v-cpu-sub', `System Load: ${cpuUsage.toFixed(1)}%`);
            setBar('v-cpu-bar', cpuUsage);

            // --- RAM ---
            const ramUsedGB  = observer.memory_used_gb || 0;
            const ramTotalGB = observer.memory_total_gb || 0;
            const ramPct     = observer.memory_percent || 0;
            setVal('v-ram', `${ramUsedGB.toFixed(1)} GB`);
            setVal('v-ram-sub', `${ramTotalGB.toFixed(1)} GB total · ${ramPct}%`);
            setBar('v-ram-bar', ramPct);

            // --- Disk ---
            const diskUsed    = observer.disk_used || '—';
            const diskTotal   = observer.disk_total || '—';
            const diskPctStr  = observer.disk_percent || '0%';
            const diskPct     = parsePct(diskPctStr);
            setVal('v-disk', diskPctStr);
            setBar('v-disk-bar', diskPct);

            // --- Network ---
            const networkStatus = observer.network || 'Unknown';
            setVal('v-network', networkStatus.toUpperCase());
            setVal('v-network-sub', 'Interface Status');
            
            const netBarEl = document.getElementById('v-network-bar');
            if (netBarEl) {
                netBarEl.style.width = '100%';
                if (networkStatus.toLowerCase() === 'online') {
                    netBarEl.className = 'vital-bar-fill green';
                    setChip('v-network-badge', 'ONLINE');
                } else {
                    netBarEl.className = 'vital-bar-fill red';
                    setChip('v-network-badge', 'OFFLINE');
                }
            }

            // --- n8n Heartbeat ---
            const n8nHb     = observer.n8n_heartbeat || {};
            const n8nHealth = n8nHb.health || 'Unknown';
            const n8nStatus = n8nHb.status || '';
            const n8nResp   = n8nStatus ? `Status: ${n8nStatus}` : '—';
            
            setVal('v-n8n', n8nHealth);
            setVal('v-n8n-sub', n8nResp);
            
            const n8nBarEl = document.getElementById('v-n8n-bar');
            if (n8nBarEl) {
                n8nBarEl.style.width = '100%';
                const badgeStatus = String(n8nHealth).toUpperCase();
                const cls = chipClass(badgeStatus);
                if (cls === 'ok') {
                    n8nBarEl.className = 'vital-bar-fill green';
                } else if (cls === 'warn') {
                    n8nBarEl.className = 'vital-bar-fill amber';
                } else {
                    n8nBarEl.className = 'vital-bar-fill red';
                }
                setChip('v-n8n-badge', badgeStatus);
            }

            // --- Gateway ---
            const gw = observer.gateway || {};
            const gwHealthStr = (gw.health || 'Unknown').toUpperCase();
            const gwProcess   = (gw.process || 'unknown');
            const gwTelegram  = gw.telegram_connected;
            const gwLogFresh  = gw.log_fresh !== false; // true if missing (backward compat)
            const gwSubParts  = [
                `Process: ${gwProcess}`,
                gwTelegram != null ? `Telegram: ${gwTelegram ? 'connected' : 'disconnected'}` : '',
                !gwLogFresh ? '⚠️ ZOMBIE — log stale >60min' : ''
            ].filter(Boolean).join(' · ');

            setVal('v-gateway', gwHealthStr);
            setVal('v-gateway-sub', gwSubParts || '—');

            const gwBarEl = document.getElementById('v-gateway-bar');
            if (gwBarEl) {
                gwBarEl.style.width = '100%';
                const gwCls = chipClass(gwHealthStr);
                if (gwCls === 'ok' && !gwLogFresh) {
                    gwBarEl.className = 'vital-bar-fill red'; // zombie override
                    setChip('v-gateway-badge', 'ZOMBIE');
                } else if (gwCls === 'ok') {
                    gwBarEl.className = 'vital-bar-fill green';
                    setChip('v-gateway-badge', gwHealthStr);
                } else if (gwCls === 'warn') {
                    gwBarEl.className = 'vital-bar-fill amber';
                    setChip('v-gateway-badge', gwHealthStr);
                } else {
                    gwBarEl.className = 'vital-bar-fill red';
                    setChip('v-gateway-badge', gwHealthStr);
                }
            }

            // --- Token Usage ---
            const token = observer.token_usage || {};
            const quotaPct = token.quota_percent || 0;
            const monthlyBurn = token.monthly_burn || 0;
            const dailyEst = token.daily_estimate || 0;
            const monthlyQuota = token.monthly_quota || 2500000;
            setVal('v-token', `${quotaPct.toFixed(1)}%`);
            // Projected exhaustion date
            let tokenSub = `${formatNumber(monthlyBurn)} / ${formatNumber(monthlyQuota)} · ~${formatNumber(dailyEst)}/day`;
            if (dailyEst > 0) {
                const remaining = monthlyQuota - monthlyBurn;
                const daysLeft = Math.floor(remaining / dailyEst);
                const projDate = new Date();
                projDate.setDate(projDate.getDate() + daysLeft);
                const dateStr = projDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                tokenSub += ` · quota in ~${daysLeft}d (${dateStr})`;
            }
            setVal('v-token-sub', tokenSub);
            setBar('v-token-bar', quotaPct, true);
            // Domain-specific token badge: 33/66% bands
            if (quotaPct > 66) {
                setChip('v-token-badge', 'CRITICAL');
            } else if (quotaPct > 33) {
                setChip('v-token-badge', 'WARNING');
            } else {
                setChip('v-token-badge', 'NOMINAL');
            }

            // --- Disk Trend ---
            const dt = observer.disk_trend || {};
            const trend = dt.trend || 'stable';
            const trendIcon = trend === 'rising' ? ' 📈' : (trend === 'falling' ? ' 📉' : '');
            const deltaStr = dt.delta_gi != null ? ` (${dt.delta_gi > 0 ? '+' : ''}${dt.delta_gi}Gi/24h)` : '';
            setVal('v-disk-sub', `Used: ${observer.disk_used || '—'} / ${observer.disk_total || '—'}${trendIcon}${deltaStr}`);

            return cpuUsage;
        }

        function renderSagePanel(sage) {
            const sageOverall = (sage.status || 'OFFLINE').toUpperCase();
            setChip('p-sage-chip', sageOverall);
            
            const sageBody = document.getElementById('sage-body');
            if (!sageBody) return;
            
            let html = '<div style="padding: 0 4px;">';
            
            if (sageOverall === 'OFFLINE' && sage.system_health == null && !sage.active_components) {
                html += `
                    <div class="sage-offline-text">
                        Sage Agent is currently offline.
                    </div>
                `;
            } else {
                // --- System Health (numeric or string) ---
                const healthVal = sage.system_health;
                if (healthVal != null) {
                    if (typeof healthVal === 'number') {
                        // Numeric health score — render gauge
                        const healthCls = healthVal >= 80 ? 'ok' : (healthVal >= 50 ? 'warn' : 'err');
                        const healthLabel = healthVal >= 80 ? 'HEALTHY' : (healthVal >= 50 ? 'DEGRADED' : 'CRITICAL');
                        html += `
                            <div class="sage-health-gauge">
                                <div class="sage-health-score-row">
                                    <span class="sage-health-score">${healthVal}</span>
                                    <span class="sage-health-label">/100</span>
                                    <span class="chip ${healthCls} chip-scale"><span class="dot-sm"></span>${healthLabel}</span>
                                </div>
                                <div class="vital-bar-track" style="margin-top: 8px; height: 6px;">
                                    <div class="vital-bar-fill ${healthCls === 'ok' ? 'green' : (healthCls === 'warn' ? 'amber' : 'red')}" style="width: ${Math.min(100, healthVal)}%"></div>
                                </div>
                                <div style="font-size: 0.72rem; color: var(--text-faint); margin-top: 4px;">System Health Score</div>
                            </div>
                        `;
                    } else {
                        // String-based health (legacy)
                        const healthCls = String(healthVal).toLowerCase().includes('degraded') ? 'warn' : 'ok';
                        html += `<div class="mb-2"><b>System Health:</b> <span class="chip ${healthCls} chip-scale"><span class="dot-sm"></span>${escapeHTML(String(healthVal))}</span></div>`;
                    }
                }
                
                // --- Active Components ---
                if (Array.isArray(sage.active_components) && sage.active_components.length > 0) {
                    html += `<div class="mb-2" style="margin-top: 12px;"><b>Active Components</b> <span style="color:var(--text-faint);font-size:0.75rem;">(${sage.active_components.length})</span></div>`;
                    html += `<div class="active-components-box">`;
                    sage.active_components.forEach(comp => {
                        const compName = comp.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        html += `<div class="mb-1 text-main">&rsaquo; ${escapeHTML(compName)}</div>`;
                    });
                    html += `</div>`;
                } else {
                    html += `<div class="sage-anomaly-row ok"><b>Active Components:</b> None</div>`;
                }
                
                // --- Anomalies (numeric or string) ---
                const anomalyVal = sage.anomalies;
                if (anomalyVal != null) {
                    const anomalyNum = typeof anomalyVal === 'number' ? anomalyVal : parseInt(anomalyVal, 10);
                    const isZero = anomalyNum === 0 || String(anomalyVal).toLowerCase().includes('none');
                    const anomalyColor = isZero ? 'ok' : 'warn';
                    const anomalyDisplay = typeof anomalyVal === 'number' ? `${anomalyVal} detected` : escapeHTML(String(anomalyVal));
                    html += `<div class="sage-anomaly-row ${anomalyColor}"><b>Anomalies:</b> ${anomalyDisplay}</div>`;
                }
                
                // --- Alerts (structured objects or legacy strings) ---
                if (Array.isArray(sage.alerts) && sage.alerts.length > 0) {
                    const critCount = sage.alerts.filter(a => a && a.severity === 'critical').length;
                    const warnCount = sage.alerts.filter(a => a && a.severity === 'warning').length;
                    const infoCount = sage.alerts.filter(a => a && a.severity === 'info').length;
                    
                    html += `<div class="sage-alert-count-row">`;
                    html += `<b>Alerts</b> <span class="sage-alert-count-label">(${sage.alerts.length})</span>`;
                    if (critCount) html += `<span class="chip err sage-alert-chip"><span class="dot-sm"></span>${critCount} Critical</span>`;
                    if (warnCount) html += `<span class="chip warn sage-alert-chip"><span class="dot-sm"></span>${warnCount} Warning</span>`;
                    if (infoCount) html += `<span class="chip neutral sage-alert-chip"><span class="dot-sm"></span>${infoCount} Info</span>`;
                    html += `</div>`;
                    
                    html += `<div class="sage-alerts-list">`;
                    sage.alerts.forEach(alert => {
                        if (typeof alert === 'string') {
                            // Legacy string format
                            html += `<div class="sage-alert-card"><div class="sage-alert-msg">${escapeHTML(alert)}</div></div>`;
                        } else if (alert && typeof alert === 'object') {
                            // Structured {severity, component, message}
                            const sev = (alert.severity || 'info').toLowerCase();
                            const sevCls = sev === 'critical' ? 'err' : (sev === 'warning' ? 'warn' : 'neutral');
                            const sevIcon = sev === 'critical' ? '🔴' : (sev === 'warning' ? '🟡' : 'ℹ️');
                            html += `
                                <div class="sage-alert-card sage-alert-${sev}">
                                    <div class="sage-alert-header">
                                        <span>${sevIcon}</span>
                                        <span class="sage-alert-component">${escapeHTML(alert.component || 'system')}</span>
                                        <span class="chip ${sevCls} sage-alert-chip"><span class="dot-sm"></span>${escapeHTML(sev.toUpperCase())}</span>
                                    </div>
                                    <div class="sage-alert-msg">${escapeHTML(alert.message || '—')}</div>
                                </div>
                            `;
                        }
                    });
                    html += `</div>`;
                } else {
                    html += `<div class="sage-anomaly-row ok"><b>Alerts:</b> None</div>`;
                }
            }
            html += `</div>`;
            sageBody.innerHTML = html;
        }

        function renderOutsiderPanel(outsider) {
            const outsiderEl = document.getElementById('outsider-content');
            if (outsiderEl) {
                if (!outsider.quote && !outsider.observations && !outsider.insight) {
                    outsiderEl.innerHTML = 'No transmission received from The Outsider.';
                    outsiderEl.className = 'quote-block';
                } else {
                    outsiderEl.className = 'quote-block';
                    let html = '';
                    
                    const mainText = outsider.quote || '—';
                    html += `
                        <div class="outsider-quote-text">
                            "${escapeHTML(mainText)}"
                        </div>
                    `;
                    
                    const obs = outsider.observations;
                    if (Array.isArray(obs)) {
                        obs.forEach(o => {
                            if (typeof o === 'string') {
                                html += `<div class="mb-1 text-secondary text-base">&bull; ${escapeHTML(o).replace(/\n/g, '<br>')}</div>`;
                            }
                        });
                    }
                    
                    const insightText = outsider.insight || '';
                    if (insightText) {
                        html += `
                            <div class="outsider-insight-box">
                                <span class="insight-label" style="display: block; margin-bottom: 4px;">Outsider Insight:</span>
                                <b>${escapeHTML(insightText).replace(/\n/g, '<br>')}</b>
                            </div>
                        `;
                    }
                    
                    html += `<div class="outsider-meta">&mdash; Observed: ${formatTimestamp(outsider.timestamp)}</div>`;
                    outsiderEl.innerHTML = html;
                }
            }
        }

        function renderCompanionPanel(companion) {
            const chip = document.getElementById('p-companion-chip');
            const body = document.getElementById('companion-body');
            if (!body) return;

            const status = (companion.status || 'offline').toUpperCase();
            if (chip) setChip('p-companion-chip', status);

            if (status === 'OFFLINE' || (!companion.calendar_today && !companion.gmail_summary && !companion.coffee_research)) {
                body.innerHTML = `<div class="panel-placeholder" style="text-align: center;">☕ Awaiting today's briefing…</div>`;
                return;
            }

            let html = '<div style="padding: 0 4px;">';

            // Calendar
            const cal = companion.calendar_today || [];
            html += `<div class="companion-section-label"><b>📅 Calendar</b> <span class="companion-section-count">(${cal.length} event${cal.length !== 1 ? 's' : ''})</span></div>`;
            if (cal.length > 0) {
                html += `<div class="active-components-box companion-calendar-box">`;
                cal.forEach(ev => {
                    html += `<div class="mb-1 text-main">&rsaquo; ${escapeHTML(typeof ev === 'string' ? ev : (ev.summary || ev.title || '—'))}</div>`;
                });
                html += `</div>`;
            } else {
                html += `<div class="companion-empty">No events today</div>`;
            }

            // Gmail
            if (companion.gmail_summary) {
                html += `<div class="companion-section-label"><b>📧 Gmail</b></div>`;
                html += `<div class="outsider-insight-box companion-gmail-box">${escapeHTML(companion.gmail_summary)}</div>`;
            }

            // Coffee Research
            const coffee = companion.coffee_research || [];
            if (coffee.length > 0) {
                html += `<div class="companion-section-label"><b>☕ Coffee Research</b> <span class="companion-section-count">(${coffee.length} article${coffee.length !== 1 ? 's' : ''})</span></div>`;
                coffee.forEach(item => {
                    const title = item.title || 'Untitled';
                    const source = item.source || '';
                    const summary = item.summary || '';
                    const url = item.url || '';
                    html += `
                        <div class="sage-alert-card companion-coffee-card">
                            <div class="companion-coffee-title">
                                ${url ? `<a href="${sanitizeURL(url)}" target="_blank" rel="noopener" style="color: var(--primary);">${escapeHTML(title)}</a>` : escapeHTML(title)}
                                ${source ? `<span class="companion-coffee-source">— ${escapeHTML(source)}</span>` : ''}
                            </div>
                            <div class="companion-coffee-summary">${escapeHTML(summary)}</div>
                        </div>
                    `;
                });
            }

            // System note
            if (companion.system_note) {
                html += `<div class="companion-system-note">${escapeHTML(companion.system_note)}</div>`;
            }

            html += `<div class="companion-timestamp">&mdash; Briefing: ${formatTimestamp(companion.timestamp)}</div>`;
            html += `</div>`;
            body.innerHTML = html;
        }

        function renderHistorianPanel(historian) {
            const chip = document.getElementById('p-historian-chip');
            const body = document.getElementById('historian-body');
            if (!body) return;

            const status = (historian.status || 'offline').toUpperCase();
            if (chip) setChip('p-historian-chip', status);

            // Offline — show countdown to next Sunday
            if (status === 'OFFLINE' || !historian.weekly_reflection) {
                const now = new Date();
                const dayOfWeek = now.getDay(); // 0=Sun
                const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
                const nextSunday = new Date(now);
                nextSunday.setDate(now.getDate() + daysUntilSunday);
                nextSunday.setHours(20, 55, 0, 0); // 20:55 ICT
                const diffMs = nextSunday - now;
                const diffH = Math.floor(diffMs / 3600000);
                const diffM = Math.floor((diffMs % 3600000) / 60000);

                let countdown;
                if (diffMs <= 0) {
                    countdown = 'Generating now…';
                } else if (diffH >= 24) {
                    const diffD = Math.floor(diffH / 24);
                    countdown = `Next report in ${diffD} day${diffD > 1 ? 's' : ''}`;
                } else {
                    countdown = `Next report in ${diffH}h ${diffM}m`;
                }

                body.innerHTML = `
                    <div class="historian-offline-card">
                        <div class="historian-offline-desc">
                            📜 The Historian compiles weekly system chronicles
                        </div>
                        <div class="historian-offline-countdown">
                            ${countdown} · Sunday 20:55 ICT
                        </div>
                    </div>
                `;
                return;
            }

            // Active — render weekly chronicle
            let html = '<div style="padding: 0 4px;">';

            // Week header
            if (historian.week || historian.date_range) {
                html += `<div class="historian-week-header">`;
                html += `<b class="historian-week-label">Week ${escapeHTML(String(historian.week || '—'))}</b>`;
                if (historian.date_range) {
                    html += `<span class="historian-date-range">${escapeHTML(historian.date_range)}</span>`;
                }
                html += `</div>`;
            }

            // Disk trend
            if (historian.disk_trend || historian.disk_delta != null) {
                const trend = historian.disk_trend || 'stable';
                const trendIcon = trend === 'rising' ? '📈' : (trend === 'falling' ? '📉' : '➡️');
                const trendCls = trend === 'rising' ? 'warn' : (trend === 'falling' ? 'ok' : 'neutral');
                html += `<div class="historian-trend-row">`;
                html += `<b>Disk Trend:</b> <span class="chip ${trendCls}"><span class="dot-sm"></span>${trendIcon} ${escapeHTML(trend.toUpperCase())}</span>`;
                if (historian.disk_delta != null) {
                    html += `<span class="historian-disk-delta">${historian.disk_delta}</span>`;
                }
                html += `</div>`;
            }

            // Key events
            if (Array.isArray(historian.key_events) && historian.key_events.length > 0) {
                html += `<div class="historian-section-label"><b>Key Events</b> <span class="historian-section-count">(${historian.key_events.length})</span></div>`;
                html += `<div class="active-components-box historian-events-box">`;
                historian.key_events.forEach(ev => {
                    html += `<div class="mb-1 text-main">&rsaquo; ${escapeHTML(typeof ev === 'string' ? ev : (ev.message || ev.event || '—'))}</div>`;
                });
                html += `</div>`;
            }

            // Patterns
            if (Array.isArray(historian.patterns) && historian.patterns.length > 0) {
                html += `<div class="historian-section-label"><b>Patterns Detected</b> <span class="historian-section-count">(${historian.patterns.length})</span></div>`;
                html += `<div class="active-components-box historian-events-box">`;
                historian.patterns.forEach(p => {
                    html += `<div class="mb-1 text-main">&rsaquo; ${escapeHTML(typeof p === 'string' ? p : (p.name || p.pattern || '—'))}</div>`;
                });
                html += `</div>`;
            }

            // Weekly reflection
            if (historian.weekly_reflection) {
                html += `
                    <div class="outsider-insight-box historian-reflection-box">
                        <span class="insight-label" style="display: block; margin-bottom: 4px;">Weekly Reflection:</span>
                        <b>${escapeHTML(historian.weekly_reflection)}</b>
                    </div>
                `;
            }

            // Recommendations
            if (Array.isArray(historian.recommendations) && historian.recommendations.length > 0) {
                html += `<div class="historian-recommendations-label"><b>Recommendations</b></div>`;
                html += `<div class="active-components-box">`;
                historian.recommendations.forEach(r => {
                    html += `<div class="mb-1 text-main">&rsaquo; ${escapeHTML(typeof r === 'string' ? r : (r.action || r.recommendation || '—'))}</div>`;
                });
                html += `</div>`;
            }

            html += `<div class="historian-timestamp">&mdash; Compiled: ${formatTimestamp(historian.timestamp)}</div>`;
            html += `</div>`;
            body.innerHTML = html;
        }

        function renderFleetTable(archivist) {
            const fleet = (archivist && Array.isArray(archivist.fleet)) ? archivist.fleet : [];
            const auditTableBody = document.getElementById('audit-table-body');
            if (!auditTableBody) return;

            if (fleet.length === 0) {
                auditTableBody.innerHTML = `<tr><td colspan="4" class="fleet-empty">No fleet data available — awaiting ARCHIVIST sync</td></tr>`;
                return;
            }

            // Sort: errors first, then by name
            const sorted = [...fleet].sort((a, b) => {
                const aErr = a.status === 'ERROR' || a.status === 'NULL' ? 0 : 1;
                const bErr = b.status === 'ERROR' || b.status === 'NULL' ? 0 : 1;
                if (aErr !== bErr) return aErr - bErr;
                return (a.name || '').localeCompare(b.name || '');
            });

            auditTableBody.innerHTML = sorted.map(agent => {
                const statusStr = (agent.status || 'UNKNOWN').toUpperCase();
                const cls = chipClass(statusStr);
                const dot = cls === 'ok' ? 'ok' : (cls === 'warn' ? 'warn' : 'err');

                // Clean agent name — strip [THE ...] brackets for display
                const cleanName = (agent.name || 'Unknown')
                    .replace(/^\[THE\s+/, '')
                    .replace(/\]$/, '');

                // Delivery column
                let deliveryHtml;
                if (agent.delivery_error) {
                    const errText = String(agent.delivery_error);
                    const shortErr = errText.length > 60 ? errText.substring(0, 60) + '…' : errText;
                    deliveryHtml = `<span class="chip err sage-alert-chip" title="${escapeHTML(errText)}"><span class="dot-sm"></span>${escapeHTML(shortErr)}</span>`;
                } else if (statusStr === 'NULL') {
                    deliveryHtml = `<span class="historian-disk-delta">Never executed</span>`;
                } else {
                    deliveryHtml = `<span style="color: var(--state-ok); font-size: 0.75rem;">✓ OK</span>`;
                }

                return `
                    <tr>
                        <td>
                            <div class="audit-agent-cell">
                                <span class="agent-indicator ${dot}" aria-hidden="true"></span>
                                <span class="agent-name">${escapeHTML(cleanName)}</span>
                            </div>
                        </td>
                        <td>
                            <span class="chip ${cls}"><span class="dot-sm"></span>${escapeHTML(statusStr)}</span>
                        </td>
                        <td>
                            <div class="audit-technical-cell">${formatTimestamp(agent.last_run)}</div>
                        </td>
                        <td>${deliveryHtml}</td>
                    </tr>`;
            }).join('');
        }

        // Footer year
        const fyEl = document.getElementById('footer-year');
        if (fyEl) fyEl.textContent = new Date().getFullYear();

        // Start Dashboard Loop
        updateDashboard();