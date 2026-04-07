/* ═══════════════════════════════════════════════════════════════
   SISTEMA DE ENFERMERÍA — data.js
   Estructuras de datos, localStorage y datos de ejemplo
═══════════════════════════════════════════════════════════════ */

const KEYS = {
  PATIENTS:  'enf_pacientes',
  HISTORY:   'enf_historial_turnos',
  CONFIG:    'enf_config',
};

const DEFAULT_CONFIG = {
  serviceName:   'Medicina Interna — Piso 3',
  professional:  'EU Ingrese su nombre',
  currentShift:  'DIA',
  shiftStart:    null,
};

/* ─── STORAGE HELPERS ─── */
function storageGet(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

/* ─── UID ─── */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ─── CONFIG ─── */
function getConfig() {
  const saved = storageGet(KEYS.CONFIG, {});
  return { ...DEFAULT_CONFIG, ...saved };
}
function saveConfig(cfg) { storageSet(KEYS.CONFIG, cfg); }

/* ─── PATIENTS ─── */
function getPatients() { return storageGet(KEYS.PATIENTS, SAMPLE_PATIENTS); }
function savePatients(patients) { storageSet(KEYS.PATIENTS, patients); }
function getPatientByCama(cama) { return getPatients().find(p => p.cama === cama) || null; }
function updatePatient(updated) {
  const patients = getPatients();
  const idx = patients.findIndex(p => p.cama === updated.cama);
  if (idx !== -1) patients[idx] = updated; else patients.push(updated);
  savePatients(patients);
}

/* ─── HISTORY ─── */
function getHistory() { return storageGet(KEYS.HISTORY, []); }
function saveHistory(hist) {
  const MAX = 60;
  if (hist.length > MAX) hist = hist.slice(hist.length - MAX);
  storageSet(KEYS.HISTORY, hist);
}
function addHistoryEntry(entry) {
  const hist = getHistory();
  hist.unshift(entry);
  saveHistory(hist);
}

/* ─── SHIFT CLOSE SNAPSHOT ─── */
function buildShiftSnapshot(professional, shiftType, shiftStart) {
  const patients = getPatients();
  const now = new Date();
  const snapshot = {
    id: uid(),
    tipo_turno: shiftType,
    fecha: formatDate(now),
    hora_inicio: shiftStart || '--:--',
    hora_cierre: formatTime(now),
    timestamp_cierre: now.toISOString(),
    profesional: professional,
    observaciones_generales: '',
    incidentes: '',
    pacientes: patients.filter(p => p.estado !== 'libre').map(p => ({
      cama: p.cama,
      nombre: p.nombre,
      dx: p.dx,
      estado_al_cierre: p.estado,
      dias_hospitalizacion: p.ingreso_datetime ? calcDays(p.ingreso_datetime) : null,
      evoluciones_turno: (p.evoluciones || []).filter(e => e.turno === shiftType && e.fechaRaw && isToday(e.fechaRaw)),
      procedimientos_realizados: (p.procedimientos || []).filter(x => x.done),
      procedimientos_pendientes: (p.procedimientos || []).filter(x => !x.done),
      examenes_criticos: (p.examenes || []).filter(x => x.estado === 'critico'),
      pendientes_para_siguiente: p.pendientes || [],
      alergias: p.alergias || '',
    }))
  };
  return snapshot;
}

/* ─── DATE / TIME HELPERS ─── */
function formatDate(d) {
  if (!d) return '--';
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatTime(d) {
  if (!d) return '--';
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}
function formatDateTime(d) {
  if (!d) return '--';
  const dt = d instanceof Date ? d : new Date(d);
  return formatDate(dt) + ' ' + formatTime(dt);
}
function isToday(isoStr) {
  try {
    const d = new Date(isoStr);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  } catch { return false; }
}
function calcDays(ingresoIso) {
  if (!ingresoIso) return null;
  const ms = Date.now() - new Date(ingresoIso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
function calcElapsed(ingresoIso) {
  if (!ingresoIso) return null;
  const ms = Date.now() - new Date(ingresoIso).getTime();
  if (ms < 0) return '0m';
  const min  = Math.floor(ms / 60000) % 60;
  const hrs  = Math.floor(ms / 3600000) % 24;
  const days = Math.floor(ms / 86400000);
  if (days > 0) return `${days}d ${hrs}h ${min}m`;
  if (hrs  > 0) return `${hrs}h ${min}m`;
  return `${min}m`;
}
function getCurrentShiftLabel(type) {
  return type === 'DIA'
    ? '☀ Turno Día  07:00 – 19:00'
    : '🌙 Turno Noche  19:00 – 07:00';
}
function detectShiftFromHour() {
  const h = new Date().getHours();
  return (h >= 7 && h < 19) ? 'DIA' : 'NOCHE';
}

/* ═══════════════════════════════════ DATOS DE EJEMPLO (5 pacientes) */
const NOW_ISO = new Date().toISOString();
function daysAgo(d, h = 0) {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  dt.setHours(h, 0, 0, 0);
  return dt.toISOString();
}

const SAMPLE_PATIENTS = [
  {
    cama: '101',
    nombre: 'María González Pérez',
    rut: '12.345.678-9',
    edad: 67,
    fechaNac: '15/03/1957',
    dx: 'Neumonía adquirida en comunidad',
    servicio: 'Medicina Interna',
    medico: 'Dr. Rodrigo Saavedra',
    prevision: 'FONASA',
    estado: 'alerta',
    ingreso_datetime: daysAgo(6, 20),
    motivo: 'Fiebre alta 39.5°C, disnea progresiva y desaturación SpO₂ 85% basal.',
    antecedentes: 'DM2 en tratamiento con metformina. HTA controlada con losartán. EPOC leve. No fuma hace 5 años.',
    alergias: 'Penicilina (rash)',
    medicacion_previa: 'Metformina 850mg c/12h, Losartán 50mg c/24h, Budesonida inhalada',
    evoluciones: [
      {
        id: uid(), fechaRaw: daysAgo(0, 8), turno: 'DIA',
        fecha: formatDateTime(new Date(daysAgo(0, 8))),
        formato: 'SOAP',
        texto: 'S: Paciente refiere mejoría parcial del dolor torácico. Persiste disnea de esfuerzo moderada. Refiere dormir mejor.\nO: PA 138/82, FC 88 lpm regular, FR 22 rpm, SpO₂ 93% con O₂ 2L nasal. Afebril T° 36.8°C. Estertores bibasales a la auscultación. Piel hidratada.\nA: NAC en evolución. SpO₂ límite con O₂ suplementario. Tolerando antibiótico EV sin reacciones.\nP: Mantener O₂ nasal, control SV c/4h, continuar antibiótico según esquema.',
        autor: 'EU Carmen Soto'
      },
      {
        id: uid(), fechaRaw: daysAgo(1, 20), turno: 'NOCHE',
        fecha: formatDateTime(new Date(daysAgo(1, 20))),
        formato: 'narrativo',
        texto: 'Paciente hemodinámicamente estable al inicio del turno nocturno. Se administra ceftriaxona 2g EV según indicación. Duerme en períodos cortos. Solicita analgesia por dolor costal, se administra paracetamol 1g EV con buena respuesta. Sin cambios relevantes. Se deja en observación.',
        autor: 'EU Pedro Vargas'
      }
    ],
    examenes: [
      { id: uid(), tipo: 'Hemograma', fecha: formatDate(new Date(daysAgo(1))), resultado: 'Leucocitos 14.200/mm³, PCR 8.2 mg/dL', estado: 'resultado' },
      { id: uid(), tipo: 'Rx Tórax', fecha: formatDate(new Date(daysAgo(1))), resultado: 'Consolidación basal derecha compatible con NAC', estado: 'resultado' },
      { id: uid(), tipo: 'Hemocultivo x2', fecha: formatDate(new Date(daysAgo(2))), resultado: 'Pendiente resultado', estado: 'pendiente' },
      { id: uid(), tipo: 'Gases arteriales', fecha: formatDate(new Date()), resultado: 'pH 7.38, PaO₂ 68 mmHg, PaCO₂ 42 mmHg', estado: 'critico' },
    ],
    procedimientos: [
      { id: uid(), nombre: 'Control SV c/4h', indicadoPor: 'Dr. Saavedra', fecha: formatDate(new Date()), done: true, horaRealizado: '08:15' },
      { id: uid(), nombre: 'Nebulización salbutamol', indicadoPor: 'Dr. Saavedra', fecha: formatDate(new Date()), done: true, horaRealizado: '09:00' },
      { id: uid(), nombre: 'Toma de hemocultivos de control', indicadoPor: 'Dr. Saavedra', fecha: formatDate(new Date()), done: false, horaRealizado: '' },
      { id: uid(), nombre: 'Administración ceftriaxona 2g EV', indicadoPor: 'Dr. Saavedra', fecha: formatDate(new Date()), done: false, horaRealizado: '' },
    ],
    pendientes: [
      { id: uid(), texto: 'Interconsulta kinesiología respiratoria — pendiente hora asignada' },
      { id: uid(), texto: 'Control PCR y hemograma mañana AM' },
      { id: uid(), texto: 'Glicemia capilar: próxima a las 12:00h' },
    ]
  },

  {
    cama: '102',
    nombre: 'Carlos Muñoz Reyes',
    rut: '8.901.234-5',
    edad: 72,
    fechaNac: '22/07/1952',
    dx: 'Insuficiencia cardíaca descompensada',
    servicio: 'Medicina Interna',
    medico: 'Dra. Patricia Leiva',
    prevision: 'FONASA',
    estado: 'obs',
    ingreso_datetime: daysAgo(3, 14),
    motivo: 'Disnea progresiva de 5 días, edema bilateral MMII ++, aumento de peso 4kg en 5 días.',
    antecedentes: 'ICC crónica FE 30%. HTA. FA permanente. Marcapasos bicameral desde 2019. DM2.',
    alergias: '',
    medicacion_previa: 'Carvedilol 6.25mg c/12h, Enalapril 10mg c/12h, Warfarina 5mg c/24h, Furosemida 40mg c/24h',
    evoluciones: [
      {
        id: uid(), fechaRaw: daysAgo(0, 8), turno: 'DIA',
        fecha: formatDateTime(new Date(daysAgo(0, 8))),
        formato: 'SOAP',
        texto: 'S: Refiere menor disnea que ayer. Aún ortopneico a 2 almohadas.\nO: PA 148/88 mmHg, FC 72 lpm (ritmo de MP), FR 18 rpm, SpO₂ 96% AA. Balance hídrico -600mL 24h. Peso hoy 84.0kg (ayer 84.8kg). Edema MMII ++.\nA: ICC en descompensación, evolución lenta pero favorable con diurético EV.\nP: Continuar furosemida EV, peso diario, balance estricto, restricción hídrica 1L/día.',
        autor: 'EU Carmen Soto'
      }
    ],
    examenes: [
      { id: uid(), tipo: 'NT-proBNP', fecha: formatDate(new Date(daysAgo(3))), resultado: '1.240 pg/mL (elevado)', estado: 'critico' },
      { id: uid(), tipo: 'Ecocardiograma', fecha: formatDate(new Date(daysAgo(2))), resultado: 'FE 30%, disfunción sistólica severa, sin derrame', estado: 'resultado' },
      { id: uid(), tipo: 'Creatinina + ELP', fecha: formatDate(new Date()), resultado: 'Cr 1.4 mg/dL, K⁺ 4.1, Na⁺ 138', estado: 'resultado' },
    ],
    procedimientos: [
      { id: uid(), nombre: 'Balance hídrico estricto', indicadoPor: 'Dra. Leiva', fecha: formatDate(new Date()), done: true, horaRealizado: '07:00' },
      { id: uid(), nombre: 'Peso diario', indicadoPor: 'Dra. Leiva', fecha: formatDate(new Date()), done: true, horaRealizado: '07:15' },
      { id: uid(), nombre: 'Furosemida 40mg EV c/12h', indicadoPor: 'Dra. Leiva', fecha: formatDate(new Date()), done: false, horaRealizado: '' },
    ],
    pendientes: [
      { id: uid(), texto: 'Control ecocardiograma en 72h' },
      { id: uid(), texto: 'Evaluar inicio espironolactona con cardiología' },
      { id: uid(), texto: 'INR de control mañana (paciente en warfarina)' },
    ]
  },

  {
    cama: '103',
    nombre: 'Ana Torres Vidal',
    rut: '15.678.901-2',
    edad: 54,
    fechaNac: '08/11/1970',
    dx: 'IAM SDST anteroseptal — post angioplastía día 2',
    servicio: 'Medicina Interna',
    medico: 'Dr. Felipe Castillo',
    prevision: 'ISAPRE',
    estado: 'ok',
    ingreso_datetime: daysAgo(2, 3),
    motivo: 'Dolor precordial opresivo 2h de evolución con elevación ST anteroseptal en ECG. Derivada de urgencias.',
    antecedentes: 'Tabaquismo activo 20 cig/día. Dislipidemia. Sin antecedentes cardíacos previos. Sin diabetes.',
    alergias: '',
    medicacion_previa: 'Atorvastatina 40mg, ningún otro medicamento habitual',
    evoluciones: [
      {
        id: uid(), fechaRaw: daysAgo(0, 8), turno: 'DIA',
        fecha: formatDateTime(new Date(daysAgo(0, 8))),
        formato: 'narrativo',
        texto: 'Paciente evoluciona favorablemente día 2 post-angioplastía. Sin dolor precordial en reposo. Hemodinámicamente estable. PA 118/72, FC 68 lpm ritmo sinusal. Se inicia rehabilitación cardíaca precoz: sedente en cama 15 minutos sin síntomas. Tolerando dieta liviana. Se refuerza educación sobre tabaquismo y hábitos cardioprotectores.',
        autor: 'EU Carmen Soto'
      }
    ],
    examenes: [
      { id: uid(), tipo: 'Troponina T peak', fecha: formatDate(new Date(daysAgo(2))), resultado: '2.8 ng/mL', estado: 'resultado' },
      { id: uid(), tipo: 'CK-MB', fecha: formatDate(new Date(daysAgo(2))), resultado: 'Peak 180 U/L, en descenso', estado: 'resultado' },
      { id: uid(), tipo: 'ECG hoy', fecha: formatDate(new Date()), resultado: 'Ritmo sinusal, sin nuevos cambios del ST', estado: 'resultado' },
    ],
    procedimientos: [
      { id: uid(), nombre: 'Monitorización ECG continua', indicadoPor: 'Dr. Castillo', fecha: formatDate(new Date()), done: true, horaRealizado: '07:00' },
      { id: uid(), nombre: 'AAS 100mg + Clopidogrel 75mg VO', indicadoPor: 'Dr. Castillo', fecha: formatDate(new Date()), done: true, horaRealizado: '08:00' },
      { id: uid(), nombre: 'Movilización progresiva', indicadoPor: 'Dr. Castillo', fecha: formatDate(new Date()), done: false, horaRealizado: '' },
    ],
    pendientes: [
      { id: uid(), texto: 'Coronariografía de control en 48h' },
      { id: uid(), texto: 'Sesión educativa al alta: hábitos cardioprotectores y medicamentos' },
    ]
  },

  {
    cama: '104',
    nombre: 'Roberto Fuentes Díaz',
    rut: '9.012.345-6',
    edad: 61,
    fechaNac: '14/05/1963',
    dx: 'ERC estadio 4 — descompensada',
    servicio: 'Medicina Interna',
    medico: 'Dr. Andrés Mora',
    prevision: 'FONASA',
    estado: 'ok',
    ingreso_datetime: daysAgo(4, 10),
    motivo: 'Edema generalizado, creatinina 6.8 mg/dL, potasio 6.1 mEq/L, hipertensión no controlada.',
    antecedentes: 'DM2 hace 15 años. HTA. ERC crónica estadio 3b en control nefrológico desde 2021.',
    alergias: 'AINEs (deterioro función renal)',
    medicacion_previa: 'Insulina NPH 20UI c/12h, Amlodipino 10mg, Furosemida 80mg, Bicarbonato de sodio 1g c/8h',
    evoluciones: [
      {
        id: uid(), fechaRaw: daysAgo(0, 8), turno: 'DIA',
        fecha: formatDateTime(new Date(daysAgo(0, 8))),
        formato: 'SOAP',
        texto: 'S: Refiere menor edema en piernas. No disnea en reposo.\nO: PA 148/90, FC 74 lpm, FR 16 rpm, SpO₂ 97% AA. Diuresis última hora: 40mL. Balance 24h: -300mL. K⁺ control: 5.4 mEq/L. Creatinina: 5.9 mg/dL.\nA: ERC descompensada en mejoría progresiva. Hiperkalemia en descenso.\nP: Mantener dieta hiposódica e hipopotasémica, control ELP mañana.',
        autor: 'EU Carmen Soto'
      }
    ],
    examenes: [
      { id: uid(), tipo: 'Creatinina', fecha: formatDate(new Date()), resultado: '5.9 mg/dL (en descenso desde 6.8)', estado: 'critico' },
      { id: uid(), tipo: 'Potasio', fecha: formatDate(new Date()), resultado: '5.4 mEq/L', estado: 'resultado' },
      { id: uid(), tipo: 'ECG', fecha: formatDate(new Date(daysAgo(1))), resultado: 'Sin signos de hiperkalemia', estado: 'resultado' },
    ],
    procedimientos: [
      { id: uid(), nombre: 'Control diuresis horaria', indicadoPor: 'Dr. Mora', fecha: formatDate(new Date()), done: true, horaRealizado: '08:00' },
      { id: uid(), nombre: 'Quelantes de fósforo con comidas', indicadoPor: 'Dr. Mora', fecha: formatDate(new Date()), done: true, horaRealizado: '08:30' },
      { id: uid(), nombre: 'Peso diario', indicadoPor: 'Dr. Mora', fecha: formatDate(new Date()), done: false, horaRealizado: '' },
    ],
    pendientes: [
      { id: uid(), texto: 'Evaluación nefrología tarde de hoy: discutir inicio diálisis' },
      { id: uid(), texto: 'Control K⁺ y creatinina a las 14:00h' },
    ]
  },

  {
    cama: '105',
    nombre: '',
    rut: '', edad: null, fechaNac: '',
    dx: '', servicio: '', medico: '', prevision: '',
    estado: 'libre',
    ingreso_datetime: null,
    motivo: '', antecedentes: '', alergias: '', medicacion_previa: '',
    evoluciones: [], examenes: [], procedimientos: [], pendientes: []
  },

  {
    cama: '106',
    nombre: 'Lucía Herrera Castro',
    rut: '18.234.567-8',
    edad: 43,
    fechaNac: '30/09/1981',
    dx: 'Celulitis severa miembro inferior derecho',
    servicio: 'Medicina Interna',
    medico: 'Dr. Rodrigo Saavedra',
    prevision: 'FONASA',
    estado: 'obs',
    ingreso_datetime: daysAgo(1, 18),
    motivo: 'Eritema, calor, aumento de volumen y dolor intenso en pierna derecha. Fiebre 38.9°C. Sin puerta de entrada evidente.',
    antecedentes: 'Sin antecedentes mórbidos relevantes. G2P2, no usa ACO.',
    alergias: '',
    medicacion_previa: 'Ninguno',
    evoluciones: [
      {
        id: uid(), fechaRaw: daysAgo(0, 9), turno: 'DIA',
        fecha: formatDateTime(new Date(daysAgo(0, 9))),
        formato: 'narrativo',
        texto: 'Zona afectada demarcada con tinta: sin progresión respecto a turno nocturno. T° 37.4°C (afebril). Persiste eritema y calor local pero disminuido. Paciente tolera vía oral y antibiótico EV sin reacciones adversas. Refiere dolor 5/10 (ayer 8/10). Extremidad elevada en todo momento.',
        autor: 'EU Carmen Soto'
      }
    ],
    examenes: [
      { id: uid(), tipo: 'Hemograma', fecha: formatDate(new Date(daysAgo(1))), resultado: 'Leucocitos 18.000/mm³, PCR 12.4 mg/dL', estado: 'resultado' },
      { id: uid(), tipo: 'Cultivo herida', fecha: formatDate(new Date(daysAgo(1))), resultado: 'Pendiente (48-72h)', estado: 'pendiente' },
    ],
    procedimientos: [
      { id: uid(), nombre: 'Cloxacilina 2g EV c/6h', indicadoPor: 'Dr. Saavedra', fecha: formatDate(new Date()), done: true, horaRealizado: '08:00' },
      { id: uid(), nombre: 'Curación y demarcación con tinta', indicadoPor: 'Dr. Saavedra', fecha: formatDate(new Date()), done: true, horaRealizado: '09:00' },
      { id: uid(), nombre: 'Mantener extremidad elevada 30°', indicadoPor: 'Dr. Saavedra', fecha: formatDate(new Date()), done: true, horaRealizado: 'Continuo' },
    ],
    pendientes: [
      { id: uid(), texto: 'Control hemograma y PCR mañana AM' },
      { id: uid(), texto: 'Evaluar paso a amoxicilina-clavulánico oral si mejoría sostenida' },
    ]
  },
];

/* ─── INIT: cargar pacientes si no existen ─── */
function initData() {
  if (!localStorage.getItem(KEYS.PATIENTS)) {
    storageSet(KEYS.PATIENTS, SAMPLE_PATIENTS);
  }
  if (!localStorage.getItem(KEYS.CONFIG)) {
    const cfg = { ...DEFAULT_CONFIG };
    cfg.currentShift = detectShiftFromHour();
    cfg.shiftStart = formatTime(new Date());
    saveConfig(cfg);
  }
}
