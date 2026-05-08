// ===============================
// ZENTRYX V2629 - FICHAJES LIMPIO
// Archivo: src/modules/fichajes.js
// ===============================

(function(){
  "use strict";

  const MODULO = {
    nombre: "fichajes",
    version: "2629",
    activo: true,
    init: init
  };

  function init(){

    console.log("Módulo fichajes V2629 activo");

    quitarBadgeViejo();

    interceptarEntrada();
    interceptarSalida();

    return true;
  }

  function quitarBadgeViejo(){

    const badge = document.getElementById("zx_mod_fichajes_badge");

    if(badge){
      badge.remove();
    }

  }

  function textoBoton(btn){
    return String(btn.innerText || btn.textContent || "").toLowerCase();
  }

  function esEntrada(btn){

    const t = textoBoton(btn);

    return (
      t.indexOf("entrada") !== -1 &&
      t.indexOf("salida") === -1
    );

  }

  function esSalida(btn){

    return textoBoton(btn).indexOf("salida") !== -1;

  }

  async function seleccionarVehiculoLibre(){

    if(
      !window.vehiculosAPI ||
      typeof window.vehiculosAPI.listarLibres !== "function"
    ){
      return null;
    }

    const res = await window.vehiculosAPI.listarLibres();

    if(res.error){

      alert(
        "Error cargando vehículos: " +
        (res.error.message || res.error)
      );

      return null;
    }

    const libres = res.data || [];

    if(libres.length === 0){

      const sinVehiculo = confirm(
        "No hay vehículos libres.\n\n¿Continuar sin vehículo?"
      );

      if(sinVehiculo){
        return {
          sinVehiculo: true
        };
      }

      return null;
    }

    const texto = libres.map(function(v,i){

      return (
        (i + 1) +
        ". " +
        (v.matricula || "Sin matrícula") +
        " · " +
        (v.km_actual || 0) +
        " km"
      );

    }).join("\n");

    const elegido = prompt(
      "Selecciona vehículo:\n\n" +
      texto +
      "\n\n0. Continuar sin vehículo"
    );

    if(elegido === null){
      return null;
    }

    if(String(elegido).trim() === "0"){

      return {
        sinVehiculo: true
      };

    }

    const vehiculo = libres[Number(elegido) - 1];

    if(!vehiculo){

      alert("Selección no válida.");

      return null;
    }

    const ocupar = await window.vehiculosAPI.ocupar(vehiculo.id);

    if(ocupar.error){

      alert(
        "No se puede usar este vehículo: " +
        (ocupar.error.message || ocupar.error)
      );

      return null;
    }

    localStorage.setItem(
      "zentryx_vehiculo_fichaje_id",
      vehiculo.id
    );

    localStorage.setItem(
      "zentryx_vehiculo_fichaje_matricula",
      vehiculo.matricula || ""
    );

    localStorage.setItem(
      "zentryx_vehiculo_fichaje_km",
      String(vehiculo.km_actual || 0)
    );

    alert(
      "Vehículo asignado: " +
      (vehiculo.matricula || "Vehículo")
    );

    return vehiculo;
  }

  function interceptarEntrada(){

    document.addEventListener("click", async function(e){

      const btn = e.target.closest("button");

      if(!btn || !esEntrada(btn)){
        return;
      }

      if(btn.dataset.zxVehiculoEntradaListo === "1"){

        btn.dataset.zxVehiculoEntradaListo = "0";

        return;
      }

      if(!window.vehiculosAPI){
        return;
      }

      e.preventDefault();
      e.stopImmediatePropagation();

      const vehiculo = await seleccionarVehiculoLibre();

      if(!vehiculo){
        return;
      }

      btn.dataset.zxVehiculoEntradaListo = "1";

      setTimeout(function(){

        btn.click();

      },50);

    }, true);

  }

  function interceptarSalida(){

    document.addEventListener("click", async function(e){

      const btn = e.target.closest("button");

      if(!btn || !esSalida(btn)){
        return;
      }

      if(btn.dataset.zxKmModuloListo === "1"){

        btn.dataset.zxKmModuloListo = "0";

        return;
      }

      e.preventDefault();
      e.stopImmediatePropagation();

      const vehiculoId =
        localStorage.getItem("zentryx_vehiculo_fichaje_id");

      const matricula =
        localStorage.getItem("zentryx_vehiculo_fichaje_matricula") ||
        "vehículo";

      const kmAnterior = Number(
        localStorage.getItem("zentryx_vehiculo_fichaje_km") || 0
      );

      if(!vehiculoId){

        btn.dataset.zxKmModuloListo = "1";

        setTimeout(function(){

          btn.click();

        },50);

        return;
      }

      let km = prompt(
        "Introduce km actuales de " +
        matricula +
        ":\n\nKm guardados: " +
        kmAnterior,
        kmAnterior ? String(kmAnterior) : ""
      );

      if(km === null){

        alert(
          "Debes introducir km para cerrar salida."
        );

        return;
      }

      km = Number(
        String(km)
          .replace(",", ".")
          .trim()
      );

      if(
        !km ||
        Number.isNaN(km) ||
        km <= 0
      ){

        alert("Km no válido.");

        return;
      }

      if(km < kmAnterior){

        alert(
          "Los km no pueden ser menores que los actuales (" +
          kmAnterior +
          ")."
        );

        return;
      }

      if(window.vehiculosAPI){

        const act =
          await window.vehiculosAPI.actualizarKm(
            vehiculoId,
            km,
            "Fichaje salida"
          );

        if(act.error){

          alert(
            "Error actualizando km: " +
            (act.error.message || act.error)
          );

          return;
        }

        await window.vehiculosAPI.liberar(
          vehiculoId
        );
      }

      window.ZENTRYX_KM_SALIDA = km;

      localStorage.removeItem(
        "zentryx_vehiculo_fichaje_id"
      );

      localStorage.removeItem(
        "zentryx_vehiculo_fichaje_matricula"
      );

      localStorage.removeItem(
        "zentryx_vehiculo_fichaje_km"
      );

      btn.dataset.zxKmModuloListo = "1";

      setTimeout(function(){

        btn.click();

      },50);

    }, true);

  }

  function registrar(){

    if(
      !window.ZENTRYX ||
      typeof window.ZENTRYX.registrarModulo !== "function"
    ){

      setTimeout(registrar,100);

      return;
    }

    window.ZENTRYX.registrarModulo(
      "fichajes",
      MODULO
    );

    try{

      MODULO.init();

    }catch(e){

      console.error(
        "Error inicializando módulo fichajes:",
        e
      );

      alert(
        "Error cargando módulo fichajes: " +
        ((e && e.message) || e)
      );
    }
  }

  if(document.readyState === "loading"){

    document.addEventListener(
      "DOMContentLoaded",
      registrar
    );

  }else{

    registrar();

  }

})();