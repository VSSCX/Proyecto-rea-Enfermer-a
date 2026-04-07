/* ═══════════════════════════════════════════════════════════════
   SISTEMA DE ENFERMERÍA — components.js
   Funciones que generan HTML de todos los componentes
═══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════ SIDEBAR */
function renderSidebar(activeView, filter) {
  const patients = getPatients().filter(p => p.estado !== 'libre');
  const counts = {
    ok:     patients.filter(p => p.estado === 'ok').length,
    alerta: patients.filter(p => p.estado === 'alerta').length,
    obs:    patients.filter(p => p.estado === 'obs').length,
    libre:  getPatients().filter(p => p.estado === 'libre').length,
    total:  patients.length,
  };
  const hasPending = patients.filter(p =>
    (p.procedimientos || []).some(x => !x.done) || (p.pendientes || []).length > 0
  ).length;

  const views = [
    { id: 'camas',      icon: '⊞', label: 'Vista de camas' },
    { id: 'pendientes', icon: '☐', label: 'Pendientes del turno' },
    { id: 'evoluciones',icon: '✎', label: 'Evoluciones del turno' },
    { id: 'historico',  icon: '⏱', label: 'Vista histórica' },
  ];
  const filters = [
    { id: 'todos',      label: 'Todos' },
    { id: 'pendientes', label: 'Con pendientes' },
    { id: 'alertas',    label: 'Solo alertas' },
    { id: 'criticos',   label: 'Con exámenes críticos' },
  ];

  return `
    <div class="sidebar-section">Vistas</div>
    ${views.map(v => `
      <div class="sidebar-item ${activeView === v.id ? 'active' : ''}" data-action="set-view" data-view="${v.id}">
        <span class="si-icon">${v.icon}</span>
        <span>${v.label}</span>
        ${v.id === 'pendientes' && hasPending ? `<span class="si-badge badge-amber">${hasPending}</span>` : ''}
      </div>`).join('')}

    <div class="sidebar-divider"></div>
    <div class="sidebar-section">Estado actual</div>
    <div class="sidebar-item">
      <span class="si-icon">●</span><span>Estables</span>
      <span class="si-badge badge-green">${counts.ok}</span>
    </div>
    <div class="sidebar-item">
      <span class="si-icon">${counts.alerta > 0 ? '<span class="pulse-dot"></span>' : '●'}</span>
      <span>Alerta</span>
      <span class="si-badge badge-red">${counts.alerta}</span>
    </div>
    <div class="sidebar-item">
      <span class="si-icon">●</span><span>Observación</span>
      <span class="si-badge badge-amber">${counts.obs}</span>
    </div>
    <div class="sidebar-item">
      <span class="si-icon">○</span><span>Camas libres</span>
      <span class="si-badge badge-gray">${counts.libre}</span>
    </div>

    <div class="sidebar-divider"></div>
    <div class="sidebar-section">Filtros</div>
    ${filters.map(f => `
      <div class="sidebar-item ${(filter || 'todos') === f.id ? 'active' : ''}" data-action="set-filter" data-filter="${f.id}">
        <span class="si-icon">◈</span><span>${f.label}</span>
      </div>`).join('')}

    <div class="sidebar-divider"></div>
    <div class="sidebar-item" data-action="close-shift">
      <span class="si-icon">⏏</span><span>Cerrar turno</span>
    </div>
  `;
}

/* ═══════════════════════════════════════════════ SHIFT BANNER */
function renderShiftBanner() {
  const hist = getHistory();
  if (!hist.length) return '';
  const last = hist[0];
  const pend = last.pacientes.reduce((acc, p) => acc + p.procedimientos_pendientes.length, 0);
  const alertas = last.pacientes.filter(p => p.estado_al_cierre === 'alerta').length;
  const icon = last.tipo_turno === 'DIA' ? '☀' : '🌙';
  return `
    <div class="shift-banner">
      <div class="shift-banner-icon">${icon}</div>
      <div class="shift-banner-info">
        <div class="shift-banner-title">Turno anterior: ${last.tipo_turno === 'DIA' ? 'Día' : 'Noche'} — ${last.fecha} — ${last.profesional}</div>
        <div class="shift-banner-sub">Cierre: ${last.hora_inicio} a ${last.hora_cierre}</div>
      </div>
      <div class="shift-banner-stats">
        <div class="shift-stat"><div class="shift-stat-val" style="color:var(--red)">${alertas}</div><div class="shift-stat-lbl">Alertas</div></div>
        <div class="shift-stat"><div class="shift-stat-val" style="color:var(--amber)">${pend}</div><div class="shift-stat-lbl">Pendientes</div></div>
        <div class="shift-stat"><div class="shift-stat-val" style="color:var(--green)">${last.pacientes.length}</div><div class="shift-stat-lbl">Pacientes</div></div>
      </div>
      <button class="shift-banner-btn" data-action="view-last-shift">Ver detalle</button>
    </div>`;
}

