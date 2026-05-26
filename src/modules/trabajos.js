// ===============================
// ZENTRYX PRO - TRABAJOS
// V3097 - OBRA + VARIOS DÍAS + VARIOS OPERARIOS
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}
  catch(e){return {}}
}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function hoy(){
  return new Date().toISOString().slice(0,10);
}

function cerrarModalTrabajo(){
  const m=document.getElementById("zx_modal_trabajo");
  if(m) m.remove();
}

function telefonoLimpio(tel){
  let n=String(tel||"").replace(/[^\d+]/g,"");
  if(n.startsWith("+")) return n;
  if(n.length===9) return "+34"+n;
  return n;
}

function direccionCliente(c){
  return [
    c.via_tipo,
    c.direccion,
    c.numero ? "Nº "+c.numero : "",
    c.portal ? "Portal "+c.portal : "",
    c.escalera ? "Esc. "+c.escalera : "",
    c.piso ? "Piso "+c.piso : "",
    c.puerta ? "Puerta "+c.puerta : "",
    c.poblacion,
    c.provincia,
    c.codigo_postal,
    c.pais
  ].filter(Boolean).join(", ");
}

function direccionTrabajo(t){
  return [
    t.direccion_obra || t.direccion,
    t.poblacion,
    t.provincia,
    t.codigo_postal,
    t.pais
  ].filter(Boolean).join(", ");
}

async function cargarClientes(){
  const r=await sb()
    .from("clientes")
    .select("*")
    .order("nombre",{ascending:true});

  if(r.error) return [];
  return r.data || [];
}

async function cargarUsuarios(){
  const r=await sb()
    .from("usuarios")
    .select("*")
    .order("nombre",{ascending:true});

  if(r.error) return [];
  return r.data || [];
}

async function cargarTrabajos(){
  const r=await sb()
    .from("trabajos")
    .select("*")
    .order("fecha",{ascending:true})
    .order("hora_inicio",{ascending:true});

  if(r.error){
    alert("Error cargando trabajos: "+r.error.message);
    return [];
  }

  return r.data || [];
}

async function cargarPlanificacion(trabajoId){
  if(!trabajoId) return [];

  const r=await sb()
    .from("trabajos_planificacion")
    .select("*")
    .eq("trabajo_id",String(trabajoId))
    .order("fecha",{ascending:true})
    .order("hora_inicio",{ascending:true});

  if(r.error) return [];
  return r.data || [];
}

function textoEstado(e){
  if(e==="pendiente") return "Pendiente";
  if(e==="en_curso") return "En curso";
  if(e==="terminado") return "Terminado";
  return e || "-";
}

function claseEstado(e){
  if(e==="pendiente") return "zx_naranja";
  if(e==="en_curso") return "zx_azul";
  if(e==="terminado") return "zx_verde";
  return "zx_gris";
}

function menuTelefono(tel){
  const n=telefonoLimpio(tel);

  if(!n){
    alert("Sin teléfono.");
    return;
  }

  cerrarModalTrabajo();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Teléfono</h2>

        <button class="zx_btn_big zx_azul" id="tr_tel_llamar">Llamar</button>
        <button class="zx_btn_big zx_verde" id="tr_tel_sms">SMS</button>
        <button class="zx_btn_big zx_verde" id="tr_tel_was">WhatsApp</button>
        <button class="zx_btn_big zx_gris" id="tr_tel_cerrar">Cerrar</button>
      </div>
    </div>
  `);

  document.getElementById("tr_tel_llamar").onclick=function(){
    location.href="tel:"+n;
  };

  document.getElementById("tr_tel_sms").onclick=function(){
    location.href="sms:"+n;
  };

  document.getElementById("tr_tel_was").onclick=function(){
    location.href="https://wa.me/"+n.replace("+","");
  };

  document.getElementById("tr_tel_cerrar").onclick=cerrarModalTrabajo;
}

function menuMapa(dir){
  if(!dir){
    alert("Sin dirección.");
    return;
  }

  const q=encodeURIComponent(dir);

  cerrarModalTrabajo();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Mapa</h2>

        <button class="zx_btn_big zx_azul" id="tr_map_apple">Apple Maps</button>
        <button class="zx_btn_big zx_verde" id="tr_map_google">Google Maps</button>
        <button class="zx_btn_big zx_naranja" id="tr_map_waze">Waze</button>
        <button class="zx_btn_big zx_gris" id="tr_map_cerrar">Cerrar</button>
      </div>
    </div>
  `);

  document.getElementById("tr_map_apple").onclick=function(){
    location.href="https://maps.apple.com/?q="+q;
  };

  document.getElementById("tr_map_google").onclick=function(){
    location.href="https://www.google.com/maps/search/?api=1&query="+q;
  };

  document.getElementById("tr_map_waze").onclick=function(){
    location.href="https://waze.com/ul?q="+q;
  };

  document.getElementById("tr_map_cerrar").onclick=cerrarModalTrabajo;
}

