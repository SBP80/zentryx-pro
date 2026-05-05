// ===============================
// ZENTRYX V2611 - MÓDULO FICHAJES
// ===============================
(function(){
  "use strict";
  const MODULO = {
    nombre: "fichajes",
    version: "2611",
    activo: true,
    init: function(){
      console.log("Módulo fichajes V2611 activo");
      crearMarcaDiscreta();
      interceptarSalida();
      return true;
    }
  };

  function crearMarcaDiscreta(){
    if(document.getElementById("zx_mod_fichajes_badge")) return;
    var b = document.createElement("div");
    b.id = "zx_mod_fichajes_badge";
    b.textContent = "Fichajes OK";
    b.style.position = "fixed";
    b.style.left = "8px";
    b.style.bottom = "8px";
    b.style.zIndex = "99999";
    b.style.background = "#dcfce7";
    b.style.color = "#166534";
    b.style.border = "1px solid #86efac";
    b.style.borderRadius = "999px";
    b.style.padding = "5px 8px";
    b.style.fontSize = "11px";
    b.style.fontWeight = "800";
    b.style.opacity = ".55";
    document.body.appendChild(b);
  }

  function esBotonSalida(btn){
    var texto = String(btn.innerText || btn.textContent || "").toLowerCase();
    return texto.indexOf("salida") !== -1;
  }

  function interceptarSalida(){
    document.addEventListener("click", function(e){
      var btn = e.target.closest("button");
      if(!btn) return;
      if(!esBotonSalida(btn)) return;

      if(btn.dataset.zxKmModuloListo === "1"){
        btn.dataset.zxKmModuloListo = "0";
        return;
      }

      e.preventDefault();
      e.stopImmediatePropagation();

      var km = prompt("Introduce km del vehículo:");
      if(km === null){
        alert("Debes introducir km para cerrar salida con vehículo.");
        window.ZENTRYX_KM_SALIDA = null;
        return;
      }

      km = Number(String(km).replace(",", ".").trim());
      if(!km || Number.isNaN(km) || km <= 0){
        alert("Km no válido.");
        window.ZENTRYX_KM_SALIDA = null;
        return;
      }

      window.ZENTRYX_KM_SALIDA = km;
      if(window.ZENTRYX){
        window.ZENTRYX.ultimoEventoModuloFichajes = { tipo: "km_salida_capturado", km: km, fecha: new Date().toISOString() };
      }

      btn.dataset.zxKmModuloListo = "1";
      setTimeout(function(){ btn.click(); }, 50);
    }, true);
  }

  function registrar(){
    if(!window.ZENTRYX || typeof window.ZENTRYX.registrarModulo !== "function"){
      setTimeout(registrar, 100);
      return;
    }
    window.ZENTRYX.registrarModulo("fichajes", MODULO);
    try{ MODULO.init(); }catch(e){
      console.error("Error inicializando módulo fichajes:", e);
      alert("Error cargando módulo fichajes: " + ((e && e.message) || e));
    }
  }

  if(document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", registrar); }
  else{ registrar(); }
})();
