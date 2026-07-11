// Authentication state helper

const auth = {
  /**
   * Submit credentials to obtain JWT session token
   */
  login: async (email, password) => {
    try {
      const data = await window.api.post('/auth/login', { email, password });
      
      // Store credentials
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      window.api.showToast('Login successful! Redirecting...', 'success');
      return data.user;
    } catch (error) {
      // API client will automatically show error toast
      throw error;
    }
  },

  /**
   * Submit data to register user account
   */
  register: async (email, password, role = 'user') => {
    try {
      const data = await window.api.post('/auth/register', { email, password, role });
      window.api.showToast('Account registered successfully! You can now log in.', 'success');
      return data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Clear active user session
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.api.showToast('Logged out successfully.', 'info');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 800);
  },

  /**
   * Get active user session info
   */
  getUser: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  },

  /**
   * Get active JWT token
   */
  getToken: () => {
    return localStorage.getItem('token');
  },

  /**
   * Evaluate session existence
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  /**
   * Guarded pages (e.g. Dashboard) - Redirects to login if session missing
   */
  guardRoute: () => {
    if (!auth.isAuthenticated()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  /**
   * Guest pages (e.g. Login) - Redirects to dashboard if session exists
   */
  guardGuestRoute: () => {
    if (auth.isAuthenticated()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  },

  /**
   * Updates user name/email labels dynamically in layouts
   */
  renderUserProfile: () => {
    const user = auth.getUser();
    if (!user) return;

    // Update DOM labels if present in active page
    const emailElements = document.querySelectorAll('[data-user-email]');
    const roleElements = document.querySelectorAll('[data-user-role]');
    
    emailElements.forEach(el => {
      el.textContent = user.email;
    });

    roleElements.forEach(el => {
      el.textContent = user.role;
      // Style administrator badges if applicable
      if (user.role === 'admin') {
        el.className = 'badge badge-active';
      } else {
        el.className = 'badge badge-inactive';
        el.style.borderColor = 'rgba(255,255,255,0.1)';
        el.style.color = 'var(--text-muted)';
        el.style.background = 'rgba(255,255,255,0.02)';
      }
    });
  }
};

window.auth = auth;
