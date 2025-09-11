// Authentication utility functions
// This file is now primarily used by auth.html

function enableSignup() {
  const fields = document.querySelectorAll('.signup-form input');
  fields.forEach(field => {
    field.disabled = false;
  });
}

// Check if user is authenticated
function isAuthenticated() {
  const userData = localStorage.getItem('user');
  return userData !== null;
}

// Get current user data
function getCurrentUser() {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
}

// Logout function
function logout() {
  localStorage.removeItem('user');
  window.location.href = 'auth.html';
}

// Redirect based on user role
function redirectBasedOnRole(user) {
  if (user.role === 'student') {
    window.location.href = 'student-dashboard.html';
  } else if (user.role === 'faculty') {
    window.location.href = 'faculty-dashboard.html';
  } else {
    window.location.href = 'dashboard.html';
  }
}
