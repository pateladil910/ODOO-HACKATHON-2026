// Signup Logic & 3D Interactive Tilt Effect

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signup-form');
  const signupCard = document.getElementById('signup-card');
  const btnSubmit = document.getElementById('btn-submit');

  // Redirect if already authenticated
  if (localStorage.getItem('token') && localStorage.getItem('user')) {
    window.location.href = 'index.html';
    return;
  }

  // --- Advanced 3D Interactive Card Tilt Effect ---
  if (signupCard) {
    signupCard.addEventListener('mousemove', (e) => {
      const rect = signupCard.getBoundingClientRect();
      const x = e.clientX - rect.left; 
      const y = e.clientY - rect.top;  
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((centerY - y) / centerY) * 8; 
      const rotateY = ((x - centerX) / centerX) * 8;
      
      signupCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
      signupCard.style.boxShadow = `
        ${-rotateY * 1.5}px ${rotateX * 1.5}px 24px rgba(15, 23, 42, 0.08),
        0px 16px 48px rgba(15, 23, 42, 0.08)
      `;
    });

    signupCard.addEventListener('mouseleave', () => {
      signupCard.style.transform = 'rotateX(0deg) rotateY(0deg) translateZ(0px)';
      signupCard.style.boxShadow = '';
    });
  }

  // --- Signup Form Submit Handler ---
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const role = document.getElementById('role').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!email || !password || !role) {
      window.api.showToast('Please fill in all required fields.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      window.api.showToast('Passwords do not match.', 'error');
      return;
    }

    if (password.length < 6) {
      window.api.showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    // Visual button press feedback during submission
    const submitText = btnSubmit.querySelector('.btn-3d-front');
    const originalText = submitText.textContent;
    submitText.textContent = 'Creating account...';
    btnSubmit.style.filter = 'grayscale(30%)';

    try {
      // Calls POST /api/v1/auth/register via our fetch utility wrapper
      await window.api.post('/auth/register', { 
        email, 
        password,
        role
      });

      window.api.showToast('Account created successfully! Redirecting...', 'success');

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);

    } catch (err) {
      console.error(err);
      submitText.textContent = originalText;
      btnSubmit.style.filter = '';
    }
  });
});