function input(id,label,value,type){
  return `
    <label class="zx_label" for="${id}">${label}</label>
    <input id="${id}" type="${type || "text"}" value="${limpiar(value || "")}" placeholder="${label}">
  `;
}
function renderPlanificacion(lista){
  if(!lista || !lista.length){
    return `<div class="zx_text">Sin planificación asignada.</div>`;
  }

  return lista.map(p=>`
    <div class="zx_tr_plan_item">
      <div class="zx_tr_plan_top">
        <b>${limpiar(p.nombre || p.usuario || "Operario")}</b>
        <span>${limpiar(p.fecha || "")}</span>
      </div>

      <div class="zx_tr_plan_txt">
        ${limpiar(p.hora_inicio ? String(p.hora_inicio).slice(0,5) : "--:--")}
        -
        ${limpiar(p.hora_fin ? String(p.hora_fin).slice(0,5) : "--:--")}
        ${p.notas ? "<br>"+limpiar(p.notas) : ""}
      </div>
    </div>
  `).join("");
}

async function renderTrabajo(t){
  const dir=direccionTrabajo(t);
  const plan=await cargarPlanificacion(t.id);

  return `
    <div class="zx_user_card">
      <div class="zx_user_name">${limpiar(t.titulo || "Trabajo")}</div>

      <div class="zx_user_data">
        <b>Estado:</b> ${limpiar(textoEstado(t.estado))}<br>
        <b>Cliente:</b> ${limpiar(t.cliente || "-")}<br>
        <b>Contacto obra:</b> ${limpiar(t.persona_contacto || "-")}<br>
        <b>Teléfono contacto:</b> ${limpiar(t.telefono_contacto || "-")}<br>
        <b>Dirección obra:</b> ${limpiar(dir || "-")}<br>
        <b>Descripción:</b> ${limpiar(t.descripcion || "-")}<br>
        <b>Notas:</b> ${limpiar(t.notas || "-")}
      </div>

      <div class="zx_tr_plan_box">
        <h3>Planificación</h3>
        ${renderPlanificacion(plan)}
      </div>

      <div class="zx_user_actions">
        <button class="zx_action_btn ${claseEstado(t.estado)}" data-tr-estado="${limpiar(t.id)}">
          Cambiar estado
        </button>

        ${t.telefono_contacto ? `<button class="zx_action_btn zx_blue" data-tr-tel="${limpiar(t.telefono_contacto)}">Teléfono</button>` : ""}
        ${dir ? `<button class="zx_action_btn zx_blue" data-tr-map="${limpiar(dir)}">Mapa</button>` : ""}
        <button class="zx_action_btn zx_blue" data-tr-edit="${limpiar(t.id)}">Editar</button>
        <button class="zx_action_btn zx_red" data-tr-del="${limpiar(t.id)}">Borrar</button>
      </div>
    </div>
  `;
}

function filaPlanificacionHTML(i,usuarios,p={}){
  return `
    <div class="zx_tr_plan_form" data-plan-row="${i}">
      <label class="zx_label">Fecha</label>
      <input type="date" class="tr_plan_fecha" value="${limpiar(p.fecha || hoy())}">

      <div class="zx_tr_grid2">
        <div>
          <label class="zx_label">Hora inicio</label>
          <input type="time" class="tr_plan_inicio" value="${limpiar(p.hora_inicio ? String(p.hora_inicio).slice(0,5) : "")}">
        </div>

        <div>
          <label class="zx_label">Hora fin</label>
          <input type="time" class="tr_plan_fin" value="${limpiar(p.hora_fin ? String(p.hora_fin).slice(0,5) : "")}">
        </div>
      </div>

      <label class="zx_label">Operario</label>
      <select class="tr_plan_usuario">
        <option value="">Seleccionar operario</option>
        ${usuarios.map(u=>`
          <option value="${limpiar(u.id)}"
            data-usuario="${limpiar(u.usuario || "")}"
            data-nombre="${limpiar(u.nombre || u.usuario || "")}"
            ${String(p.usuario_id||"")===String(u.id) ? "selected" : ""}>
            ${limpiar(u.nombre || u.usuario || "")}
          </option>
        `).join("")}
      </select>

      <label class="zx_label">Notas planificación</label>
      <textarea class="tr_plan_notas" rows="2" placeholder="Notas para este día/operario">${limpiar(p.notas || "")}</textarea>

      <button class="zx_btn_big zx_rojo tr_plan_borrar" type="button">
        Quitar esta línea
      </button>
    </div>
  `;
}

