// index.js - Handles the data entry form

// --- Local storage helpers ---
function getCases() {
  return JSON.parse(localStorage.getItem("cprCases") || "[]");
}
function setCases(cases) {
  localStorage.setItem("cprCases", JSON.stringify(cases));
}

// --- Form submission logic ---
document.getElementById("cprForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const data = {};
  Array.from(this.elements).forEach((el) => {
    if (el.name && !el.classList.contains("cycleInput")) data[el.name] = el.value;
  });
  data.cycles = collectCycles();
  const cases = getCases();
  cases.push(data);
  setCases(cases);
  
  alert('Case saved successfully!');
  this.reset();
  document.getElementById("cyclesContainer").innerHTML = "";
});


// --- Dynamic CPR cycle creation and data collection ---
// Note: This section is identical to the previous version of cpr.js
// It includes addCycleBlock, setupMedicineAdder, setupInvestigationAdders, 
// addInvestigationToList, updateCycleHeaders, and collectCycles functions.

document.getElementById("addCycleBtn").addEventListener("click", function() {
  addCycleBlock();
});

function addCycleBlock() {
  const idx = document.querySelectorAll(".cycle-block").length + 1;
  const div = document.createElement("div");
  div.className = "cycle-block";
  div.innerHTML = `
    <h3>CPR Cycle ${idx} <button type="button" class="removeCycleBtn">Remove</button></h3>
    <div class="cycle-grid">
      <label>Start Time <input type="time" class="cycleInput cycleStartTime"></label>
      <label>CPR Duration (min) <input type="number" min="0" step="0.5" class="cycleInput cycleDuration" placeholder="e.g., 2"></label>
      <label>EKG Rhythm
        <select class="cycleInput cycleEKG"><option value="PEA">PEA</option><option value="VF">VF</option><option value="Pulseless VT">Pulseless VT</option><option value="Pulse VT">Pulse VT</option><option value="ROSC">ROSC</option><option value="NR">NR (No resuscitate)</option></select>
      </label>
      <label>Pulse Check
        <select class="cycleInput cyclePulse"><option value="">-</option><option value="No pulse">No pulse</option><option value="Pulse">Pulse</option></select>
      </label>
      <label>Airway
        <select class="cycleInput cycleAirway"><option value="">-</option><option value="BVM">BVM</option><option value="ETT">ETT</option><option value="SGA">SGA</option><option value="Tracheostomy">Tracheostomy</option></select>
      </label>
      <label>Shock Delivered?
        <select class="cycleInput cycleShockYN"><option value="No">No</option><option value="Yes">Yes</option></select>
      </label>
      <label>Shock Energy (J) <input type="number" min="0" step="1" class="cycleInput cycleShockEnergy" placeholder="e.g., 200"></label>
      <label>Shock Time <input type="time" class="cycleInput cycleShockTime"></label>
    </div>
    <fieldset><legend>Quick Entry</legend>
      <div class="quick-entry-grid">
        <label>Hct (%) <input type="number" class="quickHct" placeholder="e.g., 45"></label>
        <div><label>Dtx (mg/dL) <input type="number" class="quickDtxValue" placeholder="e.g., 80"></label><button type="button" class="addDtxBtn">Add Dtx</button></div>
      </div><ul class="dtxList"></ul>
    </fieldset>
    <fieldset class="meds-list"><legend>Medicines</legend>
      <div class="small-note">Select meds, add details, then click "Add Medicine".</div>
      <div class="meds-grid">
        <label><input type="checkbox" class="medAdrenaline"> Adrenaline</label>
        <label><input type="checkbox" class="medCalcium"> 10% Calcium Gluconate</label>
        <label><input type="checkbox" class="medNaHCO3"> 7.5% NaHCO₃</label>
        <label><input type="checkbox" class="medPRC"> Gr.O low titer PRC</label>
        <label>Other: <input type="text" class="medOther" placeholder="Medicine Name"></label>
        <label>Dose <input type="text" class="medDose" placeholder="e.g., 1 mg, 1 amp"></label>
        <label>Route <input type="text" class="medRoute" placeholder="e.g., IV, IO"></label>
        <label>Time Given <input type="time" class="medTime"></label>
        <button type="button" class="addMedBtn">Add Medicine</button>
      </div><ul class="medList"></ul>
    </fieldset>
    <fieldset><legend>Investigations</legend>
      <div class="investigation-block"><strong>Blood Gas Analysis</strong>
        <div class="blood-gas-grid">
          <label>pH <input type="number" step="0.01" class="invBgPh" placeholder="7.35"></label>
          <label>PCO₂ <input type="number" step="0.1" class="invBgPco2" placeholder="40"></label>
          <label>HCO₃⁻ <input type="number" step="0.1" class="invBgHco3" placeholder="24"></label>
          <label>K⁺ <input type="number" step="0.1" class="invBgK" placeholder="4.0"></label>
          <label>Hct <input type="number" step="0.1" class="invBgHct" placeholder="45"></label>
        </div><button type="button" class="addBloodGasBtn">Add Blood Gas Result</button><ul class="investigation-list bg-list"></ul>
      </div><hr>
      <div class="investigation-block"><strong>Ultrasound Bedside</strong>
        <div class="meds-grid"><label>Result: <input type="text" class="invUsResult" placeholder="e.g., Cardiac standstill"></label><button type="button" class="addUltrasoundBtn">Add Ultrasound</button></div><ul class="investigation-list us-list"></ul>
      </div><hr>
      <div class="investigation-block"><strong>Other</strong>
        <div class="meds-grid"><label>Type: <input type="text" class="invOtherType" placeholder="e.g., Chest X-Ray"></label><label>Result: <input type="text" class="invOtherResult" placeholder="Investigation Result"></label><button type="button" class="addOtherInvBtn">Add Other</button></div><ul class="investigation-list other-inv-list"></ul>
      </div>
    </fieldset>
  `;
  const ekgSelect = div.querySelector(".cycleEKG");
  ekgSelect.addEventListener("change", () => { const shockYN = div.querySelector(".cycleShockYN"); if (["VF", "Pulseless VT"].includes(ekgSelect.value)) shockYN.value = "Yes"; else shockYN.value = "No"; });
  div.querySelector(".removeCycleBtn").onclick = function() { div.remove(); updateCycleHeaders(); };
  const dtxUL = div.querySelector(".dtxList");
  div.querySelector(".addDtxBtn").onclick = function() { const dtxInput = div.querySelector(".quickDtxValue"); const dtxValue = dtxInput.value.trim(); if (!dtxValue) return; const li = document.createElement("li"); li.textContent = `Dtx: ${dtxValue} mg/dL`; li.dataset.value = dtxValue; const removeBtn = document.createElement("button"); removeBtn.textContent = "Remove"; removeBtn.className = "removeBtn"; removeBtn.onclick = () => li.remove(); li.appendChild(removeBtn); dtxUL.appendChild(li); dtxInput.value = ""; }
  setupMedicineAdder(div);
  setupInvestigationAdders(div);
  document.getElementById("cyclesContainer").appendChild(div);
}
function setupMedicineAdder(div) { const medsUL = div.querySelector(".medList"); div.querySelector(".addMedBtn").onclick = function() { let meds = []; if (div.querySelector(".medAdrenaline").checked) meds.push("Adrenaline"); if (div.querySelector(".medCalcium").checked) meds.push("10% Calcium Gluconate"); if (div.querySelector(".medNaHCO3").checked) meds.push("7.5% NaHCO₃"); if (div.querySelector(".medPRC").checked) meds.push("Gr.O low titer PRC"); const otherVal = (div.querySelector(".medOther").value || "").trim(); if (otherVal) meds.push(otherVal); const doseVal = (div.querySelector(".medDose").value || "").trim(); const routeVal = (div.querySelector(".medRoute").value || "").trim(); const timeVal = div.querySelector(".medTime").value || "n/a"; meds.forEach(med => { const li = document.createElement("li"); li.textContent = `${med}${doseVal ? " " + doseVal : ""}${routeVal ? " (" + routeVal + ")" : ""} @ ${timeVal}`; li.dataset.name = med; li.dataset.dose = doseVal; li.dataset.route = routeVal; li.dataset.time = timeVal; const remove = document.createElement("button"); remove.textContent = "Remove"; remove.className = "removeBtn"; remove.onclick = () => li.remove(); li.appendChild(remove); medsUL.appendChild(li); }); div.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false); div.querySelector(".medOther").value = ""; div.querySelector(".medDose").value = ""; div.querySelector(".medRoute").value = ""; div.querySelector(".medTime").value = ""; }; }
function setupInvestigationAdders(div) { div.querySelector(".addBloodGasBtn").onclick = function() { const ph = div.querySelector('.invBgPh').value; const pco2 = div.querySelector('.invBgPco2').value; const hco3 = div.querySelector('.invBgHco3').value; const k = div.querySelector('.invBgK').value; const hct = div.querySelector('.invBgHct').value; if (!ph && !pco2 && !hco3 && !k && !hct) return; const resultString = `pH:${ph || '-'} PCO₂:${pco2 || '-'} HCO₃⁻:${hco3 || '-'} K⁺:${k || '-'} Hct:${hct || '-'}`; addInvestigationToList(div.querySelector(".bg-list"), "Blood Gas Analysis", resultString, { ph, pco2, hco3, k, hct }); div.querySelector('.invBgPh').value = ''; div.querySelector('.invBgPco2').value = ''; div.querySelector('.invBgHco3').value = ''; div.querySelector('.invBgK').value = ''; div.querySelector('.invBgHct').value = ''; }; div.querySelector(".addUltrasoundBtn").onclick = function() { const resultInput = div.querySelector('.invUsResult'); if (!resultInput.value.trim()) return; addInvestigationToList(div.querySelector(".us-list"), "Ultrasound Bedside", resultInput.value.trim()); resultInput.value = ''; }; div.querySelector(".addOtherInvBtn").onclick = function() { const typeInput = div.querySelector('.invOtherType'); const resultInput = div.querySelector('.invOtherResult'); if (!typeInput.value.trim() || !resultInput.value.trim()) return; addInvestigationToList(div.querySelector(".other-inv-list"), typeInput.value.trim(), resultInput.value.trim()); typeInput.value = ''; resultInput.value = ''; }; }
function addInvestigationToList(ulElement, type, result, data = {}) { const li = document.createElement("li"); li.textContent = `${type}: ${result}`; li.dataset.type = type; li.dataset.result = result; Object.keys(data).forEach(key => { li.dataset[key] = data[key]; }); const removeBtn = document.createElement("button"); removeBtn.textContent = "Remove"; removeBtn.className = "removeBtn"; removeBtn.onclick = function() { li.remove(); }; li.appendChild(removeBtn); ulElement.appendChild(li); }
function updateCycleHeaders() { document.querySelectorAll(".cycle-block").forEach((div, i) => { div.querySelector("h3").innerHTML = `CPR Cycle ${i+1} <button type="button" class="removeCycleBtn">Remove</button>`; div.querySelector(".removeCycleBtn").onclick = function() { div.remove(); updateCycleHeaders(); }; }); }
function collectCycles() { const cycles = []; document.querySelectorAll(".cycle-block").forEach(div => { const cycleData = { startTime: div.querySelector(".cycleStartTime").value, cprDuration: div.querySelector(".cycleDuration").value, ekg: div.querySelector(".cycleEKG").value, pulseCheck: div.querySelector(".cyclePulse").value, airway: div.querySelector(".cycleAirway").value, shockDelivered: div.querySelector(".cycleShockYN").value === "Yes", shockEnergy: div.querySelector(".cycleShockEnergy").value, shockTime: div.querySelector(".cycleShockTime").value, hct: div.querySelector(".quickHct").value, dtx: Array.from(div.querySelectorAll(".dtxList li")).map(li => li.dataset.value), medicines: Array.from(div.querySelectorAll(".medList li")).map(li => ({ name: li.dataset.name, dose: li.dataset.dose, route: li.dataset.route, time: li.dataset.time })), investigations: Array.from(div.querySelectorAll(".investigation-list li")).map(li => ({ type: li.dataset.type, result: li.dataset.result })) }; cycles.push(cycleData); }); return cycles; }