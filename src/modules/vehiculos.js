// ===============================
// ZENTRYX PRO - MÓDULO VEHÍCULOS
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
// CARGA VEHÍCULOS
// ===============================

async function cargarVehiculos(){

  const root=app();
  if(!root) return;

  root.innerHTML=`
    <div class="zx_card">
      <h2>Vehículos</h2>
      <div class="zx_text">Cargando vehículos...</div>
    </div>
  `;

  const cliente=sb();

  if(!cliente){
    root.innerHTML=error("Supabase no conectado.");
    return;
  }

  try{

    const res=await cliente
      .from("vehiculos")
      .select("*")
      .order("matricula",{ascending:true});

    if(res.error){
      throw res.error;
    }

    pintarVehiculos(res.data || []);

  }catch(e){
    root.innerHTML=error("Error cargando vehículos.");
    console.error(e);
  }
}

// ===============================
// UI
// ===============================

function error(txt){
  return `
    <div class="zx_card">
      <h2>Vehículos</h2>
      <div class="zx_error">${limpiarTexto(txt)}</div>
    </div>
  `;
}

function tarjetaVehiculo(v){

  return `
    <div class="zx_hist_item">
      <div class="zx_hist_tipo">
        ${limpiarTexto(v.matricula || "-")}
      </div>

      <div class="zx_hist_fecha">
        ${limpiarTexto((v.marca || "") + " " + (v.modelo || ""))}
      </div>

      <div class="zx_hist_fecha">
        Km: ${limpiarTexto(v.km_actual ?? 0)}
      </div>

      <div class="zx_hist_fecha">
        Estado: ${v.en_uso ? "En uso" : "Libre"}
      </div>

      ${
        v.usuario_asignado
        ? `<div class="zx_hist_fecha">Usuario: ${limpiarTexto(v.usuario_asignado)}</div>`
        : ""
      }

      <button
        class="zx_btn zx_gris"
        onclick="ZX_editarVehiculo('${v.id}')"
      >
        Editar
      </button>
    </div>
  `;
}

function pintarVehiculos(lista){

  const root=app();
  if(!root) return;

  if(!lista.length){

    root.innerHTML=`
      <div class="zx_card">
        <h2>Vehículos</h2>
        <div class="zx_text">No hay vehículos.</div>

        <button class="zx_btn zx_verde" onclick="ZX_crearVehiculo()">
          Añadir vehículo
        </button>
      </div>
    `;

    return;
  }

  root.innerHTML=`
    <div class="zx_card">
      <h2>Vehículos</h2>

      <button class="zx_btn zx_verde" onclick="ZX_crearVehiculo()">
        Añadir vehículo
      </button>

      ${lista.map(tarjetaVehiculo).join("")}
    </div>
  `;
}

// ===============================
// CREAR VEHÍCULO
// ===============================

window.ZX_crearVehiculo=async function(){

  const matricula=prompt("Matrícula:");
  if(!matricula) return;

  const marca=prompt("Marca:");
  const modelo=prompt("Modelo:");
  const km=prompt("Km iniciales:", "0");

  const kmNum=Number((km || "0").replace(",","."));

  if(Number.isNaN(kmNum) || kmNum < 0){
    alert("Km inválidos.");
    return;
  }

  const cliente=sb();

  const res=await cliente
    .from("vehiculos")
    .insert([{
      matricula:matricula,
      marca:marca,
      modelo:modelo,
      km_actual:kmNum,
      activo:true,
      en_uso:false,
      usuario_asignado:null
    }]);

  if(res.error){
    alert("Error creando vehículo.");
    return;
  }

  cargarVehiculos();
};

// ===============================
// EDITAR VEHÍCULO
// ===============================

window.ZX_editarVehiculo=async function(id){

  const cliente=sb();

  const res=await cliente
    .from("vehiculos")
    .select("*")
    .eq("id",id)
    .maybeSingle();

  if(res.error || !res.data){
    alert("Vehículo no encontrado.");
    return;
  }

  const v=res.data;

  const matricula=prompt("Matrícula:", v.matricula || "");
  if(!matricula) return;

  const marca=prompt("Marca:", v.marca || "");
  const modelo=prompt("Modelo:", v.modelo || "");
  const km=prompt("Km:", String(v.km_actual || 0));

  const kmNum=Number((km || "0").replace(",","."));

  if(Number.isNaN(kmNum) || kmNum < 0){
    alert("Km inválidos.");
    return;
  }

  const upd=await cliente
    .from("vehiculos")
    .update({
      matricula:matricula,
      marca:marca,
      modelo:modelo,
      km_actual:kmNum
    })
    .eq("id",id);

  if(upd.error){
    alert("Error actualizando.");
    return;
  }

  cargarVehiculos();
};

// ===============================
// EXPORT
// ===============================

window.ZX_vehiculos=cargarVehiculos;
window.ZENTRYX_UI_abrirVehiculos=cargarVehiculos;

if(window.ZENTRYX && window.ZENTRYX.registrarModulo){
  window.ZENTRYX.registrarModulo("vehiculos",{
    nombre:"Vehículos",
    activo:true,
    version:ZX_VERSION
  });
}

console.log("Vehículos cargado V"+ZX_VERSION);

})();