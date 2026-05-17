// ===============================
// ZENTRYX PRO - FICHAJE PRO
// V3022 (con dirección real)
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
}

// ===============================
// GEO + DIRECCIÓN REAL
// ===============================
async function obtenerUbicacionCompleta(){
  return new Promise(resolve=>{
    if(!navigator.geolocation){
      resolve({lat:null,lng:null,dir:null});
      return;
    }

    navigator.geolocation.getCurrentPosition(async pos=>{
      const lat=pos.coords.latitude;
      const lng=pos.coords.longitude;

      try{
        const r=await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data=await r.json();

        resolve({
          lat,
          lng,
          dir:data.display_name || null
        });

      }catch(e){
        resolve({lat,lng,dir:null});
      }

    },()=>{
      resolve({lat:null,lng:null,dir:null});
    });
  });
}

// ===============================

function estadoDesdeUltimo(tipo){
  if(!tipo) return "fuera";
  if(tipo==="entrada") return "dentro";
  if(tipo==="salida") return "fuera";
  if(tipo==="inicio_descanso") return "descanso";
  if(tipo==="fin_descanso") return "dentro";
  return "fuera";
}

function textoEstado(e){
  if(e==="dentro") return "Trabajando";
  if(e==="descanso") return "Descanso";
  return "Fuera";
}

function colorEstado(e){
  if(e==="dentro") return "#16a34a";
  if(e==="descanso") return "#f59e0b";
  return "#64748b";
}

function textoTipo(t){
  const m={
    entrada:"Entrada",
    salida:"Salida",
    inicio_descanso:"Inicio descanso",
    fin_descanso:"Fin descanso"
  };
  return m[t] || t;
}

// ===============================

async function ultimo(){
  const s=sesion();

  const r=await sb()
    .from("fichajes")
    .select("*")
    .eq("usuario_id",s.id)
    .order("created_at",{ascending:false})
    .limit(1);

  if(r.error || !r.data.length) return null;
  return r.data[0];
}

async function historial(){
  const s=sesion();

  const r=await sb()
    .from("fichajes")
    .select("*")
    .eq("usuario_id",s.id)
    .order("created_at",{ascending:false})
    .limit(20);

  if(r.error) return [];
  return r.data;
}

// ===============================

function opciones(estado){
  if(estado==="fuera"){
    return [{t:"entrada",txt:"Entrada",c:"zx_verde"}];
  }
  if(estado==="dentro"){
    return [
      {t:"salida",txt:"Salida",c:"zx_rojo"},
      {t:"inicio_descanso",txt:"Descanso",c:"zx_naranja"}
    ];
  }
  if(estado==="descanso"){
    return [{t:"fin_descanso",txt:"Fin descanso",c:"zx_azul"}];
  }
  return [];
}

// ===============================

function cerrar(){
  const m=document.getElementById("zx_modal");
  if(m) m.remove();
}

function menu(estado){
  cerrar();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Fichar</h2>

        ${opciones(estado).map(o=>`
          <button class="zx_btn_big ${o.c}" data-t="${o.t}">
            ${o.txt}
          </button>
        `).join("")}

        <button class="zx_btn_big zx_gris" id="c">Cancelar</button>
      </div>
    </div>
  `);

  document.querySelectorAll("[data-t]").forEach(b=>{
    b.onclick=()=>{
      cerrar();
      fichar(b.dataset.t);
    };
  });

  document.getElementById("c").onclick=cerrar;
}

// ===============================

async function fichar(tipo){
  const s=sesion();
  const geo=await obtenerUbicacionCompleta();

  const r=await sb()
    .from("fichajes")
    .insert([{
      usuario_id:s.id,
      usuario:s.usuario,
      nombre:s.nombre,
      tipo:tipo,
      lat:geo.lat,
      lng:geo.lng,
      direccion:geo.dir,
      dispositivo:navigator.userAgent
    }]);

  if(r.error){
    alert("Error: "+r.error.message);
    return;
  }

  ZX_fichaje();
}

// ===============================

window.ZX_fichaje=async function(){
  const u=await ultimo();
  const estado=estadoDesdeUltimo(u?.tipo);
  const hist=await historial();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Fichaje</h2>

      <div class="zx_text">Estado actual:</div>
      <div style="font-size:34px;font-weight:900;color:${colorEstado(estado)}">
        ${textoEstado(estado)}
      </div>

      <button class="zx_btn_big zx_azul" id="fichar">
        FICHAR
      </button>
    </div>

    <div class="zx_card">
      <h2>Últimos fichajes</h2>

      ${
        hist.length
        ? hist.map(h=>`
          <div class="zx_item">
            <div class="zx_item_titulo">${textoTipo(h.tipo)}</div>
            <div class="zx_item_texto">
              ${new Date(h.created_at).toLocaleString()}<br>
              ${h.direccion || ""}
            </div>
          </div>
        `).join("")
        : `<div class="zx_text">Sin registros</div>`
      }
    </div>
  `;

  document.getElementById("fichar").onclick=()=>menu(estado);
};

})();