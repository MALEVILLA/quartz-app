// Estado global de la aplicación
let appState = {
  datasetEmpresas: [],
  datasetCuentas: [],
  diccionarioPaises: {},
  continentes: [],
  tabActivo: 'empresas'
};

// Cargar datos desde data.json
async function cargarDatos() {
  try {
    const response = await fetch('data.json');
    const data = await response.json();
    
    appState.datasetEmpresas = data.empresas;
    appState.datasetCuentas = data.cuentas;
    appState.diccionarioPaises = data.paises;
    appState.continentes = data.continentes;
    
    // Inicializar UI
    inicializarFiltros();
    renderDashboards(appState.datasetEmpresas, appState.datasetCuentas);
  } catch (error) {
    console.error('Error cargando datos:', error);
  }
}

// Inicializar dropdowns de filtros
function inicializarFiltros() {
  const filterPais = document.getElementById('filterPais');
  const filterContinente = document.getElementById('filterContinente');
  
  // Poblar países
  const paises = Object.keys(appState.diccionarioPaises);
  paises.forEach(pais => {
    const option = document.createElement('option');
    option.value = pais;
    option.textContent = pais;
    filterPais.appendChild(option);
  });
  
  // Poblar continentes
  appState.continentes.forEach(continente => {
    const option = document.createElement('option');
    option.value = continente;
    option.textContent = continente;
    filterContinente.appendChild(option);
  });
}

// Cambiar tab activo
function cambiarTab(tab) {
  appState.tabActivo = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  const empContainer = document.getElementById('dashboardEmpresas');
  const ctaContainer = document.getElementById('dashboardCuentas');
  
  if (tab === 'empresas') {
    empContainer.style.display = 'block';
    ctaContainer.style.display = 'none';
  } else {
    empContainer.style.display = 'none';
    ctaContainer.style.display = 'block';
  }
}

// Lógica de Filtros en Tiempo Real
function filtrarTodo() {
  const query = document.getElementById('searchGeneral').value.toLowerCase();
  const moneda = document.getElementById('filterMoneda').value;
  const pais = document.getElementById('filterPais').value;
  const continente = document.getElementById('filterContinente').value;

  // Filtrar Cuentas
  const cuentasFiltradas = appState.datasetCuentas.filter(cta => {
    const empresa = appState.datasetEmpresas.find(e => e.id === cta.empresaId);
    
    const matchQuery = 
      cta.banco.toLowerCase().includes(query) || 
      (empresa && empresa.nombre.toLowerCase().includes(query)) ||
      cta.iban.toLowerCase().includes(query) ||
      cta.swift.toLowerCase().includes(query);
    
    const matchMoneda = moneda === '' || cta.moneda === moneda;
    const matchPais = pais === '' || cta.pais === pais;
    const matchContinente = continente === '' || cta.continente === continente;

    return matchQuery && matchMoneda && matchPais && matchContinente;
  });

  // Filtrar Empresas (mostrar si tienen cuentas que coinciden o si coinciden directamente)
  const empresasFiltradas = appState.datasetEmpresas.filter(emp => {
    const matchQuery = 
      emp.nombre.toLowerCase().includes(query) || 
      emp.actividad.toLowerCase().includes(query);
    
    const matchPais = pais === '' || emp.pais === pais;
    const matchContinente = continente === '' || emp.continente === continente;
    
    // Verificar si tiene cuentas que coinciden con los filtros
    const tieneCuentasValidas = appState.datasetCuentas.some(c => {
      if (c.empresaId !== emp.id) return false;
      const matchMonedaCta = moneda === '' || c.moneda === moneda;
      const matchPaisCta = pais === '' || c.pais === pais;
      const matchContinenteCta = continente === '' || c.continente === continente;
      return matchMonedaCta && matchPaisCta && matchContinenteCta;
    });

    const tieneCuentasConQuery = appState.datasetCuentas.some(c => 
      c.empresaId === emp.id && (
        c.banco.toLowerCase().includes(query) ||
        c.iban.toLowerCase().includes(query) ||
        c.swift.toLowerCase().includes(query)
      )
    );

    return (matchQuery || tieneCuentasConQuery) && matchPais && matchContinente && tieneCuentasValidas;
  });

  renderDashboards(empresasFiltradas, cuentasFiltradas);
}

// Renderizadores de los Dashboards
function renderDashboards(empresasFiltradas, cuentasFiltradas) {
  renderEmpresas(empresasFiltradas);
  renderCuentas(cuentasFiltradas);
}

