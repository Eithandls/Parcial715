const Components = {
  renderSidebar(activePage) {
    const sidebar = document.getElementById('sidebar');
    const user = App.user || {};
    const isCliente = user.rol === 'cliente';
    const isAdmin = user.rol === 'admin';

    let navItems = [];
    if (isCliente) {
      navItems = [
        { id: 'catalogo', icon: 'movie', label: 'Películas' },
        { id: 'musica', icon: 'music_note', label: 'Música' },
        { id: 'mis-rentas', icon: 'history', label: 'Mis Rentas' },
        { id: 'mis-reservas', icon: 'event_available', label: 'Mis Reservas' }
      ];
    } else {
      navItems = [
        { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
        { id: 'peliculas', icon: 'movie', label: 'Películas' },
        { id: 'articulos', icon: 'inventory_2', label: 'Artículos' },
        { id: 'musica', icon: 'music_note', label: 'Música' },
        { id: 'clientes', icon: 'people', label: 'Clientes' },
        ...(isAdmin ? [{ id: 'empleados', icon: 'badge', label: 'Empleados' }] : []),
        { id: 'rentas', icon: 'shopping_cart', label: 'Rentas y Devoluciones' },
        { id: 'reservas', icon: 'event_available', label: 'Reservas' },
        { id: 'consultas', icon: 'search', label: 'Consultas' },
        ...(isAdmin ? [{ id: 'reportes', icon: 'bar_chart', label: 'Reportes' }] : [])
      ];
    }

    let navHtml = navItems.map(item => `
      <a class="nav-link ${activePage === item.id ? 'active' : ''}" data-page="${item.id}" onclick="App.navigate('${item.id}')">
        <span class="material-symbols-outlined">${item.icon}</span>
        ${item.label}
      </a>
    `).join('');

    sidebar.innerHTML = `
      <div class="sidebar-header">
        <h1><span class="material-symbols-outlined">movie</span> Cinema Club</h1>
      </div>
      <nav style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:4px;">
        ${navHtml}
      </nav>
      <div class="sidebar-footer">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px; padding: 0 8px;">
          <div style="width:36px; height:36px; border-radius:50%; background:var(--primary-container); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:bold;">
            ${(user.nombre || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div style="font-weight:600; font-size:14px; color:var(--on-surface)">${user.nombre || 'Usuario'}</div>
            <div style="font-size:12px; color:var(--on-surface-variant); text-transform:capitalize;">${user.rol || 'Empleado'}</div>
          </div>
        </div>
        <button class="btn btn-outline w-full" onclick="App.logout()">
          <span class="material-symbols-outlined">logout</span> Cerrar Sesión
        </button>
      </div>
    `;
  },

  renderTopbar() {
    const topbar = document.getElementById('topbar');
    topbar.innerHTML = `
      <div style="font-weight:600; color:var(--on-surface-variant)">
        Gestión de Renta de Películas
      </div>
      <div style="display:flex; align-items:center; gap:16px;">
        <button class="btn-icon"><span class="material-symbols-outlined">notifications</span></button>
        <button class="btn-icon"><span class="material-symbols-outlined">help_outline</span></button>
      </div>
    `;
  },

  pageHeader(title, subtitle, actions = '') {
    return `
      <div class="page-header">
        <div>
          <h2>${title}</h2>
          <p class="text-muted">${subtitle}</p>
        </div>
        <div style="display:flex; gap:12px;">${actions}</div>
      </div>
    `;
  },

  kpiCard(icon, label, value, trend = '', color = 'primary') {
    return `
      <div class="kpi-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div class="kpi-icon kpi-icon-${color}">
            <span class="material-symbols-outlined">${icon}</span>
          </div>
          ${trend ? `<span class="badge ${trend.startsWith('+') ? 'badge-active' : 'badge-overdue'}">${trend}</span>` : ''}
        </div>
        <p class="kpi-label">${label}</p>
        <h3 class="kpi-value">${value}</h3>
      </div>
    `;
  },

  dataTable(columns, rows, options = {}) {
    if (!rows || rows.length === 0) {
      return `
        <div class="card text-center" style="padding:48px;">
          <span class="material-symbols-outlined" style="font-size:48px; color:var(--outline-variant); margin-bottom:16px;">inbox</span>
          <h3>No hay datos disponibles</h3>
          <p class="text-muted">No se encontraron registros para mostrar.</p>
        </div>
      `;
    }

    let thead = columns.map(c => `<th>${c.label}</th>`).join('');
    
    let tbody = rows.map(row => {
      let tds = columns.map(c => {
        if (c.render) return `<td>${c.render(row[c.key], row)}</td>`;
        return `<td>${row[c.key] !== null && row[c.key] !== undefined ? row[c.key] : '—'}</td>`;
      }).join('');
      return `<tr>${tds}</tr>`;
    }).join('');

    return `
      <div class="table-container">
        <div style="overflow-x:auto;">
          <table>
            <thead><tr>${thead}</tr></thead>
            <tbody>${tbody}</tbody>
          </table>
        </div>
        <div style="padding:16px; border-top:1px solid var(--outline-variant); display:flex; justify-content:space-between; color:var(--on-surface-variant); font-size:12px;">
          Mostrando ${rows.length} registros
        </div>
      </div>
    `;
  },

  badge(text, variant = 'default') {
    let cssClass = 'badge-inactive';
    const lower = String(text).toLowerCase();
    if (lower === 'activo' || lower === 'activa' || lower === 'disponible') cssClass = 'badge-active';
    else if (lower === 'inactivo' || lower === 'inactiva' || lower === 'eliminado') cssClass = 'badge-inactive';
    else if (lower === 'rented' || lower === 'rentado' || lower === 'rentada') cssClass = 'badge-rented';
    else if (lower === 'devuelta' || lower === 'devuelto') cssClass = 'badge-returned';
    else if (lower === 'vencida' || lower === 'vencido') cssClass = 'badge-overdue';
    
    return `<span class="badge ${cssClass}">${text}</span>`;
  },

  showModal(title, bodyHTML, footerHTML = '') {
    const container = document.getElementById('modal-container');
    container.innerHTML = `
      <div class="modal-overlay" id="current-modal-overlay">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close" onclick="Components.closeModal()"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="modal-body">
            ${bodyHTML}
          </div>
          ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
        </div>
      </div>
    `;
    if (window.Validators) Validators.attachCedulaMasks(container);
    
    document.getElementById('current-modal-overlay').addEventListener('click', () => {
      // Components.closeModal(); // Optional: close on overlay click
    });
  },

  closeModal() {
    document.getElementById('modal-container').innerHTML = '';
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'error') icon = 'error';

    toast.innerHTML = `
      <span class="material-symbols-outlined">${icon}</span>
      <div style="flex:1; font-weight:500; font-size:14px;">${message}</div>
      <button style="background:transparent; border:none; color:white; cursor:pointer;" onclick="this.parentElement.remove()">
        <span class="material-symbols-outlined">close</span>
      </button>
    `;
    
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 3000);
  },

  confirm(message) {
    return new Promise(resolve => {
      Components.showModal('Confirmar Acción', 
        `<p style="font-size:16px;">${message}</p>`,
        `<button class="btn btn-outline" onclick="Components.closeModal(); window._confirmResolve(false)">Cancelar</button>
         <button class="btn btn-primary" onclick="Components.closeModal(); window._confirmResolve(true)">Confirmar</button>`
      );
      window._confirmResolve = resolve;
    });
  },

  formatCurrency(amount) {
    return 'RD$ ' + Number(amount).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    // Handle timezone issues by treating as UTC if no time
    let date = new Date(dateStr);
    if (dateStr.length <= 10) {
      date = new Date(dateStr + 'T12:00:00Z');
    }
    return date.toLocaleDateString('es-DO');
  },

  loading() {
    return `
      <div style="display:flex; justify-content:center; align-items:center; height:200px; color:var(--primary);">
        <span class="material-symbols-outlined spin" style="font-size:48px;">progress_activity</span>
      </div>
    `;
  }
};
