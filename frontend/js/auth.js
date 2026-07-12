document.write('<script src="js/mock-api.js"></script>');

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    // Clear session on load (for testing purposes)
    localStorage.removeItem('transitOpsUser');

    // Dynamic API URL detection
    const getApiBaseUrl = () => {
        const { origin } = window.location;
        if (origin.includes(':5005')) {
            return '/api/v1';
        }
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return 'http://localhost:5005/api/v1';
        }
        return '/api/v1';
    };

    const API_BASE_URL = getApiBaseUrl();

    // Map backend roles to frontend navigation categories
    const mapRoleToFrontend = (backendRole) => {
        if (backendRole === 'fleet_manager') return 'manager';
        if (backendRole === 'safety_officer') return 'safety';
        if (backendRole === 'financial_analyst') return 'finance';
        return backendRole; // e.g. 'driver' remains 'driver'
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const roleSelect = document.getElementById('role');
        const role = roleSelect ? roleSelect.value : undefined;

        try {
            // Disable submit button during load
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';

            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, role })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Invalid credentials');
            }

            // Successful login
            const { token, user } = result.data;
            
            // Map role to what the frontend navbar expects
            const frontendUser = {
                id: user.id,
                email: user.email,
                role: mapRoleToFrontend(user.role),
                name: user.email.split('@')[0],
                token: token
            };
            
            // Save to local storage for session management
            localStorage.setItem('transitOpsUser', JSON.stringify(frontendUser));
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error('[Login Error]', error);
            // Show error message
            const errorSpan = loginError.querySelector('span');
            if (errorSpan) {
                errorSpan.textContent = error.message;
            }
            loginError.classList.add('show');
            setTimeout(() => {
                loginError.classList.remove('show');
            }, 4000);
        } finally {
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
    });
});

