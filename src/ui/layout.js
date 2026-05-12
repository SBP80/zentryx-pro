// ===============================
// ZENTRYX PRO - UI LAYOUT
// V2646
// ===============================
(function(){
  "use strict";

  const ZX_VERSION="2646";

  window.ZENTRYX=window.ZENTRYX || {};
  window.ZENTRYX.version=ZX_VERSION;

  let relojTimer=null;

  function $(id){
    return document.getElementById(id);
  }

  function app(){
    return $("app");
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
        rol:data.rol || "admin"
      };
    }catch(e){
      return {
        usuario:localStorage.getItem("usuario") || "admin",
        rol:"admin"
      };
    }
  }

  function fecha(){
    return new Date().toLocaleDateString("es-ES",{
      weekday:"long",
      day:"numeric",
      month:"long",
      year:"numeric"
    });
  }

  function hora(){
    return new Date().toLocaleTimeString("es-ES",{
      hour:"2-digit",
      minute:"2-digit",
      second:"2-digit"
    });
  }

  function estilos(){
    const viejo=$("zx_layout_styles");

    if(viejo){
      viejo.remove();
    }

    const css=document.createElement("style");
    css.id="zx_layout_styles";

    css.innerHTML=`
      *{
        box-sizing:border-box;
        -webkit-tap-highlight-color:transparent;
      }

      html,
      body{
        margin:0;
        padding:0;
        overflow-x:hidden;
        background:#eef2f7;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
        color:#0f172a;
      }

      body{
        padding-bottom:170px;
      }

      #app{
        width:100%;
        padding:16px;
        min-height:100vh;
      }

      #zx_header{
        background:#071330;
        color:white;
        padding:18px;
      }

      #zx_top{
        display:flex;
        flex-direction:column;
        gap:14px;
      }

      #zx_titulo{
        margin:0;
        font-size:30px;
        line-height:1.1;
        font-weight:900;
      }

      #zx_fecha{
        margin-top:10px;
        font-size:16px;
        color:#cbd5e1;
        line-height:1.3;
      }

      #zx_hora{
        margin-top:10px;
        font-size:34px;
        line-height:1;
        font-weight:900;
      }

      #zx_salir{
        width:100%;
        border:0;
        border-radius:18px;
        background:#dc2626;
        color:white;
        padding:15px;
        font-size:21px;
        font-weight:900;
      }

      #zx_footer{
        position:fixed;
        left:0;
        right:0;
        bottom:0;
        z-index:9999;
        background:#071330;
        border-top:1px solid rgba(255,255,255,.08);
        padding:10px 12px calc(env(safe-area-inset-bottom) + 10px);
      }

      #zx_footer_top{
        display:flex;
        align-items:center;
        gap:10px;
        margin-bottom:10px;
      }

      #zx_footer_logo{
        width:44px;
        height:44px;
        border-radius:13px;
        background:linear-gradient(135deg,#2563eb,#10b981);
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-size:24px;
        font-weight:900;
        flex-shrink:0;
      }

      #zx_footer_info h3{
        color:white;
        font-size:16px;
        font-weight:900;
        margin:0;
      }

      #zx_footer_info p{
        color:#cbd5e1;
        font-size:13px;
        margin:3px 0 0;
      }

      #zx_footer_menu{
        display:flex;
        gap:10px;
        overflow-x:auto;
        scrollbar-width:none;
      }

      #zx_footer_menu::-webkit-scrollbar{
        display:none;
      }

      .zx_footer_btn{
        flex:none;
        border:0;
        border-radius:14px;
        background:#374151;
        color:white;
        padding:12px 18px;
        min-width:120px;
        font-size:14px;
        font-weight:800;
      }

      .zx_card{
        background:white;
        border-radius:24px;
        padding:22px;
        margin-bottom:18px;
        border:1px solid #d1d5db;
        box-shadow:0 8px 24px rgba(0,0,0,.05);
      }

      .zx_card h1,
      .zx_card h2{
        margin:0 0 18px;
        font-size:32px;
        line-height:1.1;
        font-weight:900;
        color:#0f172a;
      }

      .zx_text,
      .zx_card p{
        color:#6b7280;
        font-size:17px;
        line-height:1.5;
      }

      .zx_btn{
        width:100%;
        border:0;
        border-radius:18px;
        color:white;
        padding:18px;
        font-size:20px;
        font-weight:900;
        margin-top:14px;
      }

      .zx_btn:active,
      .zx_footer_btn:active,
      #zx_salir:active{
        transform:scale(.99);
      }

      .zx_rojo{background:#dc2626}
      .zx_verde{background:#16a34a}
      .zx_azul{background:#2563eb}
      .zx_naranja{background:#ea580c}
      .zx_morado{background:#7c3aed}
      .zx_gris{background:#64748b}

      .zx_estado{
        display:inline-block;
        padding:10px 16px;
        border-radius:999px;
        font-size:18px;
        font-weight:900;
        margin-bottom:12px;
      }

      .zx_dentro{background:#dcfce7;color:#166534}
      .zx_fuera{background:#fee2e2;color:#991b1b}
      .zx_pausa{background:#ffedd5;color:#9a3412}
      .zx_comida{background:#fef3c7;color:#92400e}

      .zx_hist_item{
        border:1px solid #d1d5db;
        border-radius:18px;
        padding:16px;
        margin-top:14px;
        background:white;
      }

      .zx_hist_tipo{
        font-size:18px;
        font-weight:900;
        margin-bottom:6px;
      }

      .zx_hist_fecha{
        font-size:16px;
        color:#6b7280;
        line-height:1.5;
      }

      .zx_error{
        color:#991b1b;
        background:#fee2e2;
        border:1px solid #fecaca;
        padding:14px;
        border-radius:16px;
        font-size:16px;
        font-weight:800;
      }

      @media(min-width:768px){
        #zx_header{
          padding:28px;
        }

        #zx_top{
          flex-direction:row;
          align-items:flex-start;
          justify-content:space-between;
        }

        #zx_titulo{
          font-size:40px;
        }

        #zx_fecha{
          font-size:18px;
        }

        #zx_hora{
          font-size:46px;
        }

        #zx_salir{
          width:auto;
          padding:16px 28px;
          font-size:18px;
        }

        #app{
          padding:24px;
        }

        .zx_card{
          padding:28px;
        }

        .zx_card h1,
        .zx_card h2{
          font-size:34px;
        }
      }
    `;

    document.head.appendChild(css);
  }

  function header(){
    let h=$("zx_header");

    if(!h){
      h=document.createElement("header");
      h.id="zx_header";
      document.body.prepend(h);
    }

    h.innerHTML=`
      <div id="zx_top">
        <div>
          <h1 id="zx_titulo">Zentryx V${ZX_VERSION}</h1>
          <div id="zx_fecha">${fecha()}</div>
          <div id="zx_hora">${hora()}</div>
        </div>

        <button id="zx_salir" type="button">Salir</button>
      </div>
    `;

    $("zx_salir").onclick=function(e){
      e.preventDefault();
      e.stopPropagation();

      localStorage.removeItem("usuario");
      localStorage.removeItem("zentryx_session");
      localStorage.removeItem("zx_estado");
      localStorage.removeItem("zx_pausa");
      localStorage.removeItem("zx_comida");
      localStorage.removeItem("zx_vehiculo_activo");

      window.location.replace("./index.html?v="+ZX_VERSION);
    };

    if(relojTimer){
      clearInterval(relojTimer);
    }

    relojTimer=setInterval(function(){
      const f=$("zx_fecha");
      const r=$("zx_hora");

      if(f){
        f.textContent=fecha();
      }

      if(r){
        r.textContent=hora();
      }
    },1000);
  }

  function footer(){
    let f=$("zx_footer");

    if(!f){
      f=document.createElement("div");
      f.id="zx_footer";
      document.body.appendChild(f);
    }

    const u=usuario();

    f.innerHTML=`
      <div id="zx_footer_top">
        <div id="zx_footer_logo">Z</div>

        <div id="zx_footer_info">
          <h3>Zentryx PRO</h3>
          <p>${limpiarTexto(u.usuario)} · ${limpiarTexto(u.rol)}</p>
        </div>
      </div>

      <div id="zx_footer_menu">
        <button class="zx_footer_btn" type="button" onclick="ZX_inicio()">Inicio</button>
        <button class="zx_footer_btn" type="button" onclick="ZX_fichaje()">Fichaje</button>
        <button class="zx_footer_btn" type="button" onclick="ZX_usuarios()">Usuarios</button>
        <button class="zx_footer_btn" type="button" onclick="ZX_vehiculos()">Vehículos</button>
        <button class="zx_footer_btn" type="button" onclick="ZX_incidencias()">Incidencias</button>
        <button class="zx_footer_btn" type="button" onclick="ZX_informes()">Informes</button>
      </div>
    `;
  }

  function vistaPendiente(titulo,texto){
    if(!app()){
      return;
    }

    app().innerHTML=`
      <div class="zx_card">
        <h1>${limpiarTexto(titulo)}</h1>
        <p>${limpiarTexto(texto)}</p>
      </div>
    `;
  }

  window.ZX_usuarios=function(){
    if(window.ZENTRYX_UI_usuarios){
      window.ZENTRYX_UI_usuarios();
      return;
    }

    vistaPendiente("Usuarios","Módulo usuarios pendiente.");
  };

  window.ZX_incidencias=function(){
    vistaPendiente("Incidencias","Módulo incidencias pendiente.");
  };

  window.ZX_informes=function(){
    vistaPendiente("Informes","Módulo informes pendiente.");
  };

  window.ZX_vehiculos=function(){
    if(window.ZENTRYX_UI_abrirVehiculos){
      window.ZENTRYX_UI_abrirVehiculos();
      return;
    }

    if(window.ZX_VEHICULOS_ABRIR){
      window.ZX_VEHICULOS_ABRIR();
      return;
    }

    vistaPendiente("Vehículos","Módulo vehículos no cargado.");
  };

  window.ZX_fichaje=function(){
    if(window.ZENTRYX_UI_fichaje){
      window.ZENTRYX_UI_fichaje();
      return;
    }

    vistaPendiente("Fichaje","Módulo fichaje no cargado.");
  };

  window.ZX_inicio=function(){
    if(window.ZENTRYX_UI_inicio){
      window.ZENTRYX_UI_inicio();
      return;
    }

    vistaPendiente("Inicio","Sistema principal Zentryx PRO modular activo.");
  };

  function iniciar(){
    estilos();
    header();
    footer();

    setTimeout(function(){
      if(window.ZX_inicio){
        window.ZX_inicio();
      }
    },100);
  }

  window.ZENTRYX_UI_LAYOUT={
    iniciar:iniciar,
    refrescarFooter:footer,
    version:ZX_VERSION
  };

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",iniciar);
  }else{
    iniciar();
  }

})();