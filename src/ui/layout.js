// ===============================
// ZENTRYX V2621 - UI LAYOUT CENTRAL
// Archivo: src/ui/layout.js
// ===============================
// Objetivo:
// - Centralizar cabecera, reloj, navegación y panel principal.
// - Preparar app.html para ir vaciándolo poco a poco.
// - No rompe los módulos actuales: vehículos, fichajes, usuarios, etc.

(function(){
  "use strict";

  const VERSION_UI = "2621";

  let relojInterval = null;

  function usuarioActual(){
    try{
      return JSON.parse(localStorage.getItem("usuario") || "{}");
    }catch(e){
      return {};
    }
  }

  function textoUsuario(){
    const u = usuarioActual();
    const nombre = u.nombre || u.usuario || "Usuario";
    const rol = u.rol || u.tipo || "usuario";
    return {
      nombre,
      rol,
      linea: nombre + " · " + rol
    };
  }

  function contenedorApp(){
    let app = document.getElementById("app");

    if(!app){
      app = document.createElement("div");
      app.id = "app";
      document.body.appendChild(app);
    }

    return app;
  }

  function formatoFecha(){
    const ahora = new Date();

    return ahora.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function formatoHora(){
    const ahora = new Date();

    return ahora.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function pintarHeader(){
    let header = document.getElementById("zx_header_principal");

    if(!header){
      header = document.createElement("header");
      header.id = "zx_header_principal";
      document.body.prepend(header);
    }

    header.className = "zx-header-principal";
    header.innerHTML = `
      <div class="zx-header-top">
        <div>
          <h1 class="zx-header-title">Zentryx V${window.ZENTRYX?.version || VERSION_UI}</h1>
          <div id="zx_fecha" class="zx-header-fecha">${formatoFecha()}</div>
          <div id="zx_reloj" class="zx-header-reloj">${formatoHora()}</div>
        </div>

        <button class="zx-btn-salir" onclick="ZENTRYX_UI_salir()">Salir</button>
      </div>
    `;

    if(relojInterval){
      clearInterval(relojInterval);
    }

    relojInterval = setInterval(function(){
      const f = document.getElementById("zx_fecha");
      const r = document.getElementById("zx_reloj");

      if(f) f.textContent = formatoFecha();
      if(r) r.textContent = formatoHora();
    }, 1000);
  }

  function pintarBarraUsuario(){
    let barra = document.getElementById("zx_barra_usuario");

    if(!barra){
      barra = document.createElement("section");
      barra.id = "zx_barra_usuario";

      const header = document.getElementById("zx_header_principal");
      if(header && header.nextSibling){
        document.body.insertBefore(barra, header.nextSibling);
      }else{
        document.body.appendChild(barra);
      }
    }

    const u = textoUsuario();

    barra.className = "zx-barra-usuario";
    barra.innerHTML = `
      <div class="zx-logo">Z</div>

      <div class="zx-user-info">
        <div class="zx-user-title">Zentryx PRO</div>
        <div class="zx-user-subtitle">${u.linea}</div>
      </div>
    `;
  }

  function botonNav(texto, accion){
    return `<button class="zx-nav-btn" onclick="${accion}">${texto}</button>`;
  }

  function pintarNav(){
    let nav = document.getElementById("zx_nav_principal");

    if(!nav){
      nav = document.createElement("nav");
      nav.id = "zx_nav_principal";

      const barra = document.getElementById("zx_barra_usuario");
      if(barra && barra.nextSibling){
        document.body.insertBefore(nav, barra.nextSibling);
      }else{
        document.body.appendChild(nav);
      }
    }

    nav.className = "zx-nav-principal";
    nav.innerHTML = `
      ${botonNav("Inicio", "ZENTRYX_UI_inicio()")}
      ${botonNav("Usuarios", "ZENTRYX_UI_usuarios()")}
      ${botonNav("Incidencias", "ZENTRYX_UI_incidencias()")}
      ${botonNav("Informes", "ZENTRYX_UI_informes()")}
      ${botonNav("Vehículos", "ZENTRYX_UI_abrirVehiculos()")}
    `;
  }

  function pintarPanelPrincipal(){
    const app = contenedorApp();
    const u = textoUsuario();

    app.innerHTML = `
      <main class="zx-main">
        <section class="zx-card">
          <h1>Panel principal</h1>
          <h2>${u.nombre}</h2>
          <p class="zx-muted">${u.rol}</p>

          <div class="zx-badges">
            <span class="zx-badge zx-badge-red">Fuera</span>
            <span class="zx-badge zx-badge-gray">Estado interno: fuera</span>
          </div>
        </section>

        <section class="zx-card zx-card-soft">
          <h1>Resumen</h1>
          <p class="zx-muted">Base visual V2621 cargada desde <b>src/ui/layout.js</b>.</p>
          <p class="zx-muted">Los módulos actuales siguen funcionando encima de esta estructura.</p>
        </section>
      </main>
    `;
  }

  function aplicarEstilosLayout(){
    if(document.getElementById("zx_layout_styles")) return;

    const style = document.createElement("style");
    style.id = "zx_layout_styles";
    style.textContent = `
      :root{
        --zx-dark:#0f172a;
        --zx-bg:#eef2f7;
        --zx-card:#ffffff;
        --zx-text:#111827;
        --zx-muted:#6b7280;
        --zx-blue:#2563eb;
        --zx-red:#dc2626;
        --zx-green:#16a34a;
        --zx-line:#d1d5db;
      }

      body{
        margin:0;
        background:var(--zx-bg);
        color:var(--zx-text);
        font-family:Arial, Helvetica, sans-serif;
      }

      .zx-header-principal{
        background:var(--zx-dark);
        color:#fff;
        padding:24px 20px 26px;
      }

      .zx-header-top{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:18px;
      }

      .zx-header-title{
        margin:0;
        font-size:38px;
        line-height:1.05;
        font-weight:900;
        letter-spacing:-1px;
      }

      .zx-header-fecha{
        margin-top:12px;
        color:#cbd5e1;
        font-size:22px;
      }

      .zx-header-reloj{
        margin-top:12px;
        font-size:34px;
        line-height:1;
        font-weight:900;
      }

      .zx-btn-salir{
        border:0;
        border-radius:16px;
        background:var(--zx-red);
        color:#fff;
        font-size:20px;
        font-weight:900;
        padding:16px 24px;
      }

      .zx-barra-usuario{
        background:linear-gradient(180deg,#111827,#1f2937);
        color:#fff;
        display:flex;
        align-items:center;
        gap:16px;
        padding:18px 20px 12px;
      }

      .zx-logo{
        width:52px;
        height:52px;
        border-radius:14px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:linear-gradient(135deg,#2563eb,#16a34a);
        font-size:30px;
        font-weight:900;
      }

      .zx-user-title{
        font-size:22px;
        font-weight:900;
      }

      .zx-user-subtitle{
        margin-top:4px;
        color:#cbd5e1;
        font-size:17px;
        font-weight:700;
      }

      .zx-nav-principal{
        background:#1f2937;
        display:flex;
        gap:10px;
        overflow-x:auto;
        padding:10px 20px 18px;
        border-bottom:1px solid rgba(255,255,255,.15);
      }

      .zx-nav-btn{
        flex:0 0 auto;
        background:transparent;
        color:#fff;
        border:1px solid rgba(255,255,255,.85);
        padding:12px 18px;
        font-size:16px;
        font-weight:800;
        border-radius:0;
      }

      .zx-main{
        padding:16px;
      }

      .zx-card{
        background:var(--zx-card);
        border:1px solid var(--zx-line);
        border-radius:20px;
        padding:22px;
        margin-bottom:16px;
        box-shadow:0 10px 25px rgba(15,23,42,.08);
      }

      .zx-card h1{
        margin:0 0 14px;
        font-size:34px;
        line-height:1.05;
        font-weight:900;
      }

      .zx-card h2{
        margin:0 0 8px;
        font-size:22px;
      }

      .zx-muted{
        color:var(--zx-muted);
        font-size:18px;
        line-height:1.35;
      }

      .zx-card-soft{
        background:#f8fafc;
      }

      .zx-badges{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        margin-top:20px;
      }

      .zx-badge{
        display:inline-block;
        border-radius:999px;
        padding:10px 14px;
        font-weight:900;
      }

      .zx-badge-red{
        background:#fee2e2;
        color:#991b1b;
      }

      .zx-badge-gray{
        background:#e5e7eb;
        color:#111827;
      }
    `;

    document.head.appendChild(style);
  }

  function limpiarElementosViejosDuplicados(){
    // No borra app vieja agresivamente. Solo evita duplicados del layout nuevo.
    const duplicadosHeader = document.querySelectorAll("#zx_header_principal");
    duplicadosHeader.forEach(function(el, i){
      if(i > 0) el.remove();
    });

    const duplicadosNav = document.querySelectorAll("#zx_nav_principal");
    duplicadosNav.forEach(function(el, i){
      if(i > 0) el.remove();
    });
  }

  function iniciarLayout(){
    aplicarEstilosLayout();
    limpiarElementosViejosDuplicados();
    pintarHeader();
    pintarBarraUsuario();
    pintarNav();

    const app = contenedorApp();

    if(!app.dataset.zxLayoutInicializado){
      pintarPanelPrincipal();
      app.dataset.zxLayoutInicializado = "1";
    }
  }

  // ===============================
  // FUNCIONES GLOBALES UI
  // ===============================

  window.ZENTRYX_UI_inicio = function(){
    pintarPanelPrincipal();
  };

  window.ZENTRYX_UI_salir = function(){
    localStorage.removeItem("usuario");
    window.location.href = "index.html";
  };

  window.ZENTRYX_UI_usuarios = function(){
    const app = contenedorApp();
    app.innerHTML = `
      <main class="zx-main">
        <section class="zx-card">
          <h1>Usuarios</h1>
          <p class="zx-muted">El módulo usuarios seguirá moviéndose aquí.</p>
        </section>
      </main>
    `;
  };

  window.ZENTRYX_UI_incidencias = function(){
    const app = contenedorApp();
    app.innerHTML = `
      <main class="zx-main">
        <section class="zx-card">
          <h1>Incidencias</h1>
          <p class="zx-muted">Módulo pendiente de limpieza.</p>
        </section>
      </main>
    `;
  };

  window.ZENTRYX_UI_informes = function(){
    const app = contenedorApp();
    app.innerHTML = `
      <main class="zx-main">
        <section class="zx-card">
          <h1>Informes</h1>
          <p class="zx-muted">Módulo pendiente de limpieza.</p>
        </section>
      </main>
    `;
  };

  window.ZENTRYX_UI_iniciarLayout = iniciarLayout;

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", iniciarLayout);
  }else{
    iniciarLayout();
  }

})();
