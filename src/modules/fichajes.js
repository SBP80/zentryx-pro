// ===============================
// ZENTRYX PRO - MÓDULO FICHAJES
// V2646
// ===============================
(function(){
"use strict";

const ZX_VERSION="2646";

// ===============================
// HELPERS
// ===============================

function $(id){
  return document.getElementById(id);
}

function app(){
  return $("app");
}

function sb(){
  return window.sb || window.supabaseClient || null;
}

function limpiarTexto(valor){
  return String(valor ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function usuarioActual(){
  try{
    const raw=localStorage.getItem("zentryx_session") || localStorage.getItem("usuario") || "{}";
    const u=JSON.parse(raw);
    return u.usuario || u.nombre || "admin";
  }catch(e){
    return "admin";
  }
}

// ===============================
// ESTADO JORNADA
// ===============================

function estadoActual(){
  return localStorage.getItem("zx_estado") || "fuera";
}

function guardarEstado(valor){
  localStorage.setItem("zx_estado",valor);
}

// ===============================
// VEHÍCULO
// ===============================

function vehiculoJornada(){
  return {
    id:localStorage.getItem("zx_vehiculo_activo"),
    matricula:localStorage.getItem("zx_vehiculo_matricula"),
    km:Number(localStorage.getItem("zx_vehiculo_km") || 0)
  };
}

function guardarVehiculo(v){
  localStorage.setItem("zx_vehiculo_activo",v.id);
  localStorage.setItem("zx_vehiculo_matricula",v.matricula || "");
  localStorage.setItem("zx_vehiculo_km",String(v.km_actual || 0));
}

function limpiarVehiculo(){
  localStorage.removeItem("zx_vehiculo_activo");
  localStorage.removeItem("zx_vehiculo_matricula");
  localStorage.removeItem("zx_vehiculo_km");
}

// ===============================
// UI
// ===============================

function badgeEstado(){
  const dentro=estadoActual()==="dentro";

  return `
    <span class="zx_estado ${dentro ? "zx_dentro" : "zx_fuera"}">
      ${dentro ? "Dentro" : "Fuera"}
    </span>
  `;
}

// ===============================
// GPS
// ===============================

function obtenerUbicacion(){
  return new Promise(function(resolve){
    if(!navigator.geolocation){
      resolve({latitud:null,longitud:null});
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function(pos){
        resolve({
          latitud:pos.coords.latitude,
          longitud:pos.coords.longitude
        });
      },
      function(){
        resolve({latitud:null,longitud:null});
      },
      {
        enableHighAccuracy:true,
        timeout:7000,
        maximumAge:0
      }
    );
  });
}

// ===============================
// VEHÍCULOS
// ===============================

async function obtenerVehiculosLibres(){

  const cliente=sb();

  if(!cliente){
    alert("Supabase no conectado.");
    return [];
  }

  const res=await cliente
    .from("vehiculos")
    .select("*")
    .eq("activo",true)
    .or("en_uso.is.false,en_uso.is.null")
    .order("matricula",{ascending:true});

  if(res.error){
    alert("Error cargando vehículos: "+res.error.message);
    return [];
  }

  return res.data || [];
}

// ===============================
// MODAL VEHÍCULO
// ===============================

async function seleccionarVehiculoEntrada(){

  const vehiculos=await obtenerVehiculosLibres();

  return new Promise(function(resolve){

    const viejo=$("zx_modal_vehiculo");
    if(viejo) viejo.remove();

    const fondo=document.createElement("div");
    fondo.id="zx_modal_vehiculo";

    fondo.style.cssText=`
      position:fixed;
      inset:0;
      z-index:999999;
      background:rgba(15,23,42,.65);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:18px;
    `;

    const lista=vehiculos.map(function(v){
      return `
        <button class="zx_opcion_vehiculo" data-id="${v.id}">
          ${limpiarTexto(v.matricula || "Sin matrícula")}
          <div>${limpiarTexto(v.km_actual || 0)} km</div>
        </button>
      `;
    }).join("");

    fondo.innerHTML=`
      <div class="zx_card" style="max-width:440px;width:100%;">
        <h2>Vehículo</h2>

        <button id="zx_sin_vehiculo" class="zx_btn zx_gris">
          Sin vehículo
        </button>

        ${lista || `<div class="zx_text">No hay vehículos libres.</div>`}

        <button id="zx_cancelar" class="zx_btn zx_gris">
          Cancelar
        </button>
      </div>
    `;

    document.body.appendChild(fondo);

    $("zx_sin_vehiculo").onclick=function(){
      limpiarVehiculo();
      fondo.remove();
      resolve(true);
    };

    $("zx_cancelar").onclick=function(){
      fondo.remove();
      resolve(false);
    };

    document.querySelectorAll(".zx_opcion_vehiculo").forEach(function(btn){

      btn.onclick=async function(){

        const id=btn.getAttribute("data-id");

        const v=vehiculos.find(x=>String(x.id)===String(id));

        if(!v){
          alert("Vehículo inválido.");
          return;
        }

        const cliente=sb();

        const upd=await cliente
          .from("vehiculos")
          .update({
            en_uso:true,
            usuario_asignado:usuarioActual()
          })
          .eq("id",v.id);

        if(upd.error){
          alert("Error asignando vehículo.");
          return;
        }

        guardarVehiculo(v);

        fondo.remove();
        resolve(true);
      };
    });

  });
}

// ===============================
// GUARDAR
// ===============================

async function guardarFichaje(tipo,extra={}){

  const cliente=sb();

  if(!cliente){
    alert("Supabase no conectado.");
    return false;
  }

  const gps=await obtenerUbicacion();

  const registro={
    empresa_id:"demo",
    usuario:usuarioActual(),
    tipo:tipo,
    fecha:new Date().toISOString(),
    estado_jornada:estadoActual(),
    latitud:gps.latitud,
    longitud:gps.longitud,
    vehiculo_id:extra.vehiculo_id || null,
    vehiculo_matricula:extra.vehiculo_matricula || null,
    km_salida:extra.km_salida || null
  };

  const res=await cliente.from("fichajes").insert([registro]);

  if(res.error){
    alert("Error guardando fichaje: "+res.error.message);
    return false;
  }

  return true;
}

// ===============================
// HISTORIAL
// ===============================

function nombreTipo(tipo){
  const mapa={
    entrada:"Entrada",
    salida:"Salida",
    inicio_pausa:"Inicio pausa",
    inicio_comida:"Inicio comida"
  };

  return mapa[tipo] || tipo;
}

async function cargarHistorico(){

  const cont=$("zx_historial_fichajes");
  if(!cont) return;

  const cliente=sb();

  const res=await cliente
    .from("fichajes")
    .select("*")
    .eq("usuario",usuarioActual())
    .order("fecha",{ascending:false})
    .limit(20);

  if(res.error){
    cont.innerHTML="Error cargando historial.";
    return;
  }

  const datos=res.data || [];

  cont.innerHTML=datos.map(function(f){

    return `
      <div class="zx_hist_item">
        <div class="zx_hist_tipo">${limpiarTexto(nombreTipo(f.tipo))}</div>
        <div class="zx_hist_fecha">${new Date(f.fecha).toLocaleString("es-ES")}</div>
        ${f.vehiculo_matricula ? `<div class="zx_hist_fecha">Vehículo: ${limpiarTexto(f.vehiculo_matricula)}</div>` : ""}
        ${f.km_salida ? `<div class="zx_hist_fecha">Km: ${limpiarTexto(f.km_salida)}</div>` : ""}
      </div>
    `;

  }).join("");
}

// ===============================
// UI PRINCIPAL
// ===============================

function pintar(){

  const root=app();
  if(!root) return;

  const v=vehiculoJornada();

  root.innerHTML=`
    <div class="zx_card">
      <h2>Fichaje</h2>

      <div class="zx_text">Usuario: <b>${limpiarTexto(usuarioActual())}</b></div>

      ${badgeEstado()}

      <div class="zx_text">
        Vehículo: <b>${limpiarTexto(v.matricula || "Sin vehículo")}</b>
      </div>

      <button id="entrada" class="zx_btn zx_verde">Entrada</button>
      <button id="salida" class="zx_btn zx_rojo">Salida</button>
      <button id="pausa" class="zx_btn zx_naranja">Inicio pausa</button>
      <button id="comida" class="zx_btn zx_naranja">Inicio comida</button>
    </div>

    <div class="zx_card">
      <h2>Historial</h2>
      <div id="zx_historial_fichajes"></div>
    </div>
  `;

  eventos();
  cargarHistorico();
}

// ===============================
// EVENTOS
// ===============================

function eventos(){

  $("entrada").onclick=async function(){

    if(estadoActual()==="dentro"){
      alert("Ya estás dentro.");
      return;
    }

    const okVehiculo=await seleccionarVehiculoEntrada();

    if(!okVehiculo) return;

    guardarEstado("dentro");

    const v=vehiculoJornada();

    const ok=await guardarFichaje("entrada",{
      vehiculo_id:v.id,
      vehiculo_matricula:v.matricula
    });

    if(!ok){
      guardarEstado("fuera");
      limpiarVehiculo();
      return;
    }

    pintar();
  };

  $("salida").onclick=async function(){

    if(estadoActual()==="fuera"){
      alert("No puedes salir sin entrar.");
      return;
    }

    const v=vehiculoJornada();
    let kmSalida=null;

    if(v.id){

      const km=prompt("Km actuales:",String(v.km || ""));

      if(!km){
        alert("Introduce km.");
        return;
      }

      kmSalida=Number(km.replace(",","."));

      if(Number.isNaN(kmSalida) || kmSalida < v.km){
        alert("Km inválidos.");
        return;
      }

      const cliente=sb();

      await cliente.from("vehiculos")
        .update({km_actual:kmSalida,en_uso:false})
        .eq("id",v.id);
    }

    guardarEstado("fuera");

    const ok=await guardarFichaje("salida",{
      vehiculo_id:v.id,
      vehiculo_matricula:v.matricula,
      km_salida:kmSalida
    });

    if(!ok){
      guardarEstado("dentro");
      return;
    }

    limpiarVehiculo();
    pintar();
  };

  $("pausa").onclick=async function(){

    if(estadoActual()==="fuera"){
      alert("Sin entrada.");
      return;
    }

    const v=vehiculoJornada();

    const ok=await guardarFichaje("inicio_pausa",{
      vehiculo_id:v.id,
      vehiculo_matricula:v.matricula
    });

    if(ok){
      alert("Pausa registrada.");
      cargarHistorico();
    }
  };

  $("comida").onclick=async function(){

    if(estadoActual()==="fuera"){
      alert("Sin entrada.");
      return;
    }

    const v=vehiculoJornada();

    const ok=await guardarFichaje("inicio_comida",{
      vehiculo_id:v.id,
      vehiculo_matricula:v.matricula
    });

    if(ok){
      alert("Comida registrada.");
      cargarHistorico();
    }
  };
}

// ===============================
// EXPORT
// ===============================

window.ZX_fichaje=pintar;
window.ZENTRYX_UI_fichaje=pintar;

if(window.ZENTRYX && window.ZENTRYX.registrarModulo){
  window.ZENTRYX.registrarModulo("fichajes",{
    nombre:"Fichajes",
    activo:true,
    version:ZX_VERSION
  });
}

console.log("Fichajes cargado V"+ZX_VERSION);

})();