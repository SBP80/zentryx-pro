// ===============================
// ZENTRYX V2613 - VEHÍCULOS PANTALLA REAL
// ===============================

(function(){
  "use strict";

  const MODULO = {
    nombre: "vehiculos",
    version: "2613",
    activo: true,

    init: function(){
      console.log("Vehículos pantalla activa V2613");
      crearAviso();
      registrarUI();
      return true;
    }
  };

  function crearAviso(){
    var viejo = document.getElementById("zx_mod_vehiculos_banner");
    if(viejo) viejo.remove();

    var aviso = document.createElement("div");
    aviso.textContent = "VEHÍCULOS PANTALLA ACTIVA V2613";
    aviso.style.position = "fixed";
    aviso.style.top = "60px";
    aviso.style.left = "10px";
    aviso.style.right = "10px";
    aviso.style.zIndex = "999999";
    aviso.style.background = "#dcfce7";
    aviso.style.color = "#166534";
    aviso.style.border = "2px solid #22c55e";
    aviso.style.borderRadius = "14px";
    aviso.style.padding = "10px";
    aviso.style.fontWeight = "800";
    aviso.style.textAlign = "center";

    document.body.appendChild(aviso);

    setTimeout(function(){
      aviso.remove();
    }, 3000);
  }

  function registrarUI(){
    window.ZENTRYX_UI_abrirVehiculos = mostrarPantallaVehiculos;
  }

  function contenedorPrincipal(){
    return document.getElementById("app") || document.querySelector(".container") || document.querySelector("main");
  }

  function mostrarPantallaVehiculos(){
    var contenedor = contenedorPrincipal();

    if(!contenedor){
      alert("No encuentro el contenedor principal de la app.");
      return;
    }

    contenedor.innerHTML = `
      <div class="card">
        <h1>Vehículos</h1>
        <p class="muted">Módulo externo de vehículos V2613</p>

        <button onclick="crearVehiculoModulo()" style="
          width:100%;
          padding:14px;
          margin-bottom:15px;
          background:#2563eb;
          color:#fff;
          border:none;
          border-radius:10px;
          font-weight:700;
        ">+ Añadir vehículo</button>

        <div id="listaVehiculosModulo"></div>
      </div>
    `;

    cargarVehiculosModulo();
  }

  function cargarVehiculosModulo(){
    var lista = document.getElementById("listaVehiculosModulo");
    if(!lista) return;

    var vehiculos = JSON.parse(localStorage.getItem("vehiculos_modulo") || "[]");

    if(vehiculos.length === 0){
      lista.innerHTML = "<p>No hay vehículos creados en este módulo.</p>";
      return;
    }

    lista.innerHTML = vehiculos.map(function(v){
      return `
        <div style="
          background:#fff;
          padding:12px;
          border-radius:10px;
          margin-bottom:10px;
          border:1px solid #ddd;
        ">
          <b>${v.matricula}</b><br>
          <span>Km: ${v.km}</span>
        </div>
      `;
    }).join("");
  }

  window.crearVehiculoModulo = function(){
    var matricula = prompt("Matrícula:");
    if(!matricula) return;

    var km = Number(prompt("Kilómetros:", "0") || 0);

    var vehiculos = JSON.parse(localStorage.getItem("vehiculos_modulo") || "[]");

    vehiculos.push({
      matricula: String(matricula).toUpperCase(),
      km: km
    });

    localStorage.setItem("vehiculos_modulo", JSON.stringify(vehiculos));

    cargarVehiculosModulo();
  };

  function registrar(){
    if(!window.ZENTRYX || typeof window.ZENTRYX.registrarModulo !== "function"){
      setTimeout(registrar, 100);
      return;
    }

    window.ZENTRYX.registrarModulo("vehiculos", MODULO);
    window.ZENTRYX_UI_abrirVehiculos = mostrarPantallaVehiculos;

    try{
      MODULO.init();
    }catch(e){
      console.error("Error inicializando módulo vehículos:", e);
      alert("Error cargando módulo vehículos: " + ((e && e.message) || e));
    }
  }

  window.ZENTRYX_UI_abrirVehiculos = mostrarPantallaVehiculos;

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", registrar);
  }else{
    registrar();
  }
})();
