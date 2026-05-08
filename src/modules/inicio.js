// ===============================
// ZENTRYX V2630 - INICIO MODULAR
// ===============================
(function(){
"use strict";

function app(){
  return document.getElementById("app");
}

function card(titulo,contenido){

  return `
    <div style="
      background:white;
      border-radius:24px;
      padding:24px;
      margin-bottom:18px;
      border:1px solid #d1d5db;
      box-shadow:0 10px 30px rgba(0,0,0,.05);
    ">

      <h1 style="
        margin:0 0 18px;
        font-size:42px;
        font-weight:900;
        color:#0f172a;
      ">
        ${titulo}
      </h1>

      ${contenido}

    </div>
  `;
}

function boton(texto,color,accion){

  return `
    <button
      onclick="${accion}"
      style="
        width:100%;
        border:0;
        border-radius:18px;
        padding:18px;
        margin-bottom:14px;
        background:${color};
        color:white;
        font-size:24px;
        font-weight:900;
      "
    >
      ${texto}
    </button>
  `;
}

window.ZX_inicio = function(){

  const root = app();

  if(!root) return;

  root.innerHTML = `

    <div style="padding:18px;">

      ${card(
        "Inicio",
        `
          <div style="
            font-size:22px;
            color:#6b7280;
            line-height:1.6;
          ">
            Sistema principal Zentryx PRO modular activo.
          </div>
        `
      )}

      ${card(
        "Módulos rápidos",
        `
          ${boton("Usuarios","#2563eb","ZX_usuarios()")}
          ${boton("Vehículos","#16a34a","ZX_vehiculos()")}
          ${boton("Incidencias","#ea580c","ZX_incidencias()")}
          ${boton("Informes","#7c3aed","ZX_informes()")}
        `
      )}

      ${card(
        "Estado sistema",
        `
          <div style="
            display:flex;
            flex-direction:column;
            gap:14px;
            font-size:20px;
          ">

            <div>
              Versión: <b>V2630</b>
            </div>

            <div>
              Layout modular activo
            </div>

            <div>
              Supabase conectado
            </div>

          </div>
        `
      )}

    </div>

  `;

};

console.log("Inicio modular V2630");

})();