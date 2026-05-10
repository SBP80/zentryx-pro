// ===============================
// ZENTRYX V2641 - FICHAJES SUPABASE REAL
// ===============================
(function(){
"use strict";

function app(){
  return document.getElementById("app");
}

function sb(){
  return window.sb || window.supabaseClient || null;
}

function usuarioActual(){
  try{
    const u = JSON.parse(localStorage.getItem("usuario") || "{}");
    return u.usuario || u.nombre || "admin";
  }catch(e){
    return "admin";
  }
}

function estadoActual(){
  return localStorage.getItem("zx_estado_jornada") || "fuera";
}

function guardarEstado(valor){
  localStorage.setItem("zx_estado_jornada",valor);
}

function badgeEstado(){
  const dentro = estadoActual() === "dentro";

  return `
    <span style="
      display:inline-block;
      padding:10px 14px;
      border-radius:999px;
      font-weight:900;
      background:${dentro ? "#dcfce7" : "#fee2e2"};
      color:${dentro ? "#166534" : "#991b1b"};
      margin-bottom:16px;
    ">
      ${dentro ? "Dentro" : "Fuera"}
    </span>
  `;
}

function obtenerUbicacion(){
  return new Promise(function(resolve){
    if(!navigator.geolocation){
      resolve({
        latitud:null,
        longitud:null
      });
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
        resolve({
          latitud:null,
          longitud:null
        });
      },
      {
        enableHighAccuracy:true,
        timeout:7000,
        maximumAge:0
      }
    );
  });
}

async function guardarFichaje(tipo,extra){
  const cliente = sb();

  if(!cliente){
    alert("Supabase no conectado.");
    return false;
  }

  const ubicacion = await obtenerUbicacion();

  const registro = {
    empresa_id:"demo",
    usuario:usuarioActual(),
    tipo:tipo,
    estado_jornada:estadoActual(),
    latitud:ubicacion.latitud,
    longitud:ubicacion.longitud,
    direccion:null,
    vehiculo_id:extra && extra.vehiculo_id ? extra.vehiculo_id : null,
    vehiculo_matricula:extra && extra.vehiculo_matricula ? extra.vehiculo_matricula : null,
    km_salida:extra && extra.km_salida ? extra.km_salida : null,
    observaciones:extra && extra.observaciones ? extra.observaciones : null
  };

  const res = await cliente
    .from("fichajes")
    .insert([registro]);

  if(res.error){
    alert("Error guardando fichaje: " + res.error.message);
    return false;
  }

  localStorage.setItem(
    "zx_ultimo_fichaje",
    JSON.stringify({
      tipo:tipo,
      usuario:usuarioActual(),
      fecha:new Date().toISOString()
    })
  );

  return true;
}

async function cargarHistorico(){
  const cont = document.getElementById("zx_historial_fichajes");
  if(!cont) return;

  const cliente = sb();

  if(!cliente){
    cont.innerHTML = "Supabase no conectado.";
    return;
  }

  cont.innerHTML = "Cargando historial...";

  const res = await cliente
    .from("fichajes")
    .select("*")
    .eq("usuario",usuarioActual())
    .order("created_at",{ascending:false})
    .limit(10);

  if(res.error){
    cont.innerHTML = "Error cargando historial.";
    return;
  }

  const datos = res.data || [];

  if(datos.length === 0){
    cont.innerHTML = `
      <div style="color:#6b7280;">
        Sin fichajes registrados.
      </div>
    `;
    return;
  }

  cont.innerHTML = datos.map(function(f){

    const fecha = f.created_at
      ? new Date(f.created_at).toLocaleString("es-ES")
      : "-";

    return `
      <div style="
        border:1px solid #d1d5db;
        border-radius:16px;
        padding:12px;
        margin-bottom:10px;
        background:white;
      ">
        <div style="font-weight:900;font-size:16px;">
          ${f.tipo || "-"}
        </div>

        <div style="color:#6b7280;font-size:14px;margin-top:4px;">
          ${fecha}
        </div>

        <div style="color:#374151;font-size:14px;margin-top:4px;">
          Estado: ${f.estado_jornada || "-"}
        </div>
      </div>
    `;
  }).join("");
}

function pintarPantalla(){
  const root = app();
  if(!root) return;

  root.innerHTML = `
    <div class="zx_card">
      <h2>Fichaje</h2>

      <div style="
        font-size:17px;
        color:#6b7280;
        margin-bottom:12px;
      ">
        Usuario: <b>${usuarioActual()}</b>
      </div>

      ${badgeEstado()}

      <button id="zx_fichar_entrada" class="zx_btn zx_verde">
        Entrada
      </button>

      <button id="zx_fichar_salida" class="zx_btn zx_rojo">
        Salida
      </button>

      <button id="zx_fichar_pausa" class="zx_btn zx_naranja">
        Inicio pausa
      </button>

      <button id="zx_fichar_comida" class="zx_btn zx_naranja">
        Inicio comida
      </button>
    </div>

    <div class="zx_card">
      <h2>Historial</h2>
      <div id="zx_historial_fichajes"></div>
    </div>
  `;

  activarBotones();
  cargarHistorico();
}

function activarBotones(){

  document.getElementById("zx_fichar_entrada").onclick = async function(){

    if(estadoActual() === "dentro"){
      alert("Ya estás dentro.");
      return;
    }

    guardarEstado("dentro");

    const ok = await guardarFichaje("entrada",{});

    if(!ok){
      guardarEstado("fuera");
      return;
    }

    pintarPantalla();
  };

  document.getElementById("zx_fichar_salida").onclick = async function(){

    if(estadoActual() === "fuera"){
      alert("No puedes fichar salida sin entrada.");
      return;
    }

    const km = prompt("Km salida si usaste vehículo. Déjalo vacío si no corresponde.","");

    guardarEstado("fuera");

    const ok = await guardarFichaje("salida",{
      km_salida:km ? Number(km) : null
    });

    if(!ok){
      guardarEstado("dentro");
      return;
    }

    pintarPantalla();
  };

  document.getElementById("zx_fichar_pausa").onclick = async function(){

    if(estadoActual() === "fuera"){
      alert("No puedes iniciar pausa sin entrada.");
      return;
    }

    const ok = await guardarFichaje("inicio_pausa",{});

    if(ok){
      alert("Pausa registrada.");
      cargarHistorico();
    }
  };

  document.getElementById("zx_fichar_comida").onclick = async function(){

    if(estadoActual() === "fuera"){
      alert("No puedes iniciar comida sin entrada.");
      return;
    }

    const ok = await guardarFichaje("inicio_comida",{});

    if(ok){
      alert("Comida registrada.");
      cargarHistorico();
    }
  };
}

window.ZX_fichaje = pintarPantalla;
window.ZENTRYX_UI_fichaje = pintarPantalla;

console.log("Fichajes Supabase V2641 cargado");

})();