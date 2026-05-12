// ===============================
// ZENTRYX PRO - INICIO UI
// V2649
// ===============================
(function(){
  "use strict";

  const ZX_VERSION="2649";

  window.ZENTRYX=window.ZENTRYX || {};

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

  function usuario(){
    try{
      const raw=localStorage.getItem("usuario") || localStorage.getItem("zentryx_session") || "{}";
      const data=JSON.parse(raw);

      return {
        usuario:data.usuario || data.nombre || "admin",
        rol:data.rol || "Administrador"
      };
    }catch(e){
      return {
        usuario:"admin",
        rol:"Administrador"
      };
    }
  }

  function render(){

    if(!app()){
      return;
    }

    const u=usuario();

    app().innerHTML=`
      <div class="zx_card">
        <h2>Inicio</h2>
        <div class="zx_text">
          Sistema principal Zentryx PRO modular activo.
        </div>
      </div>

      <div class="zx_card">
        <h2>Módulos rápidos</h2>

        <button class="zx_btn zx_rojo" onclick="ZX_fichaje()">Fichaje</button>
        <button class="zx_btn zx_azul" onclick="ZX_usuarios()">Usuarios</button>
        <button class="zx_btn zx_verde" onclick="ZX_vehiculos()">Vehículos</button>
        <button class="zx_btn zx_naranja" onclick="ZX_incidencias()">Incidencias</button>
        <button class="zx_btn zx_morado" onclick="ZX_informes()">Informes</button>
      </div>

      <div class="zx_card">
        <h2>Estado sistema</h2>

        <div class="zx_text">
          <b>Versión:</b> V${ZX_VERSION}<br><br>

          Diseño responsive móvil / tablet / PC<br><br>

          Base preparada para servidor local o servidor externo<br><br>

          Supabase preparado<br><br>

          Arquitectura comercial por módulos<br><br>

          Módulos registrados: core, inicio, fichajes, vehículos, usuarios
        </div>
      </div>
    `;
  }

  window.ZENTRYX_UI_inicio=render;

})();