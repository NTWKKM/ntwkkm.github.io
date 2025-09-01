// Helper functions for localStorage
function getCases() {
  return JSON.parse(localStorage.getItem("cprCases") || "[]");
}
function setCases(cases) {
  localStorage.setItem("cprCases", JSON.stringify(cases));
}

function renderCases() {
  const cases = getCases();
  const caseList = document.getElementById("caseList");
  caseList.innerHTML = "";
  cases.forEach((c, idx) => {
    const li = document.createElement("li");
    let cyclesHtml = "";
    if (c.cycles && c.cycles.length) {
      cyclesHtml = "<ul>";
      c.cycles.forEach((cy, i) => {
        let drugList = cy.medicines.map(m => `${m.name} (${m.time})`).join(", ");
        let invList = "";
        if (cy.investigations && cy.investigations.length) {
          invList = "<ul>";
          cy.investigations.forEach(inv =>
            invList += `<li><b>${inv.type}</b>: ${inv.result}</li>`
          );
          invList += "</ul>";
        }
        cyclesHtml += `<li>
          <b>Cycle ${i+1}:</b> Start Time: ${cy.startTime}, EKG: ${cy.ekg}<br>
          <b>Medicines:</b> ${drugList}
          <br><b>Investigations:</b> ${invList || "None"}
        </li>`;
      });
      cyclesHtml += "</ul>";
    }
    li.innerHTML = `
      <strong>${c.date} ${c.time}</strong> - HN: <b>${c.hn}</b> - ${c.patientName}, Age ${c.age}<br>
      <b>Event:</b> ${c.eventDetails}<br>
      ${cyclesHtml}
      <button data-idx="${idx}">Delete</button>
    `;
    caseList.appendChild(li);
  });
}

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
  renderCases();
  this.reset();
  document.getElementById("cyclesContainer").innerHTML = "";
});

document.getElementById("caseList").addEventListener("click", function(e) {
  if (e.target.tagName === "BUTTON") {
    const idx = e.target.getAttribute("data-idx");
    const cases = getCases();
    cases.splice(idx, 1);
    setCases(cases);
    renderCases();
  }
});

document.getElementById("exportBtn").addEventListener("click", function() {
  const cases = getCases();
  if (cases.length === 0) {
    alert("No cases to export.");
    return;
  }
  // Flatten cycles for Excel
  const exportData = [];
  cases.forEach(c => {
    if (!c.cycles || !c.cycles.length) exportData.push({ ...c, cycle: "", ekg: "", medicine: "", investigation_type: "", investigation_result: "" });
    else {
      c.cycles.forEach((cy, i) => {
        const invs = cy.investigations?.map(inv => `${inv.type}: ${inv.result}`).join("; ") || "";
        exportData.push({
          ...c,
          cycle: i+1,
          startTime: cy.startTime,
          ekg: cy.ekg,
          medicine: cy.medicines.map(m => `${m.name} (${m.time})`).join(", "),
          investigation: invs
        });
      });
    }
  });
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "CPR Cases");
  XLSX.writeFile(wb, "cpr_cases.xlsx");
});

// Dynamic CPR cycles
document.getElementById("addCycleBtn").addEventListener("click", function() {
  addCycleBlock();
});

