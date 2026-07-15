// ===============================
// ZENTRYX PRO - VEHÍCULOS
// V3134 - SEGUIMIENTO GPS DE RUTA EN USO
// ===============================
(function(){
"use strict";

const ZX_VERSION="3135";
const TABLA="vehiculos";
const CACHE_KEY="zentryx_cache_vehiculos_v3135";

let ZX_VEH_CACHE=[];
let ZX_VEH_BUSQUEDA="";
let ZX_VEH_FILTRO="activos";
let ZX_VEH_CARGANDO=false;
let ZX_USOS_ACTUALES={};
let ZX_RECUPERACIONES={};
let ZX_GPS_WATCH_ID=null;
let ZX_GPS_USO_ID="";
let ZX_GPS_ULTIMO_PUNTO=null;
let ZX_GPS_ULTIMO_ENVIO=0;

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient || null}
function zx(){return window.ZENTRYX || window.ZX || null}
function backend(){
  const z=zx();
  return window.ZENTRYX_BACKEND || z?.Backend || z?.backend || null;
}

function sesion(){
  if(zx() && typeof zx().usuarioActual==="function") return zx().usuarioActual();
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
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

function normalizar(v){
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function hoy(){
  const d=new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}

function fechaES(f){
  if(!f) return "";
  const s=String(f).slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return limpiar(s);
  const p=s.split("-");
  return p[2]+"/"+p[1]+"/"+p[0];
}

function rol(){return normalizar(sesion().rol || "")}
function usuario(){return normalizar(sesion().usuario || "")}
function esAdmin(){return rol()==="administrador" || usuario()==="admin"}
function puedeEntrar(){return rol()!=="invitado" && rol()!==""}
function puedeGestionar(){return esAdmin() || ["gerente","supervisor","encargado","administrativo","oficina"].includes(rol())}

function leerCache(){
  try{return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]")}
  catch(e){return []}
}

function guardarCache(lista){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify(lista || []))}
  catch(e){}
}

function numero(v){
  const n=Number(String(v ?? "0").replace(",","."));
  return Number.isFinite(n) ? n : 0;
}

function valor(id){
  const el=document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

function cerrarModal(){
  const m=document.getElementById("zx_modal_vehiculo");
  if(m) m.remove();
  document.body.classList.remove("zx_modal_abierto");
}

function modal(html){
  cerrarModal();
  document.body.classList.add("zx_modal_abierto");
  const d=document.createElement("div");
  d.id="zx_modal_vehiculo";
  d.className="zx_modal_fondo";
  d.innerHTML=`<div class="zx_modal_caja">${html}</div>`;
  document.body.appendChild(d);
}

function estadoVehiculo(v){
  if(v.activo===false || v.activo==="false") return "inactivo";
  const ef=normalizar(v.estado_flota || "");
  if(["en_uso","pendiente_devolucion"].includes(ef)) return "uso";
  if(["averia","taller","fuera_servicio","reservado"].includes(ef)) return ef;
  if(v.en_uso===true || v.en_uso==="true") return "uso";
  return "libre";
}

function estadoTexto(v){
  const e=estadoVehiculo(v);
  if(e==="uso") return normalizar(v.estado_flota)==="pendiente_devolucion" ? "Pendiente de devolución" : "En uso";
  if(e==="reservado") return "Reservado";
  if(e==="averia") return "Avería";
  if(e==="taller") return "Taller";
  if(e==="fuera_servicio") return "Fuera de servicio";
  if(e==="inactivo") return "Inactivo";
  return "Libre";
}

function identidadActual(){
  const s=sesion() || {};
  return {
    id:String(s.id || s.user_id || s.usuario_id || ""),
    usuario:String(s.usuario || s.username || ""),
    nombre:String(s.nombre_completo || s.nombre || s.usuario || "Usuario"),
    empresa_id:String(s.empresa_id || "")
  };
}

function responsableId(v){return String(v.usuario_actual_id || "")}
function responsableNombre(v){return String(v.usuario_actual_nombre || v.usuario_asignado || "")}
function esResponsableActual(v){
  const u=identidadActual();
  return !!u.id && responsableId(v)===u.id;
}

function uuid(){
  try{if(window.crypto && crypto.randomUUID) return crypto.randomUUID()}catch(e){}
  return "zx_"+Date.now()+"_"+Math.random().toString(16).slice(2);
}

function ahoraISO(){return new Date().toISOString()}


function fechaHoraES(v){
  if(!v) return "-";
  const d=new Date(v);
  if(isNaN(d.getTime())) return "-";
  return String(d.getDate()).padStart(2,"0")+"/"+
    String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear()+" "+
    String(d.getHours()).padStart(2,"0")+":"+
    String(d.getMinutes()).padStart(2,"0")+":"+
    String(d.getSeconds()).padStart(2,"0");
}

function duracionDesde(v){
  if(!v) return "-";
  const d=new Date(v);
  if(isNaN(d.getTime())) return "-";
  let seg=Math.max(0,Math.floor((Date.now()-d.getTime())/1000));
  const h=Math.floor(seg/3600); seg%=3600;
  const m=Math.floor(seg/60); const ss=seg%60;
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(ss).padStart(2,"0");
}

function actualizarDuracionesVisibles(){
  document.querySelectorAll("[data-veh-duration-start]").forEach(function(el){
    const inicio=el.getAttribute("data-veh-duration-start");
    if(inicio) el.textContent=duracionDesde(inicio);
  });
}

function iniciarRelojDuraciones(){
  if(window.ZX_VEH_DURACION_TIMER){
    clearInterval(window.ZX_VEH_DURACION_TIMER);
  }
  actualizarDuracionesVisibles();
  window.ZX_VEH_DURACION_TIMER=setInterval(actualizarDuracionesVisibles,1000);
}


function distanciaMetros(a,b){
  if(!a||!b) return Infinity;
  const R=6371000;
  const toRad=x=>x*Math.PI/180;
  const dLat=toRad(Number(b.lat)-Number(a.lat));
  const dLng=toRad(Number(b.lng)-Number(a.lng));
  const la1=toRad(Number(a.lat));
  const la2=toRad(Number(b.lat));
  const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}

function detenerSeguimientoGPS(){
  if(ZX_GPS_WATCH_ID!=null && navigator.geolocation){
    try{navigator.geolocation.clearWatch(ZX_GPS_WATCH_ID)}catch(e){}
  }
  ZX_GPS_WATCH_ID=null;
  ZX_GPS_USO_ID="";
  ZX_GPS_ULTIMO_PUNTO=null;
  ZX_GPS_ULTIMO_ENVIO=0;
}

async function guardarPuntoGPS(v,uso,pos){
  if(!v||!uso||!pos||!pos.coords) return;
  const ahora=Date.now();
  const punto={lat:Number(pos.coords.latitude),lng:Number(pos.coords.longitude)};
  const distancia=distanciaMetros(ZX_GPS_ULTIMO_PUNTO,punto);
  if(ZX_GPS_ULTIMO_ENVIO && ahora-ZX_GPS_ULTIMO_ENVIO<30000 && distancia<50) return;

  const u=identidadActual();
  const data={
    empresa_id:u.empresa_id||null,
    uso_vehiculo_id:String(uso.id),
    vehiculo_id:String(v.id),
    usuario_id:String(u.id),
    registrado_at:new Date(pos.timestamp||ahora).toISOString(),
    lat:punto.lat,
    lng:punto.lng,
    precision_metros:Number.isFinite(Number(pos.coords.accuracy))?Number(pos.coords.accuracy):null,
    velocidad_kmh:Number.isFinite(Number(pos.coords.speed))?Math.max(0,Number(pos.coords.speed)*3.6):null,
    rumbo_grados:Number.isFinite(Number(pos.coords.heading))?Number(pos.coords.heading):null,
    altitud_metros:Number.isFinite(Number(pos.coords.altitude))?Number(pos.coords.altitude):null,
    origen:navigator.onLine?"gps":"cache_offline",
    sincronizado:!!navigator.onLine,
    dispositivo:navigator.userAgent||""
  };
  const r=await zxInsert("rutas_vehiculos_puntos",data);
  if(r&&r.error) throw r.error;
  ZX_GPS_ULTIMO_PUNTO=punto;
  ZX_GPS_ULTIMO_ENVIO=ahora;
}

function iniciarSeguimientoGPSActual(){
  detenerSeguimientoGPS();
  if(!navigator.geolocation) return;
  const v=(ZX_VEH_CACHE||[]).find(x=>esResponsableActual(x)&&estadoVehiculo(x)==="uso"&&(x.seguimiento_gps_habilitado===true||x.seguimiento_gps_habilitado==="true"));
  if(!v) return;
  const uso=v.__uso_actual||null;
  if(!uso||!uso.id) return;
  ZX_GPS_USO_ID=String(uso.id);
  ZX_GPS_WATCH_ID=navigator.geolocation.watchPosition(
    pos=>guardarPuntoGPS(v,uso,pos).catch(()=>{}),
    ()=>{},
    {enableHighAccuracy:true,maximumAge:15000,timeout:20000}
  );
}

async function insertarNotificacion(usuarioId,titulo,mensaje){
  if(!usuarioId) return;
  try{
    const r=await zxInsert("notificaciones",{
      id:uuid(),
      usuario_id:String(usuarioId),
      titulo:String(titulo||"Vehículo"),
      mensaje:String(mensaje||""),
      tipo:"vehiculo",
      leida:false,
      created_at:ahoraISO()
    });
    if(r && r.error) throw r.error;
  }catch(e){
    try{
      await zxInsert("avisos",{
        id:uuid(), usuario_id:String(usuarioId), titulo:String(titulo||"Vehículo"),
        mensaje:String(mensaje||""), tipo:"vehiculo", leida:false, created_at:ahoraISO()
      });
    }catch(e2){}
  }
}

async function cargarUsosYRecuperaciones(){
  ZX_USOS_ACTUALES={};
  ZX_RECUPERACIONES={};
  const u=identidadActual();

  try{
    const r=await zxGet("usos_vehiculos",{
      query:function(q){
        return q.in("estado",["en_uso","pendiente_devolucion"]).order("inicio_at",{ascending:false});
      }
    });
    (r.data||[])
      .filter(x=>["en_uso","pendiente_devolucion"].includes(String(x.estado||"")))
      .sort((a,b)=>new Date(b.inicio_at||0)-new Date(a.inicio_at||0))
      .forEach(x=>{
        const key=String(x.vehiculo_id||"");
        if(key && !ZX_USOS_ACTUALES[key]) ZX_USOS_ACTUALES[key]=x;
      });
  }catch(e){
    cacheBackend("usos_vehiculos")
      .filter(x=>["en_uso","pendiente_devolucion"].includes(String(x.estado||"")))
      .forEach(x=>{
        const key=String(x.vehiculo_id||"");
        if(key && !ZX_USOS_ACTUALES[key]) ZX_USOS_ACTUALES[key]=x;
      });
  }

  if(!u.id) return;

  try{
    const r=await zxGet("transferencias_vehiculos",{
      query:function(q){
        return q.eq("usuario_anterior_id",u.id)
          .eq("aviso_liberacion_enviado",true)
          .eq("respuesta_usuario_anterior","pendiente")
          .order("created_at",{ascending:false});
      }
    });
    (r.data||[])
      .filter(x=>String(x.usuario_anterior_id||"")===u.id && x.aviso_liberacion_enviado===true && String(x.respuesta_usuario_anterior||"")==="pendiente")
      .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))
      .forEach(x=>{
        const key=String(x.vehiculo_id||"");
        if(key && !ZX_RECUPERACIONES[key]) ZX_RECUPERACIONES[key]=x;
      });
  }catch(e){}
}

