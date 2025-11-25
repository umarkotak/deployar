// ===========================
// Cookie Management
// ===========================
function setCookie(name, value, days = 7) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

// ===========================
// Authentication
// ===========================
function getAuthCredentials() {
    const creds = getCookie('auth_creds');
    if (!creds) return null;
    try {
        return JSON.parse(decodeURIComponent(creds));
    } catch (e) {
        return null;
    }
}

function setAuthCredentials(username, password) {
    const creds = { username, password };
    setCookie('auth_creds', encodeURIComponent(JSON.stringify(creds)), 7);
}

function clearAuthCredentials() {
    deleteCookie('auth_creds');
}

function getAuthHeader() {
    const creds = getAuthCredentials();
    if (!creds) return null;
    const encoded = btoa(creds.username + ':' + creds.password);
    return 'Basic ' + encoded;
}

function isAuthenticated() {
    return getAuthCredentials() !== null;
}

function redirectToLogin() {
    window.location.href = '/login.html';
}

function redirectToSetup() {
    window.location.href = '/setup.html';
}

function redirectToMain() {
    window.location.href = '/index.html';
}

function logout() {
    clearAuthCredentials();
    redirectToLogin();
}

// ===========================
// Setup Check
// ===========================
async function checkSetup() {
    try {
        const response = await fetch('/api/auth/setup');
        const data = await response.json();
        return data.needs_setup;
    } catch (error) {
        console.error('Failed to check setup:', error);
        return false;
    }
}

// Make functions available globally
window.setCookie = setCookie;
window.getCookie = getCookie;
window.deleteCookie = deleteCookie;
window.getAuthCredentials = getAuthCredentials;
window.setAuthCredentials = setAuthCredentials;
window.clearAuthCredentials = clearAuthCredentials;
window.getAuthHeader = getAuthHeader;
window.isAuthenticated = isAuthenticated;
window.redirectToLogin = redirectToLogin;
window.redirectToSetup = redirectToSetup;
window.redirectToMain = redirectToMain;
window.logout = logout;
window.checkSetup = checkSetup;
