// ===============================
// ZENTRYX V2646 - FICHAJES CON VEHÍCULO EN ENTRADA
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

function vehiculoJornada(){
  return {
    id: localStorage.getItem("zx_vehiculo_jornada_id"),
    matricula: localStorage.getItem("zx_vehiculo_jornada_matricula"),
    km: Number(localStorage.getItem("zx_vehiculo_jornada_km") || 0)
  };
}

function limpiarVehiculoJornada(){
  localStorage.removeItem("zx_vehiculo_jornada_id");
  localStorage.removeItem("zx_vehiculo_jornada_matricula");
  localStorage.removeItem("zx_vehiculo_jornada_km");
}

function badgeEstado(){
  const dentro = estadoActual() === "dentro";

  return `
    <span class="zx_estado ${dentro ? "zx_dentro" : "zx_fuera"}">
      ${dentro ? "Dentro" : "Fuera"}
    </span>
  `;
}

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

async function obtenerVehiculosLibres(){
  const cliente = sb();

  if(!cliente){
    return [];
  }

  const res = await cliente
    .from("vehiculos")
    .select("*")
    .eq("activo",true)
    .or("en_uso.is.false,en_uso.is.null")
    .order("matricula",{ascending:true});

  if(res.error){
    alert("Error cargando vehículos: " + res.error.message);
    return [];
  }

  return res.data || [];
}

