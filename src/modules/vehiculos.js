(function(){
"use strict";

function app(){
  return document.getElementById("app");
}

function sb(){
  return window.sb || window.supabaseClient || null;
}

function usuarioActual(){
  try{
    const u = JSON.parse(localStorage.getItem("usuario") || "{}");
    return u.usuario || u.nombre || "admin";
  }catch(e){
    return "admin";
  }
}
