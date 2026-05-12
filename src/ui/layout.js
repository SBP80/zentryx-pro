// ===============================
// ZENTRYX PRO - UI LAYOUT
// V2647
// ===============================
(function(){
"use strict";

const ZX_VERSION="2647";

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
    const raw=localStorage.getItem("zentryx_session") || localStorage.getItem("usuario") || "{}";
    const data=JSON.parse(raw);

    return {
      usuario:data.usuario || data.nombre || "admin",
      rol:data.rol || "admin"
    };
  }catch(e){
    return {
      usuario:"admin",
      rol:"admin"
    };
  }
}

function fechaCorta(){
  return new Date().toLocaleDateString("es-ES",{
    weekday:"short",
    day:"2-digit",
    month:"short"
  });
}

function hora(){
  return new Date().toLocaleTimeString("es-ES",{
    hour:"2-digit",
    minute:"2-digit"
  });
}

function estilos(){
  const viejo=$("zx_layout_styles");
  if(viejo) viejo.remove();

  const css=document.createElement("style");
  css.id="zx_layout_styles";

  css.innerHTML=`
    *{
      box-sizing:border-box;
      -webkit-tap-highlight-color:transparent;
    }

    html,body{
      margin:0;
      padding:0;
      overflow-x:hidden;
      background:#eef2f7;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
      color:#0f172a;
    }

    body{
      padding-top:82px;
      padding-bottom:92px;
    }

    #app{
      width:100%;
      max-width:1180px;
      margin:0 auto;
      padding:16px;
      min-height:calc(100vh - 174px);
    }

    #zx_app_shell{
      width:100%;
      min-height:100vh;
    }

    #zx_topbar{
      position:fixed;
      top:0;
      left:0;
      right:0;
      z-index:9999;
      background:#071330;
      color:white;
      border-bottom:1px solid rgba(255,255,255,.08);
      padding:12px 14px calc(12px + env(safe-area-inset-top));
    }

    #zx_topbar_inner{
      max-width:1180px;
      margin:0 auto;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
    }

    #zx_brand{
      display:flex;
      align-items:center;
      gap:12px;
      min-width:0;
    }

    #zx_logo{
      width:46px;
      height:46px;
      border-radius:15px;
      background:linear-gradient(135deg,#2563eb,#10b981);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:25px;
      font-weight:900;
      color:white;
      flex:none;
    }

    #zx_brand_text{
      min-width:0;
    }

    #zx_brand_text h1{
      margin:0;
      font-size:19px;
      font-weight:900;
      line-height:1.1;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    #zx_brand_text p{
      margin:4px 0 0;
      color:#cbd5e1;
      font-size:13px;
      line-height:1.2;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    #zx_top_actions{
      display:flex;
      align-items:center;
      gap:10px;
      flex:none;
    }

    #zx_clock{
      text-align:right;
      color:#cbd5e1;
      font-size:12px;
      line-height:1.2;
      display:none;
    }

    #zx_clock strong{
      display:block;
      color:white;
      font-size:18px;
      font-weight:900;
    }

    #zx_salir{
      border:0;
      border-radius:14px;
      background:#dc2626;
      color:white;
      padding:12px 15px;
      font-size:15px;
      font-weight:900;
    }

    #zx_nav{
      position:fixed;
      left:0;
      right:0;
      bottom:0;
      z-index:9999;
      background:#071330;
      border-top:1px solid rgba(255,255,255,.08);
      padding:10px 10px calc(10px + env(safe-area-inset-bottom));
    }

    #zx_nav_inner{
      max-width:1180px;
      margin:0 auto;
      display:flex;
      gap:8px;
      overflow-x:auto;
      scrollbar-width:none;
    }

    #zx_nav_inner::-webkit-scrollbar{
      display:none;
    }

    .zx_nav_btn{
      flex:0 0 auto;
      border:0;
      border-radius:16px;
      background:#334155;
      color:white;
      min-width:112px;
      padding:13px 14px;
      font-size:14px;
      font-weight:900;
      white-space:nowrap;
    }

    .zx_nav_btn.zx_activo{
      background:#2563eb;
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
      font-size:30px;
      line-height:1.08;
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
    .zx_nav_btn:active,
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
      margin:0 0 12px;
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
      body{
        padding-top:88px;
        padding-bottom:100px;
      }

      #app{
        padding:24px;
      }

      #zx_clock{
        display:block;
      }

      .zx_card{
        padding:28px;
      }

      .zx_card h1,
      .zx_card h2{
        font-size:34px;
      }

      .zx_nav_btn{
        min-width:132px;
        font-size:15px;
      }
    }

    @media(min-width:1024px){
      body{
        padding-bottom:26px;
      }

      #app{
        padding:28px;
      }

      #zx_nav{
        top:82px;
        bottom:auto;
        border-top:0;
        border-bottom:1px solid rgba(255,255,255,.08);
        padding:10px 14px;
      }

      body{
        padding-top:156px;
      }

      #zx_nav_inner{
        justify-content:flex-start;
      }

      .zx_nav_btn{
        min-width:auto;
        padding:12px 20px;
      }
    }
  `;

  document.head.appendChild(css);
}

