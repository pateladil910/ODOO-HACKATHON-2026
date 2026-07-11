// API Fetch Wrapper Client

// Determine base API URL depending on current origin host
const getApiBaseUrl = () => {
  const { origin } = window.location;
  // If hosted directly on backend port 5000
  if (origin.includes(':5000')) {
    return '/api/v1';
  }
  // If hosted on standard dev port (like VS Code Live Server 5500 or Vite 5173)
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return 'http://localhost:5000/api/v1';
  }
  // Production fallback
  return '/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Universal Toast Notification System
 * Dynamically spawns visual notifications in the top-right corner
 */
const showToast = (message, type = 'info') => {
  let container = document.querySelector('.alerts-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'alerts-container';
    document.body.appendChild(container);
  }

  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';

  alert.innerHTML = `
    <span style="display:flex; align-items:center; gap: 8px;">
      <span>${icon}</span>
      <span>${message}</span>
    </span>
    <button class="alert-close">&times;</button>
  `;

  // Close handler
  const closeBtn = alert.querySelector('.alert-close');
  closeBtn.addEventListener('click', () => {
    alert.style.animation = 'fadeOut 0.25s forwards';
    setTimeout(() => alert.remove(), 250);
  });

  // Auto remove after 5 seconds
  const autoTimeout = setTimeout(() => {
    alert.style.animation = 'fadeOut 0.25s forwards';
    setTimeout(() => alert.remove(), 250);
  }, 5000);

  container.appendChild(alert);
};

/**
 * Core Request wrapper around native Fetch API
 */
const request = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Set headers
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject JWT Auth Token if present in local storage
  const token = localStorage.getItem('token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Inject API Key if present
  const apiKey = localStorage.getItem('apiKey');
  if (apiKey) {
    headers.set('x-api-key', apiKey);
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);
    const textData = await response.text();
    
    let payload = {};
    if (textData) {
      try {
        payload = JSON.parse(textData);
      } catch (e) {
        payload = { message: textData };
      }
    }

    if (!response.ok) {
      const errorMessage = payload.message || `Request failed with status ${response.status}`;
      showToast(errorMessage, 'error');
      
      // Auto redirect to login on auth failure (401)
      if (response.status === 401 && !window.location.pathname.endsWith('login.html')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1500);
      }
      
      throw new Error(errorMessage);
    }

    // Return the response body details
    return payload.data !== undefined ? payload.data : payload;
  } catch (error) {
    console.error(`[API Client Error] Fetch error at: ${url}`, error);
    throw error;
  }
};

// Reusable REST shorthand utilities
const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
  showToast
};

// Expose client to global window scope
window.api = api;
