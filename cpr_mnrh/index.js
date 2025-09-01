// --- Supabase setup ---
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = Supabase.createClient(supabaseUrl, supabaseKey);

const currentUser = JSON.parse(localStorage.getItem('user'));
if (!currentUser) window.location.href = 'auth.html';

// --- Logout button ---
document.getElementById('logoutBtn').onclick = () => {
  localStorage.removeItem('user');
  window.location.href = 'auth.html';
};

// --- Form submission ---
document.getElementById("cprForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const data = {};
  Array.from(this.elements).forEach(el => {
    if (el.name && !el.classList.contains("cycleInput")) data[el.name] = el.value;
  });
  data.cycles = collectCycles();

  const { error } = await supabase.from('cpr_cases').insert([{ user_id: currentUser.id, data }]);
  if (error) return alert('Error saving case: ' + error.message);

  alert('Case saved successfully!');
  this.reset();
  document.getElementById("cyclesContainer").innerHTML = "";
});

// --- Add CPR Cycle ---
document.getElementById("addCycleBtn").addEventListener("click", addCycleBlock);

function addCycleBlock() {
  const idx = document.querySelectorAll(".cycle-block").length + 1;
  const div = document.createElement("div");
  div.className = "cycle-block";
  div.innerHTML = `
    <h3>CPR Cycle ${idx} <button type="button" class="removeCycleBtn">Remove</button></h3>
    <div class="cycle-grid">
      <label>Start Time <input type="time" class="cycleInput cycleStartTime"></label>
      <label>CPR Duration (min) <input type="number" min="0" step="0.5" class="cycleInput cycleDuration"></label>
      <label>EKG Rhythm
        <select class="cycleInput cycleEKG">
          <option value="PEA">PEA</option>
          <option value="VF">VF</option>
          <option value="Pulseless VT">Pulseless VT</option>
          <option value="Pulse VT">Pulse VT</option>
          <option value="ROSC">ROSC</option>
          <option value="NR">NR</option>
        </select>
      </label>
      <label>Pulse Check
        <select class="cycleInput cyclePulse">
          <option value="">-</option>
          <option value="No pulse">No pulse</option>
          <option value="Pulse">Pulse</option>
        </select>
      </label>
      <label>Airway
        <select class="cycleInput cycleAirway">
          <option value="">-</option>
          <option value="BVM">BVM</option>
          <option value="ETT">ETT</option>
          <option value="SGA">SGA</option>
          <option value="Tracheostomy">Tracheostomy</option>
        </select>
      </label>
      <label>Shock Delivered?
        <select class="cycleInput cycleShockYN">
          <option value="No">No</option>
          <option value="Yes">Yes</option>
        </select>
      </label>
      <label>Shock Energy (J) <input type="number" min="0" step="1" class="cycleInput cycleShockEnergy"></label>
      <label>Shock Time <input type="time" class="cycleInput cycleShockTime"></label>
    </div>

    <fieldset><legend>Quick Entry</legend>
      <div class="quick-entry-grid">
        <label>Hct (%) <input type="number" class="quickHct"></label>
        <div>
          <label>Dtx (mg/dL) <input type="number" class="quickDtxValue"></label>
          <button type="button" class="addDtxBtn">Add Dtx</button>
        </div>
      </div>
      <ul class="dtxList"></ul>
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
      </div>
      <ul class="medList"></ul>
    </fieldset>

    <fieldset><legend>Investigations</legend>
      <div class="investigation-block"><strong>Blood Gas Analysis</strong>
        <div class="blood-gas-grid">
          <label>pH <input type="number" step="0.01" class="invBgPh"></label>
          <label>PCO₂ <input type="number" step="0.1" class="invBgPco2"></label>
          <label>HCO₃⁻ <input type="number" step="0.1" class="invBgHco3"></label>
          <label>K⁺ <input type="number" step="0.1" class="invBgK"></label>
          <label>Hct <input type="number" step="0.1" class="invBgHct"></label>
        </div>
        <button type="button" class="addBloodGasBtn">Add Blood Gas Result</button>
        <ul class="investigation-list bg-list"></ul>
      </div>
      <hr>
      <div class="investigation-block"><strong>Ultrasound Bedside</strong>
        <div class="meds-grid">
          <label>Result: <input type="text" class="invUsResult"></label>
          <button type="button" class="addUltrasoundBtn">Add Ultrasound</button>
        </div>
        <ul class="investigation-list us-list"></ul>
      </div>
      <hr>
      <div class="investigation-block"><strong>Other</strong>
        <div class="meds-grid">
          <label>Type: <input type="text" class="invOtherType"></label>
          <label>Result: <input type="text" class="invOtherResult"></label>
          <button type="button" class="addOtherInvBtn">Add Other</button>
        </div>
        <ul class="investigation-list other-inv-list"></ul>
      </div>
    </fieldset>
  `;

  // --- Remove cycle ---
  div.querySelector(".removeCycleBtn").onclick = () => { div.remove(); updateCycleHeaders(); };

  // --- Dtx adder ---
  const dtxUL = div.querySelector(".dtxList");
  div.querySelector(".addDtxBtn").onclick = () => {
    const val = div.querySelector(".quickDtxValue").value.trim();
    if (!val) return;
    const li = document.createElement("li");
    li.textContent = `Dtx: ${val}`;
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.className = "removeBtn";
    removeBtn.onclick = () => li.remove();
    li.appendChild(removeBtn);
    dtxUL.appendChild(li);
    div.querySelector(".quickDtxValue").value = '';
  };

  setupMedicineAdder(div);
  setupInvestigationAdders(div);

  document.getElementById("cyclesContainer").appendChild(div);
  updateCycleHeaders();
}

