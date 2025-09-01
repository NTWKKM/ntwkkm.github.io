// Helper: Get/Set CPR cases in localStorage
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
    li.innerHTML = `
      <strong>${c.date}</strong> - ${c.patientName}, Age ${c.age}<br>
      <b>Event:</b> ${c.eventDetails}<br>
      <b>Interventions:</b> ${c.interventions}<br>
      <b>Outcome:</b> ${c.outcome}<br>
      <button data-idx="${idx}">Delete</button>
    `;
    caseList.appendChild(li);
  });
}

document.getElementById("cprForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const data = {};
  Array.from(this.elements).forEach((el) => {
    if (el.name) data[el.name] = el.value;
  });
  const cases = getCases();
  cases.push(data);
  setCases(cases);
  renderCases();
  this.reset();
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
  const ws = XLSX.utils.json_to_sheet(cases);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "CPR Cases");
  XLSX.writeFile(wb, "cpr_cases.xlsx");
});

// Initial render on load
renderCases();