// index.js - Handles the data entry form
checkLogin(); // Protect the page

// --- Display user and handle logout ---
const currentUser = getCurrentUser();
document.getElementById('currentUserDisplay').textContent = currentUser;
document.getElementById('logoutBtn').addEventListener('click', logout);

// --- Form submission logic (now saves to current user's record) ---
document.getElementById("cprForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const newCaseData = {};
  Array.from(this.elements).forEach((el) => {
    if (el.name && !el.classList.contains("cycleInput")) newCaseData[el.name] = el.value;
  });
  newCaseData.cycles = collectCycles();

  const appData = getAppData();
  appData.cases[currentUser].push(newCaseData); // Add to the specific user's case list
  setAppData(appData);
  
  alert('Case saved successfully!');
  this.reset();
  document.getElementById("cyclesContainer").innerHTML = "";
});

// The rest of the file (addCycleBlock, collectCycles, etc.) is UNCHANGED.
// Copy the full content of those functions from the previous version.
// --- (Full code for addCycleBlock, setupMedicineAdder, etc. goes here) ---
document.getElementById("addCycleBtn").addEventListener("click", function() { addCycleBlock(); });
function addCycleBlock() { /* ... full function code ... */ }
function setupMedicineAdder(div) { /* ... full function code ... */ }
function setupInvestigationAdders(div) { /* ... full function code ... */ }
function addInvestigationToList(ulElement, type, result, data = {}) { /* ... full function code ... */ }
function updateCycleHeaders() { /* ... full function code ... */ }
function collectCycles() { /* ... full function code ... */ }