function leerPlanificacionFormulario(){
  const filas=[...document.querySelectorAll("[data-plan-row]")];

  return filas.map(row=>{
    const sel=row.querySelector(".tr_plan_usuario");
    const opt=sel.options[sel.selectedIndex];

    return {
      fecha:row.querySelector(".tr_plan_fecha").value,
      hora_inicio:row.querySelector(".tr_plan_inicio").value || null,
      hora_fin:row.querySelector(".tr_plan_fin").value || null,
      usuario_id:sel.value || null,
      usuario:opt ? opt.dataset.usuario || "" : "",
      nombre:opt ? opt.dataset.nombre || "" : "",
      notas:row.querySelector(".tr_plan_notas").value.trim()
    };
  }).filter(p=>p.fecha && p.usuario_id);
}

async function formulario(t={}){
  const clientes=await cargarClientes();
  const usuarios=await cargarUsuarios();
  const planExistente=await cargarPlanificacion(t.id);

  cerrarModalTrabajo();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>${t.id ? "Editar trabajo" : "Nuevo trabajo"}</h2>

        ${input("tr_titulo","Título",t.titulo)}

        <label class="zx_label" for="tr_cliente">Cliente</label>
        <select id="tr_cliente">
          <option value="">Sin cliente</option>
          ${clientes.map(c=>`
            <option value="${limpiar(c.id)}" ${String(t.cliente_id||"")===String(c.id) ? "selected" : ""}>
              ${limpiar(c.nombre || "")}
            </option>
          `).join("")}
        </select>

        ${input("tr_persona_contacto","Persona contacto obra",t.persona_contacto)}
        ${input("tr_telefono_contacto","Teléfono contacto obra",t.telefono_contacto,"tel")}

        <h3 class="zx_form_subtitle">Dirección cliente</h3>
        <textarea id="tr_direccion_cliente" rows="3" readonly>${limpiar(t.direccion_cliente || "")}</textarea>

        <h3 class="zx_form_subtitle">Dirección de obra</h3>
        <div class="zx_text">Puede ser distinta a la dirección del cliente.</div>

        ${input("tr_direccion_obra","Dirección obra",t.direccion_obra || t.direccion)}
        ${input("tr_poblacion","Población",t.poblacion)}
        ${input("tr_provincia","Provincia",t.provincia)}
        ${input("tr_codigo_postal","Código postal",t.codigo_postal)}
        ${input("tr_pais","País",t.pais || "España")}

        <button class="zx_btn_big zx_azul" id="tr_copiar_direccion" type="button">
          Usar dirección del cliente como obra
        </button>

        <h3 class="zx_form_subtitle">Planificación</h3>
        <div class="zx_text">
          Añade tantos días, horarios y operarios como necesites para esta obra.
        </div>

        <div id="tr_plan_lista">
          ${
            planExistente.length
            ? planExistente.map((p,i)=>filaPlanificacionHTML(i,usuarios,p)).join("")
            : filaPlanificacionHTML(0,usuarios,{})
          }
        </div>

        <button class="zx_btn_big zx_azul" id="tr_add_plan" type="button">
          Añadir día / operario
        </button>

        <label class="zx_label" for="tr_descripcion">Descripción</label>
        <textarea id="tr_descripcion" rows="4" placeholder="Descripción">${limpiar(t.descripcion || "")}</textarea>

        <label class="zx_label" for="tr_notas">Notas internas</label>
        <textarea id="tr_notas" rows="4" placeholder="Notas">${limpiar(t.notas || "")}</textarea>

        <button class="zx_btn_big zx_verde" id="tr_guardar">
          Guardar trabajo
        </button>

        <button class="zx_btn_big zx_gris" id="tr_cancelar">
          Cancelar
        </button>
      </div>
    </div>
  `);

  const sel=document.getElementById("tr_cliente");

  function cargarDatosCliente(){
    const c=clientes.find(x=>String(x.id)===String(sel.value));

    if(!c){
      document.getElementById("tr_direccion_cliente").value="";
      return;
    }

    const dirCliente=direccionCliente(c);

    document.getElementById("tr_direccion_cliente").value=dirCliente;
    document.getElementById("tr_persona_contacto").value=c.persona_contacto || "";
    document.getElementById("tr_telefono_contacto").value=c.telefono || "";

    if(!document.getElementById("tr_direccion_obra").value){
      document.getElementById("tr_direccion_obra").value=c.direccion || "";
      document.getElementById("tr_poblacion").value=c.poblacion || "";
      document.getElementById("tr_provincia").value=c.provincia || "";
      document.getElementById("tr_codigo_postal").value=c.codigo_postal || "";
      document.getElementById("tr_pais").value=c.pais || "España";
    }
  }

  sel.onchange=cargarDatosCliente;

  document.getElementById("tr_copiar_direccion").onclick=function(){
    const c=clientes.find(x=>String(x.id)===String(sel.value));

    if(!c){
      alert("Selecciona un cliente.");
      return;
    }

    document.getElementById("tr_direccion_obra").value=c.direccion || "";
    document.getElementById("tr_poblacion").value=c.poblacion || "";
    document.getElementById("tr_provincia").value=c.provincia || "";
    document.getElementById("tr_codigo_postal").value=c.codigo_postal || "";
    document.getElementById("tr_pais").value=c.pais || "España";
  };

  if(t.cliente_id){
    const c=clientes.find(x=>String(x.id)===String(t.cliente_id));
    if(c && !t.direccion_cliente){
      document.getElementById("tr_direccion_cliente").value=direccionCliente(c);
    }
  }

  document.getElementById("tr_add_plan").onclick=function(){
    const cont=document.getElementById("tr_plan_lista");
    const i=document.querySelectorAll("[data-plan-row]").length;
    cont.insertAdjacentHTML("beforeend",filaPlanificacionHTML(i,usuarios,{}));
    activarBotonesPlan();
  };

  function activarBotonesPlan(){
    document.querySelectorAll(".tr_plan_borrar").forEach(btn=>{
      btn.onclick=function(){
        const rows=document.querySelectorAll("[data-plan-row]");
        if(rows.length<=1){
          alert("Debe quedar al menos una línea de planificación.");
          return;
        }
        btn.closest("[data-plan-row]").remove();
      };
    });
  }

  activarBotonesPlan();

  document.getElementById("tr_cancelar").onclick=cerrarModalTrabajo;

  document.getElementById("tr_guardar").onclick=function(){
    guardarTrabajo(t.id || null,clientes);
  };
}
async function sincronizarAgenda(trabajoId,data,planificacion){
  if(!trabajoId) return;

  await sb()
    .from("agenda_eventos")
    .delete()
    .eq("origen","trabajos")
    .eq("origen_id",String(trabajoId));

  for(const p of planificacion){
    await sb()
      .from("agenda_eventos")
      .insert([{
        tipo:"trabajo",
        titulo:"Trabajo - "+data.titulo,
        descripcion:data.descripcion || "",
        fecha_inicio:p.fecha,
        fecha_fin:p.fecha,
        hora_inicio:p.hora_inicio,
        hora_fin:p.hora_fin,
        cliente_id:String(data.cliente_id || ""),
        cliente:data.cliente || "",
        usuario_id:String(p.usuario_id || ""),
        usuario:p.nombre || p.usuario || "",
        estado:data.estado==="terminado" ? "completado" : "activo",
        prioridad:"normal",
        visible_para:"todos",
        origen:"trabajos",
        origen_id:String(trabajoId),
        creado_por:data.creado_por || ""
      }]);
  }
}

async function guardarPlanificacion(trabajoId,lista){
  await sb()
    .from("trabajos_planificacion")
    .delete()
    .eq("trabajo_id",String(trabajoId));

  if(!lista.length) return;

  const insert=lista.map(p=>({
    trabajo_id:String(trabajoId),
    fecha:p.fecha,
    hora_inicio:p.hora_inicio,
    hora_fin:p.hora_fin,
    usuario_id:String(p.usuario_id || ""),
    usuario:p.usuario || "",
    nombre:p.nombre || "",
    notas:p.notas || ""
  }));

  const r=await sb()
    .from("trabajos_planificacion")
    .insert(insert);

  if(r.error){
    alert("Error guardando planificación: "+r.error.message);
  }
}

async function guardarTrabajo(id,clientes){
  const s=sesion();

  const clienteId=document.getElementById("tr_cliente").value || null;
  const cliente=clientes.find(x=>String(x.id)===String(clienteId));
  const planificacion=leerPlanificacionFormulario();

  if(!planificacion.length){
    alert("Añade al menos un día, horario y operario.");
    return;
  }

  const primera=planificacion[0];

  const data={
    titulo:document.getElementById("tr_titulo").value.trim(),
    cliente_id:clienteId,
    cliente:cliente ? cliente.nombre || "" : "",
    usuario:planificacion.map(p=>p.nombre || p.usuario).filter(Boolean).join(", "),

    fecha:primera.fecha,
    hora_inicio:primera.hora_inicio,
    hora_fin:primera.hora_fin,

    direccion_cliente:document.getElementById("tr_direccion_cliente").value.trim(),
    direccion_obra:document.getElementById("tr_direccion_obra").value.trim(),
    direccion:document.getElementById("tr_direccion_obra").value.trim(),
    poblacion:document.getElementById("tr_poblacion").value.trim(),
    provincia:document.getElementById("tr_provincia").value.trim(),
    codigo_postal:document.getElementById("tr_codigo_postal").value.trim(),
    pais:document.getElementById("tr_pais").value.trim(),

    persona_contacto:document.getElementById("tr_persona_contacto").value.trim(),
    telefono_contacto:document.getElementById("tr_telefono_contacto").value.trim(),

    descripcion:document.getElementById("tr_descripcion").value.trim(),
    notas:document.getElementById("tr_notas").value.trim(),

    creado_por:s.usuario || "",
    estado:"pendiente"
  };

  if(!data.titulo){
    alert("Introduce título.");
    return;
  }

  let r;

  if(id){
    delete data.estado;

    r=await sb()
      .from("trabajos")
      .update(data)
      .eq("id",id)
      .select()
      .maybeSingle();
  }else{
    r=await sb()
      .from("trabajos")
      .insert([data])
      .select()
      .maybeSingle();
  }

  if(r.error){
    alert("Error guardando trabajo: "+r.error.message);
    return;
  }

  const trabajoId=id || r.data?.id;

  await guardarPlanificacion(trabajoId,planificacion);
  await sincronizarAgenda(trabajoId,{
    ...data,
    estado:id ? "pendiente" : data.estado
  },planificacion);

  cerrarModalTrabajo();
  ZX_trabajos();
}

window.ZX_nuevoTrabajo=function(){
  formulario({});
};

window.ZX_editarTrabajo=async function(id){
  const r=await sb()
    .from("trabajos")
    .select("*")
    .eq("id",id)
    .maybeSingle();

  if(r.error || !r.data){
    alert("Trabajo no encontrado.");
    return;
  }

  formulario(r.data);
};

window.ZX_borrarTrabajo=async function(id){
  if(!confirm("¿Borrar trabajo?")) return;

  await sb()
    .from("agenda_eventos")
    .delete()
    .eq("origen","trabajos")
    .eq("origen_id",String(id));

  await sb()
    .from("trabajos_planificacion")
    .delete()
    .eq("trabajo_id",String(id));

  const r=await sb()
    .from("trabajos")
    .delete()
    .eq("id",id);

  if(r.error){
    alert("Error borrando trabajo: "+r.error.message);
    return;
  }

  ZX_trabajos();
};

window.ZX_cambiarEstadoTrabajo=async function(id){
  const r0=await sb()
    .from("trabajos")
    .select("*")
    .eq("id",id)
    .maybeSingle();

  if(r0.error || !r0.data){
    alert("Trabajo no encontrado.");
    return;
  }

  const actual=r0.data.estado || "pendiente";

  let nuevo="en_curso";
  if(actual==="en_curso") nuevo="terminado";
  if(actual==="terminado") nuevo="pendiente";

  const r=await sb()
    .from("trabajos")
    .update({estado:nuevo})
    .eq("id",id);

  if(r.error){
    alert("Error cambiando estado: "+r.error.message);
    return;
  }

  await sb()
    .from("agenda_eventos")
    .update({estado:nuevo==="terminado" ? "completado" : "activo"})
    .eq("origen","trabajos")
    .eq("origen_id",String(id));

  ZX_trabajos();
};

function resumen(datos){
  const pendientes=datos.filter(t=>t.estado==="pendiente").length;
  const curso=datos.filter(t=>t.estado==="en_curso").length;
  const terminados=datos.filter(t=>t.estado==="terminado").length;

  return `
    <div class="zx_card">
      <h2>Trabajos</h2>

      <div class="zx_text">
        Pendientes: <b>${pendientes}</b><br>
        En curso: <b>${curso}</b><br>
        Terminados: <b>${terminados}</b>
      </div>

      <button class="zx_btn_big zx_verde" id="btn_nuevo_trabajo">
        Nuevo trabajo
      </button>
    </div>
  `;
}

window.ZX_trabajos=async function(){
  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="trabajos"){
      b.classList.add("zx_activo");
    }
  });

  const datos=await cargarTrabajos();
  const tarjetas=[];

  for(const t of datos){
    tarjetas.push(await renderTrabajo(t));
  }

  app().innerHTML=`
    ${resumen(datos)}

    <div class="zx_card">
      <h2>Listado</h2>
      ${
        tarjetas.length
        ? tarjetas.join("")
        : `<div class="zx_text">Sin trabajos.</div>`
      }
    </div>
  `;

  document.getElementById("btn_nuevo_trabajo").onclick=function(){
    formulario({});
  };

  document.querySelectorAll("[data-tr-estado]").forEach(btn=>{
    btn.onclick=function(){
      ZX_cambiarEstadoTrabajo(btn.dataset.trEstado);
    };
  });

  document.querySelectorAll("[data-tr-tel]").forEach(btn=>{
    btn.onclick=function(){
      menuTelefono(btn.dataset.trTel);
    };
  });

  document.querySelectorAll("[data-tr-map]").forEach(btn=>{
    btn.onclick=function(){
      menuMapa(btn.dataset.trMap);
    };
  });

  document.querySelectorAll("[data-tr-edit]").forEach(btn=>{
    btn.onclick=function(){
      ZX_editarTrabajo(btn.dataset.trEdit);
    };
  });

  document.querySelectorAll("[data-tr-del]").forEach(btn=>{
    btn.onclick=function(){
      ZX_borrarTrabajo(btn.dataset.trDel);
    };
  });
};

(function estilosTrabajos(){
  if(document.getElementById("zx_trabajos_v3097")) return;

  const s=document.createElement("style");
  s.id="zx_trabajos_v3097";

  s.innerHTML=`
    .zx_tr_grid2{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
    }

    .zx_tr_plan_form{
      background:#f8fafc;
      border:1px solid #d1d5db;
      border-radius:20px;
      padding:16px;
      margin-top:14px;
    }

    .zx_tr_plan_box{
      background:#f8fafc;
      border:1px solid #d1d5db;
      border-radius:20px;
      padding:16px;
      margin-top:16px;
    }

    .zx_tr_plan_item{
      background:white;
      border:1px solid #e5e7eb;
      border-radius:16px;
      padding:12px;
      margin-top:10px;
    }

    .zx_tr_plan_top{
      display:flex;
      justify-content:space-between;
      gap:8px;
      font-size:16px;
      color:#0f172a;
      font-weight:900;
    }

    .zx_tr_plan_top span{
      color:#64748b;
      font-size:14px;
      white-space:nowrap;
    }

    .zx_tr_plan_txt{
      margin-top:6px;
      color:#475569;
      font-size:15px;
      font-weight:800;
      line-height:1.4;
    }

    .zx_user_card{
      background:white;
      border:1px solid #d1d5db;
      border-radius:24px;
      padding:22px;
      margin:18px 0;
      box-shadow:0 8px 24px rgba(0,0,0,.04);
    }

    .zx_user_name{
      font-size:30px;
      font-weight:900;
      color:#0f172a;
      margin-bottom:10px;
    }

    .zx_user_data{
      color:#334155;
      font-size:18px;
      line-height:1.55;
      font-weight:700;
    }

    .zx_user_actions{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
      margin-top:14px;
    }

    .zx_action_btn{
      border:0;
      border-radius:16px;
      background:#e5e7eb;
      padding:14px;
      font-size:17px;
      font-weight:900;
      color:#111827;
    }

    .zx_blue{background:#2563eb;color:white}
    .zx_red{background:#dc2626;color:white}

    .zx_label{
      display:block;
      margin:12px 0 6px;
      color:#334155;
      font-size:15px;
      font-weight:900;
    }

    .zx_form_subtitle{
      margin:22px 0 8px;
      color:#0f172a;
      font-size:24px;
      font-weight:900;
    }

    @media(max-width:430px){
      .zx_tr_grid2{
        grid-template-columns:1fr;
      }

      .zx_user_actions{
        grid-template-columns:1fr;
      }
    }
  `;

  document.head.appendChild(s);
})();

})();