async function cargarDetalleVehiculo(id){
  const out={usos:[],transferencias:[],puntos:[]};
  const vehId=String(id);

  try{
    const r=await zxGet("usos_vehiculos",{
      query:q=>q.eq("vehiculo_id",vehId).order("inicio_at",{ascending:false}).limit(30)
    });
    out.usos=(r.data||[]).filter(x=>String(x.vehiculo_id||"")===vehId)
      .sort((a,b)=>new Date(b.inicio_at||0)-new Date(a.inicio_at||0)).slice(0,30);
  }catch(e){}

  try{
    const r=await zxGet("transferencias_vehiculos",{
      query:q=>q.eq("vehiculo_id",vehId).order("created_at",{ascending:false}).limit(30)
    });
    out.transferencias=(r.data||[]).filter(x=>String(x.vehiculo_id||"")===vehId)
      .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,30);
  }catch(e){}

  try{
    const r=await zxGet("rutas_vehiculos_puntos",{
      query:q=>q.eq("vehiculo_id",vehId).order("registrado_at",{ascending:true}).limit(500)
    });
    out.puntos=(r.data||[]).filter(x=>String(x.vehiculo_id||"")===vehId)
      .sort((a,b)=>new Date(a.registrado_at||0)-new Date(b.registrado_at||0)).slice(0,500);
  }catch(e){}

  return out;
}

function urlRutaGoogle(puntos){
  const pts=(puntos||[]).filter(p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng)));
  if(pts.length<2) return "";
  const reducidos=[];
  const paso=Math.max(1,Math.floor(pts.length/18));
  for(let i=0;i<pts.length;i+=paso) reducidos.push(pts[i]);
  if(reducidos[reducidos.length-1]!==pts[pts.length-1]) reducidos.push(pts[pts.length-1]);
  const origen=reducidos[0], destino=reducidos[reducidos.length-1];
  const medios=reducidos.slice(1,-1).map(p=>p.lat+","+p.lng).join("|");
  let url="https://www.google.com/maps/dir/?api=1&origin="+encodeURIComponent(origen.lat+","+origen.lng)+"&destination="+encodeURIComponent(destino.lat+","+destino.lng);
  if(medios) url+="&waypoints="+encodeURIComponent(medios);
  return url;
}

function obtenerPosicion(){
  return new Promise(function(resolve){
    if(!navigator.geolocation){resolve({lat:null,lng:null});return}
    navigator.geolocation.getCurrentPosition(function(p){
      resolve({lat:p.coords.latitude,lng:p.coords.longitude});
    },function(){resolve({lat:null,lng:null})},{enableHighAccuracy:true,timeout:8000,maximumAge:60000});
  });
}

async function zxInsert(tabla,data){
  const b=backend();
  if(b && typeof b.insert==="function") return b.insert(tabla,data);
  if(!sb()) return {data:null,error:new Error("Backend no disponible")};
  return sb().from(tabla).insert([data]);
}

async function zxUpdate(tabla,data,campo,valor){
  const b=backend();
  if(b && typeof b.update==="function"){
    return b.update(tabla,data,{field:campo,value:String(valor)});
  }
  if(!sb()) return {data:null,error:new Error("Backend no disponible")};
  return sb().from(tabla).update(data).eq(campo,String(valor));
}

async function zxGet(tabla,options){
  const b=backend();
  if(b && typeof b.get==="function") return b.get(tabla,options||{});
  if(!sb()) return {data:[],error:null,offline:true,source:"cache"};
  try{
    let q=sb().from(tabla).select(options?.select||"*");
    if(options && typeof options.query==="function") q=options.query(q);
    const r=await q;
    return r || {data:[],error:null};
  }catch(e){
    return {data:[],error:e};
  }
}

function cacheBackend(tabla){
  const b=backend();
  try{
    if(b && b.cache && typeof b.cache.get==="function") return b.cache.get(tabla)||[];
  }catch(e){}
  return [];
}

function nombreVehiculo(v){
  return [v.matricula,v.marca,v.modelo].filter(Boolean).join(" ") || "Vehículo";
}

function textoBusqueda(v){
  return normalizar([
    v.matricula,v.marca,v.modelo,v.usuario_actual_nombre,v.usuario_asignado,v.km_actual,
    v.estado,v.notas,v.itv_fecha,v.seguro_fecha,v.proxima_revision_fecha
  ].join(" "));
}

function prepararVehiculo(v){
  v.__zx_busqueda=textoBusqueda(v);
  return v;
}

function filtrarVehiculos(){
  let lista=ZX_VEH_CACHE || [];

  if(ZX_VEH_FILTRO==="activos") lista=lista.filter(v=>estadoVehiculo(v)!=="inactivo");
  if(ZX_VEH_FILTRO==="libres") lista=lista.filter(v=>estadoVehiculo(v)==="libre");
  if(ZX_VEH_FILTRO==="uso") lista=lista.filter(v=>estadoVehiculo(v)==="uso");
  if(ZX_VEH_FILTRO==="inactivos") lista=lista.filter(v=>estadoVehiculo(v)==="inactivo");

  const q=normalizar(ZX_VEH_BUSQUEDA);
  if(q){
    const partes=q.split(/\s+/).filter(Boolean);
    lista=lista.filter(function(v){
      const txt=v.__zx_busqueda || textoBusqueda(v);
      return txt.includes(q) || partes.every(p=>txt.includes(p));
    });
  }

  return lista;
}

