import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Login ---
document.getElementById('loginBtn').addEventListener('click', async () => {
  const username = document.getElementById('loginUsername').value.trim();
  if (!username) return alert('Enter username');
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) return alert('User not found');
  
  localStorage.setItem('currentUser', JSON.stringify({ id: data.id, username: data.username }));
  window.location.href = 'index.html';
});

// --- Signup ---
document.getElementById('signupBtn').addEventListener('click', async () => {
  const username = document.getElementById('signupUsername').value.trim();
  if (!username) return alert('Enter username');

  // Check if username exists
  const { data: existing } = await supabase.from('users').select('*').eq('username', username).single();
  if (existing) return alert('Username already exists');

  // Insert new user
  const { data, error } = await supabase.from('users').insert({ username }).select().single();
  if (error) return alert(error.message);

  localStorage.setItem('currentUser', JSON.stringify({ id: data.id, username: data.username }));
  window.location.href = 'index.html';
});
