// ===============================
// ZENTRYX V2605 - KM INTEGRADO REAL
// ===============================

(function(){
  "use strict";

  let kmCapturado = null;

  const MODULO = {
    nombre: "fichajes",
    version: "2605",

    init: function(){
      console.log("Módulo fichajes V2605 activo");
      interceptarSalida();
    }
  };

  function interceptarSalida(){

    document.addEventListener("click", function(e){

      const btn = e.target.closest("button");
      if(!btn) return;

      const texto = (btn.innerText || "").toLowerCase();

      if(!texto.includes("salida")) return;

      // evitar bucle
      if(btn.dataset.zxProcesado === "1") return;

      e.preventDefault();
      e.stopPropagation();

      const km = prompt("Introduce los km actuales:");

      if(!km || isNaN(km)){
        alert("Debes introducir un número válido");
        return;
      }

      kmCapturado = Number(km);

      // guardar en global REAL
      window.ZENTRYX_KM_SALIDA = kmCapturado;

      console.log("KM enviados al sistema:", kmCapturado);

      // marcar botón para evitar loop
      btn.dataset.zxProcesado = "1";

      // relanzar click original
      setTimeout(()=>{
        btn.click();
      }, 50);

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