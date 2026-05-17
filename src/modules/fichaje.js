// ===============================
// ZENTRYX PRO - FICHAJE PRO
// V3033 - CONTADORES EN VIVO BIEN
// ===============================
(function(){
"use strict";

let ZX_VER_ULTIMOS=false;
let ZX_VER_ADMIN=false;
let ZX_VER_MIS_JORNADAS=false;
let ZX_TIMER=null;

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

function formatoSeg(seg){
  seg=Math.max(0,Math.floor(seg||0));
  const h=Math.floor(seg/3600);
  const m=Math.floor((seg%3600)/60);
  const s=seg%60;
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
}

function fechaCorta(f){
  if(!f) return "-";
  return new Date(f).toLocaleString();
}

function direccionCorta(d){
  if(!d) return "";
  return String(d).split(",").slice(0,3).join(",");
}

function segundosEntre(a,b){
  return Math.max(0,Math.floor((new Date(b)-new Date(a))/1000));
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

  if(r.error || !r.data || !r.data.length) return 480*60;

  const h=r.data[0];
  const dia=diaSemana(fechaISO);
  return (h[dia] || 0) * 60;
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
    return {estado:"fuera",jornada:null,eventos:[]};
  }

  const f=await fichajesDeJornada(j.id);
  const ultimo=f.length ? f[f.length-1] : null;

  return {
    estado:estadoDesdeTipo(ultimo ? ultimo.tipo : "entrada"),
    jornada:j,
    eventos:f
  };
}

function calcularEnVivo(eventos,estado){
  let entrada=null;
  let salida=null;
  let inicioDescanso=null;
  let inicioComida=null;

  let descansoSeg=0;
  let comidaSeg=0;

  const now=new Date().toISOString();

  eventos.forEach(e=>{
    if(e.tipo==="entrada") entrada=e.created_at;
    if(e.tipo==="salida") salida=e.created_at;

    if(e.tipo==="inicio_descanso") inicioDescanso=e.created_at;
    if(e.tipo==="fin_descanso" && inicioDescanso){
      descansoSeg+=segundosEntre(inicioDescanso,e.created_at);
      inicioDescanso=null;
    }

    if(e.tipo==="inicio_comida") inicioComida=e.created_at;
    if(e.tipo==="fin_comida" && inicioComida){
      comidaSeg+=segundosEntre(inicioComida,e.created_at);
      inicioComida=null;
    }
  });

  if(estado==="descanso" && inicioDescanso){
    descansoSeg+=segundosEntre(inicioDescanso,now);
  }

  if(estado==="comida" && inicioComida){
    comidaSeg+=segundosEntre(inicioComida,now);
  }

  const fin=salida || now;
  const brutoSeg=entrada ? segundosEntre(entrada,fin) : 0;
  const trabajadoSeg=Math.max(0,brutoSeg-descansoSeg-comidaSeg);

  return {
    entrada,
    salida,
    trabajadoSeg,
    descansoSeg,
    comidaSeg
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

async function cerrarJornada(jornadaId){
  const eventos=await fichajesDeJornada(jornadaId);
  const c=calcularEnVivo(eventos,"fuera");

  const objetivoSeg=await objetivoDia(c.entrada || new Date().toISOString());
  const extraSeg=Math.max(0,c.trabajadoSeg-objetivoSeg);
  const faltanteSeg=Math.max(0,objetivoSeg-c.trabajadoSeg);

  const r=await sb()
    .from("jornadas")
    .update({
      salida:c.salida,
      minutos_trabajados:Math.floor(c.trabajadoSeg/60),
      minutos_descanso:Math.floor(c.descansoSeg/60),
      minutos_comida:Math.floor(c.comidaSeg/60),
      minutos_objetivo:Math.floor(objetivoSeg/60),
      minutos_extra:Math.floor(extraSeg/60),
      minutos_faltantes:Math.floor(faltanteSeg/60),
      horas_extra:Math.floor(extraSeg/60),
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
    .limit(5);

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
    .limit(3);

  if(r.error) return [];
  return r.data || [];
}

async function jornadasAdmin(){
  const r=await sb()
    .from("jornadas")
    .select("*")
    .order("created_at",{ascending:false})
    .limit(8);

  if(r.error) return [];
  return r.data || [];
}

function resumenHTML(resumen,objetivoSeg){
  const extraSeg=Math.max(0,resumen.trabajadoSeg-objetivoSeg);
  const faltaSeg=Math.max(0,objetivoSeg-resumen.trabajadoSeg);

  return `
    <div class="zx_text">
      Trabajado: <b>${formatoSeg(resumen.trabajadoSeg)}</b><br>
      Descanso: <b>${formatoSeg(resumen.descansoSeg)}</b><br>
      Comida: <b>${formatoSeg(resumen.comidaSeg)}</b><br>
      Objetivo: <b>${formatoSeg(objetivoSeg)}</b><br>
      Extra: <b>${formatoSeg(extraSeg)}</b><br>
      Falta: <b>${formatoSeg(faltaSeg)}</b>
    </div>
  `;
}

window.ZX_toggleUltimos=function(){
  ZX_VER_ULTIMOS=!ZX_VER_ULTIMOS;
  ZX_fichaje();
};

window.ZX_toggleAdmin=function(){
  ZX_VER_ADMIN=!ZX_VER_ADMIN;
  ZX_fichaje();
};

window.ZX_toggleMisJornadas=function(){
  ZX_VER_MIS_JORNADAS=!ZX_VER_MIS_JORNADAS;
  ZX_fichaje();
};

window.ZX_fichaje=async function(){
  if(ZX_TIMER){
    clearInterval(ZX_TIMER);
    ZX_TIMER=null;
  }

  document.querySelectorAll(".zx_nav_btn").forEach(function(b){
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="fichaje"){
      b.classList.add("zx_activo");
    }
  });

  const est=await estadoActual();
  const hist=await ultimosFichajes();
  const jornadas=await jornadasUsuario();
  const adminJornadas=esAdmin() ? await jornadasAdmin() : [];
  const hoy=jornadas[0] || null;

  let resumen={trabajadoSeg:0,descansoSeg:0,comidaSeg:0};
  let objetivoSeg=480*60;

  if(est.jornada){
    resumen=calcularEnVivo(est.eventos,est.estado);
    objetivoSeg=await objetivoDia(resumen.entrada || new Date().toISOString());
  }else if(hoy){
    resumen={
      trabajadoSeg:(hoy.minutos_trabajados || 0)*60,
      descansoSeg:(hoy.minutos_descanso || 0)*60,
      comidaSeg:(hoy.minutos_comida || 0)*60
    };
    objetivoSeg=(hoy.minutos_objetivo || 480)*60;
  }

  app().innerHTML=`
    <div class="zx_card">
      <h2>Fichaje</h2>

      <div class="zx_text">Estado actual:</div>
      <div style="font-size:34px;font-weight:900;color:${colorEstado(est.estado)};margin-top:8px">
        ${textoEstado(est.estado)}
      </div>

      <button class="zx_btn_big zx_azul" id="zx_btn_fichar">FICHAR</button>
    </div>

    <div class="zx_card">
      <h2>Resumen en vivo</h2>
      <div id="zx_resumen_tiempo">${resumenHTML(resumen,objetivoSeg)}</div>
    </div>

    <div class="zx_card">
      <button class="zx_btn_big zx_gris" onclick="ZX_toggleMisJornadas()">
        ${ZX_VER_MIS_JORNADAS ? "Ocultar mis jornadas" : "Ver mis jornadas"}
      </button>
    </div>

    ${
      esAdmin()
      ? `
        <div class="zx_card">
          <button class="zx_btn_big zx_gris" onclick="ZX_toggleAdmin()">
            ${ZX_VER_ADMIN ? "Ocultar panel admin" : "Ver panel admin"}
          </button>
        </div>
      `
      : ""
    }

    <div class="zx_card">
      <button class="zx_btn_big zx_gris" onclick="ZX_toggleUltimos()">
        ${ZX_VER_ULTIMOS ? "Ocultar últimos fichajes" : "Ver últimos fichajes"}
      </button>

      ${
        ZX_VER_ULTIMOS
        ? (
            hist.length
            ? hist.map(h=>`
              <div class="zx_item">
                <div class="zx_item_titulo">${textoTipo(h.tipo)}</div>
                <div class="zx_item_texto">
                  ${fechaCorta(h.created_at)}<br>
                  ${direccionCorta(h.direccion)}
                </div>
              </div>
            `).join("")
            : `<div class="zx_text">Sin registros.</div>`
          )
        : ""
      }
    </div>
  `;

  document.getElementById("zx_btn_fichar").onclick=function(){
    abrirMenu(est.estado);
  };

  if(est.jornada){
    ZX_TIMER=setInterval(function(){
      const r=calcularEnVivo(est.eventos,est.estado);
      const cont=document.getElementById("zx_resumen_tiempo");
      if(cont) cont.innerHTML=resumenHTML(r,objetivoSeg);
    },1000);
  }
};

})();