function addCycleBlock() {
  const idx = document.querySelectorAll(".cycle-block").length + 1;
  const div = document.createElement("div");
  div.className = "cycle-block";
  div.innerHTML = `
    <h3>CPR Cycle ${idx} <button type="button" class="removeCycleBtn">Remove</button></h3>
    <label>Start Time: <input type="time" class="cycleInput" name="cycleStartTime"></label>
    <label>EKG Rhythm:
      <select class="cycleInput cycleEKG">
        <option value="PEA">PEA</option>
        <option value="VF">VF</option>
        <option value="Pulseless VT">Pulseless VT</option>
        <option value="Pulse VT">Pulse VT</option>
        <option value="ROSC">ROSC</option>
        <option value="NR">NR (No resuscitate)</option>
      </select>
    </label>
    <fieldset class="meds-list">
      <legend>Medicines</legend>
      <label><input type="checkbox" class="medAdrenaline"> Adrenaline</label>
      <label><input type="checkbox" class="medNaHCO3"> 7.5% NaHCO₃</label>
      <label><input type="checkbox" class="medCalcium"> 10% Calcium Gluconate</label>
      <label><input type="checkbox" class="medPRC"> Gr.O low titer PRC</label>
      <label>Other: <input type="text" class="medOther" placeholder="Medicine Name"></label>
      <label>Time Given: <input type="time" class="medTime"></label>
      <button type="button" class="addMedBtn">Add Medicine</button>
      <ul class="medList"></ul>
    </fieldset>
    <fieldset>
      <legend>Investigations</legend>
      <label>Type:
        <select class="invType">
          <option value="Blood Gas Analysis">Blood Gas Analysis</option>
          <option value="Ultrasound Bedside">Ultrasound Bedside</option>
          <option value="Other">Other</option>
        </select>
      </label>
      <label>Result: <input type="text" class="invResult" placeholder="Investigation Result"></label>
      <button type="button" class="addInvestigationBtn">Add Investigation</button>
      <ul class="investigation-list"></ul>
    </fieldset>
  `;
  div.querySelector(".removeCycleBtn").onclick = function() {
    div.remove();
    updateCycleHeaders();
  };
  // Medicine adding logic
  const medsUL = div.querySelector(".medList");
  div.querySelector(".addMedBtn").onclick = function() {
    // Find selected meds
    let meds = [];
    if (div.querySelector(".medAdrenaline").checked) meds.push("Adrenaline");
    if (div.querySelector(".medNaHCO3").checked) meds.push("7.5% NaHCO₃");
    if (div.querySelector(".medCalcium").checked) meds.push("10% Calcium Gluconate");
    if (div.querySelector(".medPRC").checked) meds.push("Gr.O low titer PRC");
    const otherVal = div.querySelector(".medOther").value;
    if (otherVal) meds.push(otherVal);
    const timeVal = div.querySelector(".medTime").value || "n/a";
    meds.forEach(med => {
      const li = document.createElement("li");
      li.textContent = \
`${med} (${timeVal})`;
      li.dataset.name = med;
      li.dataset.time = timeVal;
      medsUL.appendChild(li);
    });
    // Reset inputs
    div.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
    div.querySelector(".medOther").value = "";
    div.querySelector(".medTime").value = "";
  };
  // Investigation adding logic
  const invUL = div.querySelector(".investigation-list");
  div.querySelector(".addInvestigationBtn").onclick = function() {
    const type = div.querySelector(".invType").value;
    const result = div.querySelector(".invResult").value;
    if (!result) return;
    const li = document.createElement("li");
    li.textContent = \
`${type}: ${result}`;
    li.dataset.type = type;
    li.dataset.result = result;
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.className = "removeInvestigationBtn";
    removeBtn.onclick = function() { li.remove(); };
    li.appendChild(removeBtn);
    invUL.appendChild(li);
    div.querySelector(".invResult").value = "";
  };
  document.getElementById("cyclesContainer").appendChild(div);
}

function updateCycleHeaders() {
  document.querySelectorAll(".cycle-block").forEach((div, i) => {
    div.querySelector("h3").innerHTML = `CPR Cycle ${i+1} <button type="button" class="removeCycleBtn">Remove</button>`;
    div.querySelector(".removeCycleBtn").onclick = function() {
      div.remove();
      updateCycleHeaders();
    };
  });
}

// Collect cycles for saving
function collectCycles() {
  const cycles = [];
  document.querySelectorAll(".cycle-block").forEach(div => {
    const startTime = div.querySelector("input[name=cycleStartTime]").value;
    const ekg = div.querySelector(".cycleEKG").value;
    const medList = [];
    div.querySelectorAll(".medList li").forEach(li => {
      medList.push({ name: li.dataset.name, time: li.dataset.time });
    });
    const investigations = [];
    div.querySelectorAll(".investigation-list li").forEach(li => {
      investigations.push({ type: li.dataset.type, result: li.dataset.result });
    });
    cycles.push({ startTime, ekg, medicines: medList, investigations });
  });
  return cycles;
}

// Initial render
renderCases();
