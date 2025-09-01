// manage.js - Handles the data management page
checkLogin(); // Protect the page

// --- Display user and handle logout ---
const currentUser = getCurrentUser();
document.getElementById('currentUserDisplay').textContent = currentUser;
document.getElementById('logoutBtn').addEventListener('click', logout);

// --- Get/Set cases specifically for the current user ---
function getCasesForCurrentUser() {
    const appData = getAppData();
    return appData.cases[currentUser] || [];
}
function setCasesForCurrentUser(userCases) {
    const appData = getAppData();
    appData.cases[currentUser] = userCases;
    setAppData(appData);
}

// --- Render table with current user's data ---
const caseTableBody = document.getElementById('caseTableBody');
function renderTable() {
    const cases = getCasesForCurrentUser();
    caseTableBody.innerHTML = "";
    if (cases.length === 0) {
        caseTableBody.innerHTML = '<tr><td colspan="8">No saved cases found for this user.</td></tr>';
        return;
    }
    cases.forEach((c, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${c.date||'-'}</td><td>${c.time||'-'}</td><td>${c.hn||'-'}</td><td>${c.patientName||'-'}</td><td>${c.age||'-'}</td><td>${c.eventDetails||'-'}</td><td>${c.roscTime||'-'}</td><td><button class="danger delete-btn" data-index="${index}">Delete</button></td>`;
        caseTableBody.appendChild(tr);
    });
}

// --- Event listeners now operate on the user's data subset ---
caseTableBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
        const index = e.target.getAttribute('data-index');
        const cases = getCasesForCurrentUser();
        if (confirm(`Are you sure you want to delete the case for HN: ${cases[index].hn}?`)) {
            cases.splice(index, 1);
            setCasesForCurrentUser(cases);
            renderTable();
        }
    }
});

document.getElementById('clearAllBtn').addEventListener('click', () => {
    if (confirm("Are you sure you want to clear ALL of your saved cases? This cannot be undone.")) {
        setCasesForCurrentUser([]);
        renderTable();
    }
});

document.getElementById('exportBtn').addEventListener('click', () => {
    const cases = getCasesForCurrentUser();
    // The rest of the export logic is UNCHANGED
    if (cases.length === 0) { alert("No cases to export."); return; }
    const exportData = [];
    cases.forEach(c => {
        if (!c.cycles || c.cycles.length === 0) {
            exportData.push({ /* ... same as before ... */ });
        } else {
            c.cycles.forEach((cy, i) => { exportData.push({ /* ... same as before ... */ }); });
        }
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `CPR Cases ${currentUser}`);
    XLSX.writeFile(wb, `cpr_cases_${currentUser}.xlsx`);
});

renderTable(); // Initial render