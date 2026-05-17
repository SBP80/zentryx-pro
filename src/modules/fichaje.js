// ===============================
// ZENTRYX PRO - FICHAJE PRO
// V3027 COMPACTO
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}
  catch(e){return {}}
}

function usuarioId(){
  return sesion().id || null
}

function ahora(){
  return new Date().toISOString()
}

function formatoFecha(f){
  return new Date(f).toLocaleString()
}

// ===============================
// GEO
// ===============================
async function getDireccion(lat,lng){
  try{
    const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
    const j=await r.json();
    if(j && j.display_name){
      return j.display_name.split(",").slice(0,3).join(","); // CORTA
    }
    return lat+","+lng;
  }catch(e){
    return lat+","+lng;
  }
}

function getGPS(){
  return new Promise(function(resolve){
    navigator.geolocation.getCurrentPosition(async function(pos){
      const lat=pos.coords.latitude;
      const lng=pos.coords.longitude;
      const dir=await getDireccion(lat,lng);
      resolve({lat,lng,dir});
    },function(){
      resolve({lat:null,lng:null,dir:"Sin ubicación"});
    });
  });
}

// ===============================
// FICHAR
// ===============================
async function fichar(tipo){
  const uid=usuarioId();
  if(!uid) return alert("Sin sesión");

  const gps=await getGPS();

  const {error}=await sb()
    .from("fichajes")
    .insert([{
      usuario_id:uid,
      tipo:tipo,
      fecha:ahora(),
      lat:gps.lat,
      lng:gps.lng,
      direccion:gps.dir
    }]);

  if(error){
    alert("Error fichaje: "+error.message);
    return;
  }

  cargar();
}

// ===============================
// RESUMEN HOY
// ===============================
async function resumenHoy(){
  const uid=usuarioId();

  const hoy=new Date();
  hoy.setHours(0,0,0,0);

  const {data}=await sb()
    .from("fichajes")
    .select("*")
    .eq("usuario_id",uid)
    .gte("fecha",hoy.toISOString())
    .order("fecha",{ascending:true});

  let trabajo=0, descanso=0, comida=0;

  let lastEntrada=null;
  let lastDescanso=null;
  let lastComida=null;

  data.forEach(f=>{
    if(f.tipo==="entrada") lastEntrada=new Date(f.fecha);
    if(f.tipo==="salida" && lastEntrada){
      trabajo+=(new Date(f.fecha)-lastEntrada);
      lastEntrada=null;
    }

    if(f.tipo==="inicio_descanso") lastDescanso=new Date(f.fecha);
    if(f.tipo==="fin_descanso" && lastDescanso){
      descanso+=(new Date(f.fecha)-lastDescanso);
      lastDescanso=null;
    }

    if(f.tipo==="inicio_comida") lastComida=new Date(f.fecha);
    if(f.tipo==="fin_comida" && lastComida){
      comida+=(new Date(f.fecha)-lastComida);
      lastComida=null;
    }
  });

  function h(ms){
    const m=Math.floor(ms/60000);
    const h=Math.floor(m/60);
    const mm=m%60;
    return `${h}h ${mm}m`;
  }

  return {
    trabajo:h(trabajo),
    descanso:h(descanso),
    comida:h(comida),
    objetivo:"8h 0m",
    extra:"0h 0m",
    falta:"0h 0m"
  }
}

// ===============================
// ÚLTIMOS (MAX 5)
// ===============================
async function ultimos(){
  const uid=usuarioId();

  const {data}=await sb()
    .from("fichajes")
    .select("*")
    .eq("usuario_id",uid)
    .order("fecha",{ascending:false})
    .limit(5);

  return data;
}

// ===============================
// UI
// ===============================
window.ZENTRYX_UI_fichaje=async function(){

  const r=await resumenHoy();
  const ult=await ultimos();

  app().innerHTML=`
  <div class="zx_card">
    <h2>Fichaje</h2>

    <div class="zx_text">Estado actual</div>
    <div style="font-size:32px;font-weight:900;margin-bottom:12px;">Trabajando</div>

    <button class="zx_btn zx_azul" onclick="ZX_fichar_menu()">FICHAR</button>
  </div>

  <div class="zx_card">
    <h2>Hoy</h2>
    <div class="zx_text">
      Trabajado: ${r.trabajo}<br>
      Descanso: ${r.descanso}<br>
      Comida: ${r.comida}<br>
      Extra: ${r.extra}<br>
      Falta: ${r.falta}
    </div>
  </div>

  <div class="zx_card">
    <h2>Últimos</h2>
    ${
      ult.map(f=>`
        <div class="zx_item">
          <b>${f.tipo.replace("_"," ")}</b><br>
          ${formatoFecha(f.fecha)}<br>
          ${f.direccion || ""}
        </div>
      `).join("")
    }
  </div>
  `;
};

// ===============================
// MENU SIMPLE
// ===============================
window.ZX_fichar_menu=function(){
  const t=prompt("1 Entrada\n2 Salida\n3 Descanso\n4 Fin descanso\n5 Comida\n6 Fin comida");

  if(t==="1") fichar("entrada");
  if(t==="2") fichar("salida");
  if(t==="3") fichar("inicio_descanso");
  if(t==="4") fichar("fin_descanso");
  if(t==="5") fichar("inicio_comida");
  if(t==="6") fichar("fin_comida");
};

// ===============================
window.ZX_fichaje=function(){
  if(window.ZENTRYX_UI_fichaje){
    window.ZENTRYX_UI_fichaje();
  }
};

})();