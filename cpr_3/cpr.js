// CPR Recorder v2
// Local storage helpers
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
        const drugList = (cy.medicines || []).map(m => `${m.name}${m.dose ? " " + m.dose : ""} ${m.route ? "(" + m.route + ")" : ""} @ ${m.time || "n/a"}`).join(", ") || "None";
        let invList = "";
        if (cy.investigations && cy.investigations.length) {
          invList = "<ul>";
          cy.investigations.forEach(inv => invList += `<li><b>${inv.type}</b>: ${inv.result}</li>`);
          invList += "</ul>";
        }
        cyclesHtml += `<li>
          <b>Cycle ${i+1}</b> <span class="badge">${cy.ekg || "-"}</span><br>
          Start: ${cy.startTime || "-"} | CPR Duration: ${cy.cprDuration || "-"} min | Pulse Check: ${cy.pulseCheck || "-"}<br>
          Shock: ${cy.shockDelivered ? "Yes" : "No"} ${cy.shockDelivered ? `(Energy: ${cy.shockEnergy || "-"} J @ ${cy.shockTime || "-"})` : ""} | Airway: ${cy.airway || "-"}<br>
          <b>Medicines:</b> ${drugList}<br>
          <b>Investigations:</b> ${invList || "None"}
        </li>`;
      });
      cyclesHtml += "</ul>";
    }
    li.innerHTML = `
      <strong>${c.date || ""} ${c.time || ""}</strong> - HN: <b>${c.hn || ""}</b> - ${c.patientName || ""}, Age ${c.age || ""}<br>
      <b>Event:</b> ${c.eventDetails || "-"} ${c.roscTime ? `<br><b>ROSC Time:</b> ${c.roscTime}` : ""}
      ${cyclesHtml}
      <button data-idx="${idx}" class="danger">Delete</button>
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

  data.hctPatient = this.hctPatient.value;
  // Collect all Dtx inputs dynamically
  const dtxInputs = document.querySelectorAll("#dtxContainer input, input[name=dtx1]");
  dtxInputs.forEach(inp => { data[inp.name] = inp.value; });  data.cycles = collectCycles();
  const cases = getCases();
  cases.push(data);
  setCases(cases);
  renderCases();
  this.reset();
  document.getElementById("cyclesContainer").innerHTML = "";
});

document.getElementById("caseList").addEventListener("click", function(e) {
  if (e.target.tagName === "BUTTON" && e.target.classList.contains("danger")) {
    const idx = e.target.getAttribute("data-idx");
    const cases = getCases();
    cases.splice(idx, 1);
    setCases(cases);
    renderCases();
  }
});

document.getElementById("clearAllBtn").addEventListener("click", function() {
  if (confirm("Clear ALL saved cases?")) {
    localStorage.removeItem("cprCases");
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
    if (!c.cycles || !c.cycles.length) {
      exportData.push(Object.assign({
        date: c.date, time: c.time, hn: c.hn, patientName: c.patientName, age: c.age, eventDetails: c.eventDetails, roscTime: c.roscTime,
        hctPatient: c.hctPatient,
      }, Object.fromEntries(Object.entries(c).filter(([k,v]) => k.startsWith("dtx"))), {
        cycle: "", startTime: "", cprDuration: "", ekg: "", pulseCheck: "", shockDelivered: "", shockEnergy: "", shockTime: "", airway: "",
        medicine: "", investigation: ""
      });
    } else {
      c.cycles.forEach((cy, i) => {
        const invs = (cy.investigations || []).map(inv => `${inv.type}: ${inv.result}`).join("; ");
        exportData.push(Object.assign({
        date: c.date, time: c.time, hn: c.hn, patientName: c.patientName, age: c.age, eventDetails: c.eventDetails, roscTime: c.roscTime,
        hctPatient: c.hctPatient,
      }, Object.fromEntries(Object.entries(c).filter(([k,v]) => k.startsWith("dtx"))), {
        cycle: i+1,
          startTime: cy.startTime || "",
          cprDuration: cy.cprDuration || "",
          ekg: cy.ekg || "",
          pulseCheck: cy.pulseCheck || "",
          shockDelivered: cy.shockDelivered ? "Yes" : "No",
          shockEnergy: cy.shockDelivered ? (cy.shockEnergy || "") : "",
          shockTime: cy.shockDelivered ? (cy.shockTime || "") : "",
          airway: cy.airway || "",
          medicine: (cy.medicines || []).map(m => `${m.name}${m.dose ? " " + m.dose : ""} ${m.route ? "(" + m.route + ")" : ""} @ ${m.time || "n/a"}`).join(", "),
          investigation: invs || ""
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

});

function addCycleBlock() {
  const idx = document.querySelectorAll(".cycle-block").length + 1;
  const div = document.createElement("div");
  div.className = "cycle-block";
  div.innerHTML = `
    <h3>CPR Cycle ${idx} <button type="button" class="removeCycleBtn">Remove</button></h3>

    <div class="cycle-grid">
      <label>Start Time
        <input type="time" class="cycleInput" name="cycleStartTime">
      </label>

      <label>CPR Duration (min)
        <input type="number" min="0" step="0.5" class="cycleInput cycleDuration" placeholder="e.g., 2">
      </label>

      <label>EKG Rhythm
        <select class="cycleInput cycleEKG">
          <option value="PEA">PEA</option>
          <option value="VF">VF</option>
          <option value="Pulseless VT">Pulseless VT</option>
          <option value="Pulse VT">Pulse VT</option>
          <option value="ROSC">ROSC</option>
          <option value="NR">NR (No resuscitate)</option>
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

      <label>Shock Energy (J)
        <input type="number" min="0" step="1" class="cycleInput cycleShockEnergy" placeholder="e.g., 200">
      </label>

      <label>Shock Time
        <input type="time" class="cycleInput cycleShockTime">
      </label>
    </div>

    <fieldset class="meds-list">
      <legend>Medicines</legend>
      <div class="small-note">Select meds, optionally add dose/route, set time, then click "Add Medicine".</div>
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

    
    <fieldset>
      <legend>Investigations</legend>
      <div class="meds-grid">
        <label>Type:
          <select class="invType">
            <option value="Blood Gas Analysis">Blood Gas Analysis</option>
            <option value="Ultrasound Bedside">Ultrasound Bedside</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <div class="invFields">
          <!-- dynamic fields here -->
        </div>
        <label>Time:
          <input type="time" class="invTime">
        </label>
        <button type="button" class="addInvestigationBtn">Add Investigation</button>
      </div>
      <ul class="investigation-list"></ul>
    </fieldset>

  `;

  // Rhythm-based hints to encourage ACLS-aligned actions
  const ekgSelect = div.querySelector(".cycleEKG");
  ekgSelect.addEventListener("change", () => {
    const shockYN = div.querySelector(".cycleShockYN");
    if (["VF", "Pulseless VT"].includes(ekgSelect.value)) {
      shockYN.value = "Yes"; // suggest shockable
    } else {
      shockYN.value = "No";
    }
  });

  div.querySelector(".removeCycleBtn").onclick = function() {
    div.remove();
    updateCycleHeaders();
  };

  // Medicine adding logic
  const medsUL = div.querySelector(".medList");
  div.querySelector(".addMedBtn").onclick = function() {
    let meds = [];
    if (div.querySelector(".medAdrenaline").checked) meds.push("Adrenaline");
    if (div.querySelector(".medCalcium").checked) meds.push("10% Calcium Gluconate");
    if (div.querySelector(".medNaHCO3").checked) meds.push("7.5% NaHCO₃");
    if (div.querySelector(".medPRC").checked) meds.push("Gr.O low titer PRC");
    const otherVal = (div.querySelector(".medOther").value || "").trim();
    if (otherVal) meds.push(otherVal);

    const doseVal = (div.querySelector(".medDose").value || "").trim();
    const routeVal = (div.querySelector(".medRoute").value || "").trim();
    const timeVal = div.querySelector(".medTime").value || "n/a";

    meds.forEach(med => {
      const li = document.createElement("li");
      const display = `${med}${doseVal ? " " + doseVal : ""}${routeVal ? " (" + routeVal + ")" : ""} @ ${timeVal}`;
      li.textContent = display;
      li.dataset.name = med;
      li.dataset.dose = doseVal;
      li.dataset.route = routeVal;
      li.dataset.time = timeVal;

      const remove = document.createElement("button");
      remove.textContent = "Remove";
      remove.className = "removeInvestigationBtn";
      remove.onclick = () => li.remove();
      li.appendChild(remove);

      medsUL.appendChild(li);
    });

    // Reset inputs
    div.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
    div.querySelector(".medOther").value = "";
    div.querySelector(".medDose").value = "";
    div.querySelector(".medRoute").value = "";
    div.querySelector(".medTime").value = "";
  };

  // Investigation adding logic
  const invUL = div.querySelector(".investigation-list");
  
  div.querySelector(".addInvestigationBtn").onclick = function() {
    const type = div.querySelector(".invType").value;
    const time = div.querySelector(".invTime").value;
    let result = "";
    let invObj = { type, time };

    if (type === "Blood Gas Analysis") {
      invObj.ph = div.querySelector(".invPH").value;
      invObj.pco2 = div.querySelector(".invPCO2").value;
      invObj.hco3 = div.querySelector(".invHCO3").value;
      invObj.k = div.querySelector(".invK").value;
      invObj.hct = div.querySelector(".invHct").value;
      result = `pH ${invObj.ph}, PCO₂ ${invObj.pco2}, HCO₃ ${invObj.hco3}, K ${invObj.k}, Hct ${invObj.hct}`;
    } else {
      invObj.result = (div.querySelector(".invResult").value || "").trim();
      result = invObj.result;
    }
    if (!result) return;

    const li = document.createElement("li");
    li.textContent = `${type} @ ${time || "n/a"}: ${result}`;
    Object.keys(invObj).forEach(k => li.dataset[k] = invObj[k]);

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.className = "removeInvestigationBtn";
    removeBtn.onclick = function() { li.remove(); };
    li.appendChild(removeBtn);

    invUL.appendChild(li);
    if (type !== "Blood Gas Analysis") div.querySelector(".invResult").value = "";
  };

    li.appendChild(removeBtn);

    invUL.appendChild(li);
    div.querySelector(".invResult").value = "";
  };

  
  // Investigation dynamic fields
  const invTypeSelect = div.querySelector(".invType");
  const invFieldsDiv = div.querySelector(".invFields");
  function renderInvFields() {
    invFieldsDiv.innerHTML = "";
    if (invTypeSelect.value === "Blood Gas Analysis") {
      invFieldsDiv.innerHTML = `
        <label>pH <input type="text" class="invPH"></label>
        <label>PCO₂ <input type="text" class="invPCO2"></label>
        <label>HCO₃ <input type="text" class="invHCO3"></label>
        <label>K <input type="text" class="invK"></label>
        <label>Hct <input type="text" class="invHct"></label>
      `;
    } else {
      invFieldsDiv.innerHTML = `<label>Result: <input type="text" class="invResult" placeholder="Investigation Result"></label>`;
    }
  }
  renderInvFields();
  invTypeSelect.addEventListener("change", renderInvFields);

  document.getElementById("cyclesContainer").appendChild(div);

  // Add "Add Next Cycle" button
  const addNextBtn = document.createElement("button");
  addNextBtn.type = "button";
  addNextBtn.className = "primary addNextCycleBtn";
  addNextBtn.textContent = "+ Add Next Cycle";
  addNextBtn.onclick = () => addCycleBlock();
  div.appendChild(addNextBtn);

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
    const cprDuration = div.querySelector(".cycleDuration").value;
    const ekg = div.querySelector(".cycleEKG").value;
    const pulseCheck = div.querySelector(".cyclePulse").value;
    const airway = div.querySelector(".cycleAirway").value;
    const shockDelivered = div.querySelector(".cycleShockYN").value === "Yes";
    const shockEnergy = div.querySelector(".cycleShockEnergy").value;
    const shockTime = div.querySelector(".cycleShockTime").value;

    const medicines = [];
    div.querySelectorAll(".medList li").forEach(li => {
      medicines.push({
        name: li.dataset.name,
        dose: li.dataset.dose,
        route: li.dataset.route,
        time: li.dataset.time
      });
    });

    
    const investigations = [];
    div.querySelectorAll(".investigation-list li").forEach(li => {
      const obj = {};
      Object.keys(li.dataset).forEach(k => obj[k] = li.dataset[k]);
      investigations.push(obj);
    });

    cycles.push({ startTime, cprDuration, ekg, pulseCheck, airway, shockDelivered, shockEnergy, shockTime, medicines, investigations });
  });
  return cycles;
}

// Initial render
renderCases();

// Dynamic Dtx adding
document.getElementById("addDtxBtn").addEventListener("click", function() {
  const container = document.getElementById("dtxContainer");
  const count = container.querySelectorAll("input").length + 1;
  const label = document.createElement("label");
  label.textContent = `Dtx-${count}: `;
  const input = document.createElement("input");
  input.type = "text";
  input.name = "dtx" + count;
  label.appendChild(input);
  container.appendChild(label);
});
