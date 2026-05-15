// ===============================
// ZENTRYX PRO - FICHAJE PRO
// V3001
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
}

function ahora(){
  return new Date().toISOString();
}

function estadoActual(){
  return localStorage.getItem("zx_fichaje_estado") || "fuera";
}

function guardarEstado(e){
  localStorage.setItem("zx_fichaje_estado",e);
}

function textoEstado(e){
  if(e==="dentro") return "Dentro";
  if(e==="descanso") return "Descanso";
  if(e==="comida") return "Comida";
  return "Fuera";
}

function colorEstado(e){
  if(e==="dentro") return "#16a34a";
  if(e==="descanso") return "#f59e0b";
  if(e==="comida") return "#ea580c";
  return "#64748b";
}

async function fichar(tipo){
  const s=sesion();

  if(!s.id){
    alert("Sesión inválida");
    return;
  }

  let estado=estadoActual();

  if(tipo==="entrada" && estado!=="fuera"){
    alert("Ya estás dentro");
    return;
  }

  if(tipo==="salida" && estado==="fuera"){
    alert("No has entrado");
    return;
  }

  if(tipo==="descanso" && estado!=="dentro"){
    alert("Debes estar dentro");
    return;
  }

  if(tipo==="fin_descanso" && estado!=="descanso"){
    alert("No estás en descanso");
    return;
  }

  if(tipo==="comida" && estado!=="dentro"){
    alert("Debes estar dentro");
    return;
  }

  if(tipo==="fin_comida" && estado!=="comida"){
    alert("No estás en comida");
    return;
  }

  let nuevoEstado=estado;

  if(tipo==="entrada") nuevoEstado="dentro";
  if(tipo==="salida") nuevoEstado="fuera";
  if(tipo==="descanso") nuevoEstado="descanso";
  if(tipo==="fin_descanso") nuevoEstado="dentro";
  if(tipo==="comida") nuevoEstado="comida";
  if(tipo==="fin_comida") nuevoEstado="dentro";

  const res=await sb().from("fichajes").insert([{
    usuario_id:s.id,
    usuario:s.usuario,
    nombre:s.nombre,
    tipo:tipo,
    created_at:ahora()
  }]);

  if(res.error){
    alert("Error fichaje: " + res.error.message);
    return;
  }

  guardarEstado(nuevoEstado);
  cargar();
}

async function historial(){
  const s=sesion();

  const res=await sb()
    .from("fichajes")
    .select("*")
    .eq("usuario_id",s.id)
    .order("created_at",{ascending:false})
    .limit(20);

  if(res.error) return [];

  return res.data || [];
}

async function cargar(){
  const estado=estadoActual();
  const hist=await historial();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Fichaje</h2>
      <div class="zx_text">Estado actual:</div>
      <div style="font-size:26px;font-weight:900;color:${colorEstado(estado)};margin-top:6px">
        ${textoEstado(estado)}
      </div>

      <button class="zx_btn_big zx_verde" onclick="ZX_fichar('entrada')">Entrada</button>
      <button class="zx_btn_big zx_rojo" onclick="ZX_fichar('salida')">Salida</button>

      <button class="zx_btn_big zx_naranja" onclick="ZX_fichar('descanso')">Descanso</button>
      <button class="zx_btn_big zx_azul" onclick="ZX_fichar('fin_descanso')">Fin descanso</button>

      <button class="zx_btn_big zx_morado" onclick="ZX_fichar('comida')">Comida</button>
      <button class="zx_btn_big zx_gris" onclick="ZX_fichar('fin_comida')">Fin comida</button>
    </div>

    <div class="zx_card">
      <h2>Historial</h2>
      ${
        hist.length
        ? hist.map(function(h){
          return `
            <div class="zx_item">
              <div class="zx_item_titulo">${h.tipo}</div>
              <div class="zx_item_texto">${new Date(h.created_at).toLocaleString()}</div>
            </div>
          `;
        }).join("")
        : `<div class="zx_text">Sin fichajes</div>`
      }
    </div>
  `;
}

window.ZX_fichaje=function(){
  cargar();
};

window.ZX_fichar=function(tipo){
  fichar(tipo);
};

})();