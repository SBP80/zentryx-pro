(function(){
"use strict";

function app(){
  return document.getElementById("app");
}

function card(titulo,contenido){
  return `
    <div class="zx_card">
      <h1>${titulo}</h1>
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
        padding:16px;
        margin-bottom:12px;
        background:${color};
        color:white;
        font-size:22px;
        font-weight:900;
        line-height:1.1;
      "
    >
      ${texto}
    </button>
  `;
}

window.ZX_inicio=function(){
  const root=app();
  if(!root) return;

  root.innerHTML=`

    ${card(
      "Inicio",
      `
        <div style="
          font-size:18px;
          color:#6b7280;
          line-height:1.45;
        ">
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

    ${card(
      "Estado sistema",
      `
        <div style="
          display:flex;
          flex-direction:column;
          gap:10px;
          font-size:16px;
          color:#374151;
          line-height:1.4;
        ">
          <div><b>Versión:</b> V2638</div>
          <div>Layout modular activo</div>
          <div>Supabase conectado</div>
        </div>
      `
    )}

  `;
};

console.log("Inicio V2638");

})();