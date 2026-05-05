// ===============================
// ZENTRYX V2609 - MÓDULO VEHÍCULOS
// ===============================
(function(){
  "use strict";
  const MODULO = {
    nombre: "vehiculos",
    version: "2609",
    activo: true,
    init: function(){
      console.log("Módulo vehículos V2609 activo");
      crearMarcaDiscreta();
      detectarVehiculos();
      return true;
    }
  };

  function crearMarcaDiscreta(){
    if(document.getElementById("zx_mod_vehiculos_badge")) return;
    var b = document.createElement("div");
    b.id = "zx_mod_vehiculos_badge";
    b.textContent = "Vehículos OK";
    b.style.position = "fixed";
    b.style.left = "92px";
    b.style.bottom = "8px";
    b.style.zIndex = "99999";
    b.style.background = "#dbeafe";
    b.style.color = "#1e3a8a";
    b.style.border = "1px solid #93c5fd";
    b.style.borderRadius = "999px";
    b.style.padding = "5px 8px";
    b.style.fontSize = "11px";
    b.style.fontWeight = "800";
    b.style.opacity = ".55";
    document.body.appendChild(b);
  }

  function detectarVehiculos(){
    document.addEventListener("click", function(e){
      var el = e.target.closest("button, a");
      if(!el) return;
      var texto = String(el.innerText || el.textContent || "").toLowerCase();
      if(texto.indexOf("vehículo") !== -1 || texto.indexOf("vehiculos") !== -1 || texto.indexOf("vehículos") !== -1){
        console.log("Módulo vehículos detectó acceso a vehículos");
        window.ZENTRYX.ultimoEventoModuloVehiculos = { tipo: "vehiculos_detectado", fecha: new Date().toISOString() };
      }
    }, true);
  }

  function registrar(){
    if(!window.ZENTRYX || typeof window.ZENTRYX.registrarModulo !== "function"){
      setTimeout(registrar, 100);
      return;
    }
    window.ZENTRYX.registrarModulo("vehiculos", MODULO);
    try{ MODULO.init(); }catch(e){
      console.error("Error inicializando módulo vehículos:", e);
      alert("Error cargando módulo vehículos: " + ((e && e.message) || e));
    }
  }

  if(document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", registrar); }
  else{ registrar(); }
})();
