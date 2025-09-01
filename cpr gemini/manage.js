// manage.js - Handles the data inspection and management page

document.addEventListener('DOMContentLoaded', () => {

    // --- Passcode Protection ---
    // The list of correct passcodes, stored in an array.
    const CORRECT_PASSCODES = ['MNRHCPR', 'pimpon', 'plan'];
    const enteredPasscode = prompt('Please enter the passcode to access this page:');

    // Check if the entered passcode is one of the valid passcodes.
    // If not, redirect the user.
    if (!CORRECT_PASSCODES.includes(enteredPasscode)) {
        alert('Incorrect passcode. You will be redirected.');
        window.location.href = 'index.html'; // Redirect to the main page
        return; // Stop the rest of the script from running
    }
    
    // --- If passcode is correct, show the content and run the app ---
    document.getElementById('mainContent').style.display = 'block';

    const caseTableBody = document.getElementById('caseTableBody');
    const exportBtn = document.getElementById('exportBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');

    // --- Local storage helpers ---
    function getCases() {
        return JSON.parse(localStorage.getItem("cprCases") || "[]");
    }
    function setCases(cases) {
        localStorage.setItem("cprCases", JSON.stringify(cases));
    }

    // --- Render table rows ---
    function renderTable() {
        const cases = getCases();
        caseTableBody.innerHTML = ""; // Clear existing table
        if (cases.length === 0) {
            caseTableBody.innerHTML = '<tr><td colspan="8">No saved cases found.</td></tr>';
            return;
        }

        cases.forEach((c, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${c.date || '-'}</td>
                <td>${c.time || '-'}</td>
                <td>${c.hn || '-'}</td>
                <td>${c.patientName || '-'}</td>
                <td>${c.age || '-'}</td>
                <td>${c.eventDetails || '-'}</td>
                <td>${c.roscTime || '-'}</td>
                <td>
                    <button class="danger delete-btn" data-index="${index}">Delete</button>
                </td>
            `;
            caseTableBody.appendChild(tr);
        });
    }

    // --- Event listener for delete buttons ---
    caseTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const index = e.target.getAttribute('data-index');
            if (confirm(`Are you sure you want to delete the case for HN: ${getCases()[index].hn}?`)) {
                const cases = getCases();
                cases.splice(index, 1);
                setCases(cases);
                renderTable(); // Re-render the table
            }
        }
    });

    // --- Event listener for "Clear All" button ---
    clearAllBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear ALL saved cases? This cannot be undone.")) {
            localStorage.removeItem("cprCases");
            renderTable();
        }
    });

    // --- Event listener for "Export" button ---
    exportBtn.addEventListener('click', () => {
        const cases = getCases();
        if (cases.length === 0) {
            alert("No cases to export.");
            return;
        }
        const exportData = [];
        cases.forEach(c => {
            if (!c.cycles || c.cycles.length === 0) {
                exportData.push({ date: c.date, time: c.time, hn: c.hn, patientName: c.patientName, age: c.age, eventDetails: c.eventDetails, roscTime: c.roscTime, cycle: "", startTime: "", cprDuration: "", ekg: "", pulseCheck: "", shockDelivered: "", shockEnergy: "", shockTime: "", airway: "", Hct: "", Dtx: "", medicine: "", investigation: "" });
            } else {
                c.cycles.forEach((cy, i) => {
                    const invs = (cy.investigations || []).map(inv => `${inv.type}: ${inv.result}`).join("; ");
                    exportData.push({
                        date: c.date, time: c.time, hn: c.hn, patientName: c.patientName, age: c.age, eventDetails: c.eventDetails, roscTime: c.roscTime,
                        cycle: i + 1, startTime: cy.startTime || "", cprDuration: cy.cprDuration || "", ekg: cy.ekg || "", pulseCheck: cy.pulseCheck || "",
                        shockDelivered: cy.shockDelivered ? "Yes" : "No", shockEnergy: cy.shockDelivered ? (cy.shockEnergy || "") : "", shockTime: cy.shockDelivered ? (cy.shockTime || "") : "",
                        airway: cy.airway || "", Hct: cy.hct || "", Dtx: (cy.dtx || []).join('; ') || "",
                        medicine: (cy.medicines || []).map(m => `${m.name}${m.dose ? " " + m.dose : ""} ${m.route ? " (" + m.route + ")" : ""} @ ${m.time || "n/a"}`).join(", "),
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

    // --- Initial render on page load ---
    renderTable();
});
