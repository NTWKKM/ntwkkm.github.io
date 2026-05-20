const fs = require('fs');
const path = require('path');

const SNAPSHOT_PATH = path.join(__dirname, '../../fray/dashboard-snapshot.json');
const CLEAN_PATH = path.join(__dirname, '../../fray/dashboard-snapshot-clean.json');

function parsePct(str) {
  if (!str) return 0;
  return parseFloat(String(str).replace('%', '')) || 0;
}

function parseNum(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function parseMemoryMB(str) {
  if (!str) return 0;
  const m = String(str).match(/^(\d+(?:\.\d+)?)\s*[mMgG]?/);
  if (!m) return 0;
  let val = parseFloat(m[1]);
  if (String(str).toLowerCase().includes('g')) {
    val = val * 1024;
  }
  return val;
}

function getNested(obj, ...paths) {
  let current = obj;
  for (const key of paths) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
}

function normalizeStressLevel(val) {
  if (!val) return "NOMINAL";
  const v = String(val).toUpperCase().trim();
  if (v === "CRITICAL" || v === "HIGH" || v === "ERROR" || v === "DOWN" || v === "FAILED") return "CRITICAL";
  if (v === "WARNING" || v === "MODERATE" || v === "DEGRADED" || v === "STRESSED") return "WARNING";
  return "NOMINAL";
}

function normalize(input) {
  const result = {
    system: {},
    metrics: {},
    audit: {},
    metadata: {}
  };

  // 1. SYSTEM Root
  const inSys = input.system || {};
  result.system.status = inSys.status || "ONLINE";
  result.system.tier = inSys.tier || "full";
  result.system.security_lock = inSys.security_lock !== undefined ? !!inSys.security_lock : false;
  result.system.mindset = inSys.mindset || "Sati-Observation";
  result.system.last_reflection = inSys.last_reflection || "";
  result.system.timestamp = inSys.timestamp || new Date().toISOString();
  result.system.circuit_breaker = inSys.circuit_breaker || "CLOSED";

  // 2. METADATA
  const inMeta = input.metadata || {};
  result.metadata.agent = inMeta.agent || "Fray-Orchestrator";
  result.metadata.version = inMeta.version || "1.1.4";

  // 3. AUDIT
  const inAudit = input.audit || {};
  result.audit.timestamp = inAudit.timestamp || new Date().toISOString();
  result.audit.overall_health = inAudit.overall_health || "STABLE";
  result.audit.audit = {};
  if (inAudit.audit) {
    for (const [key, val] of Object.entries(inAudit.audit)) {
      if (val && typeof val === 'object') {
        result.audit.audit[key] = {
          status: val.status || "HEALTHY",
          technical: val.technical || "Found",
          analysis: val.analysis || "Normal"
        };
      }
    }
  }

  // Handle insights mapping
  const rawInsights = inAudit.cognitive_insights || inAudit.insights || {};
  result.audit.cognitive_insights = {
    synthesis: rawInsights.synthesis || "No synthesis recorded.",
    observation: rawInsights.observation || "No observations recorded."
  };

  // 4. METRICS
  const inMetrics = input.metrics || {};
  result.metrics.timestamp = inMetrics.timestamp || getNested(inMetrics, 'system_metrics', 'timestamp') || result.system.timestamp;

  const inAnalysis = inMetrics.analysis || getNested(inMetrics, 'system_metrics', 'stress_analysis') || {};

  result.metrics.telemetry = {
    cpu: { load_avg_1m: 0, load_avg_5m: 0, load_avg_15m: 0 },
    memory: { pages_free: 0, pages_active: 0, pages_wired: 0, pages_compressed: 0, status: (inAnalysis.memory_stress ? normalizeStressLevel(inAnalysis.memory_stress) : "active") },
    gpu: { residency_percent: 0, frequency_mhz: 396, power_mw: 67 },
    thermal: { pressure_level: "Nominal" },
    network: { n8n_ttfb: "failed", connectivity: "DOWN" }
  };

  // --- CPU LOAD ---
  let loadAvg = getNested(inMetrics, 'telemetry', 'load_avg') ||
                getNested(inMetrics, 'system_metrics', 'load_avg') ||
                getNested(inMetrics, 'metrics', 'load_avg') ||
                inMetrics.load_avg;

  if (loadAvg) {
    if (Array.isArray(loadAvg)) {
      result.metrics.telemetry.cpu.load_avg_1m = parseNum(loadAvg[0]);
      result.metrics.telemetry.cpu.load_avg_5m = parseNum(loadAvg[1]);
      result.metrics.telemetry.cpu.load_avg_15m = parseNum(loadAvg[2]);
    } else if (typeof loadAvg === 'object') {
      result.metrics.telemetry.cpu.load_avg_1m = parseNum(loadAvg['1m'] || loadAvg['load_avg_1m'] || loadAvg['cpu_1m']);
      result.metrics.telemetry.cpu.load_avg_5m = parseNum(loadAvg['5m'] || loadAvg['load_avg_5m'] || loadAvg['cpu_5m']);
      result.metrics.telemetry.cpu.load_avg_15m = parseNum(loadAvg['15m'] || loadAvg['load_avg_15m'] || loadAvg['cpu_15m']);
    }
  } else {
    const cpuDirect = getNested(inMetrics, 'telemetry', 'cpu') || getNested(inMetrics, 'system_metrics', 'cpu');
    if (cpuDirect && typeof cpuDirect === 'object') {
      result.metrics.telemetry.cpu.load_avg_1m = parseNum(cpuDirect.load_avg_1m || cpuDirect.load_1m);
      result.metrics.telemetry.cpu.load_avg_5m = parseNum(cpuDirect.load_avg_5m || cpuDirect.load_5m);
      result.metrics.telemetry.cpu.load_avg_15m = parseNum(cpuDirect.load_avg_15m || cpuDirect.load_15m);
    }
  }

  // --- GPU ---
  let inGpu = getNested(inMetrics, 'telemetry', 'gpu') ||
              getNested(inMetrics, 'system_metrics', 'gpu') ||
              inMetrics.gpu;
  let gpuUsage = getNested(inMetrics, 'system_metrics', 'gpu_usage') ||
                 getNested(inMetrics, 'metrics', 'gpu_usage') ||
                 inMetrics.gpu_usage;

  if (inGpu) {
    if (typeof inGpu === 'object') {
      result.metrics.telemetry.gpu.residency_percent = parseNum(inGpu.residency_percent || parsePct(inGpu.residency) || parsePct(inGpu.usage));
      result.metrics.telemetry.gpu.frequency_mhz = parseNum(inGpu.frequency_mhz || parseNum(inGpu.frequency) || 396);
      result.metrics.telemetry.gpu.power_mw = parseNum(inGpu.power_mw || parseNum(inGpu.power) || 67);
    } else {
      result.metrics.telemetry.gpu.residency_percent = parsePct(inGpu);
    }
  } else if (gpuUsage) {
    result.metrics.telemetry.gpu.residency_percent = parsePct(gpuUsage);
  }

  // --- THERMAL ---
  let inThermal = getNested(inMetrics, 'telemetry', 'thermal') ||
                  getNested(inMetrics, 'system_metrics', 'thermal') ||
                  getNested(inMetrics, 'system_metrics', 'thermal_state') ||
                  inMetrics.thermal;
  if (inThermal) {
    if (typeof inThermal === 'object') {
      result.metrics.telemetry.thermal.pressure_level = inThermal.pressure_level || inThermal.state || "Nominal";
    } else {
      result.metrics.telemetry.thermal.pressure_level = String(inThermal);
    }
  }

  // --- NETWORK ---
  let inNet = getNested(inMetrics, 'telemetry', 'network') ||
              getNested(inMetrics, 'system_metrics', 'network') ||
              inMetrics.network;
  let netLatency = getNested(inMetrics, 'system_metrics', 'network_latency') ||
                   getNested(inMetrics, 'telemetry', 'network_latency_ttfb') ||
                   inMetrics.network_latency;

  if (inNet && typeof inNet === 'object') {
    result.metrics.telemetry.network.n8n_ttfb = inNet.n8n_ttfb || inNet.latency || "Timeout";
    result.metrics.telemetry.network.connectivity = inNet.connectivity || ((result.metrics.telemetry.network.n8n_ttfb === "Timeout" || result.metrics.telemetry.network.n8n_ttfb === "failed") ? "DOWN" : "OK");
  } else if (netLatency) {
    result.metrics.telemetry.network.n8n_ttfb = String(netLatency);
    result.metrics.telemetry.network.connectivity = (netLatency === "Timeout" || netLatency === "failed") ? "DOWN" : "OK";
  }

  // --- MEMORY ---
  let inMem = getNested(inMetrics, 'telemetry', 'memory') ||
              getNested(inMetrics, 'system_metrics', 'memory') ||
              getNested(inMetrics, 'metrics', 'memory') ||
              inMetrics.memory;

  if (inMem && typeof inMem === 'object') {
    if (inMem.pages_free !== undefined && inMem.pages_active !== undefined) {
      result.metrics.telemetry.memory.pages_free = parseNum(inMem.pages_free);
      result.metrics.telemetry.memory.pages_active = parseNum(inMem.pages_active);
      result.metrics.telemetry.memory.pages_wired = parseNum(inMem.pages_wired);
      result.metrics.telemetry.memory.pages_compressed = parseNum(inMem.pages_compressed);
      result.metrics.telemetry.memory.status = inMem.status || (inAnalysis.memory_stress ? normalizeStressLevel(inAnalysis.memory_stress) : "active");
    } else {
      let usedMB = parseMemoryMB(inMem.used || inMem.phys_mem_used || inMem.phys_mem);
      let freeMB = parseMemoryMB(inMem.unused || inMem.free || inMem.pages_free);

      // Synthesize pages from MBs: 1 page = 4096 bytes (4KB) -> 1MB = 256 pages
      let usedPages = Math.round(usedMB * 256);
      result.metrics.telemetry.memory.pages_free = Math.round(freeMB * 256) || 24832;
      result.metrics.telemetry.memory.pages_active = Math.round(usedPages * 0.5);
      result.metrics.telemetry.memory.pages_wired = Math.round(usedPages * 0.25);
      result.metrics.telemetry.memory.pages_compressed = Math.round(usedPages * 0.25);
      result.metrics.telemetry.memory.status = inMem.status || (inAnalysis.memory_stress ? normalizeStressLevel(inAnalysis.memory_stress) : "active");
    }
  } else {
    // Default values if memory metrics are missing
    result.metrics.telemetry.memory = {
      pages_free: 24832,
      pages_active: 964352,
      pages_wired: 482176,
      pages_compressed: 482176,
      status: (inAnalysis.memory_stress ? normalizeStressLevel(inAnalysis.memory_stress) : "active")
    };
  }

  // --- ANALYSIS & STRESS LEVEL ---
  result.metrics.analysis = {
    stress_level: normalizeStressLevel(inAnalysis.overall_stress_level || inAnalysis.stress_level || inAnalysis.overall),
    cpu_stress: normalizeStressLevel(inAnalysis.cpu_stress),
    gpu_stress: normalizeStressLevel(inAnalysis.gpu_stress),
    memory_stress: normalizeStressLevel(inAnalysis.memory_stress),
    notes: inAnalysis.notes || inAnalysis.analysis || "System operates nominally."
  };

  return result;
}

function run() {
  console.log(`[Fray Normalizer] Starting normalization...`);
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error(`Error: Snapshot file not found at ${SNAPSHOT_PATH}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(rawData);
  } catch (err) {
    console.error(`Error: Failed to parse snapshot JSON:`, err);
    process.exit(1);
  }

  const normalized = normalize(parsed);

  fs.writeFileSync(CLEAN_PATH, JSON.stringify(normalized, null, 2), 'utf8');
  console.log(`[Fray Normalizer] Successfully wrote normalized file to ${CLEAN_PATH}`);
}

if (require.main === module) {
  run();
} else {
  module.exports = { normalize };
}

