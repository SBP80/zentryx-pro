// ===============================
// ZENTRYX PRO - STORE CORE
// V2646
// ===============================

const STORAGE_KEY="zentryx_state";

// Estado base limpio (preparado para producto comercial)
const defaultState={
  empresa:{
    id:"demo",
    nombre:"Zentryx"
  },

  usuarios:[
    {
      id:1,
      usuario:"admin",
      password:"1234",
      nombre:"Administrador",
      rol:"Administrador",
      activo:true,
      created_at:new Date().toISOString()
    }
  ],

  configuracion:{
    idioma:"es",
    moneda:"EUR",
    modo:"desarrollo"
  }
};

// ===============================
// UTILIDADES INTERNAS
// ===============================

function clonar(obj){
  return JSON.parse(JSON.stringify(obj));
}

function validarState(state){

  if(!state || typeof state!=="object"){
    return clonar(defaultState);
  }

  if(!state.empresa){
    state.empresa=clonar(defaultState.empresa);
  }

  if(!Array.isArray(state.usuarios)){
    state.usuarios=[];
  }

  if(!state.configuracion){
    state.configuracion=clonar(defaultState.configuracion);
  }

  return state;
}

// ===============================
// API STORE
// ===============================

export function loadState(){

  try{
    const raw=localStorage.getItem(STORAGE_KEY);

    if(!raw){
      return clonar(defaultState);
    }

    const parsed=JSON.parse(raw);

    return validarState(parsed);

  }catch(e){
    console.warn("Error cargando store, se usa default.");
    return clonar(defaultState);
  }
}

export function saveState(state){

  try{
    const limpio=validarState(state);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(limpio)
    );

    return true;

  }catch(e){
    console.error("Error guardando store:",e);
    return false;
  }
}

// ===============================
// HELPERS (clave para modularidad)
// ===============================

export function getUsuarios(){
  return loadState().usuarios;
}

export function getUsuarioByUsername(usuario){
  return getUsuarios().find(u=>u.usuario===usuario) || null;
}

export function addUsuario(nuevo){

  const state=loadState();

  const existe=state.usuarios.some(u=>u.usuario===nuevo.usuario);

  if(existe){
    return {ok:false,error:"Usuario ya existe"};
  }

  nuevo.id=Date.now();
  nuevo.created_at=new Date().toISOString();
  nuevo.activo=true;

  state.usuarios.push(nuevo);

  saveState(state);

  return {ok:true};
}

export function updateUsuario(usuario,datos){

  const state=loadState();

  const index=state.usuarios.findIndex(u=>u.usuario===usuario);

  if(index===-1){
    return {ok:false,error:"Usuario no encontrado"};
  }

  state.usuarios[index]={
    ...state.usuarios[index],
    ...datos
  };

  saveState(state);

  return {ok:true};
}

export function deleteUsuario(usuario){

  const state=loadState();

  state.usuarios=state.usuarios.filter(u=>u.usuario!==usuario);

  saveState(state);

  return {ok:true};
}