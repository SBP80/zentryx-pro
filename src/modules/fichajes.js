// ===============================
// ZENTRYX PRO - FICHAJE PRO
// V3010
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient || null}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
}

function ahora(){
  return new Date();
}

function formatearHora(d){
  return d.toLocaleTimeString();
}

function pedirUbicacion(){
  return new Promise((resolve)=>{
    if(!navigator.geolocation){
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos=>{
        resolve({
          lat:pos.coords.latitude,
          lng:pos.coords.longitude
        });
      },
      ()=>resolve(null),
      {enableHighAccuracy:true,timeout:5000}
    );
  });
}

async function guardar(tipo){

  const s=sesion();
  const cliente=sb();

  if(!cliente){
    alert("Sin conexión");
    return;
  }

  const geo=await pedirUbicacion();

  const data={
    usuario_id:s.id,
    usuario:s.usuario,
    nombre:s.nombre,
    tipo:tipo,
    lat:geo?.lat || null,
    lng:geo?.lng || null,
    direccion:null,
    dispositivo:navigator.userAgent
  };

  const res=await cliente
    .from("fichajes")
    .insert([data]);

  if(res.error){
    alert("Error: "+res.error.message);
    return;
  }

  alert(tipo+" registrado");
  ZX_fichaje();
}

function menu(){

  const m=document.createElement("div");
  m.className="zx_modal_fondo";

  m.innerHTML=`
    <div class="zx_modal_caja">
      <h2>Fichar</h2>

      <button class="zx_btn_big zx_verde" data-t="entrada">Entrada</button>
      <button class="zx_btn_big zx_rojo" data-t="salida">Salida</button>
      <button class="zx_btn_big zx_azul" data-t="inicio_descanso">Inicio descanso</button>
      <button class="zx_btn_big zx_gris" data-t="fin_descanso">Fin descanso</button>
      <button class="zx_btn_big zx_naranja" data-t="inicio_comida">Inicio comida</button>
      <button class="zx_btn_big zx_morado" data-t="fin_comida">Fin comida</button>

      <button class="zx_btn_big zx_gris" id="cerrar">Cancelar</button>
    </div>
  `;

  document.body.appendChild(m);

  m.querySelectorAll("[data-t]").forEach(btn=>{
    btn.onclick=function(){
      const tipo=this.dataset.t;
      m.remove();
      guardar(tipo);
    };
  });

  m.querySelector("#cerrar").onclick=function(){
    m.remove();
  };
}

async function historial(){

  const cliente=sb();
  const s=sesion();

  const res=await cliente
    .from("fichajes")
    .select("*")
    .eq("usuario_id",s.id)
    .order("hora",{ascending:false})
    .limit(10);

  if(res.error){
    return "<div>Error cargando historial</div>";
  }

  return res.data.map(f=>{
    return `
      <div class="zx_item">
        <div class="zx_item_titulo">${f.tipo}</div>
        <div class="zx_item_texto">
          ${new Date(f.hora).toLocaleString()}
        </div>
      </div>
    `;
  }).join("");
}

window.ZX_fichaje=async function(){

  const hist=await historial();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Fichaje</h2>

      <button class="zx_btn_big zx_azul" id="btn_fichar">
        FICHAR
      </button>
    </div>

    <div class="zx_card">
      <h2>Últimos movimientos</h2>
      ${hist || "<div class='zx_text'>Sin registros</div>"}
    </div>
  `;

  document.getElementById("btn_fichar").onclick=menu;
};

})();