async function cargarVehiculos(){
  if(!puedeEntrar()) return [];
  if(ZX_VEH_CARGANDO) return filtrarVehiculos();
  ZX_VEH_CARGANDO=true;

  try{
    await cargarUsosYRecuperaciones();
    const r=await zxGet(TABLA,{
      query:function(q){return q.order("matricula",{ascending:true});}
    });
    if(r.error && !(r.data||[]).length) throw r.error;

    let datos=Array.isArray(r.data) ? r.data : [];
    if(!datos.length){
      datos=cacheBackend(TABLA);
    }
    if(!datos.length){
      datos=leerCache();
    }

    ZX_VEH_CACHE=datos.map(function(v){
      const copia=Object.assign({},v);
      copia.__uso_actual=ZX_USOS_ACTUALES[String(copia.id)] || null;
      copia.__recuperacion=ZX_RECUPERACIONES[String(copia.id)] || null;
      return prepararVehiculo(copia);
    });
    guardarCache(ZX_VEH_CACHE);
  }catch(e){
    const datos=cacheBackend(TABLA);
    ZX_VEH_CACHE=(datos.length ? datos : leerCache()).map(function(v){
      const copia=Object.assign({},v);
      copia.__uso_actual=ZX_USOS_ACTUALES[String(copia.id)] || null;
      copia.__recuperacion=ZX_RECUPERACIONES[String(copia.id)] || null;
      return prepararVehiculo(copia);
    });
  }finally{
    ZX_VEH_CARGANDO=false;
  }

  return filtrarVehiculos();
}

function resumen(){
  const total=ZX_VEH_CACHE.length;
  const activos=ZX_VEH_CACHE.filter(v=>estadoVehiculo(v)!=="inactivo").length;
  const libres=ZX_VEH_CACHE.filter(v=>estadoVehiculo(v)==="libre").length;
  const uso=ZX_VEH_CACHE.filter(v=>estadoVehiculo(v)==="uso").length;

  return `
    <div class="zx_veh_kpis">
      <div><b>${total}</b><span>Total</span></div>
      <div><b>${activos}</b><span>Activos</span></div>
      <div><b>${libres}</b><span>Libres</span></div>
      <div><b>${uso}</b><span>En uso</span></div>
    </div>
  `;
}

function toolbar(total){
  const filtros=[
    ["activos","Activos"],
    ["libres","Libres"],
    ["uso","En uso"],
    ["inactivos","Inactivos"],
    ["todos","Todos"]
  ];

  return `
    <div class="zx_veh_toolbar">
      <div class="zx_veh_search">
        <input id="zx_buscar_vehiculos" type="search" value="${limpiar(ZX_VEH_BUSQUEDA)}" placeholder="Buscar matrícula, marca, modelo, usuario o revisión">
        ${ZX_VEH_BUSQUEDA ? `<button id="zx_limpiar_vehiculos" type="button">✕</button>` : ""}
      </div>

      <div class="zx_veh_filters">
        ${filtros.map(function(f){
          return `<button class="${ZX_VEH_FILTRO===f[0] ? "on" : ""}" data-veh-filter="${limpiar(f[0])}">${limpiar(f[1])}</button>`;
        }).join("")}
      </div>

      <div class="zx_veh_resume">${total} resultado(s)</div>
    </div>
  `;
}

function badge(v){
  const e=estadoVehiculo(v);
  if(e==="inactivo") return `<span class="off">Inactivo</span>`;
  if(e==="uso") return `<span class="uso">${limpiar(estadoTexto(v))}</span>`;
  if(["averia","taller","fuera_servicio"].includes(e)) return `<span class="off">${limpiar(estadoTexto(v))}</span>`;
  if(e==="reservado") return `<span class="orange">Reservado</span>`;
  return `<span class="libre">Libre</span>`;
}

function alertaFecha(fecha,diasAviso){
  if(!fecha) return "";
  const f=new Date(String(fecha).slice(0,10)+"T12:00:00");
  if(isNaN(f.getTime())) return "";
  const ahora=new Date(hoy()+"T12:00:00");
  const diff=Math.ceil((f.getTime()-ahora.getTime())/86400000);
  if(diff<0) return "caducado";
  if(diff<=diasAviso) return "pronto";
  return "ok";
}

function renderAvisos(v){
  const avisos=[];
  const itv=alertaFecha(v.itv_fecha,45);
  const seguro=alertaFecha(v.seguro_fecha,45);
  const revision=alertaFecha(v.proxima_revision_fecha,30);

  if(itv==="caducado") avisos.push("ITV caducada");
  if(itv==="pronto") avisos.push("ITV próxima");
  if(seguro==="caducado") avisos.push("Seguro caducado");
  if(seguro==="pronto") avisos.push("Seguro próximo");
  if(revision==="caducado") avisos.push("Revisión vencida");
  if(revision==="pronto") avisos.push("Revisión próxima");

  if(!avisos.length) return "";

  return `<div class="zx_veh_alertas">${avisos.map(a=>`<span>${limpiar(a)}</span>`).join("")}</div>`;
}

function fotoVehiculo(v){
  return v.foto_url || v.imagen_url || v.image_url || v.foto || "";
}

function ubicacionVehiculo(v){
  return v.trabajo_actual_nombre || v.trabajo_actual || v.ubicacion_actual || v.ultima_direccion || "";
}

function renderVehiculo(v){
  const estado=estadoVehiculo(v);
  const uso=v.__uso_actual || null;
  const responsable=responsableNombre(v) || "Sin responsable";
  const enUso=estado==="uso";
  const inicio=uso?.inicio_at || v.uso_iniciado_at || null;
  const foto=fotoVehiculo(v);
  const ubicacion=ubicacionVehiculo(v);
  const principal = esResponsableActual(v)
    ? `<button class="orange zx_veh_main_action" data-veh-devolver="${limpiar(v.id)}">📤 Devolver vehículo</button>`
    : (v.__recuperacion && estado==="libre")
      ? `<button class="purple zx_veh_main_action" data-veh-recuperar="${limpiar(v.id)}">↩️ Volver a utilizar</button>`
      : (estado!=="inactivo" && !["averia","taller","fuera_servicio"].includes(estado))
        ? `<button class="green zx_veh_main_action" data-veh-tomar="${limpiar(v.id)}">${estado==="uso" ? "🔄 Asumir vehículo" : "🚗 Utilizar vehículo"}</button>`
        : "";

  return `
    <article class="zx_veh_card" data-id="${limpiar(v.id)}">
      <div class="zx_veh_card_head">
        <div class="zx_veh_media ${foto ? "has-photo" : ""}">
          ${foto
            ? `<img src="${limpiar(foto)}" alt="${limpiar(v.matricula || "Vehículo")}" loading="lazy" onerror="this.parentElement.classList.remove('has-photo');this.remove()">`
            : `<span>🚗</span>`}
        </div>
        <div class="zx_veh_identity">
          <div class="zx_veh_modelo">${limpiar([v.marca,v.modelo].filter(Boolean).join(" ") || "Vehículo")}</div>
          <h3>${limpiar(v.matricula || "Sin matrícula")}</h3>
        </div>
        <div class="zx_veh_status_inline">${badge(v)}</div>
      </div>

      ${renderAvisos(v)}

      <div class="zx_veh_fastline">
        <div><span>👤</span><strong>${limpiar(responsable)}</strong></div>
        <div><span>🧭</span><strong>${limpiar(v.km_actual ?? 0)} km</strong></div>
        ${enUso && inicio ? `<div><span>🕒</span><strong data-veh-duration-start="${limpiar(inicio)}">${limpiar(duracionDesde(inicio))}</strong><small>Desde ${limpiar(fechaHoraES(inicio))}</small></div>` : ""}
        ${ubicacion ? `<div><span>📍</span><strong>${limpiar(ubicacion)}</strong></div>` : ""}
        ${enUso && (v.seguimiento_gps_habilitado===true || v.seguimiento_gps_habilitado==="true") ? `<div><span>🛰️</span><strong>Ruta activa</strong><small>Se guarda mientras Zentryx está abierto</small></div>` : ""}
      </div>

      ${principal}

      <button class="zx_veh_more" type="button" data-veh-more="${limpiar(v.id)}">••• Más opciones</button>
      <div class="zx_veh_more_panel" data-veh-more-panel="${limpiar(v.id)}" hidden>
        <button class="blue" data-veh-open="${limpiar(v.id)}">📄 Ficha</button>
        <button class="purple" data-veh-route="${limpiar(v.id)}">🛰️ Ruta GPS</button>
        ${puedeGestionar() ? `<button class="gray" data-veh-edit="${limpiar(v.id)}">✏️ Editar</button>` : ""}
        ${estado!=="inactivo" && puedeGestionar() ? `<button class="red" data-veh-desactivar="${limpiar(v.id)}">⛔ Desactivar</button>` : ""}
        ${estado==="inactivo" && puedeGestionar() ? `<button class="green" data-veh-activar="${limpiar(v.id)}">✅ Activar</button>` : ""}
      </div>
    </article>
  `;
}

