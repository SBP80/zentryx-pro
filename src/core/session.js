// ===============================
// ZENTRYX PRO - SESSION PRO
// V3014
// ===============================
(function(){
"use strict";

const SESSION_KEY="zentryx_session";
const LOGIN_URL="index.html?v=3014";
const APP_URL="app.html?v=3014";

const MAX_SESSION_MS=8*60*60*1000;
const INACTIVITY_MS=30*60*1000;

function now(){
  return Date.now();
}

function readSession(){
  try{
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
  }catch(e){
    return {};
  }
}

function saveSession(s){
  localStorage.setItem(SESSION_KEY,JSON.stringify(s));
}

function clearSession(){
  localStorage.removeItem(SESSION_KEY);
}

function isLoginPage(){
  const p=location.pathname.toLowerCase();
  return p.endsWith("/") || p.includes("index.html");
}

function isAppPage(){
  return location.pathname.toLowerCase().includes("app.html");
}

function sessionValid(){
  const s=readSession();

  if(!s || !s.id || !s.usuario){
    return false;
  }

  if(!s.created_at || !s.expires_at || !s.last_activity){
    return false;
  }

  if(now()>s.expires_at){
    return false;
  }

  if(now()-s.last_activity>INACTIVITY_MS){
    return false;
  }

  return true;
}

function updateActivity(){
  const s=readSession();

  if(!s || !s.id){
    return;
  }

  s.last_activity=now();

  const maxExpire=s.created_at+MAX_SESSION_MS;
  s.expires_at=Math.min(maxExpire,now()+MAX_SESSION_MS);

  saveSession(s);
}

function createSession(usuario){
  const t=now();

  const s={
    id:usuario.id,
    usuario:usuario.usuario,
    nombre:usuario.nombre,
    rol:usuario.rol,
    created_at:t,
    last_activity:t,
    expires_at:t+MAX_SESSION_MS
  };

  saveSession(s);
}

function logout(){
  clearSession();
  location.replace(LOGIN_URL);
}

function protectApp(){
  if(isAppPage() && !sessionValid()){
    clearSession();
    location.replace(LOGIN_URL);
  }
}

function protectLogin(){
  if(isLoginPage() && sessionValid()){
    location.replace(APP_URL);
  }
}

function startActivityControl(){
  ["click","touchstart","keydown","scroll"].forEach(function(ev){
    document.addEventListener(ev,function(){
      if(sessionValid()){
        updateActivity();
      }
    },{passive:true});
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

protectApp();
protectLogin();
startActivityControl();

})();