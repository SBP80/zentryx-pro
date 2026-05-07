// ===============================
// ZENTRYX V2623 - MÓDULO INICIO LIMPIO
// Archivo: src/modules/inicio.js
// ===============================
// Objetivo:
// - Eliminar pantalla antigua de inicio.
// - No pintar Alertas de flota antiguas.
// - No pintar Jornada antigua.
// - Dejar Inicio controlado por el layout nuevo.
// - Mantener compatibilidad con botones antiguos si los llama app.html.

(function(){
  "use strict";

  const MODULO = {
    nombre: "inicio",
    version: "2623",
    activo: true,
    init: init,
    abrir: abrirInicio
  };

  function usuarioActual(){
    try{
      return JSON.parse(localStorage.getItem("usuario") || "{}");
    }catch(e){
      return {};
    }
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

  function crearEstilosInicio(){
    const viejo = document.getElementById("zx_inicio_styles");
    if(viejo) viejo.remove();

    const style = document.createElement("style");
    style.id = "zx_inicio_styles";

    style.textContent = `
      .zx-inicio-main{
        padding:18px;
      }

      .zx-inicio-card{
        background:#ffffff;
        border:1px solid #d1d5db;
        border-radius:24px;
        padding:24px;
        margin-bottom:18px;
        box-shadow:0 10px 30px rgba(15,23,42,.08);
      }

      .zx-inicio-card h1{
        margin:0 0 14px;
        font-size:34px;
        line-height:1.05;
        font-weight:900;
        color:#111827;
      }

      .zx-inicio-card h2{
        margin:0 0 8px;
        font-size:22px;
        font-weight:900;
        color:#111827;
      }

      .zx-inicio-muted{
        color:#6b7280;
        font-size:18px;
        line-height:1.4;
      }

      .zx-inicio-badges{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        margin-top:20px;
      }

      .zx-inicio-badge{
        display:inline-block;
        border-radius:999px;
        padding:10px 14px;
        font-weight:900;
      }

      .zx-inicio-badge-red{
        background:#fee2e2;
        color:#991b1b;
      }

      .zx-inicio-badge-gray{
        background:#e5e7eb;
        color:#111827;
      }

      .zx-inicio-grid{
        display:grid;
        grid-template-columns:1fr;
        gap:14px;
      }

      .zx-inicio-action{
        width:100%;
        border:0;
        border-radius:16px;
        padding:16px;
        background:#2563eb;
        color:#fff;
        font-size:18px;
        font-weight:900;
      }

      .zx-inicio-action.gray{
        background:#e5e7eb;
        color:#111827;
      }

      .zx-inicio-action.green{
        background:#16a34a;
        color:#fff;
      }

      .zx-inicio-action.red{
        background:#dc2626;
        color:#fff;
      }
    `;

    document.head.appendChild(style);
  }

  function limpiarRestosViejos(){
    // Oculta alertas/flota/jornada viejas que hayan quedado pintadas por app.html.
    document.querySelectorAll("section, div, article, main").forEach(function(el){
      if(!el || el.id === "app") return;
      if(el.id && el.id.startsWith("zx_")) return;

      const txt = String(el.innerText || "");

      if(
        txt.includes("Alertas de flota") ||
        txt.includes("Jornada de hoy") ||
        txt.includes("Trabajo total") ||
        txt.includes("Pausas:") ||
        txt.includes("Horas extra:")
      ){
        el.style.display = "none";
        el.style.visibility = "hidden";
        el.style.height = "0";
        el.style.overflow = "hidden";
        el.style.pointerEvents = "none";
      }
    });

    // Oculta botones flotantes viejos, excepto los que pertenecen a módulos actuales.
    document.querySelectorAll("button, a, div").forEach(function(el){
      if(!el) return;
      if(el.id && el.id.startsWith("zx_")) return;

      const txt = String(el.innerText || "").trim();
      const st = window.getComputedStyle(el);

      if(txt === "📝" || txt === "✏️"){
        el.style.display = "none";
      }

      if(
        st.position === "fixed" &&
        txt === "Vehículos"
      ){
        // Este era el flotante viejo. Lo ocultamos para que el menú sea la vía principal.
        el.style.display = "none";
      }
    });
  }

  function abrirInicio(){
    crearEstilosInicio();

    const app = contenedorApp();
    const u = usuarioActual();

    const nombre = u.nombre || u.usuario || "Administrador";
    const rol = u.rol || u.tipo || "admin";

    app.innerHTML = `
      <main class="zx-inicio-main" data-zx-modulo="inicio" data-zx-version="2623">

        <section class="zx-inicio-card">
          <h1>Panel principal</h1>
          <h2>${nombre}</h2>
          <div class="zx-inicio-muted">${rol}</div>

          <div class="zx-inicio-badges">
            <span class="zx-inicio-badge zx-inicio-badge-red">Fuera</span>
            <span class="zx-inicio-badge zx-inicio-badge-gray">Estado interno: fuera</span>
          </div>
        </section>

        <section class="zx-inicio-card">
          <h1>Inicio</h1>
          <div class="zx-inicio-muted">
            Pantalla de inicio limpia V2623.
            <br><br>
            Se han retirado de esta vista las alertas antiguas incrustadas en app.html.
          </div>
        </section>

        <section class="zx-inicio-card">
          <h1>Módulos rápidos</h1>

          <div class="zx-inicio-grid">
            <button class="zx-inicio-action" onclick="ZENTRYX_UI_abrirVehiculos()">Vehículos</button>
            <button class="zx-inicio-action gray" onclick="ZENTRYX_UI_usuarios()">Usuarios</button>
            <button class="zx-inicio-action gray" onclick="ZENTRYX_UI_incidencias()">Incidencias</button>
            <button class="zx-inicio-action gray" onclick="ZENTRYX_UI_informes()">Informes</button>
          </div>
        </section>

      </main>
    `;

    setTimeout(limpiarRestosViejos, 50);
    setTimeout(limpiarRestosViejos, 400);
    setTimeout(limpiarRestosViejos, 1000);
  }

  function init(){
    console.log("Inicio limpio V2623 activo");

    // Sobrescribimos Inicio global para que el menú nuevo use este módulo.
    window.ZENTRYX_UI_inicio = abrirInicio;
    window.ZX_inicio = abrirInicio;

    // Si la app ya está en inicio, repintamos limpio.
    const app = contenedorApp();
    const txt = String(app.innerText || "");

    if(
      !txt ||
      txt.includes("Alertas de flota") ||
      txt.includes("Panel principal") ||
      txt.includes("Jornada de hoy")
    ){
      abrirInicio();
    }

    setInterval(limpiarRestosViejos, 1200);

    return true;
  }

  function registrar(){
    if(!window.ZENTRYX || typeof window.ZENTRYX.registrarModulo !== "function"){
      setTimeout(registrar, 100);
      return;
    }

    window.ZENTRYX.registrarModulo("inicio", MODULO);

    try{
      MODULO.init();
    }catch(e){
      console.error("Error inicializando módulo inicio:", e);
      alert("Error cargando módulo inicio: " + ((e && e.message) || e));
    }
  }

  window.ZENTRYX_MODULO_INICIO_ABRIR = abrirInicio;
  window.ZENTRYX_UI_inicio = abrirInicio;
  window.ZX_inicio = abrirInicio;

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", registrar);
  }else{
    registrar();
  }

})();
