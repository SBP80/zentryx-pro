// ===============================
// ZENTRYX PRO - SESSION
// V3152
// ===============================
(function(){
"use strict";

const ZX_VERSION="3403";

const SESSION_KEY="zentryx_session";
const USER_KEY="usuario";
const DEVICE_KEY="zentryx_device_id";
const SESSION_EVENT_KEY="zentryx_session_event";

const LOGIN_URL="index.html?v="+ZX_VERSION+"&t="+Date.now();
const APP_URL="app.html?v="+ZX_VERSION+"&t="+Date.now();

// Duración máxima absoluta de una sesión.
const MAX_SESSION_MS=12*60*60*1000;
// Cierre por inactividad.
const INACTIVITY_MS=90*60*1000;
// Evita escribir en localStorage con cada toque o desplazamiento.
const ACTIVITY_WRITE_INTERVAL_MS=30*1000;
// Revisión periódica cuando la aplicación permanece abierta.
const VALIDATION_INTERVAL_MS=30*1000;

let lastActivityWrite=0;
let redirecting=false;
let activityControlStarted=false;

function now(){
  return Date.now();
}

function parseTime(value){
  if(value===null || value===undefined || value==="") return null;

  if(typeof value==="number" && Number.isFinite(value)){
    return value;
  }

  if(typeof value==="string"){
    const numeric=Number(value);
    if(Number.isFinite(numeric) && numeric>0) return numeric;

    const parsed=Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function readRaw(key){
  try{
    const raw=localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }catch(error){
    return null;
  }
}

function saveRaw(key,value){
  try{
    localStorage.setItem(key,JSON.stringify(value));
    return true;
  }catch(error){
    return false;
  }
}

function removeRaw(key){
  try{
    localStorage.removeItem(key);
  }catch(error){}
}

function safePathname(){
  try{
    return String(location.pathname || "").toLowerCase();
  }catch(error){
    return "";
  }
}

function isLoginPage(){
  const path=safePathname();
  return path.endsWith("/") || path.endsWith("index.html") || path.includes("/index.html");
}

function isAppPage(){
  return safePathname().includes("app.html");
}

function createRandomId(prefix){
  try{
    if(window.crypto && typeof window.crypto.randomUUID==="function"){
      return prefix+window.crypto.randomUUID();
    }
  }catch(error){}

  return prefix+Date.now()+"_"+Math.random().toString(16).slice(2)+Math.random().toString(16).slice(2);
}

function getDeviceId(){
  try{
    let id=localStorage.getItem(DEVICE_KEY);

    if(!id){
      id=createRandomId("dev_");
      localStorage.setItem(DEVICE_KEY,id);
    }

    return id;
  }catch(error){
    return "dev_temp";
  }
}

function normalizeSession(session){
  if(!session || typeof session!=="object") return null;
  if(session.id===null || session.id===undefined || !String(session.id).trim()) return null;
  if(!session.usuario || !String(session.usuario).trim()) return null;

  const current=now();
  const created=parseTime(session.created_at) || parseTime(session.inicio) || current;
  const last=parseTime(session.last_activity) || parseTime(session.actividad) || created;
  const absoluteExpiry=created+MAX_SESSION_MS;
  const suppliedExpiry=parseTime(session.expires_at);
  const expires=suppliedExpiry ? Math.min(suppliedExpiry,absoluteExpiry) : absoluteExpiry;

  return {
    id:String(session.id),
    usuario:String(session.usuario).trim(),
    nombre:String(session.nombre || session.usuario).trim(),
    rol:String(session.rol || "Usuario").trim(),
    empresa_id:session.empresa_id || "demo",
    created_at:created,
    last_activity:last,
    expires_at:expires,
    inicio:session.inicio || new Date(created).toISOString(),
    actividad:new Date(last).toISOString(),
    session_id:session.session_id || createRandomId("zx_"),
    dispositivo_id:session.dispositivo_id || getDeviceId()
  };
}

function readSession(){
  return normalizeSession(readRaw(SESSION_KEY));
}

function saveSession(session){
  const normalized=normalizeSession(session);
  return normalized ? saveRaw(SESSION_KEY,normalized) : false;
}

function broadcastSessionEvent(type){
  try{
    localStorage.setItem(SESSION_EVENT_KEY,JSON.stringify({
      type:type,
      at:now(),
      id:createRandomId("evt_")
    }));
  }catch(error){}
}

function clearSession(options){
  const opts=options || {};
  removeRaw(SESSION_KEY);
  removeRaw(USER_KEY);
  lastActivityWrite=0;

  if(opts.broadcast!==false){
    broadcastSessionEvent("logout");
  }
}

function sessionStatus(){
  const session=readSession();

  if(!session){
    return {valid:false,reason:"missing",session:null};
  }

  const current=now();

  if(current>=session.expires_at || current>=session.created_at+MAX_SESSION_MS){
    return {valid:false,reason:"expired",session:session};
  }

  if(current-session.last_activity>=INACTIVITY_MS){
    return {valid:false,reason:"inactive",session:session};
  }

  const storedUser=readRaw(USER_KEY);
  if(storedUser && storedUser.id!==undefined && String(storedUser.id)!==String(session.id)){
    return {valid:false,reason:"user_mismatch",session:session};
  }

  return {valid:true,reason:"ok",session:session};
}

function sessionValid(){
  const status=sessionStatus();

  if(!status.valid){
    if(status.reason!=="missing") clearSession();
    return false;
  }

  return true;
}

function updateActivity(force){
  const status=sessionStatus();
  if(!status.valid) return false;

  const current=now();
  if(!force && current-lastActivityWrite<ACTIVITY_WRITE_INTERVAL_MS){
    return true;
  }

  const session=status.session;
  session.last_activity=current;
  session.actividad=new Date(current).toISOString();
  // La actividad nunca extiende el límite absoluto de 12 horas.
  session.expires_at=session.created_at+MAX_SESSION_MS;

  const saved=saveSession(session);
  if(saved) lastActivityWrite=current;
  return saved;
}

function createSession(usuario){
  if(!usuario || usuario.id===null || usuario.id===undefined || !usuario.usuario){
    return false;
  }

  const current=now();
  const session={
    id:String(usuario.id),
    usuario:String(usuario.usuario).trim(),
    nombre:String(usuario.nombre || usuario.usuario).trim(),
    rol:String(usuario.rol || "Usuario").trim(),
    empresa_id:usuario.empresa_id || "demo",
    created_at:current,
    last_activity:current,
    expires_at:current+MAX_SESSION_MS,
    inicio:new Date(current).toISOString(),
    actividad:new Date(current).toISOString(),
    session_id:createRandomId("zx_"),
    dispositivo_id:getDeviceId()
  };

  const sessionSaved=saveRaw(SESSION_KEY,session);
  const userSaved=saveRaw(USER_KEY,usuario);

  if(!sessionSaved || !userSaved){
    clearSession({broadcast:false});
    return false;
  }

  lastActivityWrite=current;
  broadcastSessionEvent("login");
  return true;
}

function redirect(url){
  if(redirecting) return;
  redirecting=true;

  try{
    location.replace(url);
  }catch(error){
    location.href=url;
  }
}

function logout(){
  clearSession();
  redirect(LOGIN_URL);
}

function protectApp(){
  if(!isAppPage()) return true;

  if(!sessionValid()){
    clearSession();
    redirect(LOGIN_URL);
    return false;
  }

  return true;
}

function protectLogin(){
  if(!isLoginPage()) return false;

  if(sessionValid()){
    updateActivity(true);
    redirect(APP_URL);
    return true;
  }

  return false;
}

function recordUserActivity(){
  if(isAppPage()) updateActivity(false);
}

function startActivityControl(){
  if(activityControlStarted) return;
  activityControlStarted=true;

  ["pointerdown","touchstart","keydown"].forEach(function(eventName){
    document.addEventListener(eventName,recordUserActivity,{passive:true});
  });

  document.addEventListener("visibilitychange",function(){
    if(document.hidden) return;

    if(isAppPage()){
      if(!sessionValid()){
        logout();
        return;
      }
      updateActivity(true);
    }
  });

  window.addEventListener("pageshow",function(){
    if(isAppPage()){
      if(!sessionValid()){
        logout();
        return;
      }
      updateActivity(true);
    }
  });

  window.addEventListener("storage",function(event){
    if(event.key===SESSION_KEY && !event.newValue && isAppPage()){
      redirect(LOGIN_URL);
      return;
    }

    if(event.key===SESSION_EVENT_KEY && event.newValue){
      const data=(function(){
        try{return JSON.parse(event.newValue);}catch(error){return null;}
      })();

      if(data && data.type==="logout" && isAppPage()){
        redirect(LOGIN_URL);
      }
    }
  });

  window.setInterval(function(){
    if(isAppPage() && !sessionValid()) logout();
  },VALIDATION_INTERVAL_MS);
}

window.ZENTRYX_createSession=createSession;
window.ZENTRYX_logout=logout;
window.ZENTRYX_sessionValid=sessionValid;
window.ZENTRYX_sessionStatus=sessionStatus;
window.ZENTRYX_readSession=readSession;
window.ZENTRYX_saveSession=saveSession;
window.ZENTRYX_clearSession=clearSession;
window.ZENTRYX_updateActivity=updateActivity;
window.ZENTRYX_getDeviceId=getDeviceId;

protectApp();
protectLogin();
startActivityControl();

console.log("Zentryx session.js V"+ZX_VERSION+" cargado");

})();
