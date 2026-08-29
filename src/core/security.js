// ===============================
// ZENTRYX PRO - SECURITY
// V3152 - PIN TEMPORAL LIGADO A USUARIO Y SESIÓN
// ===============================
(function(){
"use strict";

const PREFIX="zxpbkdf2";
const VERSION="v1";
const ITERATIONS=210000;
const SALT_BYTES=16;
const HASH_BITS=256;

function bytesToBase64(bytes){
  let binary="";
  const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk){
    binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value){
  const binary=atob(String(value||""));
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
  return bytes;
}

function constantTimeEqual(a,b){
  if(!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;
  if(a.length!==b.length) return false;
  let diff=0;
  for(let i=0;i<a.length;i++) diff|=a[i]^b[i];
  return diff===0;
}


const SESSION_PIN_PROOF_KEY="zentryx_session_pin_proof";
const SESSION_PIN_PROOF_TTL_MS=30*60*1000;

async function sha256Bytes(text){
  if(!window.crypto || !window.crypto.subtle) throw new Error("CRYPTO_UNAVAILABLE");
  const result=await window.crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(text)));
  return new Uint8Array(result);
}

function currentSessionIdentity(){
  try{
    const session=JSON.parse(localStorage.getItem("zentryx_session") || "null");
    if(!session || !session.id || !session.session_id) return null;
    return {userId:String(session.id),sessionId:String(session.session_id)};
  }catch(e){
    return null;
  }
}

function clearSessionPin(){
  try{sessionStorage.removeItem(SESSION_PIN_PROOF_KEY)}catch(e){}
}

async function rememberSessionPin(pin){
  const identity=currentSessionIdentity();
  if(!identity){
    clearSessionPin();
    return false;
  }

  const salt=window.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const salt64=bytesToBase64(salt);
  const proof=await sha256Bytes(salt64+":"+identity.userId+":"+identity.sessionId+":"+String(pin));
  const createdAt=Date.now();
  const data={
    salt:salt64,
    proof:bytesToBase64(proof),
    userId:identity.userId,
    sessionId:identity.sessionId,
    createdAt:createdAt,
    expiresAt:createdAt+SESSION_PIN_PROOF_TTL_MS
  };
  try{sessionStorage.setItem(SESSION_PIN_PROOF_KEY,JSON.stringify(data));return true}
  catch(e){return false}
}

async function verifySessionPin(pin){
  try{
    const raw=sessionStorage.getItem(SESSION_PIN_PROOF_KEY);
    if(!raw) return {ok:false,available:false};
    const data=JSON.parse(raw);
    const identity=currentSessionIdentity();
    const current=Date.now();

    if(
      !data || !identity || !data.salt || !data.proof ||
      String(data.userId || "")!==identity.userId ||
      String(data.sessionId || "")!==identity.sessionId ||
      !Number.isFinite(Number(data.expiresAt)) || current>=Number(data.expiresAt)
    ){
      clearSessionPin();
      return {ok:false,available:false};
    }

    const actual=await sha256Bytes(String(data.salt)+":"+identity.userId+":"+identity.sessionId+":"+String(pin));
    const expected=base64ToBytes(data.proof);
    const ok=constantTimeEqual(actual,expected);
    return {ok:ok,available:true};
  }catch(e){
    clearSessionPin();
    return {ok:false,available:false};
  }
}

function legacyHash(pin){
  try{return btoa(String(pin))}
  catch(e){return String(pin)}
}

function isStrongHash(value){
  return String(value||"").startsWith(PREFIX+"$");
}

async function derive(pin,salt,iterations){
  if(!window.crypto || !window.crypto.subtle){
    throw new Error("CRYPTO_UNAVAILABLE");
  }

  const keyMaterial=await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(pin)),
    {name:"PBKDF2"},
    false,
    ["deriveBits"]
  );

  const bits=await window.crypto.subtle.deriveBits(
    {name:"PBKDF2",salt:salt,iterations:iterations,hash:"SHA-256"},
    keyMaterial,
    HASH_BITS
  );

  return new Uint8Array(bits);
}

async function hashPin(pin){
  const salt=window.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash=await derive(pin,salt,ITERATIONS);
  return [PREFIX,VERSION,String(ITERATIONS),bytesToBase64(salt),bytesToBase64(hash)].join("$");
}

async function verifyPin(pin,stored){
  const value=String(stored||"");
  if(!value) return {ok:false,legacy:false,needsUpgrade:false};

  if(!isStrongHash(value)){
    const ok=legacyHash(pin)===value;
    return {ok:ok,legacy:true,needsUpgrade:ok};
  }

  try{
    const parts=value.split("$");
    if(parts.length!==5 || parts[0]!==PREFIX || parts[1]!==VERSION){
      return {ok:false,legacy:false,needsUpgrade:false};
    }

    const iterations=Number(parts[2]);
    if(!Number.isFinite(iterations) || iterations<100000){
      return {ok:false,legacy:false,needsUpgrade:false};
    }

    const salt=base64ToBytes(parts[3]);
    const expected=base64ToBytes(parts[4]);
    const actual=await derive(pin,salt,iterations);
    const ok=constantTimeEqual(actual,expected);
    return {ok:ok,legacy:false,needsUpgrade:ok && iterations<ITERATIONS};
  }catch(e){
    return {ok:false,legacy:false,needsUpgrade:false};
  }
}

async function upgradeHash(pin,stored){
  const result=await verifyPin(pin,stored);
  if(!result.ok) return {ok:false,hash:null,upgraded:false};
  if(!result.needsUpgrade) return {ok:true,hash:String(stored),upgraded:false};
  return {ok:true,hash:await hashPin(pin),upgraded:true};
}

window.ZENTRYX_SECURITY=Object.freeze({
  hashPin:hashPin,
  verifyPin:verifyPin,
  upgradeHash:upgradeHash,
  isStrongHash:isStrongHash,
  legacyHash:legacyHash,
  rememberSessionPin:rememberSessionPin,
  verifySessionPin:verifySessionPin,
  clearSessionPin:clearSessionPin
});

})();
