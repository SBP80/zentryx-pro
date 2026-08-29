// ===============================
// ZENTRYX PRO - BACKEND CONFIG
// V1001 - CONFIGURACIÓN CENTRALIZADA DEL BACKEND
// ===============================
(function(){
"use strict";

const VERSION="1001";
const CONFIG=Object.freeze({
  provider:"supabase",
  url:"https://idtaamivqbiuxtjywuux.supabase.co",
  publishableKey:"sb_publishable_ToDLKonbF2QnTXi56o1nfQ_10IdaPJx"
});

function existingClient(){
  return window.sb || window.supabaseClient || null;
}

function createClient(){
  const existing=existingClient();
  if(existing){
    window.sb=existing;
    window.supabaseClient=existing;
    return existing;
  }

  if(!window.supabase || typeof window.supabase.createClient!=="function"){
    return null;
  }

  const client=window.supabase.createClient(CONFIG.url,CONFIG.publishableKey);
  window.sb=client;
  window.supabaseClient=client;
  return client;
}

window.ZENTRYX_BACKEND_CONFIG=Object.freeze({
  version:VERSION,
  provider:CONFIG.provider,
  url:CONFIG.url,
  publishableKey:CONFIG.publishableKey,
  createClient:createClient
});

createClient();

console.log("Zentryx backend_config.js V"+VERSION+" cargado");
})();
