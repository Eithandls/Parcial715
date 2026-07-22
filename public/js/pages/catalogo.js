async function catalogoPage(container, filtroInicial) {
  let filtro = filtroInicial || 'peliculas';

  const loadCatalogo = async () => {
    try {
      const data = await API.request('GET', '/api/catalogo/v2');
      renderCatalogo(data);
    } catch (e) {
      container.innerHTML = `<div class="card"><h3 class="text-error">Error</h3><p>${e.message}</p></div>`;
    }
  };

  const renderCatalogo = (peliculas) => {
    const filtradas = peliculas.filter(p => {
      if (filtro === 'musica') return p.genero === 'Música';
      return p.genero !== 'Música';
    });

    const titulo = filtro === 'musica' ? 'Catálogo de Música' : 'Catálogo de Películas';
    const subtitulo = filtro === 'musica'
      ? 'Explora nuestros álbumes musicales disponibles en CD'
      : 'Explora nuestros títulos disponibles en Blu-ray y DVD';

    let html = Components.pageHeader(titulo, subtitulo);

    html += `
      <div style="display:flex; gap:12px; margin-bottom:24px;">
        <button class="btn ${filtro === 'peliculas' ? 'btn-primary' : 'btn-outline'}" onclick="App.navigate('catalogo')">
          <span class="material-symbols-outlined">movie</span> Películas
        </button>
        <button class="btn ${filtro === 'musica' ? 'btn-primary' : 'btn-outline'}" onclick="App.navigate('musica')">
          <span class="material-symbols-outlined">music_note</span> Música
        </button>
      </div>
    `;

    if (filtradas.length === 0) {
      html += `
        <div class="card text-center" style="padding:48px;">
          <span class="material-symbols-outlined" style="font-size:48px; color:var(--outline-variant); margin-bottom:16px;">
            ${filtro === 'musica' ? 'music_off' : 'inbox'}
          </span>
          <h3>No hay ${filtro === 'musica' ? 'álbumes' : 'películas'} disponibles</h3>
          <p class="text-muted">Actualmente no hay contenido en esta categoría.</p>
        </div>
      `;
      container.innerHTML = html;
      return;
    }

    html += `<div class="catalogo-grid">`;
    for (const p of filtradas) {
      const esMusica = p.genero === 'Música';
      const formatosBlu = p.formatos.filter(f => f.tipo_id === 2);
      const formatosDvd = p.formatos.filter(f => f.tipo_id === 1);
      const formatosCd = p.formatos.filter(f => f.tipo_id === 3);
      const hasBluDisp = formatosBlu.some(f => f.disponible);
      const hasDvdDisp = formatosDvd.some(f => f.disponible);
      const hasAnyDisp = hasBluDisp || hasDvdDisp || formatosCd.some(f => f.disponible);
      const bluCost = formatosBlu.length ? Math.min(...formatosBlu.map(f => f.costo_dia)) : 0;
      const dvdCost = formatosDvd.length ? Math.min(...formatosDvd.map(f => f.costo_dia)) : 0;
      const cdCost = formatosCd.length ? Math.min(...formatosCd.map(f => f.costo_dia)) : 0;

      window.Catalogo._formatos[p.id] = p.formatos;
      for (const f of p.formatos) {
        window.Catalogo._formatosById[f.id] = f;
      }

      const directores = p.elenco.filter(e => e.tipo === 'Director').map(e => e.nombre);
      const actores = p.elenco.filter(e => e.tipo === 'Actor').map(e => e.nombre);
      const artistas = p.elenco.filter(e => e.tipo === 'Artista').map(e => e.nombre);

      let elencoHtml = '';
      if (esMusica && artistas.length) {
        elencoHtml = `<div class="catalogo-card-elenco"><span class="elenco-label">Artista:</span> ${artistas.join(', ')}</div>`;
      } else {
        if (directores.length) elencoHtml += `<div class="catalogo-card-elenco"><span class="elenco-label">Dirección:</span> ${directores.join(', ')}</div>`;
        if (actores.length) elencoHtml += `<div class="catalogo-card-elenco"><span class="elenco-label">Reparto:</span> ${actores.slice(0, 4).join(', ')}</div>`;
      }

      html += `
        <div class="card catalogo-card">
          <div class="catalogo-card-header">
            <span class="material-symbols-outlined catalogo-card-icon">${esMusica ? 'music_note' : 'movie'}</span>
            <span class="badge ${hasAnyDisp ? 'badge-active' : 'badge-overdue'}">${hasAnyDisp ? 'Disponible' : 'Agotado'}</span>
          </div>
          <h3 class="catalogo-card-title">${p.titulo}</h3>
          <div class="catalogo-card-meta">
            <span>${p.genero}</span>
            ${p.anio ? `<span>${p.anio}</span>` : ''}
            ${p.duracion ? `<span>${p.duracion} min</span>` : ''}
          </div>
          ${elencoHtml}
          ${p.sinopsis ? `<p class="catalogo-card-sinopsis">${p.sinopsis}</p>` : ''}
          <div class="catalogo-card-formatos">
            ${!esMusica ? `
              <div class="formato-chip ${hasBluDisp ? 'formato-disp' : 'formato-agot'}">
                <span class="material-symbols-outlined formato-chip-icon">video_library</span>
                <span class="formato-chip-tipo">Blu-ray</span>
                <span class="formato-chip-precio">${formatosBlu.length ? Components.formatCurrency(bluCost) : '—'}<span class="text-muted" style="font-size:11px;">/día</span></span>
                <span class="badge ${formatosBlu.length ? (hasBluDisp ? 'badge-active' : 'badge-overdue') : 'badge-inactive'}">${formatosBlu.length ? (hasBluDisp ? 'Disponible' : 'Agotado') : 'No disponible'}</span>
              </div>
              <div class="formato-chip ${hasDvdDisp ? 'formato-disp' : 'formato-agot'}">
                <span class="material-symbols-outlined formato-chip-icon">disc_full</span>
                <span class="formato-chip-tipo">DVD</span>
                <span class="formato-chip-precio">${formatosDvd.length ? Components.formatCurrency(dvdCost) : '—'}<span class="text-muted" style="font-size:11px;">/día</span></span>
                <span class="badge ${formatosDvd.length ? (hasDvdDisp ? 'badge-active' : 'badge-overdue') : 'badge-inactive'}">${formatosDvd.length ? (hasDvdDisp ? 'Disponible' : 'Agotado') : 'No disponible'}</span>
              </div>
            ` : `
              <div class="formato-chip ${formatosCd.some(f => f.disponible) ? 'formato-disp' : 'formato-agot'}">
                <span class="material-symbols-outlined formato-chip-icon">music_note</span>
                <span class="formato-chip-tipo">CD</span>
                <span class="formato-chip-precio">${Components.formatCurrency(cdCost)}<span class="text-muted" style="font-size:11px;">/día</span></span>
                <span class="badge ${formatosCd.some(f => f.disponible) ? 'badge-active' : 'badge-overdue'}">${formatosCd.some(f => f.disponible) ? 'Disponible' : 'Agotado'}</span>
              </div>
            `}
          </div>
          ${hasAnyDisp ? `
            <button class="btn btn-primary w-full" style="margin-top:12px;" onclick="window.Catalogo.showRentar(${p.id}, '${p.titulo.replace(/'/g, "\\'")}')">
              <span class="material-symbols-outlined">add_shopping_cart</span> Rentar
            </button>
          ` : `
            <div class="catalogo-card-agotado-msg" style="margin-top:12px; text-align:center; color:var(--error); font-size:13px;">
              <span class="material-symbols-outlined" style="font-size:16px; vertical-align:middle;">block</span> No disponible actualmente
            </div>
          `}
        </div>
      `;
    }
    html += `</div>`;

    container.innerHTML = html;
  };

  window.Catalogo = {
    _formatos: {},
    _formatosById: {},
    _currentPeliculaId: null,
    _selectedArticuloId: null,

    showRentar(pelicula_id, titulo) {
      const allFormatos = this._formatos[pelicula_id] || [];
      this._currentPeliculaId = pelicula_id;
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const esMusica = allFormatos[0]?.tipo_id === 3;

      if (esMusica) {
        const defaultFmt = allFormatos.find(f => f.disponible) || allFormatos[0];
        const body = `
          <p style="margin-bottom:16px;">Rentar: <b>${titulo}</b></p>
          <input type="hidden" id="cat-formato" value="${defaultFmt.id}">
          <div class="form-group">
            <label>Fecha de Renta</label>
            <input type="date" id="cat-fecha-desde" class="form-control" value="${today}" onchange="window.Catalogo.calcTotal()">
          </div>
          <div class="form-group">
            <label>Fecha de Devolución Prevista</label>
            <input type="date" id="cat-fecha-hasta" class="form-control" value="${tomorrow}" onchange="window.Catalogo.calcTotal()">
          </div>
          <div style="background: var(--surface-container); padding: 16px; border-radius: 8px; margin: 16px 0;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span>Días:</span><span id="cat-dias" class="font-bold">1</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span>Costo por día:</span><span id="cat-costo-dia" class="font-bold">${Components.formatCurrency(defaultFmt.costo_dia)}</span>
            </div>
            <div style="border-top:1px solid var(--outline-variant); margin:8px 0;"></div>
            <div style="display:flex; justify-content:space-between; font-size:18px; color:var(--primary);">
              <b>Total:</b><b id="cat-total">${Components.formatCurrency(defaultFmt.costo_dia)}</b>
            </div>
          </div>
          <hr style="margin:12px 0; border:none; border-top:1px solid var(--outline-variant);">
          <h5 style="margin-bottom:8px; color:var(--primary);">Método de Pago (Tarjeta Crédito/Débito)</h5>
          ${Validators.renderCardFields('cat')}
          <div style="margin-top:12px; padding:12px; background:var(--primary-container); border-radius:8px; font-size:13px; color:var(--primary);">
            <span class="material-symbols-outlined" style="font-size:16px; vertical-align:middle;">info</span>
            Puede pasar a buscar el artículo rentado cuando quiera dentro del plazo seleccionado.
          </div>
        `;
        Components.showModal('Confirmar Renta', body, `
          <button class="btn btn-outline" onclick="Components.closeModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="window.Catalogo.confirmarRenta()">
            <span class="material-symbols-outlined">check_circle</span> Confirmar Renta
          </button>
        `);
        return;
      }

      // Movie: show BOTH formatos always (Blu-ray + DVD)
      const bluFmt = allFormatos.filter(f => f.tipo_id === 2);
      const dvdFmt = allFormatos.filter(f => f.tipo_id === 1);
      const hasBlu = bluFmt.length > 0;
      const hasDvd = dvdFmt.length > 0;
      const hasBluAvail = bluFmt.some(f => f.disponible);
      const hasDvdAvail = dvdFmt.some(f => f.disponible);
      const defaultFmt = hasBluAvail ? 'blu' : (hasDvdAvail ? 'dvd' : 'blu');
      const bluCost = bluFmt.length ? Math.min(...bluFmt.map(f => f.costo_dia)) : 150;
      const dvdCost = dvdFmt.length ? Math.min(...dvdFmt.map(f => f.costo_dia)) : 100;

      const body = `
        <p style="margin-bottom:16px;">Rentar: <b>${titulo}</b></p>
        <div class="form-group">
          <label>Formato</label>
          <div style="display:flex; gap:12px; margin-top:4px;">
            ${hasBlu ? `
              <label style="flex:1; cursor:pointer; padding:12px; border:2px solid ${defaultFmt === 'blu' ? 'var(--primary)' : 'var(--outline-variant)'}; border-radius:8px; text-align:center; ${defaultFmt === 'blu' ? 'background:var(--primary-container);' : ''}" id="fmt-blu" onclick="window.Catalogo.selectFormato('blu', ${pelicula_id})">
                <div style="font-size:14px; font-weight:600;">Blu-ray</div>
                <div style="font-size:12px;">${Components.formatCurrency(bluCost)}/día</div>
              </label>
            ` : ''}
            ${hasDvd ? `
              <label style="flex:1; cursor:pointer; padding:12px; border:2px solid ${defaultFmt === 'dvd' ? 'var(--primary)' : 'var(--outline-variant)'}; border-radius:8px; text-align:center; ${defaultFmt === 'dvd' ? 'background:var(--primary-container);' : ''}" id="fmt-dvd" onclick="window.Catalogo.selectFormato('dvd', ${pelicula_id})">
                <div style="font-size:14px; font-weight:600;">DVD</div>
                <div style="font-size:12px;">${Components.formatCurrency(dvdCost)}/día</div>
              </label>
            ` : ''}
          </div>
          <input type="hidden" id="cat-formato" value="${defaultFmt}">
        </div>
        <div class="form-group" style="margin-top:12px;">
          <label>Idioma</label>
          <select id="cat-idioma" class="form-control" onchange="window.Catalogo.onSelectChange()">
            ${this._getIdiomaOptions(pelicula_id, defaultFmt)}
          </select>
        </div>
        <div id="cat-action" style="margin-top:16px;"></div>
      `;
      Components.showModal('Rentar - ' + titulo, body, `
        <button class="btn btn-outline" onclick="Components.closeModal()">Cancelar</button>
      `);
      this.onSelectChange();
    },

    _getIdiomaOptions(pelicula_id, formato) {
      const tipoId = formato === 'blu' ? 2 : 1;
      let idiomas = [...new Set(
        (this._formatos[pelicula_id] || [])
          .filter(f => f.tipo_id === tipoId)
          .map(f => f.idioma)
      )];
      if (idiomas.length === 0) {
        idiomas = formato === 'blu' ? ['Inglés', 'Francés', 'Español'] : ['Español', 'Portugués'];
      }
      return idiomas.map(idi => `<option value="${idi}">${idi}</option>`).join('');
    },

    selectFormato(tipo, pelicula_id) {
      ['blu', 'dvd'].forEach(t => {
        const el = document.getElementById(`fmt-${t}`);
        if (el) {
          el.style.border = t === tipo ? '2px solid var(--primary)' : '2px solid var(--outline-variant)';
          el.style.background = t === tipo ? 'var(--primary-container)' : 'transparent';
        }
      });
      document.getElementById('cat-formato').value = tipo;
      const idiomaSel = document.getElementById('cat-idioma');
      if (idiomaSel) {
        idiomaSel.innerHTML = this._getIdiomaOptions(pelicula_id, tipo);
      }
      this.onSelectChange();
    },

    onSelectChange() {
      const formato = document.getElementById('cat-formato')?.value;
      const idioma = document.getElementById('cat-idioma')?.value;
      if (!formato || !idioma) return;
      this._renderAction(formato, idioma);
    },

    _renderAction(formato, idioma) {
      const pelicula_id = this._currentPeliculaId;
      const fmt = (this._formatos[pelicula_id] || [])
        .find(f => f.tipo_id === (formato === 'blu' ? 2 : 1) && f.idioma === idioma);
      const actionDiv = document.getElementById('cat-action');
      if (!actionDiv) return;

      if (fmt && fmt.disponible) {
        this._selectedArticuloId = fmt.id;
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        actionDiv.innerHTML = `
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:12px; color:var(--success); font-size:14px;">
            <span class="material-symbols-outlined" style="font-size:20px;">check_circle</span>
            <b>Disponible en ${idioma}</b>
          </div>
          <div class="form-group">
            <label>Fecha de Renta</label>
            <input type="date" id="cat-fecha-desde" class="form-control" value="${today}" onchange="window.Catalogo.calcTotal()">
          </div>
          <div class="form-group">
            <label>Fecha de Devolución Prevista</label>
            <input type="date" id="cat-fecha-hasta" class="form-control" value="${tomorrow}" onchange="window.Catalogo.calcTotal()">
          </div>
          <div style="background: var(--surface-container); padding: 16px; border-radius: 8px; margin: 16px 0;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span>Días:</span><span id="cat-dias" class="font-bold">1</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span>Costo por día:</span><span id="cat-costo-dia" class="font-bold">${Components.formatCurrency(fmt.costo_dia)}</span>
            </div>
            <div style="border-top:1px solid var(--outline-variant); margin:8px 0;"></div>
            <div style="display:flex; justify-content:space-between; font-size:18px; color:var(--primary);">
              <b>Total:</b><b id="cat-total">${Components.formatCurrency(fmt.costo_dia)}</b>
            </div>
          </div>
          <hr style="margin:12px 0; border:none; border-top:1px solid var(--outline-variant);">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; color:var(--primary);">
            <span class="material-symbols-outlined">credit_card</span>
            <span style="font-weight:600; font-size:15px;">Pago con Tarjeta de Crédito / Débito</span>
          </div>
          <div style="font-size:12px; color:var(--outline); margin-bottom:12px;">
            Las rentas en línea requieren pago con tarjeta.
          </div>
          ${Validators.renderCardFields('cat')}
          <div style="margin-top:12px; padding:12px; background:var(--primary-container); border-radius:8px; font-size:13px; color:var(--primary);">
            <span class="material-symbols-outlined" style="font-size:16px; vertical-align:middle;">info</span>
            Puede pasar a buscar el artículo rentado cuando quiera dentro del plazo seleccionado.
          </div>
          <button class="btn btn-primary w-full" style="margin-top:12px;" onclick="window.Catalogo.confirmarRenta()">
            <span class="material-symbols-outlined">check_circle</span> Confirmar Renta
          </button>
        `;
        // Apply input masks (card number groups of 4, MM/AA expiry, 3-digit CVV)
        if (window.Validators) Validators.attachCedulaMasks(actionDiv);
      } else if (fmt) {
        this._selectedArticuloId = fmt.id;
        actionDiv.innerHTML = `
          <div style="text-align:center; padding:16px 0;">
            <span class="material-symbols-outlined" style="font-size:36px; color:var(--warning);">event_busy</span>
            <p style="margin:12px 0 4px; font-size:15px;"><b>No disponible en ${idioma}</b></p>
            <p class="text-muted" style="margin-bottom:16px;">Actualmente no hay stock de este formato. Puedes reservarlo y te notificaremos cuando esté disponible.</p>
            <button class="btn btn-primary w-full" onclick="window.Catalogo.confirmarReserva()">
              <span class="material-symbols-outlined">event_available</span> Reservar
            </button>
          </div>
        `;
      } else {
        actionDiv.innerHTML = `
          <div style="text-align:center; padding:16px 0; color:var(--error);">
            <span class="material-symbols-outlined" style="font-size:36px;">error_outline</span>
            <p style="margin-top:8px;">Combinación no encontrada</p>
          </div>
        `;
      }
    },

    calcTotal() {
      const desde = document.getElementById('cat-fecha-desde')?.value;
      const hasta = document.getElementById('cat-fecha-hasta')?.value;
      if (!desde || !hasta) return;
      const start = new Date(desde);
      const end = new Date(hasta);
      let dias = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (dias < 1) dias = 1;
      const artId = this._selectedArticuloId;
      const f = artId && this._formatosById[artId];
      const costo_dia = f ? f.costo_dia : 0;
      const total = dias * costo_dia;
      document.getElementById('cat-dias').textContent = dias;
      document.getElementById('cat-costo-dia').textContent = Components.formatCurrency(costo_dia);
      document.getElementById('cat-total').textContent = Components.formatCurrency(total);
    },

    async confirmarRenta() {
      const articulo_id = this._selectedArticuloId;
      if (!articulo_id) { Components.showToast('Error al seleccionar artículo', 'error'); return; }
      const fecha_renta = document.getElementById('cat-fecha-desde').value;
      const fecha_devolucion_prevista = document.getElementById('cat-fecha-hasta').value;
      if (!fecha_renta || !fecha_devolucion_prevista) {
        Components.showToast('Selecciona las fechas de renta y devolución', 'error');
        return;
      }
      if (new Date(fecha_devolucion_prevista) < new Date(fecha_renta)) {
        Components.showToast('La fecha de devolución no puede ser anterior a la fecha de renta', 'error');
        return;
      }

      // Card payment is mandatory for online/remote rentals
      const cardName = document.getElementById('cat-card-name')?.value?.trim();
      const cardNumber = document.getElementById('cat-card-number')?.value?.trim();
      const cardExpiry = document.getElementById('cat-card-expiry')?.value?.trim();
      const cardCvv = document.getElementById('cat-card-cvv')?.value?.trim();

      if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
        Components.showToast('Complete todos los datos de la tarjeta (titular, número, expiración y CVV)', 'error');
        return;
      }
      if (!Validators.isValidCardNumber(cardNumber)) {
        Components.showToast('Número de tarjeta no válido (verifique los 16 dígitos y el dígito verificador)', 'error');
        return;
      }
      if (!Validators.isValidExpiry(cardExpiry)) {
        Components.showToast('Fecha de expiración inválida o vencida. Formato: MM/AA', 'error');
        return;
      }
      if (cardCvv.length !== 3) {
        Components.showToast('El CVV debe tener exactamente 3 dígitos numéricos', 'error');
        return;
      }

      try {
        await API.request('POST', '/api/rentas/cliente', { articulo_id, fecha_renta, fecha_devolucion_prevista, metodo_pago: 'tarjeta' });
        Components.closeModal();
        Components.showToast('Pago aprobado. Puede pasar a buscar el artículo dentro del plazo seleccionado.');
        loadCatalogo();
      } catch (e) {
        Components.showToast(e.message, 'error');
      }
    },

    async confirmarReserva() {
      const articulo_id = this._selectedArticuloId;
      if (!articulo_id) { Components.showToast('Error al seleccionar artículo', 'error'); return; }
      try {
        const resp = await API.request('POST', '/api/reservas', { articulo_id });
        Components.closeModal();
        Components.showToast(`Reserva confirmada! Estará disponible a partir del ${Components.formatDate(resp.fecha_estimada_disponible)}.`);
        loadCatalogo();
      } catch (e) {
        Components.showToast(e.message, 'error');
      }
    }
  };

  container.innerHTML = Components.loading();
  loadCatalogo();
}

App.registerPage('catalogo', (container) => catalogoPage(container, 'peliculas'));
App.registerPage('musica', (container) => catalogoPage(container, 'musica'));
