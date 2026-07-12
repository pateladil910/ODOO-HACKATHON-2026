document.addEventListener('DOMContentLoaded', () => {
    // 1. Authentication Check
    const userData = localStorage.getItem('transitOpsUser');
    if (!userData) {
        window.location.href = 'login.html';
        return; // Stop execution
    }

    const user = JSON.parse(userData);

    // 2. Populate User Info in Sidebar
    const userNameEls = document.querySelectorAll('.user-name');
    const userRoleEls = document.querySelectorAll('.user-role');
    const userAvatarEls = document.querySelectorAll('.user-avatar');

    userNameEls.forEach(el => el.textContent = user.name || 'User');
    userRoleEls.forEach(el => el.textContent = user.role || 'Role');
    userAvatarEls.forEach(el => {
        el.textContent = (user.name ? user.name.charAt(0) : 'U').toUpperCase();
    });

    // 3. Logout Logic
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('transitOpsUser');
            window.location.href = 'login.html';
        });
    }

    // 4. Mobile Sidebar Toggle
    const mobileToggle = document.getElementById('mobileToggle');
    const sidebar = document.getElementById('appSidebar');

    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 991) {
                if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target) && sidebar.classList.contains('show')) {
                    sidebar.classList.remove('show');
                }
            }
        });
    }

    // 5. Role-Based Access Control (RBAC) UI Rendering
    // Hide nav items based on role
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const allowedRoles = item.getAttribute('data-roles');
        if (allowedRoles) {
            const rolesArray = allowedRoles.split(',');
            if (!rolesArray.includes(user.role) && !rolesArray.includes('all')) {
                item.style.display = 'none';
            }
        }
    });
});
