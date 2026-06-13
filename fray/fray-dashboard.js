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
            const observer   = data.observer   || {};
            const sage       = data.sage       || {};
            const outsider   = data.outsider   || {};
            const historian  = data.historian   || {};
            const gateway    = observer.gateway  || {};

            // ---- BANNER TIMESTAMP ----
            const rootTs = data.timestamp || observer.timestamp || sage.timestamp || '—';
            setVal('banner-timestamp', formatTimestamp(rootTs));

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
            if (gwHealth.includes('unhealthy') || gwProcess === 'stopped') {
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
            // COMPONENTS RENDER
            // ============================================================
            const cpuUsage = renderVitals(observer);
            renderSagePanel(sage);
            renderOutsiderPanel(outsider);
            renderFleetTable(observer, sage, outsider, historian, cpuUsage);
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
            const gwSubParts  = [
                `Process: ${gwProcess}`,
                gwTelegram != null ? `Telegram: ${gwTelegram ? 'connected' : 'disconnected'}` : ''
            ].filter(Boolean).join(' · ');

            setVal('v-gateway', gwHealthStr);
            setVal('v-gateway-sub', gwSubParts || '—');

            const gwBarEl = document.getElementById('v-gateway-bar');
            if (gwBarEl) {
                gwBarEl.style.width = '100%';
                const gwCls = chipClass(gwHealthStr);
                if (gwCls === 'ok') {
                    gwBarEl.className = 'vital-bar-fill green';
                } else if (gwCls === 'warn') {
                    gwBarEl.className = 'vital-bar-fill amber';
                } else {
                    gwBarEl.className = 'vital-bar-fill red';
                }
                setChip('v-gateway-badge', gwHealthStr);
            }

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
                    html += `<div class="mb-2"><b>Active Components:</b> None</div>`;
                }
                
                // --- Anomalies (numeric or string) ---
                const anomalyVal = sage.anomalies;
                if (anomalyVal != null) {
                    const anomalyNum = typeof anomalyVal === 'number' ? anomalyVal : parseInt(anomalyVal, 10);
                    const isZero = anomalyNum === 0 || String(anomalyVal).toLowerCase().includes('none');
                    const anomalyColor = isZero ? 'var(--text-muted)' : 'var(--state-warn)';
                    const anomalyDisplay = typeof anomalyVal === 'number' ? `${anomalyVal} detected` : escapeHTML(String(anomalyVal));
                    html += `<div style="margin-bottom: 8px; color: ${anomalyColor};"><b>Anomalies:</b> ${anomalyDisplay}</div>`;
                }
                
                // --- Alerts (structured objects or legacy strings) ---
                if (Array.isArray(sage.alerts) && sage.alerts.length > 0) {
                    const critCount = sage.alerts.filter(a => a && a.severity === 'critical').length;
                    const warnCount = sage.alerts.filter(a => a && a.severity === 'warning').length;
                    const infoCount = sage.alerts.filter(a => a && a.severity === 'info').length;
                    
                    html += `<div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">`;
                    html += `<b>Alerts</b> <span style="color:var(--text-faint);font-size:0.75rem;">(${sage.alerts.length})</span>`;
                    if (critCount) html += `<span class="chip err" style="font-size:0.6rem;"><span class="dot-sm"></span>${critCount} Critical</span>`;
                    if (warnCount) html += `<span class="chip warn" style="font-size:0.6rem;"><span class="dot-sm"></span>${warnCount} Warning</span>`;
                    if (infoCount) html += `<span class="chip neutral" style="font-size:0.6rem;"><span class="dot-sm"></span>${infoCount} Info</span>`;
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
                                        <span class="chip ${sevCls}" style="font-size:0.58rem;"><span class="dot-sm"></span>${escapeHTML(sev.toUpperCase())}</span>
                                    </div>
                                    <div class="sage-alert-msg">${escapeHTML(alert.message || '—')}</div>
                                </div>
                            `;
                        }
                    });
                    html += `</div>`;
                } else {
                    html += `<div style="margin-bottom: 8px; color: var(--text-muted);"><b>Alerts:</b> None</div>`;
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

        function renderFleetTable(observer, sage, outsider, historian, cpuUsage) {
            const cpuStatusLabel = observer.status ? observer.status.toUpperCase() : (cpuUsage > 80 ? 'CRITICAL' : (cpuUsage > 60 ? 'WARNING' : 'NOMINAL'));
            
            // --- Sage status derivation (supports numeric system_health) ---
            let sageOverall = (sage.status || 'STABLE').toUpperCase();
            if (sage.system_health == null && sage.status === 'offline') {
                sageOverall = 'OFFLINE';
            } else if (sage.system_health != null) {
                if (typeof sage.system_health === 'number') {
                    if (sage.system_health < 50) sageOverall = 'CRITICAL';
                    else if (sage.system_health < 80) sageOverall = 'WARNING';
                    else sageOverall = 'OK';
                } else {
                    const sh = String(sage.system_health).toLowerCase();
                    if (sh.includes('fail') || sh.includes('error') || sh.includes('critical')) sageOverall = 'CRITICAL';
                    else if (sh.includes('warn') || sh.includes('degraded')) sageOverall = 'WARNING';
                }
            }

            // Sage summary
            let sageSummary = 'No report found';
            if (sage.system_health != null) {
                const healthStr = typeof sage.system_health === 'number' ? `${sage.system_health}/100` : sage.system_health;
                const anomalyStr = sage.anomalies != null ? (typeof sage.anomalies === 'number' ? `${sage.anomalies} detected` : sage.anomalies) : 'None';
                sageSummary = escapeHTML(`Health: ${healthStr} | Anomalies: ${anomalyStr}`);
            } else if (sage.status === 'offline') {
                sageSummary = 'Sage Agent is currently offline.';
            }

            // --- Outsider ---
            let outsiderSummaryText = outsider.quote || (Array.isArray(outsider.observations) && outsider.observations.length > 0 ? outsider.observations[0] : 'No transmission');
            // Truncate for fleet table if very long
            if (outsiderSummaryText.length > 200) {
                outsiderSummaryText = outsiderSummaryText.substring(0, 200) + '…';
            }
            let outsiderSummary = escapeHTML(outsiderSummaryText);
            let outsiderStatusStr = (outsider.status || 'ACTIVE').toUpperCase();
            if (!outsider.quote && !outsider.observations && !outsider.insight) {
                outsiderStatusStr = 'OFFLINE';
            }

            // --- Observer ---
            let observerSummaryText = '';
            if (observer.cpu_percent !== undefined) {
                const gwInfo = observer.gateway ? ` | Gateway: ${observer.gateway.health || '—'} (${observer.gateway.process || '—'})` : '';
                observerSummaryText = `CPU: ${observer.cpu_percent}% | RAM: ${observer.memory_used_gb}GB / ${observer.memory_total_gb}GB (${observer.memory_percent}%) | Disk: ${observer.disk_used} / ${observer.disk_total} (${observer.disk_percent}) | Network: ${observer.network}${gwInfo}`;
            } else {
                observerSummaryText = observer.status === 'unavailable' ? 'Observer telemetry unavailable.' : '—';
            }

            // --- Historian ---
            const historianStatus = (historian.status || 'OFFLINE').toUpperCase();
            let historianSummary = 'No weekly analysis available.';
            if (historian.weekly_reflection) {
                historianSummary = escapeHTML(historian.weekly_reflection);
            } else if (historian.week) {
                historianSummary = escapeHTML(`Week: ${historian.week} | ${historian.date_range || '—'}`);
            } else if (historianStatus === 'OFFLINE') {
                historianSummary = 'Historian Agent is currently offline.';
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
                },
                {
                    name: 'The Historian',
                    status: historianStatus,
                    summary: historianSummary,
                    timestamp: historian.timestamp
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