// ===============================
// ZENTRYX V2619 - MÓDULO FICHAJES + VEHÍCULOS
// ===============================
(function(){
  "use strict";

  const MODULO = {nombre:"fichajes", version:"2619", activo:true, init:init};

  function init(){
    console.log("Módulo fichajes V2619 activo");
    crearMarcaDiscreta();
    interceptarEntrada();
    interceptarSalida();
    return true;
  }

  function crearMarcaDiscreta(){
    if(document.getElementById("zx_mod_fichajes_badge")) return;
    var b=document.createElement("div");
    b.id="zx_mod_fichajes_badge"; b.textContent="Fichajes OK";
    b.style.position="fixed"; b.style.left="8px"; b.style.bottom="8px"; b.style.zIndex="99999";
    b.style.background="#dcfce7"; b.style.color="#166534"; b.style.border="1px solid #86efac";
    b.style.borderRadius="999px"; b.style.padding="5px 8px"; b.style.fontSize="11px"; b.style.fontWeight="800"; b.style.opacity=".55";
    document.body.appendChild(b);
  }

  function textoBoton(btn){ return String(btn.innerText || btn.textContent || "").toLowerCase(); }
  function esEntrada(btn){ var t=textoBoton(btn); return t.indexOf("entrada") !== -1 && t.indexOf("salida") === -1; }
  function esSalida(btn){ return textoBoton(btn).indexOf("salida") !== -1; }

  async function seleccionarVehiculoLibre(){
    if(!window.vehiculosAPI || typeof window.vehiculosAPI.listarLibres !== "function") return null;
    var res = await window.vehiculosAPI.listarLibres();
    if(res.error){ alert("Error cargando vehículos: " + (res.error.message || res.error)); return null; }
    var libres = res.data || [];
    if(libres.length === 0){ alert("No hay vehículos disponibles."); return null; }

    var texto = libres.map(function(v,i){ return (i+1)+". "+(v.matricula||"Sin matrícula")+" · "+(v.km_actual||0)+" km"; }).join("\\n");
    var elegido = prompt("Selecciona vehículo:\\n" + texto);
    if(elegido === null) return null;
    var vehiculo = libres[Number(elegido)-1];
    if(!vehiculo){ alert("Selección no válida."); return null; }

    var ocupar = await window.vehiculosAPI.ocupar(vehiculo.id);
    if(ocupar.error){ alert("No se puede usar este vehículo: " + (ocupar.error.message || ocupar.error)); return null; }

    localStorage.setItem("zentryx_vehiculo_fichaje_id", vehiculo.id);
    localStorage.setItem("zentryx_vehiculo_fichaje_matricula", vehiculo.matricula || "");
    localStorage.setItem("zentryx_vehiculo_fichaje_km", String(vehiculo.km_actual || 0));
    alert("Vehículo asignado: " + (vehiculo.matricula || "Vehículo"));
    return vehiculo;
  }

  function interceptarEntrada(){
    document.addEventListener("click", async function(e){
      var btn=e.target.closest("button");
      if(!btn || !esEntrada(btn)) return;

      if(btn.dataset.zxVehiculoEntradaListo === "1"){ btn.dataset.zxVehiculoEntradaListo="0"; return; }
      if(!window.vehiculosAPI) return;

      e.preventDefault(); e.stopImmediatePropagation();
      var vehiculo = await seleccionarVehiculoLibre();
      if(!vehiculo) return;

      btn.dataset.zxVehiculoEntradaListo="1";
      setTimeout(function(){ btn.click(); }, 50);
    }, true);
  }

  function interceptarSalida(){
    document.addEventListener("click", async function(e){
      var btn=e.target.closest("button");
      if(!btn || !esSalida(btn)) return;

      if(btn.dataset.zxKmModuloListo === "1"){ btn.dataset.zxKmModuloListo="0"; return; }

      e.preventDefault(); e.stopImmediatePropagation();

      var vehiculoId = localStorage.getItem("zentryx_vehiculo_fichaje_id");
      var matricula = localStorage.getItem("zentryx_vehiculo_fichaje_matricula") || "vehículo";
      var kmAnterior = Number(localStorage.getItem("zentryx_vehiculo_fichaje_km") || 0);

      if(!vehiculoId){ alert("No hay vehículo asignado a esta jornada."); return; }

      var km = prompt("Introduce km actuales de " + matricula + ":\\nKm guardados: " + kmAnterior, kmAnterior ? String(kmAnterior) : "");
      if(km === null){ alert("Debes introducir km para cerrar salida con vehículo."); window.ZENTRYX_KM_SALIDA=null; return; }

      km = Number(String(km).replace(",", ".").trim());
      if(!km || Number.isNaN(km) || km <= 0){ alert("Km no válido."); window.ZENTRYX_KM_SALIDA=null; return; }
      if(km < kmAnterior){ alert("Los km no pueden ser menores que los actuales (" + kmAnterior + ")."); return; }

      if(window.vehiculosAPI){
        var act = await window.vehiculosAPI.actualizarKm(vehiculoId, km, "Fichaje salida");
        if(act.error){ alert("Error actualizando km: " + (act.error.message || act.error)); return; }
        await window.vehiculosAPI.liberar(vehiculoId);
      }

      window.ZENTRYX_KM_SALIDA = km;
      localStorage.removeItem("zentryx_vehiculo_fichaje_id");
      localStorage.removeItem("zentryx_vehiculo_fichaje_matricula");
      localStorage.removeItem("zentryx_vehiculo_fichaje_km");

      btn.dataset.zxKmModuloListo="1";
      setTimeout(function(){ btn.click(); }, 50);
    }, true);
  }

  function registrar(){
    if(!window.ZENTRYX || typeof window.ZENTRYX.registrarModulo !== "function"){ setTimeout(registrar,100); return; }
    window.ZENTRYX.registrarModulo("fichajes", MODULO);
    try{ MODULO.init(); }catch(e){ console.error("Error inicializando módulo fichajes:", e); alert("Error cargando módulo fichajes: " + ((e && e.message) || e)); }
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", registrar);
  else registrar();
})();

// V2619: selector visual/sin vehículo incluido en hoja de ruta; base de bloqueo y km activa.
