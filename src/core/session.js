// ===============================
// ZENTRYX PRO - SESSION
// V3106
// ===============================
(function(){
"use strict";

const ZX_VERSION="3106";

const SESSION_KEY="zentryx_session";
const USER_KEY="usuario";

const LOGIN_URL="index.html?v="+ZX_VERSION;
const APP_URL="app.html?v="+ZX_VERSION;

const MAX_SESSION_MS=12*60*60*1000;
const INACTIVITY_MS=90*60*1000;

function now(){
  return Date.now();
}

function parseTime(v){
  if(!v) return null;

  if(typeof v==="number" && isFinite(v)){
    return v;
  }

  if(typeof v==="string"){
    const t=Date.parse(v);
    return isNaN(t) ? null : t;
  }

  return null;
}

function readRaw(key){
  try{
    const raw=localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }catch(e){
    return null;
  }
}

function save(key,value){
  try{
    localStorage.setItem(key,JSON.stringify(value));
    return true;
  }catch(e){
    return false;
  }
}

function remove(key){
  try{
    localStorage.removeItem(key);
  }catch(e){}
}

function isLoginPage(){
  const p=location.pathname.toLowerCase();
  return p.endsWith("/") || p.endsWith("index.html") || p.includes("/index.html");
}

function isAppPage(){
  return location.pathname.toLowerCase().includes("app.html");
}

function normalizeSession(s){
  if(!s || typeof s!=="object"){
    return null;
  }

  if(!s.id || !s.usuario){
    return null;
  }

  const t=now();

  const created=parseTime(s.created_at) || parseTime(s.inicio) || t;
  const last=parseTime(s.last_activity) || parseTime(s.actividad) || created;
  const expires=parseTime(s.expires_at) || created+MAX_SESSION_MS;

  return {
    id:String(s.id),
    usuario:String(s.usuario),
    nombre:s.nombre || s.usuario,
    rol:s.rol || "Usuario",
    empresa_id:s.empresa_id || "demo",
    created_at:created,
    last_activity:last,
    expires_at:expires,
    inicio:s.inicio || new Date(created).toISOString(),
    actividad:new Date(last).toISOString(),
    session_id:s.session_id || "zx_"+created+"_"+Math.random().toString(16).slice(2),
    dispositivo_id:s.dispositivo_id || getDeviceId()
  };
}

function getDeviceId(){
  const key="zentryx_device_id";

  try{
    let id=localStorage.getItem(key);

    if(!id){
      id="dev_"+Date.now()+"_"+Math.random().toString(16).slice(2);
      localStorage.setItem(key,id);
    }

    return id;

  }catch(e){
    return "dev_temp";
  }
}

function readSession(){
  return normalizeSession(readRaw(SESSION_KEY));
}

function saveSession(s){
  return save(SESSION_KEY,normalizeSession(s));
}

function clearSession(){
  remove(SESSION_KEY);
  remove(USER_KEY);
}

function sessionValid(){
  const s=readSession();

  if(!s){
    return false;
  }

  const t=now();

  if(t>s.expires_at){
    clearSession();
    return false;
  }

  if(t-s.last_activity>INACTIVITY_MS){
    clearSession();
    return false;
  }

  saveSession(s);
  return true;
}

function updateActivity(){
  const s=readSession();

  if(!s){
    return false;
  }

  const t=now();
  const maxExpire=s.created_at+MAX_SESSION_MS;

  s.last_activity=t;
  s.actividad=new Date(t).toISOString();
  s.expires_at=Math.min(maxExpire,t+MAX_SESSION_MS);

  return saveSession(s);
}

function createSession(usuario){
  if(!usuario || !usuario.id || !usuario.usuario){
    return false;
  }

  const t=now();

  const s={
    id:usuario.id,
    usuario:usuario.usuario,
    nombre:usuario.nombre || usuario.usuario,
    rol:usuario.rol || "Usuario",
    empresa_id:usuario.empresa_id || "demo",
    created_at:t,
    last_activity:t,
    expires_at:t+MAX_SESSION_MS,
    inicio:new Date(t).toISOString(),
    actividad:new Date(t).toISOString(),
    session_id:"zx_"+t+"_"+Math.random().toString(16).slice(2),
    dispositivo_id:getDeviceId()
  };

  save(SESSION_KEY,s);
  save(USER_KEY,usuario);

  return true;
}

function logout(){
  clearSession();
  location.replace(LOGIN_URL);
}

function protectApp(){
  if(isAppPage() && !sessionValid()){
    clearSession();
    location.replace(LOGIN_URL);
    return false;
  }

  return true;
}

function protectLogin(){
  if(isLoginPage() && sessionValid()){
    updateActivity();
    location.replace(APP_URL);
    return true;
  }

  return false;
}

function startActivityControl(){
  ["click","touchstart","keydown","scroll"].forEach(function(ev){
    document.addEventListener(ev,function(){
      if(sessionValid()){
        updateActivity();
      }
    },{passive:true});
  });

  document.addEventListener("visibilitychange",function(){
    if(!document.hidden && sessionValid()){
      updateActivity();
    }
  });

  window.addEventListener("pageshow",function(){
    if(sessionValid()){
      updateActivity();
    }
  });

  setInterval(function(){
    if(isAppPage() && !sessionValid()){
      logout();
    }
  },30000);
}

window.ZENTRYX_createSession=createSession;
window.ZENTRYX_logout=logout;
window.ZENTRYX_sessionValid=sessionValid;
window.ZENTRYX_readSession=readSession;
window.ZENTRYX_clearSession=clearSession;
window.ZENTRYX_updateActivity=updateActivity;
window.ZENTRYX_getDeviceId=getDeviceId;

protectApp();
protectLogin();
startActivityControl();

console.log("Zentryx session.js V"+ZX_VERSION+" cargado");

})();