function renderListado(lista){
  if(!lista.length) return `<div class="zx_veh_empty">No hay vehículos con este filtro.</div>`;
  return lista.map(renderVehiculo).join("");
}

function pintarShell(lista){
  app().innerHTML=`
    <div class="zx_veh_shell">
      <section class="zx_veh_panel zx_veh_header">
        <div>
          <h2>Vehículos</h2>
          <p>Uso real, responsables, kilómetros, documentación, ITV, seguro y revisiones.</p>
          ${navigator.onLine ? "" : `<div class="zx_veh_offline">🟡 Sin conexión · los cambios se guardarán pendientes</div>`}
        </div>
        ${puedeGestionar() ? `<button class="zx_veh_new" id="btn_nuevo_vehiculo">＋ Crear</button>` : ""}
      </section>

      <section class="zx_veh_panel">
        ${resumen()}
        ${toolbar(lista.length)}
      </section>

      <section class="zx_veh_panel">
        <div class="zx_veh_list_head">
          <h3>Listado</h3>
          <span>${lista.length} vehículo(s)</span>
        </div>
        <div id="zx_vehiculos_lista" class="zx_veh_list">${renderListado(lista)}</div>
      </section>
    </div>
  `;

  const nuevo=document.getElementById("btn_nuevo_vehiculo");
  if(nuevo) nuevo.onclick=function(){abrirFormulario({})};

  conectarEventos();
}

function repintarLista(){
  const lista=filtrarVehiculos();
  const box=document.getElementById("zx_vehiculos_lista");
  if(box){
    box.innerHTML=renderListado(lista);
    conectarEventos();
  }
}

function conectarEventos(){
  const buscar=document.getElementById("zx_buscar_vehiculos");
  if(buscar){
    buscar.oninput=function(){
      ZX_VEH_BUSQUEDA=buscar.value || "";
      repintarLista();
    };
  }

  const limpiarBtn=document.getElementById("zx_limpiar_vehiculos");
  if(limpiarBtn){
    limpiarBtn.onclick=function(){
      ZX_VEH_BUSQUEDA="";
      if(buscar) buscar.value="";
      repintarLista();
    };
  }

  document.querySelectorAll("[data-veh-filter]").forEach(function(btn){
    btn.onclick=function(){
      ZX_VEH_FILTRO=btn.dataset.vehFilter || "activos";
      document.querySelectorAll("[data-veh-filter]").forEach(b=>b.classList.remove("on"));
      btn.classList.add("on");
      repintarLista();
    };
  });

  document.querySelectorAll("[data-veh-open]").forEach(btn=>{btn.onclick=function(){abrirFicha(btn.dataset.vehOpen,"datos")}});
  document.querySelectorAll("[data-veh-route]").forEach(btn=>{btn.onclick=function(){abrirFicha(btn.dataset.vehRoute,"ruta")}});
  document.querySelectorAll("[data-veh-edit]").forEach(btn=>{btn.onclick=function(){editarVehiculo(btn.dataset.vehEdit)}});
  document.querySelectorAll("[data-veh-tomar]").forEach(btn=>{btn.onclick=function(){tomarVehiculo(btn.dataset.vehTomar)}});
  document.querySelectorAll("[data-veh-recuperar]").forEach(btn=>{btn.onclick=function(){tomarVehiculo(btn.dataset.vehRecuperar)}});
  document.querySelectorAll("[data-veh-devolver]").forEach(btn=>{btn.onclick=function(){devolverVehiculo(btn.dataset.vehDevolver)}});
  document.querySelectorAll("[data-veh-activar]").forEach(btn=>{btn.onclick=function(){actualizarVehiculo(btn.dataset.vehActivar,{activo:true,estado_flota:"libre"})}});
  document.querySelectorAll("[data-veh-desactivar]").forEach(btn=>{btn.onclick=function(){desactivarVehiculo(btn.dataset.vehDesactivar)}});
  document.querySelectorAll("[data-veh-more]").forEach(function(btn){
    btn.onclick=function(){
      const id=btn.dataset.vehMore;
      const panel=document.querySelector(`[data-veh-more-panel="${CSS.escape(id)}"]`);
      if(!panel) return;
      const abrir=panel.hasAttribute("hidden");
      document.querySelectorAll("[data-veh-more-panel]").forEach(p=>p.setAttribute("hidden",""));
      document.querySelectorAll("[data-veh-more]").forEach(b=>b.textContent="••• Más opciones");
      if(abrir){panel.removeAttribute("hidden");btn.textContent="✕ Cerrar opciones";}
    };
  });
}

function input(id,label,value,type){
  return `
    <label class="zx_veh_label" for="${id}">${limpiar(label)}</label>
    <input id="${id}" type="${type || "text"}" value="${limpiar(value || "")}" placeholder="${limpiar(label)}">
  `;
}

function abrirFormulario(v){
  v=v || {};
  if(!puedeGestionar()){alert("No tienes permiso.");return}

  modal(`
    <h2>${v.id ? "Editar vehículo" : "Nuevo vehículo"}</h2>

    <div class="zx_veh_form">
      <h3>Datos principales</h3>
      ${input("veh_matricula","Matrícula",v.matricula)}
      <div class="zx_veh_grid2">
        <div>${input("veh_marca","Marca",v.marca)}</div>
        <div>${input("veh_modelo","Modelo",v.modelo)}</div>
      </div>
      ${input("veh_km","Km actuales",v.km_actual || 0,"number")}

      <div class="zx_veh_grid2">
        <div>
          <label class="zx_veh_label" for="veh_activo">Estado</label>
          <select id="veh_activo">
            <option value="true" ${v.activo!==false && v.activo!=="false" ? "selected" : ""}>Activo</option>
            <option value="false" ${v.activo===false || v.activo==="false" ? "selected" : ""}>Inactivo</option>
          </select>
        </div>
        <div>
          <label class="zx_veh_label" for="veh_gps">Seguimiento GPS</label>
          <select id="veh_gps">
            <option value="false" ${v.seguimiento_gps_habilitado!==true && v.seguimiento_gps_habilitado!=="true" ? "selected" : ""}>Desactivado</option>
            <option value="true" ${v.seguimiento_gps_habilitado===true || v.seguimiento_gps_habilitado==="true" ? "selected" : ""}>Activado</option>
          </select>
        </div>
      </div>
      <div class="zx_veh_nota_form">La asignación se gestiona con los botones Utilizar y Devolver. No se cambia manualmente.</div>

      <h3>Revisiones y documentación</h3>
      <div class="zx_veh_grid2">
        <div>${input("veh_itv","Fecha ITV",v.itv_fecha,"date")}</div>
        <div>${input("veh_seguro","Vencimiento seguro",v.seguro_fecha,"date")}</div>
      </div>
      <div class="zx_veh_grid2">
        <div>${input("veh_revision","Próxima revisión",v.proxima_revision_fecha,"date")}</div>
        <div>${input("veh_revision_km","Km próxima revisión",v.proxima_revision_km,"number")}</div>
      </div>

      <label class="zx_veh_label" for="veh_doc">Documento</label>
      <input id="veh_doc" type="file" accept="image/*,.pdf,.doc,.docx">
      ${v.documento_url ? `<a class="zx_btn_big zx_azul" href="${limpiar(v.documento_url)}" target="_blank">Ver documento actual</a>` : ""}

      <label class="zx_veh_label" for="veh_notas">Notas</label>
      <textarea id="veh_notas" rows="4">${limpiar(v.notas || "")}</textarea>
    </div>

    <button class="zx_btn_big zx_verde" id="veh_guardar">Guardar</button>
    <button class="zx_btn_big zx_gris" id="veh_cancelar">Cancelar</button>
  `);

  document.getElementById("veh_cancelar").onclick=cerrarModal;
  document.getElementById("veh_guardar").onclick=function(){guardarVehiculo(v.id || null,v.documento_url || null,v.documento_nombre || null)};
}

