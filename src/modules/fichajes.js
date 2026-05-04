// ===============================
// ZENTRYX V2607 - SIMPLE Y ROBUSTO
// ===============================

(function(){
  "use strict";

  const MODULO = {
    nombre: "fichajes",
    version: "2607",

    init: function(){
      console.log("Módulo fichajes limpio activo");
      aviso();
      interceptar();
    }
  };

  function aviso(){
    const a = document.createElement("div");
    a.textContent = "FICHAJES MOD OK V2607";
    a.style.position="fixed";
    a.style.top="10px";
    a.style.left="10px";
    a.style.right="10px";
    a.style.zIndex="999999";
    a.style.background="#dcfce7";
    a.style.color="#166534";
    a.style.padding="10px";
    a.style.textAlign="center";
    a.style.fontWeight="900";
    document.body.appendChild(a);
  }

  function interceptar(){

    document.addEventListener("click", function(e){

      const btn = e.target.closest("button");
      if(!btn) return;

      const txt = (btn.innerText||"").toLowerCase();

      if(!txt.includes("salida")) return;

      if(btn.dataset.ok==="1"){
        btn.dataset.ok="0";
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const km = prompt("Introduce km del vehículo:");

      if(km===null){
        alert("Debes introducir km");
        return;
      }

      if(isNaN(km) || km<=0){
        alert("Km no válido");
        return;
      }

      // 🔥 SOLO PASAMOS EL DATO
      window.ZENTRYX_KM_SALIDA = Number(km);

      btn.dataset.ok="1";

      setTimeout(()=>btn.click(),50);

    }, true);
  }

  function start(){
    if(!window.ZENTRYX){
      setTimeout(start,100);
      return;
    }

    window.ZENTRYX.registrarModulo("fichajes", MODULO);
    MODULO.init();
  }

  start();

})();