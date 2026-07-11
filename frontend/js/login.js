// Login Logic & 3D Interactive Tilt Effect

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const loginCard = document.getElementById('login-card');
  const btnSubmit = document.getElementById('btn-submit');

  // Redirect if already authenticated
  if (localStorage.getItem('token') && localStorage.getItem('user')) {
    window.location.href = 'index.html';
    return;
  }

  // --- Advanced 3D Interactive Card Tilt Effect ---
  if (loginCard) {
    loginCard.addEventListener('mousemove', (e) => {
      const rect = loginCard.getBoundingClientRect();
      const x = e.clientX - rect.left; // x coordinate inside the element.
      const y = e.clientY - rect.top;  // y coordinate inside the element.
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Calculate rotation angles based on distance from center (max 8 degrees)
      const rotateX = ((centerY - y) / centerY) * 8; 
      const rotateY = ((x - centerX) / centerX) * 8;
      
      // Update transform dynamically
      loginCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
      loginCard.style.boxShadow = `
        ${-rotateY * 1.5}px ${rotateX * 1.5}px 24px rgba(15, 23, 42, 0.08),
        0px 16px 48px rgba(15, 23, 42, 0.08)
      `;
    });

    // Reset card when mouse leaves
    loginCard.addEventListener('mouseleave', () => {
      loginCard.style.transform = 'rotateX(0deg) rotateY(0deg) translateZ(0px)';
      loginCard.style.boxShadow = '';
    });
  }

  // --- Login Form Submit Handler ---
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      window.api.showToast('Please fill in all fields.', 'error');
      return;
    }

    // Visual button press feedback during submission
    const submitText = btnSubmit.querySelector('.btn-3d-front');
    const originalText = submitText.textContent;
    submitText.textContent = 'Signing in...';
    btnSubmit.style.filter = 'grayscale(30%)';

    try {
      // Calls POST /api/v1/auth/login via our fetch utility wrapper
      const data = await window.api.post('/auth/login', { email, password });

      window.api.showToast('Login successful! Redirecting...', 'success');
      
      // Cache token and profile state
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1200);

    } catch (err) {
      console.error(err);
      // API client automatically throws toast errors, but restore state here
      submitText.textContent = originalText;
      btnSubmit.style.filter = '';
    }
  });
});
