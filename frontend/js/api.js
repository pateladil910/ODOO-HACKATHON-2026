// TransitOps Core API Client Wrapper & Notification Services
(function() {
  const BASE_URL = (window.location.port && window.location.port !== '5005')
    ? 'http://localhost:5005/api/v1'
    : window.location.origin + '/api/v1';

  async function request(endpoint, options = {}) {
    // Read session token from teammate's localStorage key
    const sessionData = localStorage.getItem('transitOpsUser');
    let token = '';
    
    if (sessionData) {
      try {
        const user = JSON.parse(sessionData);
        token = user.token || '';
      } catch (e) {
        console.error('Error parsing session data', e);
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, config);
      const resData = await response.json();

      if (!response.ok) {
        // Handle Session Expiry or Access Denied
        if (response.status === 401 || response.status === 403) {
          showToast(resData.message || 'Access Denied. Please login again.', 'error');
          localStorage.removeItem('transitOpsUser');
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 1500);
          throw new Error(resData.message || 'Unauthorized');
        }
        
        showToast(resData.message || 'An error occurred during request.', 'error');
        throw new Error(resData.message || 'Request failed');
      }

      return resData.data;
    } catch (error) {
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}`, error.message);
      throw error;
    }
  }

  // Toast Alerts Notification Service
  function showToast(message, type = 'success') {
    let container = document.getElementById('alerts-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'alerts-container';
      container.className = 'alerts-container';
      document.body.appendChild(container);
    }

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    // Choose appropriate icon
    let icon = '💡';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'info') icon = 'ℹ️';

    alert.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <span>${icon}</span>
        <span>${message}</span>
      </div>
      <button class="alert-close">&times;</button>
    `;

    container.appendChild(alert);

    // Bind close button
    alert.querySelector('.alert-close').addEventListener('click', () => {
      alert.style.animation = 'fadeOut 0.2s ease forwards';
      setTimeout(() => alert.remove(), 200);
    });

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      if (alert.parentNode) {
        alert.style.animation = 'fadeOut 0.2s ease forwards';
        setTimeout(() => alert.remove(), 200);
      }
    }, 4000);
  }

  // Export globally
  window.api = {
    get: (endpoint, headers) => request(endpoint, { method: 'GET', headers }),
    post: (endpoint, body, headers) => request(endpoint, { method: 'POST', body: JSON.stringify(body), headers }),
    put: (endpoint, body, headers) => request(endpoint, { method: 'PUT', body: JSON.stringify(body), headers }),
    delete: (endpoint, headers) => request(endpoint, { method: 'DELETE', headers }),
    showToast
  };
})();
