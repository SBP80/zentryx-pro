// ===============================
// ZENTRYX V2631 - MÓDULO FICHAJES UI
// Archivo: src/modules/fichajes.js
// ===============================

(function(){
"use strict";

const MODULO = {
  nombre: "fichajes",
  version: "2631",
  activo: true,
  init: init
};

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

function estadoActual(){
  return localStorage.getItem("zx_estado_jornada") || "fuera";
}

function guardarEstado(valor){
  localStorage.setItem("zx_estado_jornada", valor);
}

function badgeEstado(){
  if(estadoActual() === "dentro"){
    return `
      <div style="
        display:inline-block;
        background:#dcfce7;
        color:#166534;
        padding:12px 18px;
        border-radius:999px;
        font-weight:900;
        font-size:20px;
      ">
        Dentro
      </div>
    `;
  }

  return `
    <div style="
      display:inline-block;
      background:#fee2e2;
      color:#991b1b;
      padding:12px 18px;
      border-radius:999px;
      font-weight:900;
      font-size:20px;
    ">
      Fuera
    </div>
  `;
}

function renderFichajes(){
  const root = app();
  if(!root) return;

  const u = usuario();

  root.innerHTML = `
    <div style="padding:18px;">

      <div style="
        background:white;
        border-radius:24px;
        padding:24px;
        border:1px solid #d1d5db;
        box-shadow:0 10px 30px rgba(0,0,0,.05);
      ">

        <h1 style="
          margin:0 0 20px;
          font-size:44px;
          font-weight:900;
          color:#0f172a;
        ">
          Fichaje
        </h1>

        <div style="
          font-size:24px;
          font-weight:900;
          margin-bottom:8px;
          color:#111827;
        ">
          ${(u.usuario || "admin")}
        </div>

        <div style="
          color:#6b7280;
          font-size:20px;
          margin-bottom:20px;
        ">
          Estado jornada
        </div>

        ${badgeEstado()}

        <div style="height:24px;"></div>

        <button
          id="zx_btn_entrada"
          style="
            width:100%;
            border:0;
            border-radius:18px;
            padding:20px;
            margin-bottom:16px;
            background:#16a34a;
            color:white;
            font-size:26px;
            font-weight:900;
          "
        >
          Entrada
        </button>

        <button
          id="zx_btn_salida"
          style="
            width:100%;
            border:0;
            border-radius:18px;
            padding:20px;
            margin-bottom:16px;
            background:#dc2626;
            color:white;
            font-size:26px;
            font-weight:900;
          "
        >
          Salida
        </button>

        <button
          id="zx_btn_pausa"
          style="
            width:100%;
            border:0;
            border-radius:18px;
            padding:18px;
            margin-bottom:16px;
            background:#f59e0b;
            color:white;
            font-size:22px;
            font-weight:900;
          "
        >
          Inicio pausa
        </button>

        <button
          id="zx_btn_comida"
          style="
            width:100%;
            border:0;
            border-radius:18px;
            padding:18px;
            background:#f59e0b;
            color:white;
            font-size:22px;
            font-weight:900;
          "
        >
          Inicio comida
        </button>

      </div>

    </div>
  `;

  activarEventos();
}

function activarEventos(){

  const entrada = document.getElementById("zx_btn_entrada");
  const salida = document.getElementById("zx_btn_salida");
  const pausa = document.getElementById("zx_btn_pausa");
  const comida = document.getElementById("zx_btn_comida");

  if(entrada){
    entrada.onclick = async function(){

      if(estadoActual() === "dentro"){
        alert("Ya estás dentro.");
        return;
      }

      const seleccionado = await seleccionarVehiculoEntrada();

      if(seleccionado === false){
        return;
      }

      guardarEstado("dentro");

      guardarUltimoFichaje("entrada");

      renderFichajes();
    };
  }

  if(salida){
    salida.onclick = async function(){

      if(estadoActual() === "fuera"){
        alert("No puedes fichar salida sin entrada.");
        return;
      }

      const ok = await cerrarVehiculoSalida();

      if(ok === false){
        return;
      }

      guardarEstado("fuera");

      guardarUltimoFichaje("salida");

      renderFichajes();
    };
  }

  if(pausa){
    pausa.onclick = function(){

      if(estadoActual() === "fuera"){
        alert("No puedes iniciar pausa sin entrada.");
        return;
      }

      guardarUltimoFichaje("inicio_pausa");

      alert("Pausa registrada.");
    };
  }

  if(comida){
    comida.onclick = function(){

      if(estadoActual() === "fuera"){
        alert("No puedes iniciar comida sin entrada.");
        return;
      }

      guardarUltimoFichaje("inicio_comida");

      alert("Comida registrada.");
    };
  }
}

function guardarUltimoFichaje(tipo){
  const registro = {
    tipo: tipo,
    fecha: new Date().toISOString(),
    usuario: (usuario().usuario || "admin")
  };

  localStorage.setItem(
    "zx_ultimo_fichaje",
    JSON.stringify(registro)
  );
}

async function seleccionarVehiculoEntrada(){

  if(
    !window.vehiculosAPI ||
    typeof window.vehiculosAPI.listarLibres !== "function"
  ){
    limpiarVehiculoJornada();
    return true;
  }

  const res = await window.vehiculosAPI.listarLibres();

  if(res.error){
    alert("Error cargando vehículos: " + (res.error.message || res.error));
    return false;
  }

  const vehiculos = res.data || [];

  const seleccion = await modalSeleccionVehiculo(vehiculos);

  if(seleccion.tipo === "cancelado"){
    return false;
  }

  if(seleccion.tipo === "sin_vehiculo"){
    limpiarVehiculoJornada();
    return true;
  }

  const vehiculo = seleccion.vehiculo;

  if(!vehiculo){
    alert("Vehículo no válido.");
    return false;
  }

  const ocupar = await window.vehiculosAPI.ocupar(vehiculo.id);

  if(ocupar.error){
    alert("No se puede usar este vehículo: " + (ocupar.error.message || ocupar.error));
    return false;
  }

  localStorage.setItem("zentryx_vehiculo_fichaje_id", vehiculo.id);
  localStorage.setItem("zentryx_vehiculo_fichaje_matricula", vehiculo.matricula || "");
  localStorage.setItem("zentryx_vehiculo_fichaje_km", String(vehiculo.km_actual || 0));

  return true;
}

function modalSeleccionVehiculo(vehiculos){
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

    let opciones = `<option value="">Sin vehículo</option>`;

    opciones += (vehiculos || []).map(function(v){
      return `
        <option value="${v.id}">
          ${(v.matricula || "Sin matrícula")} · ${(v.km_actual || 0)} km
        </option>
      `;
    }).join("");

    fondo.innerHTML = `
      <div style="
        background:white;
        border-radius:24px;
        padding:24px;
        width:100%;
        max-width:440px;
        box-shadow:0 20px 60px rgba(0,0,0,.35);
      ">

        <h1 style="
          margin:0 0 12px;
          font-size:30px;
          font-weight:900;
          color:#111827;
        ">
          Vehículo
        </h1>

        <div style="
          color:#6b7280;
          font-size:18px;
          margin-bottom:18px;
          line-height:1.4;
        ">
          Selecciona vehículo para la jornada o continúa sin vehículo.
        </div>

        <select
          id="zx_select_vehiculo_entrada"
          style="
            width:100%;
            padding:16px;
            border-radius:14px;
            border:1px solid #d1d5db;
            font-size:18px;
            margin-bottom:16px;
            background:white;
          "
        >
          ${opciones}
        </select>

        <button
          id="zx_confirmar_vehiculo_entrada"
          style="
            width:100%;
            border:0;
            border-radius:16px;
            padding:16px;
            background:#2563eb;
            color:white;
            font-size:18px;
            font-weight:900;
            margin-bottom:12px;
          "
        >
          Continuar
        </button>

        <button
          id="zx_cancelar_vehiculo_entrada"
          style="
            width:100%;
            border:0;
            border-radius:16px;
            padding:16px;
            background:#e5e7eb;
            color:#111827;
            font-size:18px;
            font-weight:900;
          "
        >
          Cancelar
        </button>

      </div>
    `;

    document.body.appendChild(fondo);

    document.getElementById("zx_confirmar_vehiculo_entrada").onclick =
    function(){

      const id = document.getElementById("zx_select_vehiculo_entrada").value;

      fondo.remove();

      if(!id){
        resolve({
          tipo: "sin_vehiculo"
        });
        return;
      }

      const vehiculo = (vehiculos || []).find(function(v){
        return String(v.id) === String(id);
      });

      resolve({
        tipo: "vehiculo",
        vehiculo: vehiculo
      });
    };

    document.getElementById("zx_cancelar_vehiculo_entrada").onclick =
    function(){

      fondo.remove();

      resolve({
        tipo: "cancelado"
      });
    };
  });
}

