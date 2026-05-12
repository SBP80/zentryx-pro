// ===============================
// ZENTRYX PRO - MÓDULO INICIO
// V2646
// ===============================
(function(){
  "use strict";

  const ZX_VERSION="2646";

  function app(){
    return document.getElementById("app");
  }

  function limpiarTexto(valor){
    return String(valor ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function card(titulo,contenido){
    return `
      <div class="zx_card">
        <h1>${limpiarTexto(titulo)}</h1>
        ${contenido}
      </div>
    `;
  }

  function boton(texto,clase,accion){
    return `
      <button class="zx_btn ${clase}" type="button" onclick="${accion}">
        ${limpiarTexto(texto)}
      </button>
    `;
  }

  window.ZENTRYX_UI_inicio=function(){
    const root=app();

    if(!root){
      return;
    }

    const modulos=window.ZENTRYX && window.ZENTRYX.listarModulos
      ? window.ZENTRYX.listarModulos()
      : [];

    root.innerHTML=`
      ${card(
        "Inicio",
        `
          <div class="zx_text">
            Sistema principal Zentryx PRO modular activo.
          </div>
        `
      )}

      ${card(
        "Módulos rápidos",
        `
          ${boton("Fichaje","zx_rojo","ZX_fichaje()")}
          ${boton("Usuarios","zx_azul","ZX_usuarios()")}
          ${boton("Vehículos","zx_verde","ZX_vehiculos()")}
          ${boton("Incidencias","zx_naranja","ZX_incidencias()")}
          ${boton("Informes","zx_morado","ZX_informes()")}
        `
      )}

      ${card(
        "Estado sistema",
        `
          <div class="zx_text">
            <b>Versión:</b> V${ZX_VERSION}<br><br>
            Layout modular activo<br><br>
            Supabase preparado<br><br>
            Arquitectura comercial por módulos<br><br>
            Módulos registrados: ${limpiarTexto(modulos.length ? modulos.join(", ") : "core")}
          </div>
        `
      )}
    `;
  };

  window.ZX_inicio=function(){
    window.ZENTRYX_UI_inicio();
  };

  if(window.ZENTRYX && window.ZENTRYX.registrarModulo){
    window.ZENTRYX.registrarModulo("inicio",{
      nombre:"Inicio",
      activo:true,
      version:ZX_VERSION
    });
  }

  console.log("Inicio cargado V"+ZX_VERSION);
})();