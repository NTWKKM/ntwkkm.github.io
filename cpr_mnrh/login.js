document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const passcode = document.getElementById('passcode').value.trim().toLowerCase();
    if (!passcode) return;

    const appData = getAppData();
    
    if (appData.users.includes(passcode)) {
        sessionStorage.setItem('currentUser', passcode);
        window.location.href = 'index.html'; // Go to recorder after login
    } else {
        alert('Passcode not found. Please check your passcode or sign up.');
    }
});