function vehiculoPorId(id){
  return ZX_VEH_CACHE.find(v=>String(v.id)===String(id)) || null;
}

async function editarVehiculo(id){
  const local=vehiculoPorId(id);
  if(!navigator.onLine || !sb()){
    if(local){abrirFormulario(local);return}
    alert("Vehículo no encontrado sin conexión.");
    return;
  }

  try{
    const r=await sb().from(TABLA).select("*").eq("id",String(id)).maybeSingle();
    if(r.error || !r.data){
      if(local){abrirFormulario(local);return}
      alert("Vehículo no encontrado.");
      return;
    }
    abrirFormulario(r.data);
  }catch(e){
    if(local){abrirFormulario(local);return}
    alert("Vehículo no encontrado.");
  }
}

async function subirDocumento(file,matricula){
  if(!file) return null;
  if(!navigator.onLine || !sb()){
    alert("Para subir documentos necesitas conexión.");
    return null;
  }

  const ext=(file.name.split(".").pop() || "dat").toLowerCase();
  const clean=String(matricula || "vehiculo").replace(/[^a-zA-Z0-9_-]/g,"_");
  const path="vehiculos/"+clean+"_"+Date.now()+"."+ext;

  const buckets=["zentryx-vehiculos","zentryx-trabajos","zentryx-clientes"];

  for(const bucket of buckets){
    try{
      const r=await sb().storage.from(bucket).upload(path,file,{upsert:true});
      if(!r.error){
        return sb().storage.from(bucket).getPublicUrl(path).data.publicUrl;
      }
    }catch(e){}
  }

  alert("No se pudo subir el documento.");
  return null;
}

async function guardarVehiculo(id,docActual,nombreDocActual){
  const matricula=valor("veh_matricula").toUpperCase();
  if(!matricula){alert("La matrícula es obligatoria.");return}

  const km=numero(valor("veh_km"));
  if(km<0){alert("Los km no pueden ser negativos.");return}

  const file=(document.getElementById("veh_doc")?.files || [])[0] || null;
  const docUrl=await subirDocumento(file,matricula);

  const data={
    matricula:matricula,
    marca:valor("veh_marca"),
    modelo:valor("veh_modelo"),
    km_actual:km,
    activo:valor("veh_activo")==="true",
    seguimiento_gps_habilitado:valor("veh_gps")==="true",
    itv_fecha:valor("veh_itv") || null,
    seguro_fecha:valor("veh_seguro") || null,
    proxima_revision_fecha:valor("veh_revision") || null,
    proxima_revision_km:valor("veh_revision_km") ? numero(valor("veh_revision_km")) : null,
    documento_url:docUrl || docActual || null,
    documento_nombre:file ? file.name : nombreDocActual || null,
    notas:valor("veh_notas")
  };

  try{
    let r;
    if(zx() && typeof zx().update==="function" && typeof zx().insert==="function"){
      r=id ? await zx().update(TABLA,data,"id",id) : await zx().insert(TABLA,[data]);
    }else if(id){
      r=await sb().from(TABLA).update(data).eq("id",String(id));
    }else{
      r=await sb().from(TABLA).insert([data]);
    }

    if(r && r.error) throw r.error;

    cerrarModal();
    await window.ZX_vehiculos();
  }catch(e){
    alert("Error guardando vehículo: "+(e.message || "Error"));
  }
}

async function actualizarVehiculo(id,data){
  try{
    let r;
    if(zx() && typeof zx().update==="function"){
      r=await zx().update(TABLA,data,"id",id);
    }else{
      r=await sb().from(TABLA).update(data).eq("id",String(id));
    }
    if(r && r.error) throw r.error;
    await window.ZX_vehiculos();
  }catch(e){
    alert("No se pudo actualizar el vehículo.");
  }
}

async function tomarVehiculo(id){
  const v=vehiculoPorId(id);
  if(!v){alert("Vehículo no encontrado.");return}
  if(estadoVehiculo(v)==="inactivo"){alert("Este vehículo está inactivo.");return}

  const actual=responsableNombre(v);
  const ocupado=estadoVehiculo(v)==="uso" && !esResponsableActual(v);

  modal(`
    <h2>${ocupado ? "Cambiar responsable" : "Utilizar vehículo"}</h2>
    ${ocupado ? `<div class="zx_veh_aviso">Este vehículo está asignado ahora mismo a <b>${limpiar(actual || "otro usuario")}</b>. ¿Quieres utilizarlo?</div>` : ""}
    <div class="zx_veh_info ficha">
      <p><b>Vehículo</b><span>${limpiar(nombreVehiculo(v))}</span></p>
      <p><b>Km registrados</b><span>${limpiar(v.km_actual ?? 0)}</span></p>
    </div>
    <label class="zx_veh_label" for="veh_km_inicio_uso">Kilómetros al recogerlo</label>
    <input id="veh_km_inicio_uso" type="number" inputmode="decimal" value="${limpiar(v.km_actual ?? 0)}">
    <label class="zx_veh_label" for="veh_motivo_uso">Observación opcional</label>
    <textarea id="veh_motivo_uso" rows="3" placeholder="Solo si necesitas indicar algo"></textarea>
    <button class="zx_btn_big zx_verde" id="veh_tomar_ok">${ocupado ? "Sí, utilizarlo" : "Confirmar uso"}</button>
    <button class="zx_btn_big zx_gris" id="veh_tomar_cancelar">Cancelar</button>
  `);

  document.getElementById("veh_tomar_cancelar").onclick=cerrarModal;
  document.getElementById("veh_tomar_ok").onclick=async function(){
    const km=numero(valor("veh_km_inicio_uso"));
    if(km<numero(v.km_actual)){alert("Los kilómetros no pueden ser inferiores a los registrados.");return}

    const btn=document.getElementById("veh_tomar_ok");
    btn.disabled=true;
    btn.textContent="Guardando...";

    try{
      const u=identidadActual();
      if(!u.id) throw new Error("No se ha podido identificar al usuario.");
      const pos=await obtenerPosicion();
      const nuevoUsoId=uuid();
      const now=ahoraISO();
      const usoAnteriorId=v.uso_actual_id || null;

      if(ocupado && usoAnteriorId){
        const rCerrar=await zxUpdate("usos_vehiculos",{
          estado:"transferido",
          fin_at:now,
          km_fin:km,
          lat_fin:pos.lat,
          lng_fin:pos.lng,
          motivo_fin:"Transferido a "+u.nombre,
          actualizado_por:u.id
        },"id",usoAnteriorId);
        if(rCerrar && rCerrar.error) throw rCerrar.error;
      }

      const nuevoUso={
        id:nuevoUsoId,
        empresa_id:u.empresa_id || null,
        vehiculo_id:String(v.id),
        vehiculo_matricula:v.matricula || null,
        usuario_id:u.id,
        usuario:u.usuario || null,
        nombre_usuario:u.nombre,
        estado:"en_uso",
        inicio_at:now,
        km_inicio:km,
        lat_inicio:pos.lat,
        lng_inicio:pos.lng,
        motivo_inicio:valor("veh_motivo_uso") || (ocupado ? "Cambio de responsable" : "Uso directo"),
        dispositivo_inicio:navigator.userAgent || "",
        uso_anterior_id:usoAnteriorId,
        usuario_anterior_id:ocupado ? responsableId(v) || null : null,
        usuario_anterior_nombre:ocupado ? actual || null : null,
        tomado_sin_liberacion:ocupado,
        seguimiento_gps_activo:v.seguimiento_gps_habilitado===true || v.seguimiento_gps_habilitado==="true",
        creado_por:u.id
      };

      const rUso=await zxInsert("usos_vehiculos",nuevoUso);
      if(rUso && rUso.error) throw rUso.error;

      if(ocupado){
        const rTransfer=await zxInsert("transferencias_vehiculos",{
          id:uuid(),
          empresa_id:u.empresa_id || null,
          vehiculo_id:String(v.id),
          vehiculo_matricula:v.matricula || null,
          uso_anterior_id:usoAnteriorId,
          uso_nuevo_id:nuevoUsoId,
          usuario_anterior_id:responsableId(v) || null,
          nombre_anterior:actual || null,
          usuario_nuevo_id:u.id,
          usuario_nuevo:u.usuario || null,
          nombre_nuevo:u.nombre,
          estado:"confirmada",
          km_transferencia:km,
          lat:pos.lat,
          lng:pos.lng,
          mensaje_usuario_anterior:u.nombre+" está utilizando el vehículo "+(v.matricula || ""),
          avisar_al_liberar:true,
          respuesta_usuario_anterior:"pendiente",
          motivo:"Cambio de responsable confirmado",
          dispositivo:navigator.userAgent || "",
          confirmado_por:u.id,
          confirmado_at:now
        });
        if(rTransfer && rTransfer.error) throw rTransfer.error;
        await insertarNotificacion(
          responsableId(v),
          "Vehículo asumido por otro usuario",
          u.nombre+" está utilizando el vehículo "+(v.matricula||"")+". Te avisaremos cuando quede libre."
        );
      }

      const rVeh=await zxUpdate(TABLA,{
        uso_actual_id:nuevoUsoId,
        usuario_actual_id:u.id,
        usuario_actual_nombre:u.nombre,
        uso_iniciado_at:now,
        estado_flota:"en_uso",
        km_actual:km,
        en_uso:true,
        usuario_asignado:u.nombre
      },"id",id);
      if(rVeh && rVeh.error) throw rVeh.error;

      if(v.__recuperacion && v.__recuperacion.id){
        try{await zxUpdate("transferencias_vehiculos",{respuesta_usuario_anterior:"volver_a_usar"},"id",v.__recuperacion.id)}catch(e){}
      }

      cerrarModal();
      await window.ZX_vehiculos();
    }catch(e){
      btn.disabled=false;
      btn.textContent=ocupado ? "Sí, utilizarlo" : "Confirmar uso";
      alert("No se pudo asignar el vehículo: "+(e.message || "Error"));
    }
  };
}

