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
    let aviso = document.createElement("div");
    aviso.textContent = "VEHÍCULOS PANTALLA ACTIVA";
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

    setTimeout(()=> aviso.remove(), 3000);
  }

  function registrarUI(){
    window.ZENTRYX_UI_abrirVehiculos = mostrarPantallaVehiculos;
  }

  function mostrarPantallaVehiculos(){

    let contenedor = document.querySelector(".container");
    if(!contenedor) return;

    contenedor.innerHTML = `
      <div class="card">
        <h1>Vehículos</h1>

        <button onclick="crearVehiculo()" style="
          width:100%;
          padding:14px;
          margin-bottom:15px;
          background:#2563eb;
          color:#fff;
          border:none;
          border-radius:10px;
          font-weight:700;
        ">+ Añadir vehículo</button>

        <div id="listaVehiculos"></div>
      </div>
    `;

    cargarVehiculos();
  }

  // ===============================
  // DATOS TEMPORALES (luego Supabase)
  // ===============================

  function cargarVehiculos(){

    let lista = document.getElementById("listaVehiculos");

    let vehiculos = JSON.parse(localStorage.getItem("vehiculos") || "[]");

    if(vehiculos.length === 0){
      lista.innerHTML = "<p>No hay vehículos</p>";
      return;
    }

    lista.innerHTML = vehiculos.map(v => `
      <div style="
        background:#fff;
        padding:12px;
        border-radius:10px;
        margin-bottom:10px;
        border:1px solid #ddd;
      ">
        <b>${v.matricula}</b><br>
        Km: ${v.km}
      </div>
    `).join("");
  }

  // ===============================
  // CREAR VEHÍCULO
  // ===============================

  window.crearVehiculo = function(){

    let matricula = prompt("Matrícula:");
    if(!matricula) return;

    let km = parseInt(prompt("Kilómetros:"), 10) || 0;

    let vehiculos = JSON.parse(localStorage.getItem("vehiculos") || "[]");

    vehiculos.push({
      matricula: matricula.toUpperCase(),
      km: km
    });

    localStorage.setItem("vehiculos", JSON.stringify(vehiculos));

    cargarVehiculos();
  }

  // ===============================
  // REGISTRO
  // ===============================

  function registrar(){
    if(!window.ZENTRYX){
      setTimeout(registrar, 100);
      return;
    }

    window.ZENTRYX.registrarModulo("vehiculos", MODULO);
    MODULO.init();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", registrar);
  } else {
    registrar();
  }

})();