// --- Helper functions ---
function updateCycleHeaders() {
  document.querySelectorAll(".cycle-block").forEach((div, i) => {
    div.querySelector("h3").innerHTML = `CPR Cycle ${i+1} <button type="button" class="removeCycleBtn">Remove</button>`;
    div.querySelector(".removeCycleBtn").onclick = () => { div.remove(); updateCycleHeaders(); };
  });
}

function collectCycles() {
  const cycles = [];
  document.querySelectorAll(".cycle-block").forEach(div => {
    cycles.push({
      startTime: div.querySelector(".cycleStartTime").value,
      cprDuration: div.querySelector(".cycleDuration").value,
      ekg: div.querySelector(".cycleEKG").value,
      pulseCheck: div.querySelector(".cyclePulse").value,
      airway: div.querySelector(".cycleAirway").value,
      shockDelivered: div.querySelector(".cycleShockYN").value === "Yes",
      shockEnergy: div.querySelector(".cycleShockEnergy").value,
      shockTime: div.querySelector(".cycleShockTime").value,
      hct: div.querySelector(".quickHct").value,
      dtx: Array.from(div.querySelectorAll(".dtxList li")).map(li => li.textContent.replace("Dtx: ","")),
      medicines: Array.from(div.querySelectorAll(".medList li")).map(li => li.textContent),
      investigations: Array.from(div.querySelectorAll(".investigation-list li")).map(li => li.textContent)
    });
  });
  return cycles;
}

function setupMedicineAdder(div) {
  const medsUL = div.querySelector(".medList");
  div.querySelector(".addMedBtn").onclick = () => {
    let meds = [];
    if(div.querySelector(".medAdrenaline").checked) meds.push("Adrenaline");
    if(div.querySelector(".medCalcium").checked) meds.push("10% Calcium Gluconate");
    if(div.querySelector(".medNaHCO3").checked) meds.push("7.5% NaHCO₃");
    if(div.querySelector(".medPRC").checked) meds.push("Gr.O low titer PRC");
    const other = div.querySelector(".medOther").value.trim();
    if(other) meds.push(other);
    const dose = div.querySelector(".medDose").value.trim();
    const route = div.querySelector(".medRoute").value.trim();
    const time = div.querySelector(".medTime").value || "n/a";

    meds.forEach(m => {
      const li = document.createElement("li");
      li.textContent = `${m}${dose? " " + dose: ""}${route? " ("+route+")": ""} @ ${time}`;
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove"; removeBtn.className="removeBtn"; removeBtn.onclick = () => li.remove();
      li.appendChild(removeBtn);
      medsUL.appendChild(li);
    });

    div.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked=false);
    div.querySelector(".medOther").value=""; div.querySelector(".medDose").value="";
    div.querySelector(".medRoute").value=""; div.querySelector(".medTime").value="";
  };
}

function setupInvestigationAdders(div){
  div.querySelector(".addBloodGasBtn").onclick = ()=>{
    const ph=div.querySelector('.invBgPh').value, pco2=div.querySelector('.invBgPco2').value,
          hco3=div.querySelector('.invBgHco3').value, k=div.querySelector('.invBgK').value,
          hct=div.querySelector('.invBgHct').value;
    if(!ph&&!pco2&&!hco3&&!k&&!hct) return;
    const str=`pH:${ph||'-'} PCO₂:${pco2||'-'} HCO₃⁻:${hco3||'-'} K⁺:${k||'-'} Hct:${hct||'-'}`;
    const li=document.createElement("li"); li.textContent=str;
    const removeBtn=document.createElement("button"); removeBtn.textContent="Remove"; removeBtn.onclick=()=>li.remove();
    li.appendChild(removeBtn);
    div.querySelector(".bg-list").appendChild(li);
    div.querySelectorAll(".invBgPh,.invBgPco2,.invBgHco3,.invBgK,.invBgHct").forEach(i=>i.value="");
  };

  div.querySelector(".addUltrasoundBtn").onclick=()=>{
    const val=div.querySelector(".invUsResult").value.trim();
    if(!val) return;
    const li=document.createElement("li"); li.textContent=val;
    const removeBtn=document.createElement("button"); removeBtn.textContent="Remove"; removeBtn.onclick=()=>li.remove();
    li.appendChild(removeBtn);
    div.querySelector(".us-list").appendChild(li);
    div.querySelector(".invUsResult").value="";
  };

  div.querySelector(".addOtherInvBtn").onclick=()=>{
    const type=div.querySelector(".invOtherType").value.trim();
    const result=div.querySelector(".invOtherResult").value.trim();
    if(!type&&!result) return;
    const li=document.createElement("li"); li.textContent=`${type || "-"}: ${result || "-"}`;
    const removeBtn=document.createElement("button"); removeBtn.textContent="Remove"; removeBtn.onclick=()=>li.remove();
    li.appendChild(removeBtn);
    div.querySelector(".other-inv-list").appendChild(li);
    div.querySelector(".invOtherType").value=""; div.querySelector(".invOtherResult").value="";
  };
}
