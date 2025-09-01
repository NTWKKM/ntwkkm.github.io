document.getElementById('signupForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const newPasscode = document.getElementById('newPasscode').value.trim().toLowerCase();
    if (!newPasscode) return;

    const appData = getAppData();

    if (appData.users.includes(newPasscode)) {
        alert('This passcode already exists. Please choose another one.');
    } else {
        appData.users.push(newPasscode);
        appData.cases[newPasscode] = []; // Initialize empty case list for the new user
        setAppData(appData);
        alert('Passcode created successfully! You can now log in.');
        window.location.href = 'login.html';
    }
});