// Renderizar Dashboard de Empresas
function renderEmpresas(empresasFiltradas) {
  const empContainer = document.getElementById('dashboardEmpresas');
  empContainer.innerHTML = '';

  if (empresasFiltradas.length === 0) {
    empContainer.innerHTML = '<div class="no-results">No se encontraron empresas</div>';
    return;
  }

  empresasFiltradas.forEach(emp => {
    const cuentasAsociadas = appState.datasetCuentas.filter(c => c.empresaId === emp.id);
    const paisesCuentas = [...new Set(cuentasAsociadas.map(c => c.pais))];
    const labelFiscal = appState.diccionarioPaises[emp.pais]?.taxLabel || 'ID Fiscal';
    const monedas = [...new Set(cuentasAsociadas.map(c => c.moneda))];

    const card = document.createElement('div');
    card.className = 'empresa-card';
    card.innerHTML = `
      <div class="card-header">
        <div>
          <h3 class="empresa-nombre">${emp.nombre}</h3>
          <p class="empresa-actividad">${emp.actividad}</p>
        </div>
        <span class="continente-badge">${emp.continente}</span>
      </div>

      <div class="card-body">
        <div class="info-row">
          <span class="label">${labelFiscal}:</span>
          <span class="value">${emp.taxId}</span>
        </div>
        <div class="info-row">
          <span class="label">País:</span>
          <span class="value">${emp.pais}</span>
        </div>
        <div class="info-row">
          <span class="label">Email:</span>
          <span class="value">${emp.mail}</span>
        </div>
        <div class="info-row">
          <span class="label">Dirección:</span>
          <span class="value">${emp.direccion}</span>
        </div>
      </div>

      <div class="cuentas-section">
        <h4 class="section-title">Cuentas Asociadas (${cuentasAsociadas.length})</h4>
        <div class="cuentas-grid">
          ${cuentasAsociadas.map(c => `
            <div class="mini-cuenta">
              <div class="mini-banco">${c.banco}</div>
              <div class="mini-info">
                <span class="moneda-badge">${c.moneda}</span>
                <span class="pais-badge">${c.pais}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    empContainer.appendChild(card);
  });

  actualizarContador('empresas', empresasFiltradas.length);
}

// Renderizar Dashboard de Cuentas
function renderCuentas(cuentasFiltradas) {
  const ctaContainer = document.getElementById('dashboardCuentas');
  ctaContainer.innerHTML = '';

  if (cuentasFiltradas.length === 0) {
    ctaContainer.innerHTML = '<div class="no-results">No se encontraron cuentas</div>';
    return;
  }

  cuentasFiltradas.forEach(cta => {
    const empresaPropietaria = appState.datasetEmpresas.find(e => e.id === cta.empresaId);
    
    // Generar texto para compartir en WhatsApp
    const shareText = `📊 DATOS BANCARIOS
      
Empresa: ${empresaPropietaria?.nombre || 'Desconocida'}
Banco: ${cta.banco}
País: ${cta.pais} (${cta.continente})
Moneda: ${cta.moneda}

📋 Datos Bancarios:
IBAN: ${cta.iban}
SWIFT/BIC: ${cta.swift}
${cta.ruta !== 'No Aplica' ? `Ruta/ABA: ${cta.ruta}` : ''}

📍 Ubicación: ${cta.direccion}`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

    const card = document.createElement('div');
    card.className = 'cuenta-card';
    card.innerHTML = `
      <div class="card-header">
        <div>
          <p class="empresa-propietaria">Empresa: ${empresaPropietaria?.nombre || 'Desconocida'}</p>
          <h3 class="banco-nombre">${cta.banco}</h3>
        </div>
        <span class="moneda-badge-large">${cta.moneda}</span>
      </div>

      <div class="card-body">
        <div class="info-row">
          <span class="label">IBAN:</span>
          <span class="value monospace">${cta.iban}</span>
        </div>
        <div class="info-row">
          <span class="label">SWIFT/BIC:</span>
          <span class="value monospace">${cta.swift}</span>
        </div>
        ${cta.ruta !== 'No Aplica' ? `
        <div class="info-row">
          <span class="label">Ruta/ABA:</span>
          <span class="value monospace">${cta.ruta}</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span class="label">País/Región:</span>
          <span class="value">${cta.pais} (${cta.continente})</span>
        </div>
        <div class="info-row">
          <span class="label">Dirección:</span>
          <span class="value">${cta.direccion}</span>
        </div>
      </div>

      <div class="card-footer">
        <button class="btn-copy" onclick="copiarAlPortapapeles('${cta.iban}', this)">📋 Copiar IBAN</button>
        <a href="${whatsappUrl}" target="_blank" class="btn-whatsapp">💬 Compartir WhatsApp</a>
      </div>
    `;

    ctaContainer.appendChild(card);
  });

  actualizarContador('cuentas', cuentasFiltradas.length);
}

// Actualizar contador de resultados
function actualizarContador(tipo, cantidad) {
  const contador = document.getElementById(`contador-${tipo}`);
  if (contador) {
    contador.textContent = cantidad;
  }
}

// Copiar al portapapeles
function copiarAlPortapapeles(texto, elemento) {
  navigator.clipboard.writeText(texto).then(() => {
    const originalText = elemento.textContent;
    elemento.textContent = '✅ Copiado';
    setTimeout(() => {
      elemento.textContent = originalText;
    }, 2000);
  });
}

// Cargar datos al iniciar
window.addEventListener('DOMContentLoaded', cargarDatos);
