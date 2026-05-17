// ================================
// ZENTRYX PRO - FICHAJE PRO
// V3028 - MENÚ BOTONES INTELIGENTE
// ================================

(function(){
"use strict";

// =====================
// HELPERS
// =====================
function app(){ return document.getElementById("app") }

function sesion(){
  try{
    return JSON.parse(localStorage.getItem("zentryx_session")||"{}")
  }catch(e){ return {} }
}

function ahora(){
  return new Date().toISOString()
}

function estadoActual(){
  return localStorage.getItem("zx_fichaje_estado") || "fuera"
}

function guardarEstado(e){
  localStorage.setItem("zx_fichaje_estado", e)
}

function textoEstado(e){
  if(e==="dentro") return "Trabajando"
  if(e==="descanso") return "Descanso"
  if(e==="comida") return "Comida"
  return "Fuera"
}

function colorEstado(e){
  if(e==="dentro") return "#16a34a"
  if(e==="descanso") return "#f59e0b"
  if(e==="comida") return "#ea580c"
  return "#64748b"
}

// =====================
// GEO
// =====================
function getGPS(){
  return new Promise((resolve)=>{
    if(!navigator.geolocation){
      resolve({lat:null, lng:null})
      return
    }

    navigator.geolocation.getCurrentPosition(
      pos=>{
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        })
      },
      ()=>resolve({lat:null,lng:null}),
      {enableHighAccuracy:true,timeout:5000}
    )
  })
}

// =====================
// GUARDAR
// =====================
async function guardar(tipo){

  const s = sesion()
  if(!s.id){
    alert("Sin sesión")
    return
  }

  const gps = await getGPS()

  const { error } = await window.supabase
    .from("fichajes")
    .insert([{
      usuario_id: s.id,
      tipo: tipo,
      fecha: ahora(),
      lat: gps.lat,
      lng: gps.lng
    }])

  if(error){
    alert("Error: " + error.message)
    return
  }

  // actualizar estado
  if(tipo==="entrada") guardarEstado("dentro")
  if(tipo==="salida") guardarEstado("fuera")
  if(tipo==="descanso") guardarEstado("descanso")
  if(tipo==="fin_descanso") guardarEstado("dentro")
  if(tipo==="comida") guardarEstado("comida")
  if(tipo==="fin_comida") guardarEstado("dentro")

  render()
}

// =====================
// BOTÓN
// =====================
function boton(txt, color, accion){
  return `
    <button onclick="${accion}"
      style="
        width:100%;
        padding:16px;
        margin-top:10px;
        border:none;
        border-radius:14px;
        font-weight:700;
        font-size:16px;
        color:white;
        background:${color};
      ">
      ${txt}
    </button>
  `
}

// =====================
// OPCIONES SEGÚN ESTADO
// =====================
function opciones(){

  const e = estadoActual()

  let html = ""

  if(e==="fuera"){
    html += boton("Entrada","#16a34a","fichar('entrada')")
  }

  if(e==="dentro"){
    html += boton("Salida","#dc2626","fichar('salida')")
    html += boton("Descanso","#f59e0b","fichar('descanso')")
    html += boton("Comida","#ea580c","fichar('comida')")
  }

  if(e==="descanso"){
    html += boton("Fin descanso","#2563eb","fichar('fin_descanso')")
  }

  if(e==="comida"){
    html += boton("Fin comida","#7c3aed","fichar('fin_comida')")
  }

  return html
}

// =====================
// RENDER
// =====================
function render(){

  const e = estadoActual()

  app().innerHTML = `
    <div style="padding:15px">

      <div style="
        background:white;
        border-radius:16px;
        padding:15px;
      ">
        <h2>Fichaje</h2>

        <div style="margin-top:10px">
          Estado actual:
          <div style="
            font-size:28px;
            font-weight:800;
            color:${colorEstado(e)};
          ">
            ${textoEstado(e)}
          </div>
        </div>

        <div style="margin-top:15px">
          ${opciones()}
        </div>

      </div>

    </div>
  `
}

// =====================
// GLOBAL
// =====================
window.fichar = guardar

// =====================
render()

})()