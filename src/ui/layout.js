(function(){
"use strict";

window.ZENTRYX = window.ZENTRYX || {};
window.ZENTRYX.version = "2632";

let relojTimer = null;

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
  const viejo=document.getElementById("zx_layout_styles");
  if(viejo) viejo.remove();

  const css=document.createElement("style");
  css.id="zx_layout_styles";
  css.innerHTML=`
    body{margin:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#111827;overflow-x:hidden}
    #zx_header{background:#0f172a;color:white;padding:24px 20px}
    #zx_top{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}
    #zx_titulo{font-size:38px;font-weight:900;margin:0;line-height:1}
    #zx_fecha{margin-top:12px;font-size:20px;color:#cbd5e1;line-height:1.25}
    #zx_hora{margin-top:14px;font-size:34px;font-weight:900}
    #zx_salir{background:#dc2626;color:white;border:0;border-radius:18px;padding:18px 24px;font-size:22px;font-weight:900}
    #zx_usuario_barra{background:#111827;color:white;padding:18px 20px;display:flex;align-items:center;gap:16px}
    #zx_logo{width:54px;height:54px;border-radius:14px;background:linear-gradient(135deg,#2563eb,#16a34a);display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900}
    #zx_nombre_app{font-size:20px;font-weight:900}
    #zx_usuario_texto{color:#cbd5e1;margin-top:4px;font-size:16px}

    #zx_nav{
      position:sticky;
      top:0;
      z-index:9999;
      background:#1f2937;
      padding:12px 20px 18px;
      display:flex;
      gap:12px;
      overflow-x:auto;
      box-shadow:0 8px 20px rgba(15,23,42,.25);
    }

    .zx_btn_nav{
      flex:0 0 auto;
      background:#374151;
      color:white;
      border:1px solid rgba(255,255,255,.6);
      padding:14px 18px;
      font-size:17px;
      font-weight:800;
    }

    #app{padding:18px;min-height:60vh}
    .zx_card{background:white;border-radius:24px;padding:24px;margin-bottom:18px;border:1px solid #d1d5db;box-shadow:0 10px 30px rgba(0,0,0,.06)}
    .zx_card h1{margin:0 0 16px;font-size:34px;font-weight:900;line-height:1.05}
  `;
  document.head.appendChild(css);
}

function header(){
  let h=document.getElementById("zx_header");
  if(!h){
    h=document.createElement("header");
    h.id="zx_header";
    document.body.prepend(h);
  }

  h.innerHTML=`
    <div id="zx_top">
      <div>
        <h1 id="zx_titulo">Zentryx V2632</h1>
        <div id="zx_fecha">${fecha()}</div>
        <div id="zx_hora">${hora()}</div>
      </div>
      <button id="zx_salir" type="button">Salir</button>
    </div>
  `;

  const salir=document.getElementById("zx_salir");

  salir.onclick=function(e){
    e.preventDefault();
    e.stopPropagation();

    localStorage.removeItem("usuario");
    localStorage.removeItem("zx_estado_jornada");
    localStorage.removeItem("zx_ultimo_fichaje");
    localStorage.removeItem("zentryx_vehiculo_fichaje_id");
    localStorage.removeItem("zentryx_vehiculo_fichaje_matricula");
    localStorage.removeItem("zentryx_vehiculo_fichaje_km");

    window.location.replace("./index.html?v=2632");
  };

  if(relojTimer) clearInterval(relojTimer);

  relojTimer=setInterval(function(){
    const f=document.getElementById("zx_fecha");
    const r=document.getElementById("zx_hora");
    if(f) f.textContent=fecha();
    if(r) r.textContent=hora();
  },1000);
}

function barraUsuario(){
  let b=document.getElementById("zx_usuario_barra");
  if(!b){
    b=document.createElement("div");
    b.id="zx_usuario_barra";
    document.body.appendChild(b);
  }

  const u=usuario();

  b.innerHTML=`
    <div id="zx_logo">Z</div>
    <div>
      <div id="zx_nombre_app">Zentryx PRO</div>
      <div id="zx_usuario_texto">${u.usuario || "admin"} · ${u.rol || "admin"}</div>
    </div>
  `;
}

function boton(t,a){
  return `<button class="zx_btn_nav" type="button" onclick="${a}">${t}</button>`;
}

function nav(){
  let n=document.getElementById("zx_nav");
  if(!n){
    n=document.createElement("div");
    n.id="zx_nav";
    document.body.appendChild(n);
  }

  n.innerHTML=`
    ${boton("Inicio","ZX_inicio()")}
    ${boton("Fichaje","ZX_fichaje()")}
    ${boton("Usuarios","ZX_usuarios()")}
    ${boton("Vehículos","ZX_vehiculos()")}
    ${boton("Incidencias","ZX_incidencias()")}
    ${boton("Informes","ZX_informes()")}
  `;
}

window.ZX_usuarios=function(){
  app().innerHTML=`<div class="zx_card"><h1>Usuarios</h1><p>Módulo usuarios pendiente.</p></div>`;
};

window.ZX_incidencias=function(){
  app().innerHTML=`<div class="zx_card"><h1>Incidencias</h1><p>Módulo incidencias pendiente.</p></div>`;
};

window.ZX_informes=function(){
  app().innerHTML=`<div class="zx_card"><h1>Informes</h1><p>Módulo informes pendiente.</p></div>`;
};

window.ZX_vehiculos=function(){
  if(window.ZENTRYX_UI_abrirVehiculos){ window.ZENTRYX_UI_abrirVehiculos(); return; }
  if(window.ZX_VEHICULOS_ABRIR){ window.ZX_VEHICULOS_ABRIR(); return; }
  app().innerHTML=`<div class="zx_card"><h1>Vehículos</h1><p>No cargado.</p></div>`;
};

window.ZX_fichaje=function(){
  if(window.ZENTRYX_UI_fichaje){ window.ZENTRYX_UI_fichaje(); return; }
  app().innerHTML=`<div class="zx_card"><h1>Fichaje</h1><p>No cargado.</p></div>`;
};

function iniciar(){
  estilos();
  header();
  barraUsuario();
  nav();

  setTimeout(function(){
    if(window.ZX_inicio) window.ZX_inicio();
  },100);
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",iniciar);
}else{
  iniciar();
}

})();