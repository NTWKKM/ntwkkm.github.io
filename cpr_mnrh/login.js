import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://elzfuojueoxxrzxevrss.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsemZ1b2p1ZW94eHJ6eGV2cnNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDQ0MzgsImV4cCI6MjA3MjMyMDQzOH0.rNZDYWyInotfXpTgXWEO_rFqbgvJr5xI7f_N_vfKIP4';
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
