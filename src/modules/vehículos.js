// ===============================
// ZENTRYX V2609 - MODULO VEHICULOS BASE
// ===============================

(function(){
  "use strict";

  const MODULO = {
    nombre: "vehiculos",
    version: "2609",

    init: function(){
      console.log("Módulo vehículos activo");
      aviso();
      detectarVista();
    }
  };

  function aviso(){
    const a = document.createElement("div");
    a.textContent = "VEHÍCULOS MOD OK V2609";
    a.style.position="fixed";
    a.style.top="50px";
    a.style.left="10px";
    a.style.right="10px";
    a.style.zIndex="999999";
    a.style.background="#dbeafe";
    a.style.color="#1e3a8a";
    a.style.padding="10px";
    a.style.textAlign="center";
    a.style.fontWeight="900";
    document.body.appendChild(a);
  }

  function detectarVista(){

    // detecta cuando entras en vehículos
    document.addEventListener("click", function(e){

      const el = e.target.closest("button, a");
      if(!el) return;

      const txt = (el.innerText||"").toLowerCase();

      if(txt.includes("vehículo") || txt.includes("vehiculos")){
        console.log("Entrando en módulo vehículos desde menú");
      }

    });

  }

  function start(){
    if(!window.ZENTRYX){
      setTimeout(start,100);
      return;
    }

    window.ZENTRYX.registrarModulo("vehiculos", MODULO);
    MODULO.init();
  }

  start();

})();