// ===============================
// ZENTRYX V2611 - MÓDULO VEHÍCULOS FUNCIONAL
// ===============================

(function(){
  "use strict";

  const MODULO = {
    nombre: "vehiculos",
    version: "2611",
    activo: true,

    init: function(){
      console.log("Vehículos activo V2611");
      crearAviso();
      activarEventos();
      return true;
    }
  };

  function crearAviso(){
    var viejo = document.getElementById("zx_mod_vehiculos_banner");
    if(viejo) viejo.remove();

    var aviso = document.createElement("div");
    aviso.id = "zx_mod_vehiculos_banner";
    aviso.textContent = "VEHÍCULOS LISTO V2611";
    aviso.style.position = "fixed";
    aviso.style.top = "60px";
    aviso.style.left = "10px";
    aviso.style.right = "10px";
    aviso.style.zIndex = "999999";
    aviso.style.background = "#dcfce7";
    aviso.style.color = "#166534";
    aviso.style.border = "2px solid #22c55e";
    aviso.style.borderRadius = "14px";
    aviso.style.padding = "10px";
    aviso.style.fontWeight = "800";
    aviso.style.textAlign = "center";
    aviso.style.boxShadow = "0 10px 24px rgba(0,0,0,.22)";

    document.body.appendChild(aviso);

    setTimeout(function(){
      aviso.remove();
    }, 4500);
  }

  function activarEventos(){
    document.addEventListener("click", function(e){
      var btn = e.target.closest("button, a");
      if(!btn) return;

      var texto = String(btn.innerText || btn.textContent || "").toLowerCase();

      if(
        texto.indexOf("vehiculo") !== -1 ||
        texto.indexOf("vehículo") !== -1 ||
        texto.indexOf("vehículos") !== -1 ||
        texto.indexOf("vehiculos") !== -1 ||
        texto.indexOf("abrir vehículos") !== -1
      ){
        mostrarPanelVehiculos();
      }
    }, true);
  }

  function mostrarPanelVehiculos(){
    var existente = document.getElementById("zx_panel_vehiculos_modulo");
    if(existente) existente.remove();

    var fondo = document.createElement("div");
    fondo.id = "zx_panel_vehiculos_modulo";
    fondo.style.position = "fixed";
    fondo.style.inset = "0";
    fondo.style.background = "rgba(15,23,42,.55)";
    fondo.style.zIndex = "999998";
    fondo.style.display = "flex";
    fondo.style.alignItems = "center";
    fondo.style.justifyContent = "center";
    fondo.style.padding = "18px";

    var panel = document.createElement("div");
    panel.style.background = "#fff";
    panel.style.color = "#111827";
    panel.style.padding = "22px";
    panel.style.borderRadius = "18px";
    panel.style.width = "100%";
    panel.style.maxWidth = "420px";
    panel.style.boxShadow = "0 22px 45px rgba(0,0,0,.35)";

    panel.innerHTML = `
      <h2 style="margin-top:0;font-size:28px;">Vehículos</h2>
      <p>El módulo de vehículos ya responde desde archivo externo.</p>
      <p style="color:#64748b;">Siguiente paso: mover aquí el listado real de vehículos.</p>
      <button id="zx_cerrar_panel_vehiculos" style="
        width:100%;
        padding:14px;
        border:0;
        border-radius:12px;
        background:#0f172a;
        color:#fff;
        font-weight:800;
        font-size:16px;
      ">Cerrar</button>
    `;

    fondo.appendChild(panel);
    document.body.appendChild(fondo);

    document.getElementById("zx_cerrar_panel_vehiculos").onclick = function(){
      fondo.remove();
    };

    fondo.addEventListener("click", function(e){
      if(e.target === fondo) fondo.remove();
    });
  }

  function registrar(){
    if(!window.ZENTRYX || typeof window.ZENTRYX.registrarModulo !== "function"){
      setTimeout(registrar, 100);
      return;
    }

    window.ZENTRYX.registrarModulo("vehiculos", MODULO);

    try{
      MODULO.init();
    }catch(e){
      console.error("Error inicializando módulo vehículos:", e);
      alert("Error cargando módulo vehículos: " + ((e && e.message) || e));
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", registrar);
  }else{
    registrar();
  }
})();