async function devolverVehiculo(id){
  const v=vehiculoPorId(id);
  if(!v){alert("Vehículo no encontrado.");return}
  if(!esResponsableActual(v) && !puedeGestionar()){
    alert("Solo el responsable actual o un administrador puede devolverlo.");
    return;
  }

  modal(`
    <h2>Devolver vehículo</h2>
    <div class="zx_veh_info ficha">
      <p><b>Vehículo</b><span>${limpiar(nombreVehiculo(v))}</span></p>
      <p><b>Responsable</b><span>${limpiar(responsableNombre(v) || "-")}</span></p>
    </div>
    <label class="zx_veh_label" for="veh_km_salida">Kilómetros finales</label>
    <input id="veh_km_salida" type="number" inputmode="decimal" value="${limpiar(v.km_actual ?? 0)}">
    <label class="zx_veh_label" for="veh_observacion_salida">Incidencia u observación</label>
    <textarea id="veh_observacion_salida" rows="3" placeholder="Déjalo vacío si todo está correcto"></textarea>
    <button class="zx_btn_big zx_verde" id="veh_devolver_ok">Confirmar devolución</button>
    <button class="zx_btn_big zx_gris" id="veh_devolver_cancelar">Cancelar</button>
  `);

  document.getElementById("veh_devolver_cancelar").onclick=cerrarModal;
  document.getElementById("veh_devolver_ok").onclick=async function(){
    const km=numero(valor("veh_km_salida"));
    if(km<numero(v.km_actual)){alert("Los kilómetros finales no pueden ser inferiores a los actuales.");return}
    const btn=document.getElementById("veh_devolver_ok");
    btn.disabled=true;
    btn.textContent="Guardando...";

    try{
      const u=identidadActual();
      const pos=await obtenerPosicion();
      const now=ahoraISO();

      if(v.uso_actual_id){
        const rUso=await zxUpdate("usos_vehiculos",{
          estado:"devuelto",
          fin_at:now,
          km_fin:km,
          lat_fin:pos.lat,
          lng_fin:pos.lng,
          motivo_fin:valor("veh_observacion_salida") || "Devolución normal",
          dispositivo_fin:navigator.userAgent || "",
          actualizado_por:u.id || null
        },"id",v.uso_actual_id);
        if(rUso && rUso.error) throw rUso.error;
      }

      const rVeh=await zxUpdate(TABLA,{
        uso_actual_id:null,
        usuario_actual_id:null,
        usuario_actual_nombre:null,
        uso_iniciado_at:null,
        estado_flota:"libre",
        km_actual:km,
        en_uso:false,
        usuario_asignado:""
      },"id",id);
      if(rVeh && rVeh.error) throw rVeh.error;

      try{
        const tr=await sb().from("transferencias_vehiculos").select("*")
          .eq("uso_nuevo_id",String(v.uso_actual_id||""))
          .eq("avisar_al_liberar",true)
          .order("created_at",{ascending:false}).limit(1);
        const t=tr.data&&tr.data[0] ? tr.data[0] : null;
        if(t && t.usuario_anterior_id){
          await zxUpdate("transferencias_vehiculos",{
            aviso_liberacion_enviado:true,
            mensaje_usuario_anterior:(u.nombre||responsableNombre(v)||"El usuario")+" ya ha liberado el vehículo "+(v.matricula||"")
          },"id",t.id);
          await insertarNotificacion(
            t.usuario_anterior_id,
            "Vehículo libre",
            (u.nombre||responsableNombre(v)||"El usuario")+" ha liberado el vehículo "+(v.matricula||"")+". Puedes volver a utilizarlo desde Vehículos."
          );
        }
      }catch(e){}

      detenerSeguimientoGPS();
      cerrarModal();
      await window.ZX_vehiculos();
    }catch(e){
      btn.disabled=false;
      btn.textContent="Confirmar devolución";
      alert("No se pudo devolver el vehículo: "+(e.message || "Error"));
    }
  };
}

async function desactivarVehiculo(id){
  if(!confirm("¿Desactivar este vehículo?")) return;
  const v=vehiculoPorId(id);
  if(v && estadoVehiculo(v)==="uso"){
    alert("Primero debe devolverse el vehículo.");
    return;
  }
  await actualizarVehiculo(id,{activo:false,estado_flota:"libre",en_uso:false,usuario_asignado:""});
}

