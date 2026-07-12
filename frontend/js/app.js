document.write('<script src="js/mock-api.js"></script>');

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

    // 6. Dynamic Theme Toggle Injection & Logic
    const headerRight = document.querySelector('.header-right');
    if (headerRight && !document.getElementById('themeToggleBtn')) {
        const themeToggleBtn = document.createElement('button');
        themeToggleBtn.className = 'header-action';
        themeToggleBtn.id = 'themeToggleBtn';
        themeToggleBtn.title = 'Toggle Theme';
        themeToggleBtn.style.marginRight = '8px';
        themeToggleBtn.innerHTML = '<i class="ph ph-sun" id="themeIcon" style="font-size: 1.25rem;"></i>';
        headerRight.prepend(themeToggleBtn);
    }

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    
    // Apply saved theme state immediately
    const currentTheme = localStorage.getItem('transitOpsTheme') || 'dark';
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeIcon) {
            themeIcon.className = 'ph ph-moon';
        }
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            localStorage.setItem('transitOpsTheme', isLight ? 'light' : 'dark');
            if (themeIcon) {
                themeIcon.className = isLight ? 'ph ph-moon' : 'ph ph-sun';
            }
        });
    }
});