async function cerrarVehiculoSalida(){

  const vehiculoId = localStorage.getItem("zentryx_vehiculo_fichaje_id");

  if(!vehiculoId){
    return true;
  }

  const matricula =
    localStorage.getItem("zentryx_vehiculo_fichaje_matricula") ||
    "vehículo";

  const kmAnterior =
    Number(localStorage.getItem("zentryx_vehiculo_fichaje_km") || 0);

  let km = prompt(
    "Introduce km actuales de " + matricula + ":\n\nKm guardados: " + kmAnterior,
    kmAnterior ? String(kmAnterior) : ""
  );

  if(km === null){
    alert("Debes introducir km para cerrar salida.");
    return false;
  }

  km = Number(
    String(km)
      .replace(",", ".")
      .trim()
  );

  if(!km || Number.isNaN(km) || km <= 0){
    alert("Km no válido.");
    return false;
  }

  if(km < kmAnterior){
    alert("Los km no pueden ser menores que los actuales (" + kmAnterior + ").");
    return false;
  }

  if(window.vehiculosAPI){
    const act = await window.vehiculosAPI.actualizarKm(
      vehiculoId,
      km,
      "Fichaje salida"
    );

    if(act.error){
      alert("Error actualizando km: " + (act.error.message || act.error));
      return false;
    }

    await window.vehiculosAPI.liberar(vehiculoId);
  }

  limpiarVehiculoJornada();

  return true;
}

function limpiarVehiculoJornada(){
  localStorage.removeItem("zentryx_vehiculo_fichaje_id");
  localStorage.removeItem("zentryx_vehiculo_fichaje_matricula");
  localStorage.removeItem("zentryx_vehiculo_fichaje_km");
}

function registrar(){
  if(
    !window.ZENTRYX ||
    typeof window.ZENTRYX.registrarModulo !== "function"
  ){
    setTimeout(registrar,100);
    return;
  }

  window.ZENTRYX.registrarModulo("fichajes", MODULO);

  window.ZX_fichaje = renderFichajes;
  window.ZENTRYX_UI_fichaje = renderFichajes;

  try{
    MODULO.init();
  }catch(e){
    console.error("Error inicializando fichajes:", e);
    alert("Error cargando fichajes: " + ((e && e.message) || e));
  }
}

window.ZX_fichaje = renderFichajes;
window.ZENTRYX_UI_fichaje = renderFichajes;

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", registrar);
}else{
  registrar();
}

})();