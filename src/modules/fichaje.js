// ===============================
// ZENTRYX PRO - FICHAJE PRO
// V3021
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
}

function estadoDesdeUltimo(tipo){
  if(!tipo) return "fuera";
  if(tipo==="entrada") return "dentro";
  if(tipo==="salida") return "fuera";
  if(tipo==="inicio_descanso") return "descanso";
  if(tipo==="fin_descanso") return "dentro";
  if(tipo==="inicio_comida") return "comida";
  if(tipo==="fin_comida") return "dentro";
  return "fuera";
}

function textoTipo(t){
  const m={
    entrada:"Entrada",
    salida:"Salida",
    inicio_descanso:"Inicio descanso",
    fin_descanso:"Fin descanso",
    inicio_comida:"Inicio comida",
    fin_comida:"Fin comida"
  };
  return m[t] || t;
}

function textoEstado(e){
  if(e==="dentro") return "Trabajando";
  if(e==="descanso") return "Descanso";
  if(e==="comida") return "Comida";
  return "Fuera";
}

function colorEstado(e){
  if(e==="dentro") return "#16a34a";
  if(e==="descanso") return "#f59e0b";
  if(e==="comida") return "#ea580c";
  return "#64748b";
}

async function pedirUbicacion(){
  return new Promise(resolve=>{
    if(!navigator.geolocation){
      resolve({lat:null,lng:null});
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos=>resolve({
        lat:pos.coords.latitude,
        lng:pos.coords.longitude
      }),
      ()=>resolve({lat:null,lng:null}),
      {enableHighAccuracy:true,timeout:8000,maximumAge:0}
    );
  });
}

async function ultimoFichaje(){
  const s=sesion();

  const res=await sb()
    .from("fichajes")
    .select("*")
    .eq("usuario_id",s.id)
    .order("created_at",{ascending:false})
    .limit(1);

  if(res.error || !res.data || !res.data.length) return null;
  return res.data[0];
}

async function historial(){
  const s=sesion();

  const res=await sb()
    .from("fichajes")
    .select("*")
    .eq("usuario_id",s.id)
    .order("created_at",{ascending:false})
    .limit(20);

  if(res.error) return [];
  return res.data || [];
}

function validarMovimiento(tipo,estado){
  if(tipo==="entrada" && estado!=="fuera") return "Ya tienes una entrada abierta.";
  if(tipo==="salida" && estado==="fuera") return "No puedes salir sin haber entrado.";
  if(tipo==="inicio_descanso" && estado!=="dentro") return "Solo puedes iniciar descanso estando trabajando.";
  if(tipo==="fin_descanso" && estado!=="descanso") return "No estás en descanso.";
  if(tipo==="inicio_comida" && estado!=="dentro") return "Solo puedes iniciar comida estando trabajando.";
  if(tipo==="fin_comida" && estado!=="comida") return "No estás en comida.";
  return "";
}

function opcionesPermitidas(estado){
  if(estado==="fuera"){
    return [{tipo:"entrada",texto:"Entrada",clase:"zx_verde"}];
  }

  if(estado==="dentro"){
    return [
      {tipo:"salida",texto:"Salida",clase:"zx_rojo"},
      {tipo:"inicio_descanso",texto:"Inicio descanso",clase:"zx_naranja"},
      {tipo:"inicio_comida",texto:"Inicio comida",clase:"zx_morado"}
    ];
  }

  if(estado==="descanso"){
    return [{tipo:"fin_descanso",texto:"Fin descanso",clase:"zx_azul"}];
  }

  if(estado==="comida"){
    return [{tipo:"fin_comida",texto:"Fin comida",clase:"zx_azul"}];
  }

  return [];
}

function cerrarModal(){
  const m=document.getElementById("zx_modal_fichaje");
  if(m) m.remove();
}

function abrirMenuFichaje(estado){
  cerrarModal();

  const opciones=opcionesPermitidas(estado);

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_fichaje" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Fichar</h2>
        <div class="zx_text">Estado actual: <b>${textoEstado(estado)}</b></div>

        ${opciones.map(o=>`
          <button class="zx_btn_big ${o.clase}" data-fichaje="${o.tipo}">
            ${o.texto}
          </button>
        `).join("")}

        <button class="zx_btn_big zx_gris" id="zx_cancelar_fichaje">
          Cancelar
        </button>
      </div>
    </div>
  `);

  document.querySelectorAll("[data-fichaje]").forEach(btn=>{
    btn.onclick=function(){
      const tipo=this.dataset.fichaje;
      cerrarModal();
      registrar(tipo);
    };
  });

  document.getElementById("zx_cancelar_fichaje").onclick=cerrarModal;
}

async function registrar(tipo){
  const s=sesion();

  if(!s.id){
    alert("Sesión no válida.");
    return;
  }

  const ultimo=await ultimoFichaje();
  const estado=estadoDesdeUltimo(ultimo ? ultimo.tipo : null);

  const fallo=validarMovimiento(tipo,estado);
  if(fallo){
    alert(fallo);
    return;
  }

  const geo=await pedirUbicacion();

  const res=await sb()
    .from("fichajes")
    .insert([{
      usuario_id:s.id,
      usuario:s.usuario || "",
      nombre:s.nombre || "",
      tipo:tipo,
      lat:geo.lat,
      lng:geo.lng,
      dispositivo:navigator.userAgent
    }]);

  if(res.error){
    alert("Error al guardar fichaje: " + res.error.message);
    return;
  }

  ZX_fichaje();
}

window.ZX_fichaje=async function(){
  const ultimo=await ultimoFichaje();
  const estado=estadoDesdeUltimo(ultimo ? ultimo.tipo : null);
  const hist=await historial();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Fichaje</h2>

      <div class="zx_text">Estado actual:</div>
      <div style="font-size:34px;font-weight:900;color:${colorEstado(estado)};margin-top:8px">
        ${textoEstado(estado)}
      </div>

      <button class="zx_btn_big zx_azul" id="zx_btn_fichar">
        FICHAR
      </button>
    </div>

    <div class="zx_card">
      <h2>Últimos fichajes</h2>

      ${
        hist.length
        ? hist.map(h=>`
          <div class="zx_item">
            <div class="zx_item_titulo">${textoTipo(h.tipo)}</div>
            <div class="zx_item_texto">
              ${new Date(h.created_at).toLocaleString()}
              ${h.lat && h.lng ? `<br>GPS: ${h.lat}, ${h.lng}` : ""}
            </div>
          </div>
        `).join("")
        : `<div class="zx_text">Sin registros.</div>`
      }
    </div>
  `;

  document.getElementById("zx_btn_fichar").onclick=function(){
    abrirMenuFichaje(estado);
  };
};

})();