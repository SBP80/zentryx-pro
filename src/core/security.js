// ===============================
// ZENTRYX PRO - SECURITY
// V3150
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
  legacyHash:legacyHash
});

})();