/* ══════════════════════════════════════════════════ BED CARD */
function renderBedCard(p) {
  const statusLabels = { ok: 'Estable', alerta: 'Alerta', obs: 'Observación', libre: 'Disponible' };
  if (p.estado === 'libre') {
    return `
      <div class="bed-card st-libre" data-action="open-patient" data-cama="${p.cama}">
        <div class="bed-header">
          <div class="bed-num">Cama ${p.cama}</div>
          <span class="bed-status-badge">Disponible</span>
        </div>
        <div class="bed-name" style="color:#94A3B8">Sin paciente</div>
        <div class="bed-divider"></div>
        <div style="font-size:12px;color:#CBD5E1;text-align:center;padding:4px 0">+ Asignar paciente</div>
      </div>`;
  }

  const elapsed   = calcElapsed(p.ingreso_datetime);
  const days      = p.ingreso_datetime ? Math.floor((Date.now() - new Date(p.ingreso_datetime)) / 86400000) : 0;
  const timerClass = days >= 14 ? 't-danger' : days >= 7 ? 't-warn' : '';
  const pendCount  = (p.procedimientos || []).filter(x => !x.done).length;
  const hasCritical = (p.examenes || []).some(e => e.estado === 'critico');
  const hasEvol    = (p.evoluciones || []).some(e => isToday(e.fechaRaw));
  const allergyAlert = p.alergias ? `<span class="allergy-badge" title="${p.alergias}">⚠ Alergia</span>` : '';

  return `
    <div class="bed-card st-${p.estado}" data-action="open-patient" data-cama="${p.cama}">
      <div class="bed-header">
        <div class="bed-num">Cama ${p.cama}</div>
        <span class="bed-status-badge ${p.estado === 'alerta' ? '' : ''}">${statusLabels[p.estado]}</span>
      </div>
      <div class="bed-name">${p.nombre}</div>
      <div class="bed-dx">${p.dx}</div>
      ${allergyAlert}
      <div class="bed-divider"></div>
      <div class="bed-timer ${timerClass}">
        <span class="t-icon">⏱</span>
        <span class="timer-val" data-ingreso="${p.ingreso_datetime}">${elapsed || '--'}</span>
      </div>
      <div class="bed-ingreso">Ingreso: ${p.ingreso_datetime ? formatDateTime(new Date(p.ingreso_datetime)) : '--'}</div>
      <div class="bed-footer">
        ${pendCount  ? `<span class="bed-tag pending">⚑ ${pendCount} pend.</span>` : ''}
        ${hasEvol    ? `<span class="bed-tag evol">✓ Evolución</span>` : ''}
        ${hasCritical? `<span class="bed-tag critical">⚠ Crítico</span>` : ''}
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════ BEDS VIEW */
function renderBedsView(filter) {
  let patients = getPatients();
  if (filter === 'pendientes') patients = patients.filter(p => p.estado !== 'libre' && ((p.procedimientos || []).some(x => !x.done) || (p.pendientes || []).length > 0));
  else if (filter === 'alertas') patients = patients.filter(p => p.estado === 'alerta');
  else if (filter === 'criticos') patients = patients.filter(p => (p.examenes || []).some(e => e.estado === 'critico'));
  const cfg = getConfig();
  return `
    <div class="view-header">
      <div>
        <div class="view-title">Vista de camas</div>
        <div class="view-subtitle">${cfg.serviceName} — ${patients.filter(p=>p.estado!=='libre').length} pacientes activos</div>
      </div>
    </div>
    ${renderShiftBanner()}
    <div class="beds-grid">
      ${patients.map(renderBedCard).join('')}
    </div>`;
}

/* ════════════════════════════════════ GLOBAL PENDIENTES VIEW */
function renderPendientesView() {
  const patients = getPatients().filter(p => p.estado !== 'libre' && (
    (p.procedimientos || []).some(x => !x.done) || (p.pendientes || []).length > 0
  ));
  if (!patients.length) return `
    <div class="view-header"><div class="view-title">Pendientes del turno</div></div>
    <div class="empty-state"><div class="es-icon">✓</div><p>Sin pendientes registrados</p></div>`;

  return `
    <div class="view-header">
      <div><div class="view-title">Pendientes del turno</div>
      <div class="view-subtitle">${patients.length} pacientes con pendientes</div></div>
    </div>
    ${patients.map(p => {
      const pend = (p.procedimientos || []).filter(x => !x.done);
      const otros = p.pendientes || [];
      const statusColors = { ok: 'var(--green)', alerta: 'var(--red)', obs: 'var(--amber)' };
      return `
        <div class="global-pend-card">
          <div class="global-pend-header">
            <span style="color:${statusColors[p.estado]};font-size:10px">●</span>
            <span class="global-pend-cama">Cama ${p.cama}</span>
            <span class="global-pend-name">${p.nombre}</span>
            <span class="global-pend-dx">${p.dx}</span>
          </div>
          ${pend.length ? `
            <div class="section-title" style="margin-top:0">Procedimientos pendientes</div>
            <div class="proc-list">
              ${pend.map(pr => `
                <div class="proc-item">
                  <input type="checkbox" class="proc-check" data-action="toggle-proc" data-cama="${p.cama}" data-id="${pr.id}">
                  <span class="proc-name">${pr.nombre}</span>
                  <span class="proc-meta">${pr.indicadoPor || ''}<br>${pr.fecha || ''}</span>
                </div>`).join('')}
            </div>` : ''}
          ${otros.length ? `
            <div class="section-title" style="margin-top:10px">Otros pendientes</div>
            <div class="pend-list">
              ${otros.map(pd => `
                <div class="pend-item">
                  <span class="pend-dot"></span>
                  <span class="pend-text">${pd.texto}</span>
                </div>`).join('')}
            </div>` : ''}
        </div>`;
    }).join('')}`;
}

/* ══════════════════════════════════ EVOLUCIONES TURNO VIEW */
function renderEvolucionesView() {
  const cfg = getConfig();
  const patients = getPatients().filter(p => p.estado !== 'libre' && (p.evoluciones || []).some(e => isToday(e.fechaRaw)));
  const sinEvol   = getPatients().filter(p => p.estado !== 'libre' && !(p.evoluciones || []).some(e => isToday(e.fechaRaw)));

  return `
    <div class="view-header">
      <div><div class="view-title">Evoluciones del turno</div>
      <div class="view-subtitle">Turno ${cfg.currentShift === 'DIA' ? 'Día' : 'Noche'} — ${cfg.professional}</div></div>
    </div>
    ${sinEvol.length ? `
      <div style="background:var(--amber-bg);border:1px solid var(--amber-border);border-radius:12px;padding:10px 16px;margin-bottom:14px;font-size:13px;color:var(--amber)">
        ⚠ Sin evolución hoy: ${sinEvol.map(p => `Cama ${p.cama} (${p.nombre.split(' ')[0]})`).join(' · ')}
      </div>` : ''}
    ${patients.length ? patients.map(p => {
      const hoyEvols = (p.evoluciones || []).filter(e => isToday(e.fechaRaw));
      return `
        <div class="global-pend-card" style="margin-bottom:14px">
          <div class="global-pend-header">
            <span class="global-pend-cama">Cama ${p.cama}</span>
            <span class="global-pend-name">${p.nombre}</span>
            <span class="global-pend-dx">${p.dx}</span>
          </div>
          <div style="padding:0 16px 16px">
            <div class="evol-list">
              ${hoyEvols.map(e => renderEvolItem(e, p.cama)).join('')}
            </div>
          </div>
        </div>`;
    }).join('') : `<div class="empty-state"><div class="es-icon">✎</div><p>Sin evoluciones registradas hoy</p></div>`}`;
}

function renderEvolItem(e, cama) {
  const turnoClass = e.turno === 'DIA' ? 'turno-dia' : 'turno-noche';
  return `
    <div class="evol-item ${turnoClass}">
      <div class="evol-meta">
        <span class="evol-date">${e.fecha}</span>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="evol-turno ${e.turno === 'DIA' ? 'dia' : 'noche'}">${e.turno === 'DIA' ? '☀ Día' : '🌙 Noche'}</span>
          <span class="evol-del" data-action="del-evol" data-cama="${cama}" data-id="${e.id}">Eliminar</span>
        </div>
      </div>
      <div class="evol-text">${escapeHtml(e.texto)}</div>
      <div class="evol-autor">${e.autor}</div>
    </div>`;
}

/* ═══════════════════════════════════════════ HISTORIAL VIEW */
function renderHistoricoView(filterCama) {
  const hist = getHistory();
  const patients = getPatients();
  const camasConPaciente = patients.filter(p => p.estado !== 'libre');

  return `
    <div class="view-header">
      <div><div class="view-title">Vista histórica de turnos</div>
      <div class="view-subtitle">Trazabilidad completa del estado de pacientes por turno</div></div>
    </div>
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
      <select id="history-cama-filter" style="padding:7px 10px;border:1px solid #E2E8F0;border-radius:8px;font-size:13px;background:white;outline:none" onchange="APP.setHistoryFilter(this.value)">
        <option value="">Todos los pacientes</option>
        ${camasConPaciente.map(p => `<option value="${p.cama}" ${filterCama === p.cama ? 'selected' : ''}>Cama ${p.cama} — ${p.nombre}</option>`).join('')}
      </select>
      <span style="font-size:12px;color:#94A3B8">${hist.length} cierre${hist.length !== 1 ? 's' : ''} registrado${hist.length !== 1 ? 's' : ''}</span>
    </div>
    ${!hist.length ? `<div class="empty-state"><div class="es-icon">⏱</div><p>Sin cierres de turno registrados aún.<br>Al cerrar el turno se guardará el estado de todos los pacientes.</p></div>` : ''}
    <div class="history-list">
      ${hist.map((entry, idx) => renderHistoryCard(entry, idx, filterCama)).join('')}
    </div>`;
}

function renderHistoryCard(entry, idx, filterCama) {
  const icon = entry.tipo_turno === 'DIA' ? '☀' : '🌙';
  const label = entry.tipo_turno === 'DIA' ? 'Turno Día' : 'Turno Noche';
  const alertas  = entry.pacientes.filter(p => p.estado_al_cierre === 'alerta').length;
  const obs      = entry.pacientes.filter(p => p.estado_al_cierre === 'obs').length;
  const criticos = entry.pacientes.reduce((a, p) => a + (p.examenes_criticos || []).length, 0);
  const pacs = filterCama ? entry.pacientes.filter(p => p.cama === filterCama) : entry.pacientes;

  return `
    <div class="history-card">
      <div class="history-card-header" data-action="toggle-history" data-idx="${idx}">
        <div class="history-card-icon">${icon}</div>
        <div class="history-card-info">
          <div class="history-card-title">${label} — ${entry.fecha} — ${entry.profesional}</div>
          <div class="history-card-sub">${entry.hora_inicio} → ${entry.hora_cierre} · ${entry.pacientes.length} pacientes</div>
        </div>
        <div class="history-card-stats">
          ${alertas  ? `<span class="history-stat" style="background:var(--red-bg);color:var(--red)">${alertas} alertas</span>` : ''}
          ${obs      ? `<span class="history-stat" style="background:var(--amber-bg);color:var(--amber)">${obs} obs.</span>` : ''}
          ${criticos ? `<span class="history-stat" style="background:var(--red-bg);color:var(--red)">⚠ ${criticos} crítico${criticos>1?'s':''}</span>` : ''}
          ${entry.incidentes ? `<span class="history-stat" style="background:#FEF2F2;color:#B91C1C">⚑ Incidente</span>` : ''}
        </div>
        <span style="font-size:18px;color:#CBD5E1;margin-left:8px">›</span>
      </div>
      <div class="history-body" id="history-body-${idx}">
        ${entry.observaciones_generales ? `
          <div style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:8px;padding:10px 12px;margin-bottom:12px">
            <div style="font-size:11px;font-weight:600;color:#075985;margin-bottom:4px">Observaciones generales del turno</div>
            <div style="font-size:13px;color:#0369A1">${escapeHtml(entry.observaciones_generales)}</div>
          </div>` : ''}
        ${entry.incidentes ? `
          <div style="background:var(--red-bg);border:1px solid var(--red-border);border-radius:8px;padding:10px 12px;margin-bottom:12px">
            <div style="font-size:11px;font-weight:600;color:var(--red);margin-bottom:4px">⚑ Incidentes reportados</div>
            <div style="font-size:13px;color:#991B1B">${escapeHtml(entry.incidentes)}</div>
          </div>` : ''}
        ${!pacs.length ? `<div class="empty-state"><p>Sin datos para la cama seleccionada en este turno</p></div>` : ''}
        ${pacs.map(p => renderSnapshotCard(p)).join('')}
      </div>
    </div>`;
}

function renderSnapshotCard(p) {
  const colores = { ok: 'var(--green)', alerta: 'var(--red)', obs: 'var(--amber)' };
  const labels  = { ok: 'Estable', alerta: 'Alerta', obs: 'Observación' };
  const pend = (p.procedimientos_pendientes || []);
  const done = (p.procedimientos_realizados || []);
  const evols = (p.evoluciones_turno || []);

  return `
    <div class="patient-snapshot">
      <div class="snapshot-header">
        <span class="snapshot-cama">Cama ${p.cama}</span>
        <span class="snapshot-name">${p.nombre}</span>
        <span class="snapshot-estado" style="background:${colores[p.estado_al_cierre] ? colores[p.estado_al_cierre]+'22' : '#F1F5F9'};color:${colores[p.estado_al_cierre] || '#6B7280'}">
          ${labels[p.estado_al_cierre] || p.estado_al_cierre}
        </span>
      </div>
      <div style="font-size:12px;color:#64748B">${p.dx}</div>
      ${p.dias_hospitalizacion !== null ? `<div style="font-size:11px;color:#94A3B8;margin-top:2px">Día ${p.dias_hospitalizacion} de hospitalización</div>` : ''}

      ${evols.length ? `
        <div class="snapshot-section">Evoluciones registradas en este turno (${evols.length})</div>
        ${evols.map(e => `<div style="font-size:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:8px;margin-top:4px">
          <span style="font-size:10px;color:#94A3B8">${e.fecha} — ${e.autor}</span>
          <div style="margin-top:4px;white-space:pre-wrap">${escapeHtml(e.texto.substring(0, 200))}${e.texto.length > 200 ? '...' : ''}</div>
        </div>`).join('')}` : '<div class="snapshot-section" style="color:#DC2626">Sin evoluciones en este turno</div>'}

      ${done.length ? `
        <div class="snapshot-section" style="margin-top:8px">Procedimientos realizados</div>
        ${done.map(pr => `<div style="font-size:12px;color:#16A34A;padding:2px 0">✓ ${pr.nombre}</div>`).join('')}` : ''}

      ${pend.length ? `
        <div class="snapshot-section" style="margin-top:8px;color:var(--amber)">Pendientes para siguiente turno</div>
        ${pend.map(pr => `<div style="font-size:12px;color:#D97706;padding:2px 0">◷ ${pr.nombre}</div>`).join('')}` : ''}

      ${(p.pendientes_para_siguiente || []).length ? `
        <div class="snapshot-section" style="margin-top:8px">Otros pendientes</div>
        ${p.pendientes_para_siguiente.map(pd => `<div style="font-size:12px;color:#78350F;padding:2px 0">• ${pd.texto || pd}</div>`).join('')}` : ''}

      ${(p.examenes_criticos || []).length ? `
        <div class="snapshot-section" style="color:var(--red);margin-top:8px">⚠ Exámenes críticos</div>
        ${p.examenes_criticos.map(e => `<div style="font-size:12px;color:var(--red)">! ${e.tipo}: ${e.resultado}</div>`).join('')}` : ''}
    </div>`;
}

/* ══════════════════════════════════════════════ PATIENT MODAL */
function renderPatientModal(p) {
  const isLibre = p.estado === 'libre';
  const title = isLibre ? `Cama ${p.cama} — Disponible` : `Cama ${p.cama} — ${p.nombre}`;
  const sub   = isLibre ? 'Asignar nuevo paciente' : `${p.dx} · ${p.edad} años · ${p.rut}`;
  const statusBadge = isLibre ? '' : `
    <span class="bed-status-badge st-${p.estado}" style="font-size:12px;padding:3px 10px">
      ${{ok:'Estable',alerta:'Alerta',obs:'Observación'}[p.estado]}
    </span>`;
  const tabs = isLibre
    ? [['datos','Datos del paciente']]
    : [['datos','Datos'],['ingreso','Ingreso'],['evoluciones','Evoluciones'],['examenes','Exámenes'],['procedimientos','Procedimientos'],['pendientes','Pendientes']];

  return `
    <div class="modal-header">
      <div class="modal-header-info">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="modal-title">${title}</div>
          ${statusBadge}
          ${p.alergias ? `<span class="allergy-badge" title="${p.alergias}">⚠ ${p.alergias}</span>` : ''}
        </div>
        <div class="modal-sub">${sub}</div>
      </div>
      <button class="modal-close" data-action="close-modal">✕</button>
    </div>
    <div class="modal-tabs">
      ${tabs.map(([id, label]) => `<div class="modal-tab ${id==='datos'?'active':''}" data-tab="${id}">${label}</div>`).join('')}
    </div>
    <div class="modal-body">
      ${renderTabDatos(p)}
      ${!isLibre ? renderTabIngreso(p) : ''}
      ${!isLibre ? renderTabEvoluciones(p) : ''}
      ${!isLibre ? renderTabExamenes(p) : ''}
      ${!isLibre ? renderTabProcedimientos(p) : ''}
      ${!isLibre ? renderTabPendientes(p) : ''}
    </div>`;
}

function renderTabDatos(p) {
  return `
    <div class="tab-panel active" data-panel="datos">
      <div class="section-title">Identificación</div>
      <div class="field-grid">
        <div class="field"><label>Nombre completo</label><input type="text" value="${p.nombre || ''}" data-field="nombre" data-cama="${p.cama}"></div>
        <div class="field"><label>RUT</label><input type="text" value="${p.rut || ''}" data-field="rut" data-cama="${p.cama}"></div>
      </div>
      <div class="field-grid cols-3">
        <div class="field"><label>Edad</label><input type="number" value="${p.edad || ''}" data-field="edad" data-cama="${p.cama}"></div>
        <div class="field"><label>Fecha de nacimiento</label><input type="text" value="${p.fechaNac || ''}" data-field="fechaNac" data-cama="${p.cama}" placeholder="DD/MM/AAAA"></div>
        <div class="field"><label>Previsión</label>
          <select data-field="prevision" data-cama="${p.cama}">
            ${['FONASA','ISAPRE','Particular','Otro'].map(v=>`<option ${p.prevision===v?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field-grid">
        <div class="field"><label>Diagnóstico principal</label><input type="text" value="${p.dx || ''}" data-field="dx" data-cama="${p.cama}"></div>
        <div class="field"><label>Cama</label><input type="text" value="${p.cama || ''}" data-field="cama_display" disabled></div>
      </div>
      <div class="field-grid">
        <div class="field"><label>Servicio / Unidad</label><input type="text" value="${p.servicio || ''}" data-field="servicio" data-cama="${p.cama}"></div>
        <div class="field"><label>Médico tratante</label><input type="text" value="${p.medico || ''}" data-field="medico" data-cama="${p.cama}"></div>
      </div>
      <div class="field-grid">
        <div class="field"><label>Alergias conocidas</label>
          <input type="text" value="${p.alergias || ''}" data-field="alergias" data-cama="${p.cama}" placeholder="Ninguna conocida" style="${p.alergias ? 'border-color:#FECACA;background:#FEF2F2;color:#B91C1C' : ''}">
        </div>
        <div class="field"><label>Estado clínico</label>
          <select data-field="estado" data-cama="${p.cama}">
            <option value="ok"     ${p.estado==='ok'    ?'selected':''}>Estable</option>
            <option value="obs"    ${p.estado==='obs'   ?'selected':''}>Observación</option>
            <option value="alerta" ${p.estado==='alerta'?'selected':''}>Alerta</option>
            <option value="libre"  ${p.estado==='libre' ?'selected':''}>Libre / Alta</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn-primary" data-action="save-patient" data-cama="${p.cama}">Guardar cambios</button>
        ${p.estado !== 'libre' ? `<button class="btn-primary btn-danger" data-action="discharge-patient" data-cama="${p.cama}">Dar de alta</button>` : ''}
      </div>
    </div>`;
}

function renderTabIngreso(p) {
  return `
    <div class="tab-panel" data-panel="ingreso">
      <div class="section-title">Datos de ingreso</div>
      <div class="field-grid">
        <div class="field"><label>Fecha y hora de ingreso</label>
          <input type="datetime-local" value="${p.ingreso_datetime ? new Date(p.ingreso_datetime).toISOString().slice(0,16) : ''}" data-field="ingreso_datetime" data-cama="${p.cama}">
        </div>
        <div class="field"><label>Timer actual</label>
          <div class="field-val" style="font-size:16px;font-weight:600;color:var(--blue)">⏱ ${calcElapsed(p.ingreso_datetime) || '--'}</div>
        </div>
      </div>
      <div class="field field-grid cols-1">
        <div class="field"><label>Motivo de hospitalización</label>
          <textarea data-field="motivo" data-cama="${p.cama}">${p.motivo || ''}</textarea>
        </div>
      </div>
      <div class="field"><label>Antecedentes mórbidos relevantes</label>
        <textarea data-field="antecedentes" data-cama="${p.cama}">${p.antecedentes || ''}</textarea>
      </div>
      <div class="field"><label>Medicación habitual pre-ingreso</label>
        <textarea data-field="medicacion_previa" data-cama="${p.cama}" style="min-height:60px">${p.medicacion_previa || ''}</textarea>
      </div>
      <div style="margin-top:12px">
        <button class="btn-primary" data-action="save-patient" data-cama="${p.cama}">Guardar</button>
      </div>
    </div>`;
}

function renderTabEvoluciones(p) {
  const cfg = getConfig();
  return `
    <div class="tab-panel" data-panel="evoluciones">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="font-size:13px;font-weight:600;color:var(--text-secondary)">${(p.evoluciones||[]).length} evoluciones registradas</div>
        <button class="btn-primary" data-action="show-evol-form" data-cama="${p.cama}">+ Nueva evolución</button>
      </div>
      <div id="evol-form-${p.cama}" style="display:none" class="evol-form">
        <div class="evol-form-title">Nueva evolución — ${cfg.currentShift === 'DIA' ? '☀ Turno Día' : '🌙 Turno Noche'}</div>
        <div class="format-toggle">
          <button class="format-btn active" data-format="narrativo">Narrativo</button>
          <button class="format-btn" data-format="SOAP">SOAP (S/O/A/P)</button>
        </div>
        <textarea id="evol-text-${p.cama}" style="width:100%;min-height:140px;padding:10px;border:1px solid #BAE6FD;border-radius:8px;font-size:13px;font-family:var(--font);resize:vertical;background:white" placeholder="Escriba la evolución aquí..."></textarea>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn-primary" data-action="save-evol" data-cama="${p.cama}">Guardar evolución</button>
          <button class="btn-cancel" data-action="cancel-evol" data-cama="${p.cama}">Cancelar</button>
        </div>
      </div>
      <div class="evol-list">
        ${!(p.evoluciones||[]).length ? `<div class="empty-state"><div class="es-icon">✎</div><p>Sin evoluciones registradas</p></div>` : ''}
        ${(p.evoluciones||[]).map(e => renderEvolItem(e, p.cama)).join('')}
      </div>
    </div>`;
}

function renderTabExamenes(p) {
  return `
    <div class="tab-panel" data-panel="examenes">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="font-size:13px;font-weight:600;color:var(--text-secondary)">Exámenes y resultados</div>
        <button class="btn-add" data-action="add-exam" data-cama="${p.cama}">+ Agregar examen</button>
      </div>
      ${!(p.examenes||[]).length ? `<div class="empty-state"><div class="es-icon">🧪</div><p>Sin exámenes registrados</p></div>` : `
      <table class="exam-table">
        <thead><tr><th>Tipo</th><th>Fecha</th><th>Resultado</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${(p.examenes||[]).map(e => `
            <tr>
              <td style="font-weight:500">${e.tipo}</td>
              <td>${e.fecha}</td>
              <td class="${e.estado === 'critico' ? 'exam-result-critical' : ''}">${e.resultado}</td>
              <td><span class="exam-badge ${e.estado}">${{pendiente:'Pendiente',resultado:'Resultado',critico:'Crítico'}[e.estado]||e.estado}</span></td>
              <td><span style="cursor:pointer;font-size:11px;color:var(--red)" data-action="del-exam" data-cama="${p.cama}" data-id="${e.id}">✕</span></td>
            </tr>`).join('')}
        </tbody>
      </table>`}
    </div>`;
}

function renderTabProcedimientos(p) {
  return `
    <div class="tab-panel" data-panel="procedimientos">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="font-size:13px;font-weight:600;color:var(--text-secondary)">Procedimientos indicados</div>
        <button class="btn-add" data-action="add-proc" data-cama="${p.cama}">+ Agregar</button>
      </div>
      ${!(p.procedimientos||[]).length ? `<div class="empty-state"><div class="es-icon">☐</div><p>Sin procedimientos registrados</p></div>` : ''}
      <div class="proc-list">
        ${(p.procedimientos||[]).map(pr => `
          <div class="proc-item ${pr.done ? 'done' : ''}">
            <input type="checkbox" class="proc-check" ${pr.done?'checked':''} data-action="toggle-proc" data-cama="${p.cama}" data-id="${pr.id}">
            <span class="proc-name">${pr.nombre}</span>
            <span class="proc-meta">${pr.indicadoPor||''}<br>${pr.done && pr.horaRealizado ? '✓ '+pr.horaRealizado : pr.fecha||''}</span>
            <span class="proc-del" data-action="del-proc" data-cama="${p.cama}" data-id="${pr.id}">✕</span>
          </div>`).join('')}
      </div>
    </div>`;
}

function renderTabPendientes(p) {
  return `
    <div class="tab-panel" data-panel="pendientes">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="font-size:13px;font-weight:600;color:var(--text-secondary)">Otros pendientes e indicaciones</div>
        <button class="btn-add" data-action="add-pend" data-cama="${p.cama}">+ Agregar</button>
      </div>
      ${!(p.pendientes||[]).length ? `<div class="empty-state"><div class="es-icon">📋</div><p>Sin pendientes registrados</p></div>` : ''}
      <div class="pend-list">
        ${(p.pendientes||[]).map(pd => `
          <div class="pend-item">
            <span class="pend-dot"></span>
            <span class="pend-text">${pd.texto}</span>
            <span class="pend-del" data-action="del-pend" data-cama="${p.cama}" data-id="${pd.id}">✕</span>
          </div>`).join('')}
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════ PRINT VIEW */
function renderPrintTemplate() {
  const cfg = getConfig();
  const patients = getPatients().filter(p => p.estado !== 'libre');
  const now = new Date();
  return `
    <style>@media print{body{font-size:11px;color:#000}}</style>
    <div style="padding:20px;font-family:Arial,sans-serif">
      <div style="display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:16px">
        <div>
          <div style="font-size:16px;font-weight:bold">${cfg.serviceName}</div>
          <div>Turno: ${cfg.currentShift === 'DIA' ? 'Día 07:00–19:00' : 'Noche 19:00–07:00'}</div>
          <div>Profesional: ${cfg.professional}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:16px;font-weight:bold">${formatDate(now)}</div>
          <div>${formatTime(now)}</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead>
          <tr style="background:#F1F5F9">
            <th style="border:1px solid #CBD5E1;padding:6px;text-align:left">Cama</th>
            <th style="border:1px solid #CBD5E1;padding:6px;text-align:left">Paciente</th>
            <th style="border:1px solid #CBD5E1;padding:6px;text-align:left">Diagnóstico</th>
            <th style="border:1px solid #CBD5E1;padding:6px;text-align:left">Estado</th>
            <th style="border:1px solid #CBD5E1;padding:6px;text-align:left">Días hosp.</th>
            <th style="border:1px solid #CBD5E1;padding:6px;text-align:left">Evolución hoy</th>
            <th style="border:1px solid #CBD5E1;padding:6px;text-align:left">Pendientes</th>
          </tr>
        </thead>
        <tbody>
          ${patients.map(p => {
            const days = p.ingreso_datetime ? Math.floor((Date.now()-new Date(p.ingreso_datetime))/86400000) : '--';
            const evolHoy = (p.evoluciones||[]).find(e=>isToday(e.fechaRaw));
            const pend = (p.procedimientos||[]).filter(x=>!x.done).map(x=>x.nombre).concat((p.pendientes||[]).map(x=>x.texto));
            return `
              <tr>
                <td style="border:1px solid #CBD5E1;padding:6px;font-weight:bold">${p.cama}</td>
                <td style="border:1px solid #CBD5E1;padding:6px">${p.nombre}<br><span style="color:#64748B;font-size:10px">${p.rut} · ${p.edad}a</span></td>
                <td style="border:1px solid #CBD5E1;padding:6px">${p.dx}</td>
                <td style="border:1px solid #CBD5E1;padding:6px">${{ok:'Estable',alerta:'ALERTA',obs:'Obs.'}[p.estado]||p.estado}</td>
                <td style="border:1px solid #CBD5E1;padding:6px;text-align:center">${days}</td>
                <td style="border:1px solid #CBD5E1;padding:6px;max-width:200px">${evolHoy ? evolHoy.texto.substring(0,150)+'...' : '— Sin evolución —'}</td>
                <td style="border:1px solid #CBD5E1;padding:6px">${pend.slice(0,3).join('<br>')}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
      <div style="margin-top:20px;border-top:1px solid #CBD5E1;padding-top:10px;font-size:10px;color:#64748B">
        Impreso: ${formatDateTime(now)} · ${cfg.serviceName} · Sistema de Enfermería
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════ TOAST */
function showToast(msg, type = 'ok') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type === 'error' ? 'error' : type === 'warn' ? 'warn' : ''}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

/* ═══════════════════════════════════════════════ UTILS */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══════════════════════════════════════ SHIFT CLOSE DIALOG */
function renderShiftCloseDialog(onConfirm) {
  const cfg = getConfig();
  document.getElementById('dialog-content').innerHTML = `
    <div class="dialog-title">Cerrar turno — ${cfg.currentShift === 'DIA' ? 'Turno Día' : 'Turno Noche'}</div>
    <div class="dialog-message">Se guardará un snapshot del estado actual de todos los pacientes. Esta acción no se puede deshacer.</div>
    <label style="font-size:12px;font-weight:600;color:#64748B;display:block;margin-bottom:4px">Observaciones generales del turno</label>
    <textarea id="shift-obs" class="dialog-input" style="min-height:70px;margin-bottom:12px" placeholder="Ej: Turno tranquilo, sin incidentes relevantes..."></textarea>
    <label style="font-size:12px;font-weight:600;color:#64748B;display:block;margin-bottom:4px">Incidentes (opcional)</label>
    <input type="text" id="shift-incident" class="dialog-input" placeholder="Dejar vacío si no hubo incidentes">
    <div class="dialog-actions">
      <button class="btn-cancel" data-action="close-dialog">Cancelar</button>
      <button class="btn-primary" id="confirm-close-shift">Cerrar turno y guardar</button>
    </div>`;
  document.getElementById('dialog-overlay').classList.remove('hidden');
  document.getElementById('confirm-close-shift').onclick = () => {
    const obs = document.getElementById('shift-obs').value;
    const inc = document.getElementById('shift-incident').value;
    document.getElementById('dialog-overlay').classList.add('hidden');
    onConfirm(obs, inc);
  };
}
