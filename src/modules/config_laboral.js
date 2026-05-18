// ===============================
// ZENTRYX PRO - CONFIG LABORAL PRO
// V3052 - FESTIVOS COMPLETOS CRUD
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}
  catch(e){return {}}
}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ===============================
// SELECTOR TIEMPO
// ===============================
function selectorTiempo(id,val=480){
  const h=Math.floor(val/60);
  const m=val%60;

  return `
  <div class="zx_hm_row">
    <select id="${id}_h">
      ${[...Array(13).keys()].map(i=>`<option ${i===h?"selected":""}>${i}</option>`).join("")}
    </select>
    <select id="${id}_m">
      ${[0,15,30,45].map(i=>`<option ${i===m?"selected":""}>${i}</option>`).join("")}
    </select>
  </div>`;
}

function leerTiempo(id){
  return Number(document.getElementById(id+"_h").value)*60 +
         Number(document.getElementById(id+"_m").value);
}

// ===============================
// FESTIVOS
// ===============================
async function cargarFestivosLista(){

  const anio=document.getElementById("anio").value;

  const r=await sb()
    .from("festivos")
    .select("*")
    .eq("anio",anio)
    .order("fecha",{ascending:true});

  if(r.error) return [];

  return r.data || [];
}

function renderFestivo(f){
  return `
  <div class="zx_admin_row">
    <div class="zx_admin_row_top">
      <b>${limpiar(f.nombre)}</b>
      <span>${limpiar(f.fecha)}</span>
    </div>

    <div class="zx_edit_grid">
      <button class="zx_admin_btn zx_admin_editar" data-edit="${f.id}">
        Editar
      </button>

      <button class="zx_admin_btn zx_admin_borrar" data-del="${f.id}">
        Borrar
      </button>
    </div>
  </div>`;
}

async function borrarFestivo(id){
  if(!confirm("¿Eliminar festivo?")) return;

  await sb().from("festivos").delete().eq("id",id);

  ZX_configLaboral();
}

function modalFestivo(f=null){

  document.body.insertAdjacentHTML("beforeend",`
    <div class="zx_modal_fondo">
      <div class="zx_modal_caja">

        <h2>${f?"Editar":"Nuevo"} festivo</h2>

        <input id="fx_fecha" type="date" value="${f?f.fecha:""}">
        <input id="fx_nombre" placeholder="Nombre" value="${f?limpiar(f.nombre):""}">

        <button id="fx_save" class="zx_btn_big zx_verde">
          Guardar
        </button>

        <button onclick="this.closest('.zx_modal_fondo').remove()" class="zx_btn_big zx_gris">
          Cancelar
        </button>

      </div>
    </div>
  `);

  document.getElementById("fx_save").onclick=async ()=>{
    const fecha=document.getElementById("fx_fecha").value;
    const nombre=document.getElementById("fx_nombre").value;

    const anio=new Date(fecha).getFullYear();

    const data={fecha,nombre,anio};

    if(f){
      await sb().from("festivos").update(data).eq("id",f.id);
    }else{
      await sb().from("festivos").insert(data);
    }

    document.querySelector(".zx_modal_fondo").remove();
    ZX_configLaboral();
  };
}

// ===============================
// UI
// ===============================
window.ZX_configLaboral=async function(){

  const festivos=await cargarFestivosLista();

  app().innerHTML=`

    <div class="zx_card">
      <h2>Config. laboral</h2>

      <h3>Jornada</h3>

      Lunes ${selectorTiempo("lunes")}
      Martes ${selectorTiempo("martes")}
      Miércoles ${selectorTiempo("miercoles")}
      Jueves ${selectorTiempo("jueves")}
      Viernes ${selectorTiempo("viernes")}
    </div>

    <div class="zx_card">
      <h3>Calendario</h3>

      <input id="anio" value="${new Date().getFullYear()}">

      <button id="btn_cargar" class="zx_btn_big zx_azul">
        Descargar festivos
      </button>

      <button id="btn_nuevo" class="zx_btn_big zx_verde">
        Añadir festivo
      </button>
    </div>

    <div class="zx_card">
      <h3>Festivos</h3>

      ${
        festivos.length
        ? festivos.map(renderFestivo).join("")
        : `<div class="zx_text">Sin festivos</div>`
      }
    </div>
  `;

  document.getElementById("btn_nuevo").onclick=()=>modalFestivo();

  document.querySelectorAll("[data-del]").forEach(b=>{
    b.onclick=()=>borrarFestivo(b.dataset.del);
  });

  document.querySelectorAll("[data-edit]").forEach(b=>{
    const f=festivos.find(x=>x.id==b.dataset.edit);
    b.onclick=()=>modalFestivo(f);
  });

  document.getElementById("btn_cargar").onclick=async ()=>{
    const anio=document.getElementById("anio").value;

    const res=await fetch("https://date.nager.at/api/v3/PublicHolidays/"+anio+"/ES");
    const data=await res.json();

    await sb().from("festivos").delete().eq("anio",anio);

    const insert=data.map(f=>({
      fecha:f.date,
      nombre:f.localName,
      anio
    }));

    await sb().from("festivos").insert(insert);

    ZX_configLaboral();
  };
};

})();