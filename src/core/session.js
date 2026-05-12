// ===============================
// ZENTRYX PRO - SESSION CORE
// V2646
// ===============================

const SESSION_KEY="zentryx_session";

export function getSession(){
  const raw=localStorage.getItem(SESSION_KEY);

  if(!raw){
    return null;
  }

  try{
    return JSON.parse(raw);
  }catch(e){

    return {
      usuario:raw,
      login_at:null
    };
  }
}

export function setSession(usuario,datos={}){

  if(!usuario){
    console.warn("Intento de sesión sin usuario.");
    return false;
  }

  const sessionData={
    usuario:usuario,
    login_at:new Date().toISOString(),
    ...datos
  };

  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify(sessionData)
  );

  return true;
}

export function clearSession(){
  localStorage.removeItem(SESSION_KEY);
}

export function isLogged(){

  const session=getSession();

  if(!session){
    return false;
  }

  return !!session.usuario;
}

export function getUsuarioActual(){

  const session=getSession();

  if(!session){
    return null;
  }

  return session.usuario || null;
}