async function abrirFicha(id,tabInicial){
  tabInicial=tabInicial || "datos";
  const v=vehiculoPorId(id);
  if(!v){alert("Vehículo no encontrado.");return}

  modal(`
    <h2>${limpiar(nombreVehiculo(v))}</h2>
    <div class="zx_veh_loading">Cargando historial...</div>
    <button class="zx_btn_big zx_gris" id="veh_ficha_cerrar">Cerrar</button>
  `);
  document.getElementById("veh_ficha_cerrar").onclick=cerrarModal;

  const detalle=await cargarDetalleVehiculo(id);
  const usos=detalle.usos||[];
  const transferencias=detalle.transferencias||[];
  const puntos=detalle.puntos||[];
  const rutaUrl=urlRutaGoogle(puntos);

  const usoHtml=usos.length ? usos.map(function(u){
    const kmTxt=(u.km_inicio!=null ? u.km_inicio : "-")+" → "+(u.km_fin!=null ? u.km_fin : "-");
    return `<div class="zx_veh_hist_item"><b>${limpiar(u.nombre_usuario||u.usuario||"Usuario")}</b><span>${limpiar(fechaHoraES(u.inicio_at))} · ${limpiar(u.estado||"")}</span><small>Km ${limpiar(kmTxt)}${u.km_recorridos!=null ? " · "+limpiar(u.km_recorridos)+" km" : ""}</small></div>`;
  }).join("") : `<div class="zx_veh_empty">Todavía no hay usos registrados.</div>`;

  const transHtml=transferencias.length ? transferencias.map(function(t){
    return `<div class="zx_veh_hist_item"><b>${limpiar(t.nombre_anterior||"Sin responsable")} → ${limpiar(t.nombre_nuevo||"Usuario")}</b><span>${limpiar(fechaHoraES(t.created_at))}</span><small>${limpiar(t.motivo||"Cambio de responsable")}</small></div>`;
  }).join("") : `<div class="zx_veh_empty">No hay transferencias registradas.</div>`;

  modal(`
    <h2>${limpiar(nombreVehiculo(v))}</h2>
    <div class="zx_veh_badges">${badge(v)}</div>
    ${renderAvisos(v)}

    <div class="zx_veh_tabs">
      <button class="${tabInicial==="datos" ? "on" : ""}" data-veh-tab="datos">Datos</button>
      <button class="${tabInicial==="historial" ? "on" : ""}" data-veh-tab="historial">Historial (${usos.length})</button>
      <button class="${tabInicial==="transferencias" ? "on" : ""}" data-veh-tab="transferencias">Cambios (${transferencias.length})</button>
      <button class="${tabInicial==="ruta" ? "on" : ""}" data-veh-tab="ruta">Ruta (${puntos.length})</button>
    </div>

    <div class="zx_veh_tab ${tabInicial==="datos" ? "on" : ""}" data-veh-panel="datos">
      <div class="zx_veh_info ficha">
        <p><b>Matrícula</b><span>${limpiar(v.matricula || "-")}</span></p>
        <p><b>Marca / modelo</b><span>${limpiar([v.marca,v.modelo].filter(Boolean).join(" ") || "-")}</span></p>
        <p><b>Km actuales</b><span>${limpiar(v.km_actual ?? 0)}</span></p>
        <p><b>Responsable actual</b><span>${limpiar(responsableNombre(v) || "-")}</span></p>
        <p><b>Inicio del uso</b><span>${limpiar(fechaHoraES(v.uso_iniciado_at))}</span></p>
        <p><b>Tiempo de uso</b><span>${limpiar(duracionDesde(v.uso_iniciado_at))}</span></p>
        <p><b>ITV</b><span>${limpiar(fechaES(v.itv_fecha) || "-")}</span></p>
        <p><b>Seguro</b><span>${limpiar(fechaES(v.seguro_fecha) || "-")}</span></p>
        <p><b>Revisión</b><span>${limpiar(fechaES(v.proxima_revision_fecha) || "-")}</span></p>
        <p><b>Km revisión</b><span>${limpiar(v.proxima_revision_km || "-")}</span></p>
        ${v.notas ? `<p><b>Notas</b><span>${limpiar(v.notas)}</span></p>` : ""}
      </div>
    </div>

    <div class="zx_veh_tab ${tabInicial==="historial" ? "on" : ""}" data-veh-panel="historial"><div class="zx_veh_hist">${usoHtml}</div></div>
    <div class="zx_veh_tab ${tabInicial==="transferencias" ? "on" : ""}" data-veh-panel="transferencias"><div class="zx_veh_hist">${transHtml}</div></div>
    <div class="zx_veh_tab ${tabInicial==="ruta" ? "on" : ""}" data-veh-panel="ruta">
      <div class="zx_veh_route_box">
        <b>${puntos.length} puntos GPS registrados</b>
        <span>${puntos.length ? "Ruta disponible para este vehículo." : "Aún no hay puntos GPS guardados. Activa el seguimiento en Editar, utiliza el vehículo y mantén Zentryx abierto durante el trayecto."}</span>
        ${rutaUrl ? `<a href="${limpiar(rutaUrl)}" target="_blank" rel="noopener">Abrir recorrido en Google Maps</a>` : ""}
      </div>
    </div>

    <div class="zx_veh_actions ficha_actions">
      ${puedeGestionar() ? `<button class="blue" id="veh_ficha_editar">Editar</button>` : ""}
      ${v.documento_url ? `<button class="purple" id="veh_ficha_doc">Documento</button>` : ""}
      <button class="gray" id="veh_ficha_cerrar">Cerrar</button>
    </div>
  `);

  document.querySelectorAll("[data-veh-tab]").forEach(function(btn){
    btn.onclick=function(){
      const tab=btn.dataset.vehTab;
      document.querySelectorAll("[data-veh-tab]").forEach(x=>x.classList.toggle("on",x===btn));
      document.querySelectorAll("[data-veh-panel]").forEach(x=>x.classList.toggle("on",x.dataset.vehPanel===tab));
    };
  });
  const editar=document.getElementById("veh_ficha_editar");
  if(editar) editar.onclick=function(){editarVehiculo(id)};
  const doc=document.getElementById("veh_ficha_doc");
  if(doc) doc.onclick=function(){window.open(v.documento_url,"_blank")};
  document.getElementById("veh_ficha_cerrar").onclick=cerrarModal;
}

