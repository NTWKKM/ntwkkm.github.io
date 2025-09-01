// admin.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://elzfuojueoxxrzxevrss.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsemZ1b2p1ZW94eHJ6eGV2cnNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDQ0MzgsImV4cCI6MjA3MjMyMDQzOH0.rNZDYWyInotfXpTgXWEO_rFqbgvJr5xI7f_N_vfKIP4';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const caseTableBody = document.getElementById('caseTableBody');
const filterBtn = document.getElementById('filterBtn');
const exportBtn = document.getElementById('exportBtn');
const filterUser = document.getElementById('filterUser');

let allCases = [];

// --- Fetch all CPR cases with usernames ---
async function fetchCases() {
  const { data: cases, error } = await supabase
    .from('cpr_cases')
    .select('id, created_at, data, users(username)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  allCases = cases.map(c => ({
    id: c.id,
    created_at: c.created_at,
    username: c.users.username,
    ...c.data
  }));

  renderTable(allCases);
}

// --- Render table ---
function renderTable(cases) {
  caseTableBody.innerHTML = '';
  if (!cases.length) {
    caseTableBody.innerHTML = '<tr><td colspan="8">No cases found.</td></tr>';
    return;
  }

  cases.forEach((c) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.username}</td>
      <td>${new Date(c.created_at).toLocaleString()}</td>
      <td>${c.patientName || '-'}</td>
      <td>${c.hn || '-'}</td>
      <td>${c.age || '-'}</td>
      <td>${c.eventDetails || '-'}</td>
      <td>${c.roscTime || '-'}</td>
      <td>
        <button class="danger delete-btn" data-id="${c.id}">Delete</button>
      </td>
    `;
    caseTableBody.appendChild(tr);
  });
}

// --- Filter by username ---
filterBtn.addEventListener('click', () => {
  const username = filterUser.value.trim().toLowerCase();
  const filtered = allCases.filter(c => c.username.toLowerCase().includes(username));
  renderTable(filtered);
});

// --- Delete case ---
caseTableBody.addEventListener('click', async (e) => {
  if (e.target.classList.contains('delete-btn')) {
    const id = e.target.dataset.id;
    if (!confirm('Are you sure you want to delete this case?')) return;
    const { error } = await supabase.from('cpr_cases').delete().eq('id', id);
    if (error) return alert('Error deleting: ' + error.message);
    fetchCases();
  }
});

// --- Export filtered cases to Excel ---
exportBtn.addEventListener('click', () => {
  const rows = Array.from(caseTableBody.querySelectorAll('tr')).map(tr => {
    const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent);
    return cells;
  }).filter(r => r.length > 0);

  if (!rows.length) return alert('No data to export');

  const ws = XLSX.utils.aoa_to_sheet([['Username','Created At','Patient Name','HN','Age','Event','ROSC Time'], ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'CPR Cases');
  XLSX.writeFile(wb, 'cpr_cases_admin.xlsx');
});

// --- Initial load ---
fetchCases();
