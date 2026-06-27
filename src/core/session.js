// ===============================
// ZENTRYX PRO - SESSION PRO
// V3096 DEV1
// ===============================
(function(){
"use strict";

const SESSION_KEY="zentryx_session";
const USER_KEY="usuario";
const LOGIN_URL="index.html?v=3096dev1";
const APP_URL="app.html?v=3096dev1";

const MAX_SESSION_MS=8*60*60*1000;
const INACTIVITY_MS=30*60*1000;

function now(){
  return Date.now();
}

function parseDateValue(v){
  if(!v) return null;
  if(typeof v==="number" && isFinite(v)) return v;
  if(typeof v==="string"){
    const t=Date.parse(v);
    return isNaN(t) ? null : t;
  }
  return null;
}

function readSession(){
  try{
    const raw=localStorage.getItem(SESSION_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){
    return null;
  }
}

function saveSession(s){
  try{
    localStorage.setItem(SESSION_KEY,JSON.stringify(s));
  }catch(e){}
}

function clearSession(){
  try{localStorage.removeItem(SESSION_KEY)}catch(e){}
  try{localStorage.removeItem(USER_KEY)}catch(e){}
}

function isLoginPage(){
  const p=location.pathname.toLowerCase();
  return p.endsWith("/") || p.endsWith("index.html") || p.includes("/index.html");
}

function isAppPage(){
  return location.pathname.toLowerCase().includes("app.html");
}

function normalizeSession(s){
  if(!s || typeof s!=="object") return null;
  if(!s.id || !s.usuario) return null;

  const t=now();
  const created=parseDateValue(s.created_at) || parseDateValue(s.inicio) || t;
  const last=parseDateValue(s.last_activity) || parseDateValue(s.actividad) || created;
  const expires=parseDateValue(s.expires_at) || (created+MAX_SESSION_MS);

  const normalized={
    id:s.id,
    usuario:s.usuario,
    nombre:s.nombre || s.usuario,
    rol:s.rol || "Usuario",
    created_at:created,
    last_activity:last,
    expires_at:expires,
    inicio:s.inicio || new Date(created).toISOString(),
    actividad:new Date(last).toISOString()
  };

  if(s.dispositivo_id) normalized.dispositivo_id=s.dispositivo_id;
  if(s.session_id) normalized.session_id=s.session_id;

  return normalized;
}

function sessionValid(){
  const s=normalizeSession(readSession());
  if(!s) return false;

  const t=now();

  if(t>s.expires_at) return false;
  if(t-s.last_activity>INACTIVITY_MS) return false;

  saveSession(s);
  return true;
}

function updateActivity(){
  const s=normalizeSession(readSession());
  if(!s) return false;

  const t=now();
  const maxExpire=s.created_at+MAX_SESSION_MS;

  s.last_activity=t;
  s.actividad=new Date(t).toISOString();
  s.expires_at=Math.min(maxExpire,t+MAX_SESSION_MS);

  saveSession(s);
  return true;
}

function createSession(usuario){
  if(!usuario || !usuario.id || !usuario.usuario) return false;

  const t=now();
  const s={
    id:usuario.id,
    usuario:usuario.usuario,
    nombre:usuario.nombre || usuario.usuario,
    rol:usuario.rol || "Usuario",
    created_at:t,
    last_activity:t,
    expires_at:t+MAX_SESSION_MS,
    inicio:new Date(t).toISOString(),
    actividad:new Date(t).toISOString()
  };

  saveSession(s);

  try{
    localStorage.setItem(USER_KEY,JSON.stringify(usuario));
  }catch(e){}

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
      if(sessionValid()) updateActivity();
    },{passive:true});
  });

  document.addEventListener("visibilitychange",function(){
    if(!document.hidden && sessionValid()) updateActivity();
  });

  window.addEventListener("pageshow",function(){
    if(sessionValid()) updateActivity();
  });

  setInterval(function(){
    if(isAppPage() && !sessionValid()) logout();
  },30000);
}

window.ZENTRYX_createSession=createSession;
window.ZENTRYX_logout=logout;
window.ZENTRYX_sessionValid=sessionValid;
window.ZENTRYX_readSession=function(){return normalizeSession(readSession())};
window.ZENTRYX_clearSession=clearSession;
window.ZENTRYX_updateActivity=updateActivity;

protectApp();
protectLogin();
startActivityControl();

})();