function instalarCSS(){
  const old=document.getElementById("zx_vehiculos_css_v3135");
  if(old) old.remove();

  const s=document.createElement("style");
  s.id="zx_vehiculos_css_v3135";
  s.innerHTML=`
    .zx_veh_shell{display:grid;grid-template-columns:1fr;gap:14px;padding-bottom:calc(env(safe-area-inset-bottom) + 118px)}
    .zx_veh_panel{background:white;border:1px solid #dbe3ef;border-radius:26px;padding:18px;box-shadow:0 12px 28px rgba(15,23,42,.06);overflow:hidden}
    .zx_veh_header{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start}
    .zx_veh_header h2{margin:0;color:#071330;font-size:30px;line-height:1.05;font-weight:950;letter-spacing:-.5px}
    .zx_veh_header p{margin:8px 0 0;color:#64748b;font-size:15px;font-weight:850;line-height:1.35}
    .zx_veh_new{border:0;border-radius:18px;background:#16a34a;color:white;padding:14px 16px;font-size:16px;font-weight:950;white-space:nowrap}
    .zx_veh_kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}
    .zx_veh_kpis div{background:#f8fafc;border:1px solid #dbe3ef;border-radius:20px;padding:14px;text-align:center}
    .zx_veh_kpis b{display:block;color:#071330;font-size:27px;font-weight:950;line-height:1}
    .zx_veh_kpis span{display:block;color:#64748b;font-size:13px;font-weight:900;margin-top:6px}
    .zx_veh_toolbar{display:grid;grid-template-columns:1fr;gap:12px}
    .zx_veh_search{position:relative}
    .zx_veh_search input{width:100%;margin:0!important;padding-right:48px!important;border:1px solid #dbe3ef;border-radius:18px;padding:15px;font-size:16px;font-weight:850;background:#f8fafc;color:#071330}
    .zx_veh_search button{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:#e2e8f0;width:34px;height:34px;border-radius:12px;font-weight:950;color:#334155}
    .zx_veh_filters{display:flex;gap:8px;overflow-x:auto;padding-bottom:3px}
    .zx_veh_filters button{border:0;border-radius:999px;background:#f1f5f9;color:#334155;padding:10px 13px;font-size:13px;font-weight:950;white-space:nowrap}
    .zx_veh_filters button.on{background:#2563eb;color:white}
    .zx_veh_resume{color:#64748b;font-size:13px;font-weight:900}
    .zx_veh_list_head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
    .zx_veh_list_head h3{margin:0;color:#071330;font-size:25px;font-weight:950;letter-spacing:-.3px}
    .zx_veh_list_head span{color:#64748b;font-size:13px;font-weight:950;white-space:nowrap}
    .zx_veh_list{display:grid;grid-template-columns:1fr;gap:12px}
    .zx_veh_card{background:#f8fafc;border:1px solid #dbe3ef;border-radius:22px;padding:14px;overflow:hidden}
    .zx_veh_card_head{display:grid;grid-template-columns:58px minmax(0,1fr) auto;gap:11px;align-items:center}
    .zx_veh_media{width:58px;height:58px;border-radius:18px;background:#dbeafe;display:flex;align-items:center;justify-content:center;overflow:hidden}
    .zx_veh_media span{font-size:26px}.zx_veh_media img{width:100%;height:100%;object-fit:cover;display:block}
    .zx_veh_identity{min-width:0}.zx_veh_identity h3{margin:2px 0 0;color:#071330;font-size:21px;line-height:1.05;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .zx_veh_status_inline{align-self:start}.zx_veh_status_inline>span{display:inline-block;border-radius:999px;padding:7px 9px;font-size:11px;font-weight:950;white-space:nowrap}.zx_veh_status_inline .libre{background:#dcfce7;color:#166534}.zx_veh_status_inline .uso{background:#dbeafe;color:#1d4ed8}.zx_veh_status_inline .off{background:#fee2e2;color:#991b1b}.zx_veh_status_inline .orange{background:#ffedd5;color:#9a3412}
    .zx_veh_top{display:grid;grid-template-columns:52px 1fr;gap:12px;align-items:center}
    .zx_veh_icon{width:52px;height:52px;border-radius:18px;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:950}
    .zx_veh_top h3{margin:2px 0 0;color:#071330;font-size:21px;line-height:1.15;font-weight:950}
    .zx_veh_modelo{color:#64748b;font-size:13px;font-weight:950;line-height:1.2}
    .zx_veh_meta{margin-top:4px;color:#64748b;font-size:13px;font-weight:950}
    .zx_veh_badges{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px}
    .zx_veh_badges span{border-radius:999px;padding:8px 10px;font-size:12px;font-weight:950}
    .zx_veh_badges .libre{background:#dcfce7;color:#166534}
    .zx_veh_badges .uso{background:#dbeafe;color:#1d4ed8}
    .zx_veh_badges .off{background:#fee2e2;color:#991b1b}.zx_veh_badges .orange{background:#ffedd5;color:#9a3412}
    .zx_veh_alertas{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
    .zx_veh_alertas span{background:#fef3c7;color:#92400e;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:950}
    .zx_veh_fastline{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:11px}.zx_veh_fastline>div{min-width:0;display:grid;grid-template-columns:23px minmax(0,1fr);align-items:center;background:white;border:1px solid #e6edf5;border-radius:14px;padding:9px 10px}.zx_veh_fastline span{font-size:16px}.zx_veh_fastline strong{color:#071330;font-size:13px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.zx_veh_fastline small{grid-column:2;color:#64748b;font-size:10px;font-weight:850;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .zx_veh_info{margin-top:13px;display:grid;grid-template-columns:1fr;gap:8px}
    .zx_veh_info p{margin:0;background:white;border:1px solid #e6edf5;border-radius:16px;padding:11px}
    .zx_veh_info b{display:block;color:#64748b;font-size:12px;font-weight:950;margin-bottom:4px}
    .zx_veh_info span{display:block;color:#071330;font-size:15px;font-weight:850;line-height:1.3;word-break:break-word}
    .zx_veh_quick{display:grid;gap:8px;margin-top:13px}
    .zx_veh_quick>div{display:grid;grid-template-columns:28px 1fr;align-items:center;background:white;border:1px solid #e6edf5;border-radius:16px;padding:11px 12px}
    .zx_veh_quick span{font-size:18px}.zx_veh_quick b{color:#071330;font-size:15px;font-weight:900}.zx_veh_quick small{grid-column:2;color:#64748b;font-size:12px;font-weight:850;margin-top:2px}
    .zx_veh_main_action{width:100%;border:0;border-radius:18px;padding:15px 12px;color:white;font-size:16px;font-weight:950;min-height:52px;margin-top:13px}
    .zx_veh_main_action.green{background:#16a34a}.zx_veh_main_action.purple{background:#7c3aed}.zx_veh_main_action.orange{background:#f97316}
    .zx_veh_more{width:100%;border:0;background:transparent;color:#334155;padding:12px 8px 4px;font-size:14px;font-weight:950}
    .zx_veh_more_panel{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}
    .zx_veh_more_panel[hidden]{display:none!important}
    .zx_veh_more_panel button,.zx_veh_actions button{border:0;border-radius:16px;padding:13px 8px;color:white;font-size:14px;font-weight:950;min-height:46px}
    .zx_veh_more_panel .green,.zx_veh_actions .green{background:#16a34a}.zx_veh_more_panel .blue,.zx_veh_actions .blue{background:#2563eb}.zx_veh_more_panel .purple,.zx_veh_actions .purple{background:#7c3aed}.zx_veh_more_panel .orange,.zx_veh_actions .orange{background:#f97316}.zx_veh_more_panel .gray,.zx_veh_actions .gray{background:#64748b}.zx_veh_more_panel .red,.zx_veh_actions .red{background:#dc2626}
    .zx_veh_actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}
    .zx_veh_aviso{margin:12px 0;background:#fff7ed;border:1px solid #fdba74;color:#9a3412;border-radius:16px;padding:13px;font-weight:850;line-height:1.35}.zx_veh_nota_form{margin-top:10px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;border-radius:14px;padding:11px;font-size:13px;font-weight:800}.zx_veh_empty{color:#64748b;font-size:16px;font-weight:850;padding:12px 0}
    .zx_veh_form h3{margin:20px 0 8px;color:#071330;font-size:22px;font-weight:950}
    .zx_veh_label{display:block;margin:12px 0 6px;color:#475569;font-size:14px;font-weight:950}
    .zx_veh_form input,.zx_veh_form select,.zx_veh_form textarea,#zx_modal_vehiculo input,#zx_modal_vehiculo select,#zx_modal_vehiculo textarea{width:100%;border:1px solid #dbe3ef;border-radius:16px;padding:13px;font-size:16px;font-weight:800;color:#071330;background:#f8fafc}
    .zx_veh_grid2{display:grid;grid-template-columns:1fr;gap:10px}
    .zx_veh_loading{padding:20px 0;color:#64748b;font-weight:900;text-align:center}
    .zx_veh_tabs{display:flex;gap:8px;overflow-x:auto;margin:14px 0 12px;padding-bottom:4px}
    .zx_veh_tabs button{border:0;border-radius:999px;background:#e2e8f0;color:#334155;padding:10px 12px;font-size:13px;font-weight:950;white-space:nowrap}
    .zx_veh_tabs button.on{background:#2563eb;color:white}
    .zx_veh_tab{display:none}.zx_veh_tab.on{display:block}
    .zx_veh_hist{display:grid;gap:9px}.zx_veh_hist_item{background:#f8fafc;border:1px solid #dbe3ef;border-radius:16px;padding:12px}
    .zx_veh_hist_item b,.zx_veh_hist_item span,.zx_veh_hist_item small{display:block}.zx_veh_hist_item b{color:#071330;font-size:15px}.zx_veh_hist_item span{color:#475569;font-size:13px;font-weight:850;margin-top:4px}.zx_veh_hist_item small{color:#64748b;font-size:12px;font-weight:850;margin-top:4px}
    .zx_veh_route_box{background:#f8fafc;border:1px solid #dbe3ef;border-radius:18px;padding:16px}.zx_veh_route_box b,.zx_veh_route_box span{display:block}.zx_veh_route_box span{margin-top:6px;color:#64748b;font-weight:850}.zx_veh_route_box a{display:inline-block;margin-top:12px;background:#2563eb;color:white;text-decoration:none;border-radius:14px;padding:11px 13px;font-weight:950}
    @media(max-width:390px){.zx_veh_panel{padding:15px;border-radius:22px}.zx_veh_header h2{font-size:27px}.zx_veh_actions,.zx_veh_more_panel{grid-template-columns:1fr}.zx_veh_kpis{grid-template-columns:1fr 1fr}.zx_veh_card_head{grid-template-columns:52px minmax(0,1fr)}.zx_veh_media{width:52px;height:52px}.zx_veh_status_inline{grid-column:1/-1}.zx_veh_fastline{grid-template-columns:1fr 1fr}}
    @media(min-width:700px){.zx_veh_shell{padding-bottom:32px}.zx_veh_kpis{grid-template-columns:repeat(4,minmax(0,1fr))}.zx_veh_list{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_veh_grid2{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_veh_info.ficha{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(min-width:1100px){.zx_veh_panel{padding:22px}.zx_veh_list{grid-template-columns:repeat(3,minmax(0,1fr))}}
  `;
  document.head.appendChild(s);
}

window.ZX_vehiculos=async function(){
  instalarCSS();

  if(zx() && typeof zx().marcarModuloActivo==="function"){
    zx().marcarModuloActivo("vehiculos");
  }else{
    document.querySelectorAll(".zx_nav_btn").forEach(function(b){
      b.classList.remove("zx_activo");
      if(b.dataset.modulo==="vehiculos") b.classList.add("zx_activo");
    });
  }

  if(!puedeEntrar()){
    app().innerHTML=`
      <div class="zx_veh_panel">
        <h2>Vehículos</h2>
        <div class="zx_text">No tienes permiso para acceder a Vehículos.</div>
      </div>
    `;
    return;
  }

  ZX_VEH_CACHE=leerCache().map(prepararVehiculo);
  pintarShell(filtrarVehiculos());
  iniciarRelojDuraciones();
  iniciarSeguimientoGPSActual();

  setTimeout(async function(){
    const lista=await cargarVehiculos();
    pintarShell(lista);
    iniciarRelojDuraciones();
    iniciarSeguimientoGPSActual();
  },20);
};

window.ZENTRYX_UI_abrirVehiculos=window.ZX_vehiculos;

if(zx() && typeof zx().registrarModulo==="function"){
  zx().registrarModulo("vehiculos",{
    nombre:"Vehículos",
    activo:true,
    version:ZX_VERSION
  });
}

console.log("ZENTRYX vehiculos.js V"+ZX_VERSION+" cargado");

})();
