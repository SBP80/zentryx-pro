(function(){
"use strict";

function app(){
  return document.getElementById("app");
}

function estado(){
  return localStorage.getItem("zx_estado_jornada") || "fuera";
}

function guardarEstado(valor){
  localStorage.setItem("zx_estado_jornada", valor);
}

function usuario(){
  try{
    return JSON.parse(localStorage.getItem("usuario") || "{}");
  }catch(e){
    return {};
  }
}

function guardarFichaje(tipo){
  const u=usuario();

  const registro={
    tipo:tipo,
    usuario:u.usuario || "admin",
    fecha:new Date().toISOString()
  };

  localStorage.setItem("zx_ultimo_fichaje",JSON.stringify(registro));
}

function renderFichaje(){
  const root=app();
  if(!root) return;

  const dentro=estado()==="dentro";

  root.innerHTML=`
    <div class="zx_card">
      <h1>Fichaje</h1>

      <p style="font-size:18px;color:#6b7280;">
        Usuario: <b>${usuario().usuario || "admin"}</b>
      </p>

      <div style="
        display:inline-block;
        padding:10px 16px;
        border-radius:999px;
        font-weight:900;
        margin-bottom:18px;
        background:${dentro ? "#dcfce7" : "#fee2e2"};
        color:${dentro ? "#166534" : "#991b1b"};
      ">
        ${dentro ? "Dentro" : "Fuera"}
      </div>

      <button id="zx_btn_entrada" style="
        width:100%;
        border:0;
        border-radius:18px;
        padding:16px;
        margin-bottom:12px;
        background:#16a34a;
        color:white;
        font-size:20px;
        font-weight:900;
      ">
        Entrada
      </button>

      <button id="zx_btn_salida" style="
        width:100%;
        border:0;
        border-radius:18px;
        padding:16px;
        margin-bottom:12px;
        background:#dc2626;
        color:white;
        font-size:20px;
        font-weight:900;
      ">
        Salida
      </button>

      <button id="zx_btn_pausa" style="
        width:100%;
        border:0;
        border-radius:18px;
        padding:16px;
        margin-bottom:12px;
        background:#f59e0b;
        color:white;
        font-size:18px;
        font-weight:900;
      ">
        Inicio pausa
      </button>

      <button id="zx_btn_comida" style="
        width:100%;
        border:0;
        border-radius:18px;
        padding:16px;
        background:#f59e0b;
        color:white;
        font-size:18px;
        font-weight:900;
      ">
        Inicio comida
      </button>
    </div>
  `;

  document.getElementById("zx_btn_entrada").onclick=function(){
    if(estado()==="dentro"){
      alert("Ya estás dentro.");
      return;
    }

    guardarEstado("dentro");
    guardarFichaje("entrada");
    renderFichaje();
  };

  document.getElementById("zx_btn_salida").onclick=function(){
    if(estado()==="fuera"){
      alert("No puedes fichar salida sin entrada.");
      return;
    }

    guardarEstado("fuera");
    guardarFichaje("salida");
    renderFichaje();
  };

  document.getElementById("zx_btn_pausa").onclick=function(){
    if(estado()==="fuera"){
      alert("No puedes iniciar pausa sin entrada.");
      return;
    }

    guardarFichaje("inicio_pausa");
    alert("Pausa registrada.");
  };

  document.getElementById("zx_btn_comida").onclick=function(){
    if(estado()==="fuera"){
      alert("No puedes iniciar comida sin entrada.");
      return;
    }

    guardarFichaje("inicio_comida");
    alert("Comida registrada.");
  };
}

window.ZX_fichaje=renderFichaje;
window.ZENTRYX_UI_fichaje=renderFichaje;

console.log("Fichajes V2638 cargado");

})();