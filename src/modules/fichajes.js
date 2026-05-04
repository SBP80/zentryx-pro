// ===============================
// ZENTRYX V2606 - MÓDULO FICHAJES
// ===============================

(function(){
  "use strict";

  const MODULO = {
    nombre: "fichajes",
    version: "2606",
    activo: true,

    init: function(){
      console.log("Módulo fichajes V2606 activo");
      crearAvisoVisible();
      interceptarSalida();
      return true;
    }
  };

  function crearAvisoVisible(){
    var viejo = document.getElementById("zx_mod_fichajes_banner");
    if(viejo) viejo.remove();

    var aviso = document.createElement("div");
    aviso.id = "zx_mod_fichajes_banner";
    aviso.textContent = "MÓDULO FICHAJES CARGADO V2606";
    aviso.style.position = "fixed";
    aviso.style.top = "10px";
    aviso.style.left = "10px";
    aviso.style.right = "10px";
    aviso.style.zIndex = "999999";
    aviso.style.background = "#dcfce7";
    aviso.style.color = "#166534";
    aviso.style.border = "2px solid #22c55e";
    aviso.style.borderRadius = "14px";
    aviso.style.padding = "12px";
    aviso.style.fontWeight = "900";
    aviso.style.textAlign = "center";
    aviso.style.boxShadow = "0 10px 24px rgba(0,0,0,.22)";
    document.body.appendChild(aviso);

    setTimeout(function(){
      aviso.style.opacity = ".55";
    }, 6000);
  }

  function esBotonSalida(btn){
    var texto = String(btn.innerText || btn.textContent || "").toLowerCase();
    return texto.indexOf("salida") !== -1;
  }

  async function vehiculoSeleccionado(){
    if(typeof window.vehiculoSeleccionadoFichaje === "function"){
      return window.vehiculoSeleccionadoFichaje();
    }
    var select = document.getElementById("fichaje_vehiculo_id");
    return select ? select.value : "";
  }

  async function leerVehiculo(vehiculoId){
    if(!vehiculoId || !window.sb) return null;

    var res = await window.sb
      .from("org_vehiculos")
      .select("id,matricula,modelo,km_actual")
      .eq("id", vehiculoId)
      .maybeSingle();

    if(res.error){
      console.warn("No se pudo leer vehículo desde módulo fichajes", res.error);
      return null;
    }

    return res.data || null;
  }

  async function pedirKmSalida(vehiculoId){
    var vehiculo = await leerVehiculo(vehiculoId);
    var kmActual = Number(vehiculo && vehiculo.km_actual ? vehiculo.km_actual : 0);
    var nombre = vehiculo
      ? String((vehiculo.matricula || "Vehículo") + " " + (vehiculo.modelo || "")).trim()
      : "vehículo";

    while(true){
      var valor = prompt(
        "Introduce los kilómetros actuales de " + nombre + ".\n\nKm actuales guardados: " + kmActual,
        kmActual ? String(kmActual) : ""
      );

      if(valor === null) return {ok:false, cancelado:true};

      var km = Number(String(valor).replace(",", ".").trim());

      if(!km || Number.isNaN(km) || km <= 0){
        alert("Introduce kilómetros válidos.");
        continue;
      }

      if(kmActual && km < kmActual){
        alert("Los kilómetros introducidos (" + km + ") no pueden ser menores que los actuales del vehículo (" + kmActual + ").");
        continue;
      }

      return {ok:true, km:km};
    }
  }

  function interceptarSalida(){
    document.addEventListener("click", async function(e){
      var btn = e.target.closest("button");
      if(!btn) return;
      if(!esBotonSalida(btn)) return;

      if(btn.dataset.zxKmModuloListo === "1"){
        btn.dataset.zxKmModuloListo = "0";
        return;
      }

      e.preventDefault();
      e.stopImmediatePropagation();

      try{
        var vehiculoId = await vehiculoSeleccionado();

        if(!vehiculoId){
          btn.dataset.zxKmModuloListo = "1";
          setTimeout(function(){ btn.click(); }, 30);
          return;
        }

        var res = await pedirKmSalida(vehiculoId);

        if(!res.ok){
          window.ZENTRYX_KM_SALIDA = null;
          alert("Salida cancelada. Para cerrar jornada con vehículo debes introducir los kilómetros.");
          return;
        }

        window.ZENTRYX_KM_SALIDA = res.km;
        window.ZENTRYX.ultimoEventoModuloFichajes = {
          tipo: "km_salida_capturado",
          km: res.km,
          fecha: new Date().toISOString()
        };

        btn.dataset.zxKmModuloListo = "1";
        setTimeout(function(){ btn.click(); }, 30);

      }catch(err){
        console.error("Error en módulo fichajes V2606", err);
        window.ZENTRYX_KM_SALIDA = null;
        alert("No se pudo preparar la salida: " + ((err && err.message) || err));
      }
    }, true);
  }

  function registrar(){
    if(!window.ZENTRYX || typeof window.ZENTRYX.registrarModulo !== "function"){
      setTimeout(registrar, 100);
      return;
    }

    window.ZENTRYX.registrarModulo("fichajes", MODULO);

    try{
      MODULO.init();
    }catch(e){
      console.error("Error inicializando módulo fichajes:", e);
      alert("Error cargando módulo fichajes: " + ((e && e.message) || e));
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", registrar);
  }else{
    registrar();
  }
})();
