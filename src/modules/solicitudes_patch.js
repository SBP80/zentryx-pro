(function(){
"use strict";

function pintarBotonSolicitudes(){
  const app=document.getElementById("app");
  if(!app || document.getElementById("zx_btn_solicitudes_home")) return;

  const cards=[...document.querySelectorAll(".zx_card")];
  const acceso=cards.find(c=>c.textContent.includes("Acceso rápido"));
  if(!acceso) return;

  const btn=document.createElement("button");
  btn.id="zx_btn_solicitudes_home";
  btn.className="zx_btn_big zx_gris";
  btn.textContent="Solicitudes";
  btn.onclick=function(){
    if(window.ZX_solicitudes){
      window.ZX_solicitudes();
    }else{
      alert("Módulo solicitudes no cargado.");
    }
  };

  const panel=[...acceso.querySelectorAll("button")]
    .find(b=>b.textContent.includes("Panel admin"));

  if(panel){
    panel.before(btn);
  }else{
    acceso.appendChild(btn);
  }
}

const oldInicio=window.ZX_inicio;

window.ZX_inicio=function(){
  if(oldInicio) oldInicio();
  setTimeout(pintarBotonSolicitudes,100);
};

document.addEventListener("DOMContentLoaded",function(){
  setTimeout(pintarBotonSolicitudes,300);
});
})();