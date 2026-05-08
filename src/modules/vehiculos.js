// ===============================
// ZENTRYX V2629 - VEHÍCULOS LIMPIO
// ===============================
(function(){
"use strict";

function app(){
  return document.getElementById("app");
}

function tarjetaVehiculo(v){

  return `
    <div style="
      background:white;
      border-radius:20px;
      padding:18px;
      margin-bottom:14px;
      border:1px solid #d1d5db;
    ">

      <div style="
        font-size:26px;
        font-weight:900;
        margin-bottom:10px;
      ">
        ${v.matricula || "-"}
      </div>

      <div style="
        font-size:18px;
        color:#374151;
        margin-bottom:8px;
      ">
        Kilómetros: ${v.km_actual || 0}
      </div>

      <div style="
        display:inline-block;
        padding:8px 14px;
        border-radius:999px;
        font-weight:800;
        background:${v.en_uso ? "#fee2e2" : "#dcfce7"};
        color:${v.en_uso ? "#991b1b" : "#166534"};
      ">
        ${v.en_uso ? "En uso" : "Libre"}
      </div>

    </div>
  `;
}

async function cargarVehiculos(){

  const cont = document.getElementById("zx_lista_vehiculos");

  if(!cont) return;

  cont.innerHTML = "Cargando...";

  if(!window.sb){

    cont.innerHTML = `
      <div style="color:#991b1b;font-weight:800;">
        Supabase no conectado
      </div>
    `;

    return;
  }

  try{

    const res = await window.sb
      .from("vehiculos")
      .select("*")
      .order("created_at",{ascending:false});

    if(res.error) throw res.error;

    const datos = res.data || [];

    if(datos.length === 0){

      cont.innerHTML = `
        <div style="color:#6b7280;">
          No hay vehículos
        </div>
      `;

      return;
    }

    cont.innerHTML = datos.map(tarjetaVehiculo).join("");

  }catch(e){

    console.error(e);

    cont.innerHTML = `
      <div style="color:#991b1b;font-weight:800;">
        Error cargando vehículos
      </div>
    `;
  }
}

window.ZX_vehiculos = async function(){

  const root = app();

  if(!root) return;

  root.innerHTML = `

    <div style="padding:18px;">

      <div style="
        background:white;
        border-radius:24px;
        padding:24px;
        border:1px solid #d1d5db;
      ">

        <h1 style="
          margin:0 0 18px;
          font-size:42px;
          font-weight:900;
        ">
          Vehículos
        </h1>

        <button
          onclick="ZX_vehiculos()"
          style="
            width:100%;
            border:0;
            border-radius:16px;
            background:#2563eb;
            color:white;
            padding:16px;
            font-size:18px;
            font-weight:900;
            margin-bottom:18px;
          "
        >
          Recargar
        </button>

        <div id="zx_lista_vehiculos"></div>

      </div>

    </div>

  `;

  await cargarVehiculos();

};

console.log("Vehículos limpio V2629");

})();