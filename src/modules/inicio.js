// ===============================
// ZENTRYX V2632 - INICIO LIMPIO
// ===============================
(function(){
"use strict";

function app(){
  return document.getElementById("app");
}

function card(titulo, contenido){
  return `
    <div class="zx_card">
      <h1>${titulo}</h1>
      ${contenido}
    </div>
  `;
}

function boton(texto, color, accion){
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
    ${card(
      "Inicio",
      `
        <div style="font-size:22px;color:#6b7280;line-height:1.6;">
          Sistema principal Zentryx PRO modular activo.
        </div>
      `
    )}

    ${card(
      "Módulos rápidos",
      `
        ${boton("Fichaje","#dc2626","ZX_fichaje()")}
        ${boton("Usuarios","#2563eb","ZX_usuarios()")}
        ${boton("Vehículos","#16a34a","ZX_vehiculos()")}
        ${boton("Incidencias","#ea580c","ZX_incidencias()")}
        ${boton("Informes","#7c3aed","ZX_informes()")}
      `
    )}
  `;
};

console.log("Inicio limpio V2632");

})();