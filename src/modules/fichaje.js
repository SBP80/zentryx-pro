// ===============================
// ZENTRYX PRO - FICHAJE PRO
// V3026 - MENU INTELIGENTE + HORARIOS + PANEL ADMIN
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
}

function esAdmin(){
  const s=sesion();
  return String(s.rol||"").toLowerCase()==="administrador" || String(s.usuario||"").toLowerCase()==="admin";
}

function ahora(){return new Date().toISOString()}

function formatoMin(min){
  const h=Math.floor((min||0)/60);
  const m=(min||0)%60;
  return h+"h "+String(m).padStart(2,"0")+"m";
}

function diaSemana(fechaISO){
  const d=new Date(fechaISO);
  return ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"][d.getDay()];
}

async function objetivoDia(fechaISO){
  const s=sesion();

  const r=await sb()
    .from("horarios_usuario")
    .select("*")
    .eq("usuario_id",String(s.id))
    .eq("activo",true)
    .limit(1);

  if(r.error || !r.data || !r.data.length) return 480;

  const h=r.data[0];
  const dia=diaSemana(fechaISO);

  return h[dia] || 0;
}

function textoTipo(t){
  const m={
    entrada:"Entrada",
    salida:"Salida",
    inicio_descanso:"Inicio descanso",
    fin_descanso:"Fin descanso",
    inicio_comida:"Inicio comida",
    fin_comida:"Fin comida"
  };
  return m[t] || t;
}

function estadoDesdeTipo(tipo){
  if(!tipo) return "fuera";
  if(tipo==="entrada") return "dentro";
  if(tipo==="salida") return "fuera";
  if(tipo==="inicio_descanso") return "descanso";
  if(tipo==="fin_descanso") return "dentro";
  if(tipo==="inicio_comida") return "comida";
  if(tipo==="fin_comida") return "dentro";
  return "fuera";
}