function pintarTopbar(){
  let top=$("zx_topbar");

  if(!top){
    top=document.createElement("div");
    top.id="zx_topbar";
    document.body.prepend(top);
  }

  const u=usuario();

  top.innerHTML=`
    <div id="zx_topbar_inner">
      <div id="zx_brand">
        <div id="zx_logo">Z</div>

        <div id="zx_brand_text">
          <h1>Zentryx PRO</h1>
          <p>${limpiarTexto(u.usuario)} · ${limpiarTexto(u.rol)}</p>
        </div>
      </div>

      <div id="zx_top_actions">
        <div id="zx_clock">
          <strong id="zx_hora">${hora()}</strong>
          <span id="zx_fecha">${fechaCorta()}</span>
        </div>

        <button id="zx_salir" type="button">Salir</button>
      </div>
    </div>
  `;

  $("zx_salir").onclick=function(){
    logout();
  };

  if(relojTimer){
    clearInterval(relojTimer);
  }

  relojTimer=setInterval(function(){
    const h=$("zx_hora");
    const f=$("zx_fecha");

    if(h) h.textContent=hora();
    if(f) f.textContent=fechaCorta();
  },1000);
}

function setActivo(nombre){
  document.querySelectorAll(".zx_nav_btn").forEach(function(btn){
    btn.classList.remove("zx_activo");

    if(btn.dataset.modulo===nombre){
      btn.classList.add("zx_activo");
    }
  });
}

function pintarNav(){
  let nav=$("zx_nav");

  if(!nav){
    nav=document.createElement("nav");
    nav.id="zx_nav";
    document.body.appendChild(nav);
  }

  nav.innerHTML=`
    <div id="zx_nav_inner">
      <button class="zx_nav_btn" data-modulo="inicio" type="button" onclick="ZX_inicio()">Inicio</button>
      <button class="zx_nav_btn" data-modulo="fichaje" type="button" onclick="ZX_fichaje()">Fichaje</button>
      <button class="zx_nav_btn" data-modulo="usuarios" type="button" onclick="ZX_usuarios()">Usuarios</button>
      <button class="zx_nav_btn" data-modulo="vehiculos" type="button" onclick="ZX_vehiculos()">Vehículos</button>
      <button class="zx_nav_btn" data-modulo="incidencias" type="button" onclick="ZX_incidencias()">Incidencias</button>
      <button class="zx_nav_btn" data-modulo="informes" type="button" onclick="ZX_informes()">Informes</button>
    </div>
  `;
}

function vistaPendiente(titulo,texto){
  if(!app()) return;

  app().innerHTML=`
    <div class="zx_card">
      <h1>${limpiarTexto(titulo)}</h1>
      <p>${limpiarTexto(texto)}</p>
    </div>
  `;
}

window.logout=function(){
  localStorage.removeItem("usuario");
  localStorage.removeItem("zentryx_session");
  localStorage.removeItem("zx_estado");
  localStorage.removeItem("zx_pausa");
  localStorage.removeItem("zx_comida");
  localStorage.removeItem("zx_vehiculo_activo");
  localStorage.removeItem("zx_vehiculo_matricula");
  localStorage.removeItem("zx_vehiculo_km");

  window.location.replace("./index.html?v="+ZX_VERSION);
};

window.ZX_usuarios=function(){
  setActivo("usuarios");

  if(window.ZENTRYX_UI_usuarios){
    window.ZENTRYX_UI_usuarios();
    return;
  }

  vistaPendiente("Usuarios","Módulo usuarios pendiente.");
};

window.ZX_incidencias=function(){
  setActivo("incidencias");
  vistaPendiente("Incidencias","Módulo incidencias pendiente.");
};

window.ZX_informes=function(){
  setActivo("informes");
  vistaPendiente("Informes","Módulo informes pendiente.");
};

window.ZX_vehiculos=function(){
  setActivo("vehiculos");

  if(window.ZENTRYX_UI_abrirVehiculos){
    window.ZENTRYX_UI_abrirVehiculos();
    return;
  }

  vistaPendiente("Vehículos","Módulo vehículos no cargado.");
};

window.ZX_fichaje=function(){
  setActivo("fichaje");

  if(window.ZENTRYX_UI_fichaje){
    window.ZENTRYX_UI_fichaje();
    return;
  }

  vistaPendiente("Fichaje","Módulo fichaje no cargado.");
};

window.ZX_inicio=function(){
  setActivo("inicio");

  if(window.ZENTRYX_UI_inicio){
    window.ZENTRYX_UI_inicio();
    return;
  }

  vistaPendiente("Inicio","Sistema principal Zentryx PRO modular activo.");
};

function iniciar(){
  estilos();

  const headerViejo=$("zx_header");
  const footerViejo=$("zx_footer");

  if(headerViejo) headerViejo.remove();
  if(footerViejo) footerViejo.remove();

  pintarTopbar();
  pintarNav();

  setTimeout(function(){
    if(window.ZX_inicio){
      window.ZX_inicio();
    }
  },100);
}

window.ZENTRYX_UI_LAYOUT={
  iniciar:iniciar,
  refrescarTopbar:pintarTopbar,
  refrescarNav:pintarNav,
  version:ZX_VERSION
};

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",iniciar);
}else{
  iniciar();
}

})();