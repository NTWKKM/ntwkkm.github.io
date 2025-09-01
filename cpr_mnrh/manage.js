const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = Supabase.createClient(supabaseUrl, supabaseKey);

const currentUser = JSON.parse(localStorage.getItem('user'));
if (!currentUser) window.location.href = 'auth.html';
if (currentUser.role !== 'admin') {
  alert('Access denied');
  window.location.href = 'index.html';
}

document.getElementById('logoutBtn').onclick = () => {
  localStorage.removeItem('user');
  window.location.href = 'auth.html';
};

const caseTableBody = document.getElementById('caseTableBody');
const exportBtn = document.getElementById('exportBtn');
const clearAllBtn = document.getElementById('clearAllBtn');

async function getCases() {
  const { data, error } = await supabase.from('cpr_cases').select('id,user_id,data,created_at');
  return error ? [] : data;
}

async function deleteCase(caseId) {
  const { error } = await supabase.from('cpr_cases').delete().eq('id', caseId);
  if (error) alert(error.message);
  else renderTable();
}

async function renderTable() {
  const cases = await getCases();
  caseTableBody.innerHTML = '';
  if (!cases.length) return caseTableBody.innerHTML = '<tr><td colspan="8">No saved cases.</td></tr>';
  
  cases.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.data.date || '-'}</td>
      <td>${c.data.time || '-'}</td>
      <td>${c.data.hn || '-'}</td>
      <td>${c.data.patientName || '-'}</td>
      <td>${c.data.age || '-'}</td>
      <td>${c.data.eventDetails || '-'}</td>
      <td>${c.data.roscTime || '-'}</td>
      <td><button class="danger delete-btn" onclick="deleteCase('${c.id}')">Delete</button></td>
    `;
    caseTableBody.appendChild(tr);
  });
}

exportBtn.onclick = async () => {
  const cases = await getCases();
  if (!cases.length) return alert('No cases to export.');
  const exportData = cases.map(c => ({
    date: c.data.date, time: c.data.time, hn: c.data.hn, patientName: c.data.patientName,
    age: c.data.age, eventDetails: c.data.eventDetails, roscTime: c.data.roscTime
  }));
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "CPR Cases");
  XLSX.writeFile(wb, "cpr_cases.xlsx");
};

clearAllBtn.onclick = async () => {
  if (!confirm("Clear all cases?")) return;
  const { error } = await supabase.from('cpr_cases').delete();
  if (error) alert(error.message);
  else renderTable();
};

renderTable();
