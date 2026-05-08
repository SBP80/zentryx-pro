// ===============================
// ZENTRYX V2631 - UI FICHAJE
// ===============================
(function(){
"use strict";

function app(){
  return document.getElementById("app");
}

function usuario(){
  try{
    return JSON.parse(localStorage.getItem("usuario") || "{}");
  }catch(e){
    return {};
  }
}

function estadoActual(){
  return localStorage.getItem("zx_estado_jornada") || "fuera";
}

function guardarEstado(v){
  localStorage.setItem("zx_estado_jornada", v);
}

function badgeEstado(){

  if(estadoActual() === "dentro"){
    return `
      <div style="
        background:#dcfce7;
        color:#166534;
        padding:12px 18px;
        border-radius:999px;
        font-weight:900;
        display:inline-block;
      ">
        Dentro
      </div>
    `;
  }

  return `
    <div style="
      background:#fee2e2;
      color:#991b1b;
      padding:12px 18px;
      border-radius:999px;
      font-weight:900;
      display:inline-block;
    ">
      Fuera
    </div>
  `;
}

function render(){

  const root = app();

  if(!root) return;

  const u = usuario();

  root.innerHTML = `

    <div style="padding:18px;">

      <div style="
        background:white;
        border-radius:24px;
        padding:24px;
        border:1px solid #d1d5db;
        box-shadow:0 10px 30px rgba(0,0,0,.05);
      ">

        <h1 style="
          margin:0 0 20px;
          font-size:44px;
          font-weight:900;
          color:#0f172a;
        ">
          Fichaje
        </h1>

        <div style="
          font-size:24px;
          font-weight:800;
          margin-bottom:10px;
        ">
          ${(u.usuario || "admin")}
        </div>

        <div style="
          color:#6b7280;
          font-size:20px;
          margin-bottom:22px;
        ">
          Estado jornada
        </div>

        ${badgeEstado()}

        <div style="height:22px;"></div>

        <button
          id="zx_btn_entrada"
          style="
            width:100%;
            border:0;
            border-radius:18px;
            padding:20px;
            margin-bottom:16px;
            background:#16a34a;
            color:white;
            font-size:26px;
            font-weight:900;
          "
        >
          Entrada
        </button>

        <button
          id="zx_btn_salida"
          style="
            width:100%;
            border:0;
            border-radius:18px;
            padding:20px;
            background:#dc2626;
            color:white;
            font-size:26px;
            font-weight:900;
          "
        >
          Salida
        </button>

      </div>

    </div>

  `;

  eventos();
}

function eventos(){

  const entrada = document.getElementById("zx_btn_entrada");
  const salida = document.getElementById("zx_btn_salida");

  if(entrada){

    entrada.onclick = async function(){

      guardarEstado("dentro");

      if(window.vehiculosAPI){

        const libres = await window.vehiculosAPI.listarLibres();

        if(
          libres &&
          libres.data &&
          libres.data.length
        ){

          alert(
            "Hay " +
            libres.data.length +
            " vehículos disponibles."
          );

        }

      }

      render();

    };

  }

  if(salida){

    salida.onclick = function(){

      guardarEstado("fuera");

      render();

    };

  }

}

window.ZX_fichaje = render;

console.log("UI fichaje V2631");

})();