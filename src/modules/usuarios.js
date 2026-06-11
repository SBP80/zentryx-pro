// ===============================
// ZENTRYX PRO - USUARIOS PRO
// V3109 - DOCUMENTOS PRO
// ===============================
(function(){
"use strict";

const DOC_BUCKET="zentryx-usuarios-docs";
const FOTO_BUCKET="zentryx-usuarios";

const ZX_PROVINCIAS_POR_COMUNIDAD={
  "Andalucía":["Almería","Cádiz","Córdoba","Granada","Huelva","Jaén","Málaga","Sevilla"],
  "Aragón":["Huesca","Teruel","Zaragoza"],
  "Asturias":["Asturias"],
  "Baleares":["Baleares"],
  "Canarias":["Las Palmas","Santa Cruz de Tenerife"],
  "Cantabria":["Cantabria"],
  "Castilla-La Mancha":["Albacete","Ciudad Real","Cuenca","Guadalajara","Toledo"],
  "Castilla y León":["Ávila","Burgos","León","Palencia","Salamanca","Segovia","Soria","Valladolid","Zamora"],
  "Cataluña":["Barcelona","Girona","Lleida","Tarragona"],
  "Comunidad Valenciana":["Alicante","Castellón","Valencia"],
  "Extremadura":["Badajoz","Cáceres"],
  "Galicia":["A Coruña","Lugo","Ourense","Pontevedra"],
  "La Rioja":["La Rioja"],
  "Madrid":["Madrid"],
  "Murcia":["Murcia"],
  "Navarra":["Navarra"],
  "País Vasco":["Álava","Bizkaia","Gipuzkoa"],
  "Ceuta":["Ceuta"],
  "Melilla":["Melilla"]
};

const ZX_COMUNIDADES=["",...Object.keys(ZX_PROVINCIAS_POR_COMUNIDAD)];

const ZX_LOCALIDADES_POR_PROVINCIA={
  "Madrid":["Madrid","Alcalá de Henares","Pozuelo del Rey","Torrejón de Ardoz","Coslada","San Fernando de Henares","Mejorada del Campo","Loeches","Arganda del Rey","Campo Real","Nuevo Baztán","Valverde de Alcalá"],
  "Badajoz":["Badajoz","Mérida","Don Benito","Villanueva de la Serena","Almendralejo","Zafra"],
  "Cáceres":["Cáceres","Plasencia","Navalmoral de la Mata","Coria","Trujillo","Miajadas"]
};

const ZX_CONVENIOS=[
  "",
  "Oficinas",
  "Metal",
  "Construcción",
  "Fontanería",
  "Climatización",
  "Electricidad",
  "Comercio",
  "Hostelería",
  "Transporte",
  "Otro"
];

const ZX_RELACIONES_EMERGENCIA=[
  "",
  "Padre",
  "Madre",
  "Cónyuge",
  "Pareja",
  "Hijo/a",
  "Hermano/a",
  "Familiar",
  "Amigo/a",
  "Otro"
];

let ZX_FILTRO_USUARIOS="activos";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient || null}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
}

function rolLocal(){return String(sesion().rol || "").toLowerCase()}
function usuarioLocal(){return String(sesion().usuario || "").toLowerCase()}
function esAdminLocal(){return rolLocal()==="administrador" || usuarioLocal()==="admin"}
function esEncargadoLocal(){return rolLocal()==="encargado"}

function puedeCrear(){return esAdminLocal()}
function puedeEditar(){return esAdminLocal() || esEncargadoLocal()}
function puedeReset(){return esAdminLocal()}
function puedeEliminar(){return esAdminLocal()}
function puedeReactivar(){return esAdminLocal()}

function puedeVerPrivado(u){
  const s=sesion();
  return esAdminLocal() || esEncargadoLocal() || String(s.id||"")===String(u.id||"");
}

function puedeVerDocs(u){
  const s=sesion();
  return esAdminLocal() || String(s.id||"")===String(u.id||"");
}

function puedeVerLaboral(u){
  const s=sesion();
  return esAdminLocal() || esEncargadoLocal() || String(s.id||"")===String(u.id||"");
}
