document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    // Clear session on load (for testing purposes)
    localStorage.removeItem('transitOpsUser');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            // Call the real backend authentication endpoint
            const resData = await window.api.post('/auth/login', { email, password });
            
            const userData = {
                email: resData.user.email,
                role: resData.user.role,
                name: resData.user.email.split('@')[0],
                token: resData.token
            };
            
            // Save to local storage for session management using the teammate's key
            localStorage.setItem('transitOpsUser', JSON.stringify(userData));
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } catch (err) {
            // Show teammate's error box
            loginError.classList.add('show');
            setTimeout(() => {
                loginError.classList.remove('show');
            }, 3000);
        }
    });
});
