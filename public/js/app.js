const App = {
  currentPage: 'dashboard',
  user: null,
  pages: {},

  rolePages: {
    admin: ['dashboard', 'peliculas', 'articulos', 'musica', 'clientes', 'empleados', 'rentas', 'reservas', 'consultas', 'reportes', 'tipos-articulo', 'elenco', 'generos', 'idiomas'],
    empleado: ['dashboard', 'peliculas', 'articulos', 'musica', 'clientes', 'rentas', 'reservas', 'consultas', 'tipos-articulo', 'elenco', 'generos', 'idiomas'],
    cliente: ['catalogo', 'musica', 'mis-rentas', 'mis-reservas']
  },

  canAccess(page) {
    return Boolean(this.user && (this.rolePages[this.user.rol] || []).includes(page));
  },

  registerPage(name, renderFn) {
    this.pages[name] = renderFn;
  },

  async init() {
    if (API.token) {
      try {
        const resp = await API.me();
        this.user = resp.user;
        this.showApp();
      } catch(e) {
        this.showLogin();
      }
    } else {
      this.showLogin();
    }
  },

  showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
    document.getElementById('login-card').classList.remove('hidden');
    document.getElementById('register-card').classList.add('hidden');
    
    const form = document.getElementById('login-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const btn = form.querySelector('button');
        
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined spin">progress_activity</span> Iniciando...';
        
        try {
          const resp = await API.login(username, password);
          API.setToken(resp.token);
          App.user = resp.user;
          App.showApp();
        } catch(err) {
          document.getElementById('login-error').textContent = err.message;
        } finally {
          btn.disabled = false;
          btn.innerHTML = 'Ingresar';
        }
      };
    }

    const regForm = document.getElementById('register-form');
    if (regForm) {
      regForm.onsubmit = async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('reg-nombre').value;
        const email = document.getElementById('reg-email').value;
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const cedula = document.getElementById('reg-cedula').value;
        const telefono = document.getElementById('reg-telefono').value;
        const btn = regForm.querySelector('button');
        
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined spin">progress_activity</span> Creando...';
        
        try {
          const resp = await API.register({ nombre, email, username, password, cedula, telefono });
          API.setToken(resp.token);
          App.user = resp.user;
          App.showApp();
        } catch(err) {
          document.getElementById('register-error').textContent = err.message;
        } finally {
          btn.disabled = false;
          btn.innerHTML = 'Registrar y Entrar';
        }
      };
    }
  },

  toggleRegister(e) {
    if(e) e.preventDefault();
    const loginCard = document.getElementById('login-card');
    const registerCard = document.getElementById('register-card');
    if (loginCard.classList.contains('hidden')) {
      loginCard.classList.remove('hidden');
      registerCard.classList.add('hidden');
    } else {
      loginCard.classList.add('hidden');
      registerCard.classList.remove('hidden');
    }
  },

  showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    Components.renderTopbar();
    if (App.user.rol === 'cliente' && this.currentPage === 'dashboard') {
      this.currentPage = 'catalogo';
    } else if (App.user.rol !== 'cliente' && this.currentPage === 'catalogo') {
      this.currentPage = 'dashboard';
    }
    this.navigate(this.currentPage);
  },

  navigate(page) {
    if (!this.canAccess(page)) {
      const fallback = this.user?.rol === 'cliente' ? 'catalogo' : 'dashboard';
      if (page !== fallback) Components.showToast('Tu rol no tiene permiso para esa opción', 'error');
      page = fallback;
    }
    this.currentPage = page;
    Components.renderSidebar(page);
    const content = document.getElementById('content');
    
    if (this.pages[page]) {
      content.innerHTML = Components.loading();
      // setTimeout to allow UI to paint loading state
      setTimeout(() => {
        try {
          this.pages[page](content);
        } catch (e) {
          console.error(e);
          content.innerHTML = `<div class="card"><h3 class="text-error">Error cargando la página</h3><p>${e.message}</p></div>`;
        }
      }, 50);
    } else {
      content.innerHTML = `<div class="card"><h3>Página en construcción</h3><p>El módulo ${page} no ha sido implementado aún.</p></div>`;
    }
  },

  logout() {
    API.logout().catch(() => {});
    API.clearToken();
    this.user = null;
    this.showLogin();
    // Clear inputs
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').textContent = '';
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
