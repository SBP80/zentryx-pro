// ===============================
// ZENTRYX V2604 - KM EN SALIDA DESDE MODULO
// ===============================

(function(){
  "use strict";

  const MODULO = {
    nombre: "fichajes",
    version: "2604",

    init: function(){
      console.log("Fichajes módulo control km activo");
      controlarSalida();
    }
  };

  function controlarSalida(){

    document.addEventListener("click", async function(e){

      const btn = e.target.closest("button");
      if(!btn) return;

      const texto = (btn.innerText || "").toLowerCase();

      if(!texto.includes("salida")) return;

      console.log("Interceptado salida");

      // Bloquear ejecución original momentáneamente
      e.preventDefault();
      e.stopPropagation();

      // Pedir km
      const km = prompt("Introduce los km actuales del vehículo:");

      if(!km || isNaN(km)){
        alert("Debes introducir un número válido");
        return;
      }

      console.log("KM introducidos:", km);

      // Guardar en variable global temporal
      window.ZENTRYX_KM_SALIDA = Number(km);

      // 🔥 IMPORTANTE:
      // volver a lanzar el click original SIN bloquear
      setTimeout(()=>{
        btn.click();
      }, 100);

    }, true);
  }

  function registrar(){
    if(!window.ZENTRYX){
      setTimeout(registrar, 100);
      return;
    }

    window.ZENTRYX.registrarModulo("fichajes", MODULO);
    MODULO.init();
  }

  registrar();

})();