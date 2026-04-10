import './style.css';
import { auth } from './supabase';
import { store, state } from './store';
import { renderPage } from './ui';

// Navigation Manager
window.showPage = (page) => {
  renderPage(page);
  // Update nav UI
  document.querySelectorAll('.nav-i').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
};

// Global App State
async function initApp() {
  const user = await auth.getUser();
  
  if (!user) {
    document.getElementById('screen-auth').style.display = 'flex';
    document.getElementById('screen-app').style.display = 'none';
    initAuthFlow();
  } else {
    document.getElementById('screen-auth').style.display = 'none';
    document.getElementById('screen-app').style.display = 'block';
    
    // Load data from Supabase
    await store.loadAll();
    
    // Initial Page
    window.showPage('dashboard');
  }
}

function initAuthFlow() {
  const loginBtn = document.getElementById('btn-login');
  if (loginBtn) {
    loginBtn.onclick = async () => {
      const email = document.getElementById('tf-email').value;
      const pass = document.getElementById('tf-pass').value;
      const { error } = await auth.signIn(email, pass);
      if (error) alert(error.message);
      else location.reload();
    };
  }
}

// Watch Auth Changes
auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    // location.reload(); // Simple way to reset state
  }
});

// Initialization
document.addEventListener('DOMContentLoaded', initApp);