async function seleccionarVehiculoEntrada(){

  const vehiculos = await obtenerVehiculosLibres();

  return new Promise(function(resolve){

    const viejo = document.getElementById("zx_modal_vehiculo");
    if(viejo) viejo.remove();

    const fondo = document.createElement("div");
    fondo.id = "zx_modal_vehiculo";

    fondo.style.position = "fixed";
    fondo.style.inset = "0";
    fondo.style.zIndex = "999999";
    fondo.style.background = "rgba(15,23,42,.65)";
    fondo.style.display = "flex";
    fondo.style.alignItems = "center";
    fondo.style.justifyContent = "center";
    fondo.style.padding = "18px";

    const listaVehiculos = vehiculos.map(function(v){
      return `
        <button
          class="zx_opcion_vehiculo"
          data-id="${v.id}"
          style="
            width:100%;
            border:1px solid #d1d5db;
            border-radius:16px;
            background:white;
            color:#111827;
            padding:16px;
            margin-bottom:10px;
            text-align:left;
            font-size:18px;
            font-weight:900;
          "
        >
          ${v.matricula || "Sin matrícula"}
          <div style="
            font-size:14px;
            color:#6b7280;
            margin-top:4px;
            font-weight:700;
          ">
            ${v.km_actual || 0} km
          </div>
        </button>
      `;
    }).join("");

    fondo.innerHTML = `
      <div style="
        width:100%;
        max-width:440px;
        background:white;
        border-radius:24px;
        padding:22px;
        box-shadow:0 20px 60px rgba(0,0,0,.35);
      ">

        <h2 style="
          margin:0 0 14px;
          font-size:28px;
          font-weight:900;
          color:#111827;
        ">
          Vehículo
        </h2>

        <div style="
          color:#6b7280;
          font-size:16px;
          margin-bottom:18px;
          line-height:1.4;
        ">
          Elige vehículo para esta jornada.
        </div>

        <button
          id="zx_sin_vehiculo"
          style="
            width:100%;
            border:0;
            border-radius:16px;
            background:#64748b;
            color:white;
            padding:16px;
            margin-bottom:14px;
            font-size:18px;
            font-weight:900;
          "
        >
          Sin vehículo
        </button>

        ${listaVehiculos || `
          <div style="
            color:#6b7280;
            font-size:16px;
            margin-bottom:14px;
          ">
            No hay vehículos libres.
          </div>
        `}

        <button
          id="zx_cancelar_vehiculo"
          style="
            width:100%;
            border:0;
            border-radius:16px;
            background:#e5e7eb;
            color:#111827;
            padding:16px;
            margin-top:6px;
            font-size:18px;
            font-weight:900;
          "
        >
          Cancelar
        </button>

      </div>
    `;

    document.body.appendChild(fondo);

    document.getElementById("zx_sin_vehiculo").onclick = function(){
      limpiarVehiculoJornada();
      fondo.remove();
      resolve(true);
    };

    document.getElementById("zx_cancelar_vehiculo").onclick = function(){
      fondo.remove();
      resolve(false);
    };

    document.querySelectorAll(".zx_opcion_vehiculo").forEach(function(btn){

      btn.onclick = async function(){

        const id = btn.getAttribute("data-id");

        const vehiculo = vehiculos.find(function(v){
          return String(v.id) === String(id);
        });

        if(!vehiculo){
          alert("Vehículo no válido.");
          return;
        }

        const cliente = sb();

        const ocupar = await cliente
          .from("vehiculos")
          .update({
            en_uso:true,
            usuario_asignado:usuarioActual()
          })
          .eq("id",vehiculo.id);

        if(ocupar.error){
          alert("No se pudo ocupar el vehículo: " + ocupar.error.message);
          return;
        }

        localStorage.setItem("zx_vehiculo_jornada_id",vehiculo.id);
        localStorage.setItem("zx_vehiculo_jornada_matricula",vehiculo.matricula || "");
        localStorage.setItem("zx_vehiculo_jornada_km",String(vehiculo.km_actual || 0));

        fondo.remove();
        resolve(true);
      };
    });
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
    fecha:new Date().toISOString(),
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
    .order("fecha",{ascending:false})
    .limit(20);

  if(res.error){
    cont.innerHTML = "Error cargando historial.";
    return;
  }

  const datos = res.data || [];

  if(datos.length === 0){
    cont.innerHTML = `<div class="zx_text">Sin fichajes registrados.</div>`;
    return;
  }

  cont.innerHTML = datos.map(function(f){
    const fecha = f.fecha ? new Date(f.fecha).toLocaleString("es-ES") : "-";

    return `
      <div class="zx_hist_item">
        <div class="zx_hist_tipo">${nombreTipo(f.tipo)}</div>
        <div class="zx_hist_fecha">${fecha}</div>
        ${f.vehiculo_matricula ? `<div class="zx_hist_fecha">Vehículo: ${f.vehiculo_matricula}</div>` : ""}
        ${f.km_salida ? `<div class="zx_hist_fecha">Km salida: ${f.km_salida}</div>` : ""}
        ${(f.latitud && f.longitud) ? `<div class="zx_hist_fecha">GPS: ${f.latitud}, ${f.longitud}</div>` : ""}
      </div>
    `;
  }).join("");
}

function nombreTipo(tipo){
  const mapa = {
    entrada:"Entrada",
    salida:"Salida",
    inicio_pausa:"Inicio pausa",
    inicio_comida:"Inicio comida"
  };

  return mapa[tipo] || tipo || "-";
}

function pintarPantalla(){
  const root = app();
  if(!root) return;

  const v = vehiculoJornada();

  root.innerHTML = `
    <div class="zx_card">
      <h2>Fichaje</h2>

      <div class="zx_text" style="margin-bottom:12px;">
        Usuario: <b>${usuarioActual()}</b>
      </div>

      ${badgeEstado()}

      ${
        v.id
        ? `<div class="zx_text" style="margin-bottom:12px;">Vehículo jornada: <b>${v.matricula}</b></div>`
        : `<div class="zx_text" style="margin-bottom:12px;">Vehículo jornada: <b>Sin vehículo</b></div>`
      }

      <button id="zx_fichar_entrada" class="zx_btn zx_verde">Entrada</button>
      <button id="zx_fichar_salida" class="zx_btn zx_rojo">Salida</button>
      <button id="zx_fichar_pausa" class="zx_btn zx_naranja">Inicio pausa</button>
      <button id="zx_fichar_comida" class="zx_btn zx_naranja">Inicio comida</button>
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

    const seleccionado = await seleccionarVehiculoEntrada();

    if(seleccionado === false){
      return;
    }

    guardarEstado("dentro");

    const v = vehiculoJornada();

    const ok = await guardarFichaje("entrada",{
      vehiculo_id:v.id || null,
      vehiculo_matricula:v.matricula || null
    });

    if(!ok){
      guardarEstado("fuera");
      limpiarVehiculoJornada();
      return;
    }

    pintarPantalla();
  };

  document.getElementById("zx_fichar_salida").onclick = async function(){

    if(estadoActual() === "fuera"){
      alert("No puedes fichar salida sin entrada.");
      return;
    }

    const v = vehiculoJornada();
    let kmSalida = null;

    if(v.id){
      const km = prompt(
        "Introduce km actuales de " + (v.matricula || "vehículo") + ":\n\nKm guardados: " + v.km,
        v.km ? String(v.km) : ""
      );

      if(km === null || String(km).trim() === ""){
        alert("Debes introducir km para cerrar salida.");
        return;
      }

      kmSalida = Number(String(km).replace(",","."));

      if(Number.isNaN(kmSalida) || kmSalida <= 0){
        alert("Km no válido.");
        return;
      }

      if(kmSalida < v.km){
        alert("Los km no pueden ser menores que los actuales.");
        return;
      }

      const cliente = sb();

      const act = await cliente
        .from("vehiculos")
        .update({
          km_actual:kmSalida,
          en_uso:false
        })
        .eq("id",v.id);

      if(act.error){
        alert("Error actualizando vehículo: " + act.error.message);
        return;
      }
    }

    guardarEstado("fuera");

    const ok = await guardarFichaje("salida",{
      vehiculo_id:v.id || null,
      vehiculo_matricula:v.matricula || null,
      km_salida:kmSalida
    });

    if(!ok){
      guardarEstado("dentro");
      return;
    }

    limpiarVehiculoJornada();
    pintarPantalla();
  };

  document.getElementById("zx_fichar_pausa").onclick = async function(){

    if(estadoActual() === "fuera"){
      alert("No puedes iniciar pausa sin entrada.");
      return;
    }

    const v = vehiculoJornada();

    const ok = await guardarFichaje("inicio_pausa",{
      vehiculo_id:v.id || null,
      vehiculo_matricula:v.matricula || null
    });

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

    const v = vehiculoJornada();

    const ok = await guardarFichaje("inicio_comida",{
      vehiculo_id:v.id || null,
      vehiculo_matricula:v.matricula || null
    });

    if(ok){
      alert("Comida registrada.");
      cargarHistorico();
    }
  };
}

window.ZX_fichaje = pintarPantalla;
window.ZENTRYX_UI_fichaje = pintarPantalla;

console.log("Fichajes Supabase V2646 cargado");

})();