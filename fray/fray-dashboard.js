// ============================================================
        // HELPERS (escapeHTML and sanitizeURL from shared.js)
        // ============================================================

        // Status classification constants (module-level for performance)
        const OK_SET   = new Set(['OK','NOMINAL','LOW','NORMAL','CLOSED','UNLOCKED','ACTIVE','ONLINE','HEALTHY','STABLE','FULL','OPEN_GOOD','PASS','RUNNING','CONSISTENT']);
        const WARN_SET = new Set(['WARNING','MODERATE','DEGRADED','STRESSED','MEDIUM','ALERT','SATURATED','STALE']);
        const ERR_SET  = new Set(['CRITICAL','HIGH','TIMEOUT','OVERHEATED','LOCKED','OPEN','OFFLINE','ERROR','DOWN','FAILED','UNREACHABLE','FAIL','UNHEALTHY','UNAVAILABLE']);

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
        function setBar(id, pct) {
            const el = document.getElementById(id);
            if (!el) return;
            const clamped = Math.min(100, Math.max(0, pct || 0));
            el.style.width = clamped + '%';
            
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

        async function updateDashboard() {
            const loader  = document.getElementById('dash-loading');
            const content = document.getElementById('dash-content');

            try {
                // Fetch the raw snapshot directly (no more normalization layer)
                const data = await fetchWithFallback(`dashboard-snapshot.json?v=${Date.now()}`, null, 2);
                if (!data) throw new Error('Null or invalid payload received.');
                
                renderDashboard(data);

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
                // Recursive polling
                clearTimeout(updateTimeout);
                updateTimeout = setTimeout(updateDashboard, 30000);
            }
        }

        function renderDashboard(data) {
            // ---- EXTRACT TOP-LEVEL SECTIONS ----
            const observer  = data.observer  || {};
            const sage      = data.sage      || {};
            const outsider  = data.outsider  || {};

            // ---- BANNER TIMESTAMP ----
            const rootTs = data.timestamp || observer.timestamp || sage.timestamp || '—';
            setVal('banner-timestamp', formatTimestamp(rootTs));

            // ============================================================
            // OVERALL HEALTH — derive from observer
            // ============================================================
            let overallHealth = 'STABLE';
            if (observer.n8n_heartbeat?.status && String(observer.n8n_heartbeat.status).toLowerCase().includes('error')) {
                overallHealth = 'ERROR';
            }
            if (observer.n8n_heartbeat?.health && String(observer.n8n_heartbeat.health).toLowerCase().includes('error')) {
                overallHealth = 'ERROR';
            }

            // Header title
            setVal('header-agent-text', 'FRAY-ORCHESTRATION');

            const healthEl = document.getElementById('header-health-badge');
            if (healthEl) {
                healthEl.className = `health-badge ${chipClass(overallHealth)}`;
                healthEl.innerHTML = `<span class="dot"></span><span id="header-health-text">${escapeHTML(overallHealth)}</span>`;
            }

            // ============================================================
            // COMPONENTS RENDER
            // ============================================================
            const cpuUsage = renderVitals(observer);
            renderSagePanel(sage);
            renderOutsiderPanel(outsider);
            renderFleetTable(observer, sage, outsider, cpuUsage);
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
            setVal('v-disk-sub', `Used: ${diskUsed} / ${diskTotal}`);
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
            const statusCode = n8nHb.status_code ? `Code: ${n8nHb.status_code}` : '';
            const attempts   = n8nHb.attempts ? `Attempts: ${n8nHb.attempts}` : '';
            const n8nResp    = [statusCode, attempts].filter(Boolean).join(' · ') || '—';
            
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

            return cpuUsage;
        }

        function renderSagePanel(sage) {
            const sageOverall = (sage.status || 'OFFLINE').toUpperCase();
            setChip('p-sage-chip', sageOverall);
            
            const sageBody = document.getElementById('sage-body');
            if (!sageBody) return;
            
            let html = '<div style="padding: 0 4px;">';
            
            if (sageOverall === 'OFFLINE' && !sage.system_health && !sage.active_components) {
                html += `
                    <div class="sage-offline-text">
                        Sage Agent is currently offline.
                    </div>
                `;
            } else {
                html += `
                    <div class="sage-header">
                        <span class="insight-label" class="mb-0">Status:</span>
                        <span class="mono" style="font-size: 0.75rem; color: var(--text-muted);">System Health Assessment</span>
                    </div>
                `;
                
                // Sage status detail metrics
                html += `<div class="sage-metrics">`;
                
                if (sage.system_health) {
                    const healthCls = sage.system_health.toLowerCase().includes('degraded') ? 'warn' : 'ok';
                    html += `<div class="mb-2"><b>System Health:</b> <span class="chip ${healthCls}" class="chip-scale"><span class="dot-sm"></span>${escapeHTML(sage.system_health)}</span></div>`;
                }
                
                if (Array.isArray(sage.active_components) && sage.active_components.length > 0) {
                    html += `<div class="mb-2"><b>Active Components:</b></div>`;
                    html += `<div class="active-components-box">`;
                    sage.active_components.forEach(comp => {
                        html += `<div class="mb-1 text-main">&rsaquo; ${escapeHTML(comp)}</div>`;
                    });
                    html += `</div>`;
                } else {
                    html += `<div class="mb-2"><b>Active Components:</b> None</div>`;
                }
                
                if (sage.anomalies) {
                    const anomalyColor = sage.anomalies.toLowerCase().includes('none') ? 'var(--text-muted)' : 'var(--state-warn)';
                    html += `<div style="margin-bottom: 8px; color: ${anomalyColor};"><b>Anomalies:</b> ${escapeHTML(sage.anomalies)}</div>`;
                }
                
                if (Array.isArray(sage.alerts) && sage.alerts.length > 0) {
                    html += `<div style="margin-bottom: 8px; color: var(--state-err);"><b>Alerts:</b></div>`;
                    html += `<div class="alerts-box">`;
                    sage.alerts.forEach(alert => {
                        html += `<div style="margin-bottom: 4px; color: var(--state-err);">&bull; ${escapeHTML(alert)}</div>`;
                    });
                    html += `</div>`;
                } else {
                    html += `<div style="margin-bottom: 8px; color: var(--text-muted);"><b>Alerts:</b> None</div>`;
                }
                
                html += `</div>`;
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
                                html += `<div class="mb-1 text-secondary text-base">&bull; ${escapeHTML(o)}</div>`;
                            }
                        });
                    }
                    
                    const insightText = outsider.insight || '';
                    if (insightText) {
                        html += `
                            <div class="outsider-insight-box">
                                <span class="insight-label" style="display: block; margin-bottom: 4px;">Outsider Insight:</span>
                                <b>${escapeHTML(insightText)}</b>
                            </div>
                        `;
                    }
                    
                    html += `<div class="outsider-meta">&mdash; Observed: ${formatTimestamp(outsider.timestamp)}</div>`;
                    outsiderEl.innerHTML = html;
                }
            }
        }

        function renderFleetTable(observer, sage, outsider, cpuUsage) {
            const cpuStatusLabel = observer.status ? observer.status.toUpperCase() : (cpuUsage > 80 ? 'CRITICAL' : (cpuUsage > 60 ? 'WARNING' : 'NOMINAL'));
            
            let sageOverall = (sage.status || 'STABLE').toUpperCase();
            if (!sage.system_health && sage.status === 'offline') {
                sageOverall = 'OFFLINE';
            } else if (sage.system_health) {
                const sh = sage.system_health.toLowerCase();
                if (sh.includes('fail') || sh.includes('error') || sh.includes('critical')) {
                    sageOverall = 'CRITICAL';
                } else if (sh.includes('warn') || sh.includes('degraded')) {
                    sageOverall = 'WARNING';
                }
            }

            let sageSummary = 'No report found';
            if (sage.system_health) {
                sageSummary = escapeHTML(`Health: ${sage.system_health} | Anomalies: ${sage.anomalies || 'None'}`);
            } else if (sage.status === 'offline') {
                sageSummary = 'Sage Agent is currently offline.';
            }

            let outsiderSummaryText = outsider.quote || (Array.isArray(outsider.observations) && outsider.observations.length > 0 ? outsider.observations[0] : 'No transmission');
            let outsiderSummary = escapeHTML(outsiderSummaryText);
            let outsiderStatusStr = (outsider.status || 'ACTIVE').toUpperCase();
            if (!outsider.quote && !outsider.observations && !outsider.insight) {
                outsiderStatusStr = 'OFFLINE';
            }

            let observerSummaryText = '';
            if (observer.cpu_percent !== undefined) {
                observerSummaryText = `CPU: ${observer.cpu_percent}% | RAM: ${observer.memory_used_gb}GB / ${observer.memory_total_gb}GB (${observer.memory_percent}%) | Disk: ${observer.disk_used} / ${observer.disk_total} (${observer.disk_percent}) | Network: ${observer.network}`;
            } else {
                observerSummaryText = observer.status === 'unavailable' ? 'Observer telemetry unavailable.' : '—';
            }

            const fleetData = [
                {
                    name: 'The Observer',
                    status: cpuStatusLabel,
                    summary: escapeHTML(observerSummaryText),
                    timestamp: observer.timestamp
                },
                {
                    name: 'The Sage',
                    status: sageOverall,
                    summary: sageSummary,
                    timestamp: sage.timestamp
                },
                {
                    name: 'The Outsider',
                    status: outsiderStatusStr,
                    summary: outsiderSummary,
                    timestamp: outsider.timestamp
                }
            ];

            // Fleet health chip
            const hasFleetIssues = fleetData.some(a => chipClass(a.status) === 'err' || chipClass(a.status) === 'warn');
            const fleetChip = document.getElementById('fleet-health-chip');
            if (fleetChip) {
                const fleetHealth = hasFleetIssues ? 'ISSUES DETECTED' : 'ALL PASS';
                const fleetCls = hasFleetIssues ? 'warn' : 'ok';
                fleetChip.className = `chip ${fleetCls}`;
                fleetChip.innerHTML = `<span class="dot-sm"></span>${escapeHTML(fleetHealth)}`;
            }

            const auditTableBody = document.getElementById('audit-table-body');
            if (auditTableBody) {
                auditTableBody.innerHTML = fleetData.map(agent => {
                    const cls = chipClass(agent.status);
                    const dot = cls === 'ok' ? 'ok' : (cls === 'warn' ? 'warn' : 'err');
                    return `
                        <tr>
                            <td>
                                <div class="audit-agent-cell">
                                    <span class="agent-indicator ${dot}" aria-hidden="true"></span>
                                    <span class="agent-name">${escapeHTML(agent.name)}</span>
                                </div>
                            </td>
                            <td>
                                <span class="chip ${cls}"><span class="dot-sm"></span>${escapeHTML(agent.status)}</span>
                            </td>
                            <td>
                                <div class="agent-analysis" onclick="this.classList.toggle('expanded')" title="Click to expand/collapse">${agent.summary}</div>
                            </td>
                            <td>
                                <div class="audit-technical-cell">${formatTimestamp(agent.timestamp)}</div>
                            </td>
                        </tr>`;
                }).join('');
            }
        }

        // Footer year
        const fyEl = document.getElementById('footer-year');
        if (fyEl) fyEl.textContent = new Date().getFullYear();

        // Start Dashboard Loop
        updateDashboard();