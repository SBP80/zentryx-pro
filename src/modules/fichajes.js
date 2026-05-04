// ===============================
// ZENTRYX V2605 - MÓDULO FICHAJES
// ===============================
// Controla la petición de kilómetros al pulsar salida.
// app.html usa window.ZENTRYX_KM_SALIDA como valor oficial.

(function(){
  "use strict";

  let ultimoBotonProcesado = null;

  const MODULO = {
    nombre: "fichajes",
    version: "2605",
    activo: true,

    init: function(){
      console.log("Módulo fichajes V2605 activo");
      crearIndicadorModulo();
      interceptarSalida();
      return true;
    }
  };

  function crearIndicadorModulo(){
    if(document.getElementById("zx_mod_fichajes_badge")) return;

    const badge = document.createElement("div");
    badge.id = "zx_mod_fichajes_badge";
    badge.textContent = "Fichajes módulo OK";
    badge.style.position = "fixed";
    badge.style.left = "10px";
    badge.style.bottom = "10px";
    badge.style.zIndex = "99999";
    badge.style.background = "#dcfce7";
    badge.style.color = "#166534";
    badge.style.border = "1px solid #86efac";
    badge.style.borderRadius = "999px";
    badge.style.padding = "7px 10px";
    badge.style.fontSize = "12px";
    badge.style.fontWeight = "800";
    badge.style.boxShadow = "0 8px 20px rgba(0,0,0,.18)";

    document.body.appendChild(badge);

    setTimeout(function(){
      badge.style.opacity = ".45";
    }, 5000);
  }

  function textoBoton(btn){
    return String(btn.innerText || btn.textContent || "").toLowerCase();
  }

  function esBotonSalida(btn){
    return textoBoton(btn).indexOf("salida") !== -1;
  }

  async function vehiculoSeleccionado(){
    if(typeof window.vehiculoSeleccionadoFichaje === "function"){
      return window.vehiculoSeleccionadoFichaje();
    }

    const select = document.getElementById("fichaje_vehiculo_id");
    return select ? select.value : "";
  }

  async function leerVehiculo(vehiculoId){
    if(!vehiculoId || !window.sb){
      return null;
    }

    const {data,error} = await window.sb
      .from("org_vehiculos")
      .select("id,matricula,modelo,km_actual")
      .eq("id", vehiculoId)
      .maybeSingle();

    if(error){
      console.warn("No se pudo leer vehículo desde módulo fichajes", error);
      return null;
    }

    return data || null;
  }

  async function pedirKmSalida(vehiculoId){
    const vehiculo = await leerVehiculo(vehiculoId);
    const kmActual = Number(vehiculo && vehiculo.km_actual ? vehiculo.km_actual : 0);
    const nombre = vehiculo
      ? String((vehiculo.matricula || "Vehículo") + " " + (vehiculo.modelo || "")).trim()
      : "vehículo";

    while(true){
      const valor = prompt(
        "Introduce los kilómetros actuales de " + nombre + ".\n\nKm actuales guardados: " + kmActual,
        kmActual ? String(kmActual) : ""
      );

      if(valor === null){
        return {ok:false, cancelado:true};
      }

      const km = Number(String(valor).replace(",", ".").trim());

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
      const btn = e.target.closest("button");
      if(!btn) return;
      if(!esBotonSalida(btn)) return;

      // Si este click lo relanza el módulo, se deja pasar a la app principal.
      if(btn.dataset.zxKmModuloListo === "1"){
        btn.dataset.zxKmModuloListo = "0";
        return;
      }

      // Evita dobles pulsaciones seguidas.
      if(ultimoBotonProcesado === btn && btn.dataset.zxKmModuloProcesando === "1"){
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      ultimoBotonProcesado = btn;
      btn.dataset.zxKmModuloProcesando = "1";

      e.preventDefault();
      e.stopImmediatePropagation();

      try{
        const vehiculoId = await vehiculoSeleccionado();

        if(!vehiculoId){
          // Sin vehículo, deja que el sistema original continúe.
          btn.dataset.zxKmModuloListo = "1";
          btn.dataset.zxKmModuloProcesando = "0";
          setTimeout(function(){ btn.click(); }, 30);
          return;
        }

        const res = await pedirKmSalida(vehiculoId);

        if(!res.ok){
          btn.dataset.zxKmModuloProcesando = "0";
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
        btn.dataset.zxKmModuloProcesando = "0";

        setTimeout(function(){
          btn.click();
        }, 30);

      }catch(err){
        console.error("Error en módulo fichajes V2605", err);
        btn.dataset.zxKmModuloProcesando = "0";
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