function textoEstado(e){
  if(e==="dentro") return "Trabajando";
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

async function obtenerUbicacion(){
  return new Promise(resolve=>{
    if(!navigator.geolocation){
      resolve({lat:null,lng:null,direccion:null});
      return;
    }

    navigator.geolocation.getCurrentPosition(async pos=>{
      const lat=pos.coords.latitude;
      const lng=pos.coords.longitude;

      try{
        const r=await fetch("https://nominatim.openstreetmap.org/reverse?format=json&lat="+lat+"&lon="+lng);
        const data=await r.json();
        resolve({lat,lng,direccion:data.display_name || null});
      }catch(e){
        resolve({lat,lng,direccion:null});
      }
    },()=>{
      resolve({lat:null,lng:null,direccion:null});
    },{
      enableHighAccuracy:true,
      timeout:8000,
      maximumAge:0
    });
  });
}

async function jornadaAbierta(){
  const s=sesion();

  const r=await sb()
    .from("jornadas")
    .select("*")
    .eq("usuario_id",String(s.id))
    .eq("estado","abierta")
    .order("created_at",{ascending:false})
    .limit(1);

  if(r.error || !r.data || !r.data.length) return null;
  return r.data[0];
}

async function fichajesDeJornada(jornadaId){
  const r=await sb()
    .from("fichajes")
    .select("*")
    .eq("jornada_id",jornadaId)
    .order("created_at",{ascending:true});

  if(r.error) return [];
  return r.data || [];
}

async function estadoActual(){
  const j=await jornadaAbierta();

  if(!j){
    return {estado:"fuera",jornada:null};
  }

  const f=await fichajesDeJornada(j.id);
  const ultimo=f.length ? f[f.length-1] : null;

  return {
    estado:estadoDesdeTipo(ultimo ? ultimo.tipo : "entrada"),
    jornada:j
  };
}

function opcionesPermitidas(estado){
  if(estado==="fuera"){
    return [{tipo:"entrada",texto:"Entrada",clase:"zx_verde"}];
  }

  if(estado==="dentro"){
    return [
      {tipo:"salida",texto:"Salida",clase:"zx_rojo"},
      {tipo:"inicio_descanso",texto:"Inicio descanso",clase:"zx_naranja"},
      {tipo:"inicio_comida",texto:"Inicio comida",clase:"zx_morado"}
    ];
  }

  if(estado==="descanso"){
    return [{tipo:"fin_descanso",texto:"Fin descanso",clase:"zx_azul"}];
  }

  if(estado==="comida"){
    return [{tipo:"fin_comida",texto:"Fin comida",clase:"zx_azul"}];
  }

  return [];
}

function cerrarModal(){
  const m=document.getElementById("zx_modal_fichaje");
  if(m) m.remove();
}

function abrirMenu(estado){
  cerrarModal();

  const ops=opcionesPermitidas(estado);

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_fichaje" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Fichar</h2>
        <div class="zx_text">Estado actual: <b>${textoEstado(estado)}</b></div>

        ${ops.map(o=>`
          <button class="zx_btn_big ${o.clase}" data-fichaje="${o.tipo}">
            ${o.texto}
          </button>
        `).join("")}

        <button class="zx_btn_big zx_gris" id="zx_cancelar_fichaje">Cancelar</button>
      </div>
    </div>
  `);

  document.querySelectorAll("[data-fichaje]").forEach(btn=>{
    btn.onclick=function(){
      const tipo=this.dataset.fichaje;
      cerrarModal();
      registrar(tipo);
    };
  });

  document.getElementById("zx_cancelar_fichaje").onclick=cerrarModal;
}

async function crearJornada(){
  const s=sesion();
  const entrada=ahora();

  const r=await sb()
    .from("jornadas")
    .insert([{
      usuario_id:String(s.id),
      usuario:s.usuario || "",
      nombre:s.nombre || "",
      fecha:new Date().toISOString().slice(0,10),
      entrada,
      estado:"abierta"
    }])
    .select()
    .single();

  if(r.error){
    alert("Error creando jornada: "+r.error.message);
    return null;
  }

  return r.data;
}

async function insertarFichaje(tipo,jornadaId,geo){
  const s=sesion();

  const r=await sb()
    .from("fichajes")
    .insert([{
      usuario_id:String(s.id),
      usuario:s.usuario || "",
      nombre:s.nombre || "",
      jornada_id:jornadaId,
      tipo,
      lat:geo.lat,
      lng:geo.lng,
      direccion:geo.direccion,
      dispositivo:navigator.userAgent,
      created_at:ahora()
    }]);

  if(r.error){
    alert("Error al guardar fichaje: "+r.error.message);
    return false;
  }

  return true;
}

function minutosEntre(a,b){
  return Math.max(0,Math.round((new Date(b)-new Date(a))/60000));
}

function calcularJornada(eventos){
  let entrada=null;
  let salida=null;
  let inicioDescanso=null;
  let inicioComida=null;
  let minutosDescanso=0;
  let minutosComida=0;

  eventos.forEach(e=>{
    if(e.tipo==="entrada") entrada=e.created_at;
    if(e.tipo==="salida") salida=e.created_at;

    if(e.tipo==="inicio_descanso") inicioDescanso=e.created_at;
    if(e.tipo==="fin_descanso" && inicioDescanso){
      minutosDescanso+=minutosEntre(inicioDescanso,e.created_at);
      inicioDescanso=null;
    }

    if(e.tipo==="inicio_comida") inicioComida=e.created_at;
    if(e.tipo==="fin_comida" && inicioComida){
      minutosComida+=minutosEntre(inicioComida,e.created_at);
      inicioComida=null;
    }
  });

  const bruto=entrada && salida ? minutosEntre(entrada,salida) : 0;
  const trabajados=Math.max(0,bruto-minutosDescanso-minutosComida);

  return {
    entrada,
    salida,
    minutos_trabajados:trabajados,
    minutos_descanso:minutosDescanso,
    minutos_comida:minutosComida
  };
}

async function cerrarJornada(jornadaId){
  const eventos=await fichajesDeJornada(jornadaId);
  const c=calcularJornada(eventos);

  const objetivo=await objetivoDia(c.entrada || new Date().toISOString());
  const extra=Math.max(0,c.minutos_trabajados-objetivo);
  const faltante=Math.max(0,objetivo-c.minutos_trabajados);

  const r=await sb()
    .from("jornadas")
    .update({
      salida:c.salida,
      minutos_trabajados:c.minutos_trabajados,
      minutos_descanso:c.minutos_descanso,
      minutos_comida:c.minutos_comida,
      minutos_objetivo:objetivo,
      minutos_extra:extra,
      minutos_faltantes:faltante,
      horas_extra:extra,
      estado:"cerrada"
    })
    .eq("id",jornadaId);

  if(r.error){
    alert("Error cerrando jornada: "+r.error.message);
    return false;
  }

  return true;
}

async function registrar(tipo){
  const s=sesion();

  if(!s.id){
    alert("Sesión no válida.");
    return;
  }

  const est=await estadoActual();
  let jornada=est.jornada;

  if(tipo==="entrada" && est.estado!=="fuera"){
    alert("Ya tienes una jornada abierta.");
    return;
  }

  if(tipo!=="entrada" && !jornada){
    alert("No hay jornada abierta.");
    return;
  }

  if(tipo==="inicio_descanso" && est.estado!=="dentro"){
    alert("Solo puedes iniciar descanso trabajando.");
    return;
  }

  if(tipo==="fin_descanso" && est.estado!=="descanso"){
    alert("No estás en descanso.");
    return;
  }

  if(tipo==="inicio_comida" && est.estado!=="dentro"){
    alert("Solo puedes iniciar comida trabajando.");
    return;
  }

  if(tipo==="fin_comida" && est.estado!=="comida"){
    alert("No estás en comida.");
    return;
  }

  if(tipo==="salida" && (est.estado==="descanso" || est.estado==="comida")){
    alert("Primero termina descanso o comida.");
    return;
  }

  if(tipo==="entrada"){
    jornada=await crearJornada();
    if(!jornada) return;
  }

  const geo=await obtenerUbicacion();
  const ok=await insertarFichaje(tipo,jornada.id,geo);

  if(!ok) return;

  if(tipo==="salida"){
    await cerrarJornada(jornada.id);
  }

  ZX_fichaje();
}

async function ultimosFichajes(){
  const s=sesion();

  const r=await sb()
    .from("fichajes")
    .select("*")
    .eq("usuario_id",String(s.id))
    .order("created_at",{ascending:false})
    .limit(20);

  if(r.error) return [];
  return r.data || [];
}

async function jornadasUsuario(){
  const s=sesion();

  const r=await sb()
    .from("jornadas")
    .select("*")
    .eq("usuario_id",String(s.id))
    .order("created_at",{ascending:false})
    .limit(5);

  if(r.error) return [];
  return r.data || [];
}

async function jornadasAdmin(){
  const r=await sb()
    .from("jornadas")
    .select("*")
    .order("created_at",{ascending:false})
    .limit(50);

  if(r.error) return [];
  return r.data || [];
}

async function validarJornada(id){
  const s=sesion();

  const r=await sb()
    .from("jornadas")
    .update({
      estado:"validada",
      validada_at:new Date().toISOString(),
      validada_por:s.usuario || ""
    })
    .eq("id",id);

  if(r.error){
    alert("Error validando: "+r.error.message);
    return;
  }

  ZX_fichaje();
}

async function pagarJornada(id){
  const s=sesion();

  const r=await sb()
    .from("jornadas")
    .update({
      estado:"pagada",
      pagada_at:new Date().toISOString(),
      pagada_por:s.usuario || ""
    })
    .eq("id",id);

  if(r.error){
    alert("Error marcando pagada: "+r.error.message);
    return;
  }

  ZX_fichaje();
}

function renderJornada(j,admin){
  return `
    <div class="zx_item">
      <div class="zx_item_titulo">${j.nombre || j.usuario || "-"} · ${j.fecha || "-"}</div>
      <div class="zx_item_texto">
        Estado: <b>${j.estado || "-"}</b><br>
        Trabajado: ${formatoMin(j.minutos_trabajados || 0)}<br>
        Objetivo: ${formatoMin(j.minutos_objetivo || 0)}<br>
        Descanso: ${formatoMin(j.minutos_descanso || 0)}<br>
        Comida: ${formatoMin(j.minutos_comida || 0)}<br>
        Extra: ${formatoMin(j.minutos_extra || j.horas_extra || 0)}<br>
        Falta: ${formatoMin(j.minutos_faltantes || 0)}
      </div>

      ${
        admin
        ? `
          ${j.estado==="cerrada" ? `<button class="zx_btn_big zx_verde" data-validar="${j.id}">Validar</button>` : ""}
          ${j.estado==="validada" ? `<button class="zx_btn_big zx_naranja" data-pagar="${j.id}">Marcar pagada</button>` : ""}
        `
        : ""
      }
    </div>
  `;
}

window.ZX_fichaje=async function(){
  const est=await estadoActual();
  const hist=await ultimosFichajes();
  const jornadas=await jornadasUsuario();
  const adminJornadas=esAdmin() ? await jornadasAdmin() : [];

  app().innerHTML=`
    <div class="zx_card">
      <h2>Fichaje</h2>

      <div class="zx_text">Estado actual:</div>
      <div style="font-size:34px;font-weight:900;color:${colorEstado(est.estado)};margin-top:8px">
        ${textoEstado(est.estado)}
      </div>

      <button class="zx_btn_big zx_azul" id="zx_btn_fichar">
        FICHAR
      </button>
    </div>

    ${
      esAdmin()
      ? `
        <div class="zx_card">
          <h2>Panel admin jornadas</h2>
          ${
            adminJornadas.length
            ? adminJornadas.map(j=>renderJornada(j,true)).join("")
            : `<div class="zx_text">Sin jornadas.</div>`
          }
        </div>
      `
      : ""
    }

    <div class="zx_card">
      <h2>Mis jornadas</h2>
      ${
        jornadas.length
        ? jornadas.map(j=>renderJornada(j,false)).join("")
        : `<div class="zx_text">Sin jornadas.</div>`
      }
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
        : `<div class="zx_text">Sin registros.</div>`
      }
    </div>
  `;

  document.getElementById("zx_btn_fichar").onclick=function(){
    abrirMenu(est.estado);
  };

  document.querySelectorAll("[data-validar]").forEach(btn=>{
    btn.onclick=function(){
      validarJornada(btn.dataset.validar);
    };
  });

  document.querySelectorAll("[data-pagar]").forEach(btn=>{
    btn.onclick=function(){
      pagarJornada(btn.dataset.pagar);
    };
  });
};

})();