/* ═══════════════════════════════════════════════════════════════
   SISTEMA DE ENFERMERÍA — app.js
   Lógica principal, eventos, timers y gestión de turnos
═══════════════════════════════════════════════════════════════ */

const APP = {
  currentView:    'camas',
  currentFilter:  'todos',
  historyFilter:  '',
  timerInterval:  null,
  clockInterval:  null,

  /* ─── INIT ─── */
  init() {
    initData();
    this.loadConfig();
    this.startClock();
    this.render();
    this.bindGlobalEvents();
    this.startTimers();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  },

  /* ─── RESPONSIVE: sidebar mobile toggle ─── */
  toggleSidebar() {
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.getElementById('sidebar-overlay');
    const isOpen   = sidebar.classList.contains('open');
    if (isOpen) { this.closeSidebar(); }
    else {
      sidebar.classList.add('open');
      overlay.classList.add('visible');
    }
  },
  closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('visible');
  },
  handleResize() {
    if (window.innerWidth > 1024) { this.closeSidebar(); }
  },

  /* ─── CONFIG LOAD ─── */
  loadConfig() {
    const cfg = getConfig();
    document.getElementById('service-name-display').textContent = cfg.serviceName;
    document.getElementById('professional-name').textContent = cfg.professional;
    this.updateShiftBtn(cfg.currentShift);
  },

  updateShiftBtn(shiftType) {
    const btn = document.getElementById('shift-btn');
    const icon = document.getElementById('shift-icon');
    const label = document.getElementById('shift-label');
    if (shiftType === 'DIA') {
      icon.textContent = '☀';
      label.textContent = 'Turno Día  07:00–19:00';
      btn.classList.remove('night');
    } else {
      icon.textContent = '🌙';
      label.textContent = 'Turno Noche  19:00–07:00';
      btn.classList.add('night');
    }
  },

  /* ─── CLOCK ─── */
  startClock() {
    const tick = () => {
      const now = new Date();
      const clock = document.getElementById('clock');
      const dateEl = document.getElementById('date-display');
      if (clock) clock.textContent = now.toLocaleTimeString('es-CL');
      if (dateEl) dateEl.textContent = now.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
    };
    tick();
    this.clockInterval = setInterval(tick, 1000);
  },

  /* ─── TIMERS (bed cards) ─── */
  startTimers() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      document.querySelectorAll('.timer-val').forEach(el => {
        const iso = el.dataset.ingreso;
        if (iso) el.textContent = calcElapsed(iso) || '--';
      });
    }, 60000);
  },

  /* ─── RENDER ─── */
  render() {
    this.renderSidebar();
    this.renderMain();
  },

  renderSidebar() {
    document.getElementById('sidebar').innerHTML = renderSidebar(this.currentView, this.currentFilter);
  },

  renderMain() {
    const main = document.getElementById('main-content');
    switch (this.currentView) {
      case 'camas':      main.innerHTML = renderBedsView(this.currentFilter); break;
      case 'pendientes': main.innerHTML = renderPendientesView(); break;
      case 'evoluciones':main.innerHTML = renderEvolucionesView(); break;
      case 'historico':  main.innerHTML = renderHistoricoView(this.historyFilter); break;
    }
  },

  /* ─── SET VIEW ─── */
  setView(view) {
    this.currentView = view;
    this.currentFilter = 'todos';
    this.closeSidebar();
    this.render();
  },

  setFilter(filter) {
    this.currentFilter = filter;
    this.renderMain();
    this.renderSidebar();
  },

  setHistoryFilter(cama) {
    this.historyFilter = cama;
    this.renderMain();
  },

  /* ─── SEARCH ─── */
  handleSearch(query) {
    if (!query.trim()) { this.renderMain(); return; }
    const q = query.toLowerCase();
    const patients = getPatients().filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.rut.includes(q) ||
      p.cama.includes(q) ||
      (p.dx || '').toLowerCase().includes(q)
    );
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="view-header">
        <div><div class="view-title">Búsqueda: "${query}"</div>
        <div class="view-subtitle">${patients.length} resultado${patients.length!==1?'s':''}</div></div>
      </div>
      <div class="beds-grid">${patients.map(renderBedCard).join('') || '<div class="empty-state"><p>Sin resultados</p></div>'}</div>`;
  },

  /* ═══════════════════════════════════════════════ PATIENT MODAL */
  openPatient(cama) {
    let p = getPatientByCama(cama);
    if (!p) return;
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-content').innerHTML = renderPatientModal(p);
    overlay.classList.remove('hidden');
    this.bindModalTabs();
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  },

  bindModalTabs() {
    document.querySelectorAll('.modal-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === target));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === target));
      });
    });
  },

  /* ─── SAVE PATIENT ─── */
  savePatient(cama) {
    const p = getPatientByCama(cama) || { cama, evoluciones:[], examenes:[], procedimientos:[], pendientes:[] };
    document.querySelectorAll(`[data-field][data-cama="${cama}"]`).forEach(el => {
      const field = el.dataset.field;
      if (field === 'cama_display') return;
      if (el.tagName === 'SELECT') p[field] = el.value;
      else if (el.type === 'number') p[field] = el.value ? Number(el.value) : null;
      else p[field] = el.value;
    });
    updatePatient(p);
    this.render();
    this.openPatient(cama);
    showToast('Paciente guardado correctamente');
  },

  /* ─── DISCHARGE ─── */
  dischargePatient(cama) {
    if (!confirm(`¿Confirmar alta del paciente de la cama ${cama}?`)) return;
    const p = getPatientByCama(cama);
    if (!p) return;
    p.nombre = ''; p.rut = ''; p.edad = null; p.fechaNac = ''; p.dx = '';
    p.servicio = ''; p.medico = ''; p.prevision = ''; p.estado = 'libre';
    p.ingreso_datetime = null; p.motivo = ''; p.antecedentes = ''; p.alergias = '';
    p.medicacion_previa = ''; p.evoluciones = []; p.examenes = []; p.procedimientos = []; p.pendientes = [];
    updatePatient(p);
    this.closeModal();
    this.render();
    showToast(`Cama ${cama} liberada`);
  },

  /* ─── EVOLUCIONES ─── */
  showEvolForm(cama) {
    const form = document.getElementById(`evol-form-${cama}`);
    if (form) form.style.display = 'block';
  },
  cancelEvolForm(cama) {
    const form = document.getElementById(`evol-form-${cama}`);
    if (form) form.style.display = 'none';
  },
  saveEvol(cama) {
    const textarea = document.getElementById(`evol-text-${cama}`);
    const text = textarea ? textarea.value.trim() : '';
    if (!text) { showToast('Escriba el texto de la evolución', 'warn'); return; }
    const cfg = getConfig();
    const now = new Date();
    const evol = {
      id: uid(), fechaRaw: now.toISOString(), turno: cfg.currentShift,
      fecha: formatDateTime(now), formato: 'narrativo',
      texto: text, autor: cfg.professional
    };
    const p = getPatientByCama(cama);
    if (!p) return;
    p.evoluciones = [evol, ...(p.evoluciones || [])];
    updatePatient(p);
    this.openPatient(cama);
    // re-activate evoluciones tab
    setTimeout(() => {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'evoluciones'));
      document.querySelectorAll('.tab-panel').forEach(pp => pp.classList.toggle('active', pp.dataset.panel === 'evoluciones'));
    }, 50);
    showToast('Evolución guardada');
  },
  delEvol(cama, id) {
    if (!confirm('¿Eliminar esta evolución? Esta acción no se puede deshacer.')) return;
    const p = getPatientByCama(cama);
    if (!p) return;
    p.evoluciones = (p.evoluciones || []).filter(e => e.id !== id);
    updatePatient(p);
    this.openPatient(cama);
    setTimeout(() => {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'evoluciones'));
      document.querySelectorAll('.tab-panel').forEach(pp => pp.classList.toggle('active', pp.dataset.panel === 'evoluciones'));
    }, 50);
    showToast('Evolución eliminada', 'warn');
  },

  /* ─── EXÁMENES ─── */
  addExam(cama) {
    const tipo = prompt('Tipo de examen:'); if (!tipo) return;
    const resultado = prompt('Resultado:') || 'Pendiente';
    const estado = prompt('Estado (pendiente / resultado / critico):', 'resultado') || 'resultado';
    const p = getPatientByCama(cama); if (!p) return;
    p.examenes = [{ id: uid(), tipo, resultado, fecha: formatDate(new Date()), estado }, ...(p.examenes || [])];
    updatePatient(p);
    this.openPatient(cama);
    setTimeout(() => {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'examenes'));
      document.querySelectorAll('.tab-panel').forEach(pp => pp.classList.toggle('active', pp.dataset.panel === 'examenes'));
    }, 50);
    showToast('Examen agregado');
  },
  delExam(cama, id) {
    const p = getPatientByCama(cama); if (!p) return;
    p.examenes = (p.examenes || []).filter(e => e.id !== id);
    updatePatient(p);
    this.openPatient(cama);
    setTimeout(() => {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'examenes'));
      document.querySelectorAll('.tab-panel').forEach(pp => pp.classList.toggle('active', pp.dataset.panel === 'examenes'));
    }, 50);
  },

  /* ─── PROCEDIMIENTOS ─── */
  addProc(cama) {
    const nombre = prompt('Nombre del procedimiento:'); if (!nombre) return;
    const indicadoPor = prompt('Indicado por (médico):', 'Médico tratante') || '';
    const p = getPatientByCama(cama); if (!p) return;
    p.procedimientos = [...(p.procedimientos || []), { id: uid(), nombre, indicadoPor, fecha: formatDate(new Date()), done: false, horaRealizado: '' }];
    updatePatient(p);
    this.openPatient(cama);
    setTimeout(() => {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'procedimientos'));
      document.querySelectorAll('.tab-panel').forEach(pp => pp.classList.toggle('active', pp.dataset.panel === 'procedimientos'));
    }, 50);
    showToast('Procedimiento agregado');
  },
  toggleProc(cama, id) {
    const p = getPatientByCama(cama); if (!p) return;
    const proc = (p.procedimientos || []).find(x => x.id === id);
    if (!proc) return;
    proc.done = !proc.done;
    proc.horaRealizado = proc.done ? formatTime(new Date()) : '';
    updatePatient(p);
    // Si estamos en vista global de pendientes, re-renderizar main
    if (this.currentView === 'pendientes') { this.renderMain(); return; }
    // Si modal abierto, actualizar
    this.openPatient(cama);
    setTimeout(() => {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'procedimientos'));
      document.querySelectorAll('.tab-panel').forEach(pp => pp.classList.toggle('active', pp.dataset.panel === 'procedimientos'));
    }, 50);
  },
  delProc(cama, id) {
    const p = getPatientByCama(cama); if (!p) return;
    p.procedimientos = (p.procedimientos || []).filter(x => x.id !== id);
    updatePatient(p);
    this.openPatient(cama);
    setTimeout(() => {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'procedimientos'));
      document.querySelectorAll('.tab-panel').forEach(pp => pp.classList.toggle('active', pp.dataset.panel === 'procedimientos'));
    }, 50);
  },

  /* ─── PENDIENTES ─── */
  addPend(cama) {
    const texto = prompt('Descripción del pendiente:'); if (!texto) return;
    const p = getPatientByCama(cama); if (!p) return;
    p.pendientes = [...(p.pendientes || []), { id: uid(), texto }];
    updatePatient(p);
    this.openPatient(cama);
    setTimeout(() => {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'pendientes'));
      document.querySelectorAll('.tab-panel').forEach(pp => pp.classList.toggle('active', pp.dataset.panel === 'pendientes'));
    }, 50);
    showToast('Pendiente agregado');
  },
  delPend(cama, id) {
    const p = getPatientByCama(cama); if (!p) return;
    p.pendientes = (p.pendientes || []).filter(x => x.id !== id);
    updatePatient(p);
    this.openPatient(cama);
    setTimeout(() => {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'pendientes'));
      document.querySelectorAll('.tab-panel').forEach(pp => pp.classList.toggle('active', pp.dataset.panel === 'pendientes'));
    }, 50);
  },

  /* ─── SHIFT TOGGLE ─── */
  toggleShift() {
    renderShiftCloseDialog((obs, inc) => {
      const cfg = getConfig();
      const snapshot = buildShiftSnapshot(cfg.professional, cfg.currentShift, cfg.shiftStart);
      snapshot.observaciones_generales = obs;
      snapshot.incidentes = inc;
      addHistoryEntry(snapshot);
      cfg.currentShift = cfg.currentShift === 'DIA' ? 'NOCHE' : 'DIA';
      cfg.shiftStart = formatTime(new Date());
      saveConfig(cfg);
      this.updateShiftBtn(cfg.currentShift);
      this.render();
      showToast(`Turno cerrado. Iniciando ${cfg.currentShift === 'DIA' ? 'Turno Día' : 'Turno Noche'}`);
    });
  },

  closeShift() { this.toggleShift(); },

  /* ─── HISTORIAL ─── */
  toggleHistoryCard(idx) {
    const body = document.getElementById(`history-body-${idx}`);
    const header = body ? body.previousElementSibling : null;
    if (!body) return;
    const isOpen = body.classList.contains('open');
    body.classList.toggle('open', !isOpen);
    if (header) header.classList.toggle('expanded', !isOpen);
  },

  viewLastShift() {
    this.currentView = 'historico';
    this.render();
    // expand first card
    setTimeout(() => {
      const firstBody = document.getElementById('history-body-0');
      const firstHeader = firstBody ? firstBody.previousElementSibling : null;
      if (firstBody) { firstBody.classList.add('open'); firstHeader && firstHeader.classList.add('expanded'); }
    }, 100);
  },

  /* ─── EXPORT / IMPORT ─── */
  exportData() {
    const data = {
      patients: getPatients(),
      history:  getHistory(),
      config:   getConfig(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `enfermeria_backup_${formatDate(new Date()).replace(/\//g,'-')}.json`;
    a.click();
    showToast('Datos exportados correctamente');
  },

  importData() {
    document.getElementById('import-file').click();
  },

  handleImport(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.patients) savePatients(data.patients);
        if (data.history)  saveHistory(data.history);
        if (data.config)   saveConfig({ ...getConfig(), ...data.config });
        this.loadConfig();
        this.render();
        showToast('Datos importados correctamente');
      } catch {
        showToast('Error al importar: archivo inválido', 'error');
      }
    };
    reader.readAsText(file);
  },

  /* ─── PRINT ─── */
  printShift() {
    const tpl = document.getElementById('print-template');
    tpl.innerHTML = renderPrintTemplate();
    tpl.style.display = 'block';
    window.print();
    tpl.style.display = 'none';
    tpl.innerHTML = '';
  },

  /* ─── EDIT SERVICE NAME ─── */
  editServiceName() {
    const name = prompt('Nombre del servicio:', getConfig().serviceName);
    if (!name) return;
    const cfg = getConfig(); cfg.serviceName = name; saveConfig(cfg);
    document.getElementById('service-name-display').textContent = name;
    this.renderMain();
  },

  /* ─── GLOBAL EVENT DELEGATION ─── */
  bindGlobalEvents() {
    // Delegation from document
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const action = el.dataset.action;
      const cama   = el.dataset.cama;
      const id     = el.dataset.id;

      switch (action) {
        case 'set-view':            this.setView(el.dataset.view); break;
        case 'set-filter':          this.setFilter(el.dataset.filter); break;
        case 'open-patient':        this.openPatient(cama); break;
        case 'close-modal':
        case 'close-modal-backdrop':this.closeModal(); break;
        case 'close-dialog':        document.getElementById('dialog-overlay').classList.add('hidden'); break;
        case 'toggle-shift':        this.toggleShift(); break;
        case 'close-shift':         this.closeShift(); break;
        case 'save-patient':        this.savePatient(cama); break;
        case 'discharge-patient':   this.dischargePatient(cama); break;
        case 'show-evol-form':      this.showEvolForm(cama); break;
        case 'cancel-evol':         this.cancelEvolForm(cama); break;
        case 'save-evol':           this.saveEvol(cama); break;
        case 'del-evol':            this.delEvol(cama, id); break;
        case 'add-exam':            this.addExam(cama); break;
        case 'del-exam':            this.delExam(cama, id); break;
        case 'add-proc':            this.addProc(cama); break;
        case 'toggle-proc':         this.toggleProc(cama, id); break;
        case 'del-proc':            this.delProc(cama, id); break;
        case 'add-pend':            this.addPend(cama); break;
        case 'del-pend':            this.delPend(cama, id); break;
        case 'export-data':         this.exportData(); break;
        case 'import-data':         this.importData(); break;
        case 'print-shift':         this.printShift(); break;
        case 'edit-service-name':   this.editServiceName(); break;
        case 'view-last-shift':     this.viewLastShift(); break;
        case 'toggle-history':      this.toggleHistoryCard(el.dataset.idx); break;
      }
    });

    // Format toggle buttons (SOAP/narrativo)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.format-btn');
      if (!btn) return;
      btn.closest('.format-toggle').querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const fmt = btn.dataset.format;
      const form = btn.closest('.evol-form');
      const ta = form ? form.querySelector('textarea') : null;
      if (ta && fmt === 'SOAP') {
        ta.value = 'S: (Subjetivo — qué refiere el paciente)\n\nO: (Objetivo — signos vitales, hallazgos al examen)\n\nA: (Análisis — evaluación de la situación)\n\nP: (Plan — intervenciones y próximos pasos)';
        ta.focus();
      } else if (ta && fmt === 'narrativo') {
        if (ta.value.startsWith('S:')) ta.value = '';
      }
    });

    // Professional name edit
    document.getElementById('professional-name').addEventListener('blur', (e) => {
      const cfg = getConfig();
      cfg.professional = e.target.textContent.trim() || cfg.professional;
      saveConfig(cfg);
    });

    // Search
    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => this.handleSearch(e.target.value), 300);
    });

    // Import file
    document.getElementById('import-file').addEventListener('change', (e) => {
      this.handleImport(e.target.files[0]);
      e.target.value = '';
    });

    // ESC closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  },
};

/* ─── BOOT ─── */
document.addEventListener('DOMContentLoaded', () => APP.init());
