document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    // Clear session on load (for testing purposes)
    localStorage.removeItem('transitOpsUser');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        // Mock Authentication Logic
        // In a real app, this would be an API call
        if (email && password.length >= 6) {
            // Success mock
            const userData = {
                email: email,
                role: role,
                name: email.split('@')[0],
                token: 'mock-jwt-token-12345'
            };
            
            // Save to local storage for session management
            localStorage.setItem('transitOpsUser', JSON.stringify(userData));
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            // Show error
            loginError.classList.add('show');
            setTimeout(() => {
                loginError.classList.remove('show');
            }, 3000);
        }
    });
});
