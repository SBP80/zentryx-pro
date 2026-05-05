// ===============================
// ZENTRYX V2611 - MÓDULO VEHÍCULOS FUNCIONAL
// ===============================

(function(){
  "use strict";

  const MODULO = {
    nombre: "vehiculos",
    version: "2611",
    activo: true,

    init: function(){
      console.log("Vehículos activo V2611");
      crearAviso();
      activarEventos();
      return true;
    }
  };

  function crearAviso(){
    let aviso = document.createElement("div");
    aviso.textContent = "VEHÍCULOS LISTO";
    aviso.style.position = "fixed";
    aviso.style.top = "60px";
    aviso.style.left = "10px";
    aviso.style.right = "10px";
    aviso.style.zIndex = "999999";
    aviso.style.background = "#dcfce7";
    aviso.style.color = "#166534";
    aviso.style.border = "2px solid #22c55e";
    aviso.style.borderRadius = "14px";
    aviso.style.padding = "10px";
    aviso.style.fontWeight = "800";
    aviso.style.textAlign = "center";

    document.body.appendChild(aviso);

    setTimeout(()=> aviso.remove(), 4000);
  }

  function activarEventos(){
    document.addEventListener("click", function(e){

      let btn = e.target.closest("button, a");
      if(!btn) return;

      let texto = (btn.innerText || "").toLowerCase();

      if(texto.includes("vehiculo") || texto.includes("vehículos")){
        
        mostrarPanelVehiculos();

      }

    }, true);
  }

  function mostrarPanelVehiculos(){

    let panel = document.createElement("div");

    panel.style.position = "fixed";
    panel.style.top = "50%";
    panel.style.left = "50%";
    panel.style.transform = "translate(-50%, -50%)";
    panel.style.background = "#fff";
    panel.style.padding = "20px";
    panel.style.borderRadius = "16px";
    panel.style.zIndex = "999999";
    panel.style.boxShadow = "0 20px 40px rgba(0,0,0,.3)";
    panel.style.width = "90%";
    panel.style.maxWidth = "400px";

    panel.innerHTML = `
      <h2>Vehículos</h2>
      <p>Aquí irá gestión real de vehículos</p>
      <button id="cerrarVehiculos">Cerrar</button>
    `;

    document.body.appendChild(panel);

    document.getElementById("cerrarVehiculos").onclick = ()=>{
      panel.remove();
    };
  }

  function registrar(){
    if(!window.ZENTRYX){
      setTimeout(registrar, 100);
      return;
    }

    window.ZENTRYX.registrarModulo("vehiculos", MODULO);
    MODULO.init();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", registrar);
  } else {
    registrar();
  }

})();