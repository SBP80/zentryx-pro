// ===============================
// ZENTRYX PRO - FICHAJE PRO
// V3025 - HORARIOS + EXTRA + FALTANTES
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
}

function ahora(){return new Date().toISOString()}

function diaSemana(fechaISO){
  const d=new Date(fechaISO);
  return ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"][d.getDay()];
}

function formatoMin(min){
  const h=Math.floor((min||0)/60);
  const m=(min||0)%60;
  return h+"h "+String(m).padStart(2,"0")+"m";
}

// ===============================
// HORARIO USUARIO
// ===============================
async function obtenerHorario(fecha){
  const s=sesion();

  const r=await sb()
    .from("horarios_usuario")
    .select("*")
    .eq("usuario_id",String(s.id))
    .eq("activo",true)
    .limit(1);

  if(r.error || !r.data.length) return 480;

  const h=r.data[0];
  const dia=diaSemana(fecha);

  return h[dia] || 0;
}

// ===============================
// GEO
// ===============================
async function geo(){
  return new Promise(resolve=>{
    navigator.geolocation.getCurrentPosition(async pos=>{
      const lat=pos.coords.latitude;
      const lng=pos.coords.longitude;

      try{
        const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const d=await r.json();
        resolve({lat,lng,dir:d.display_name});
      }catch{
        resolve({lat,lng,dir:null});
      }
    },()=>resolve({lat:null,lng:null,dir:null}));
  });
}

// ===============================

function minutos(a,b){
  return Math.max(0,Math.round((new Date(b)-new Date(a))/60000));
}

async function jornadaAbierta(){
  const s=sesion();

  const r=await sb()
    .from("jornadas")
    .select("*")
    .eq("usuario_id",String(s.id))
    .eq("estado","abierta")
    .limit(1);

  return r.data?.[0] || null;
}

async function eventos(jid){
  const r=await sb()
    .from("fichajes")
    .select("*")
    .eq("jornada_id",jid)
    .order("created_at",{ascending:true});

  return r.data||[];
}

// ===============================
// CALCULO PRO
// ===============================
function calcular(ev){
  let entrada=null;
  let salida=null;
  let dIni=null;
  let cIni=null;
  let d=0,c=0;

  ev.forEach(e=>{
    if(e.tipo==="entrada") entrada=e.created_at;
    if(e.tipo==="salida") salida=e.created_at;

    if(e.tipo==="inicio_descanso") dIni=e.created_at;
    if(e.tipo==="fin_descanso" && dIni){
      d+=minutos(dIni,e.created_at);
      dIni=null;
    }

    if(e.tipo==="inicio_comida") cIni=e.created_at;
    if(e.tipo==="fin_comida" && cIni){
      c+=minutos(cIni,e.created_at);
      cIni=null;
    }
  });

  const bruto=entrada && salida ? minutos(entrada,salida) : 0;
  const trabajados=Math.max(0,bruto-d-c);

  return {entrada,salida,trabajados,descanso:d,comida:c};
}

// ===============================

async function cerrar(jid){
  const ev=await eventos(jid);
  const c=calcular(ev);

  const objetivo=await obtenerHorario(c.entrada);

  const extra=Math.max(0,c.trabajados-objetivo);
  const faltante=Math.max(0,objetivo-c.trabajados);

  await sb().from("jornadas").update({
    salida:c.salida,
    minutos_trabajados:c.trabajados,
    minutos_descanso:c.descanso,
    minutos_comida:c.comida,
    minutos_objetivo:objetivo,
    minutos_extra:extra,
    minutos_faltantes:faltante,
    estado:"cerrada"
  }).eq("id",jid);
}

// ===============================

async function fichar(tipo){
  const s=sesion();
  let j=await jornadaAbierta();

  if(tipo==="entrada"){
    if(j){alert("Ya abierta");return;}

    const r=await sb().from("jornadas").insert([{
      usuario_id:String(s.id),
      usuario:s.usuario,
      nombre:s.nombre,
      fecha:new Date().toISOString().slice(0,10),
      entrada:ahora(),
      estado:"abierta"
    }]).select().single();

    j=r.data;
  }

  if(!j){alert("Sin jornada");return;}

  const g=await geo();

  await sb().from("fichajes").insert([{
    usuario_id:String(s.id),
    jornada_id:j.id,
    tipo,
    lat:g.lat,
    lng:g.lng,
    direccion:g.dir,
    created_at:ahora()
  }]);

  if(tipo==="salida"){
    await cerrar(j.id);
  }

  ZX_fichaje();
}

// ===============================

async function jornadas(){
  const s=sesion();

  const r=await sb()
    .from("jornadas")
    .select("*")
    .eq("usuario_id",String(s.id))
    .order("created_at",{ascending:false})
    .limit(5);

  return r.data||[];
}

// ===============================

window.ZX_fichaje=async function(){
  const js=await jornadas();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Fichaje</h2>
      <button class="zx_btn_big zx_azul" onclick="ZX_fichar('entrada')">Entrada</button>
      <button class="zx_btn_big zx_rojo" onclick="ZX_fichar('salida')">Salida</button>
    </div>

    <div class="zx_card">
      <h2>Jornadas</h2>
      ${
        js.map(j=>`
          <div class="zx_item">
            <div class="zx_item_titulo">${j.fecha}</div>
            <div class="zx_item_texto">
              Trabajado: ${formatoMin(j.minutos_trabajados)}<br>
              Objetivo: ${formatoMin(j.minutos_objetivo)}<br>
              Extra: ${formatoMin(j.minutos_extra)}<br>
              Falta: ${formatoMin(j.minutos_faltantes)}
            </div>
          </div>
        `).join("")
      }
    </div>
  `;
};

window.ZX_fichar=fichar;

})();