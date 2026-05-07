// ===============================
// ZENTRYX V2619 - MÓDULO VEHÍCULOS SUPABASE + USO
// ===============================
(function(){
  "use strict";

  const MODULO = {nombre:"vehiculos", version:"2619", activo:true, init:init, abrir:mostrarPantallaVehiculos};

  function clienteSupabase(){
    if(window.sb && typeof window.sb.from === "function") return window.sb;
    if(window.supabaseClient && typeof window.supabaseClient.from === "function") return window.supabaseClient;
    return null;
  }

  function usuarioActual(){
    try{
      var u = JSON.parse(localStorage.getItem("usuario") || "{}");
      return u.usuario || u.nombre || u.id || "admin";
    }catch(e){ return "admin"; }
  }

  function init(){
    console.log("Vehículos PRO V2619 activo");
    crearAviso();
    crearBotonFlotante();
    activarEventos();
    window.vehiculosAPI = crearAPI();
    window.ZENTRYX_UI_abrirVehiculos = mostrarPantallaVehiculos;
    return true;
  }

  function crearAPI(){
    return {
      listar: async function(){
        var sb = clienteSupabase();
        if(!sb) return {data:[], error:{message:"Supabase no conectado"}};
        return await sb.from("vehiculos").select("*").order("created_at", {ascending:false});
      },
      listarLibres: async function(){
        var res = await this.listar();
        if(res.error) return res;
        var usuario = usuarioActual();
        res.data = (res.data || []).filter(function(v){
          return !v.en_uso || String(v.usuario_id || "") === String(usuario);
        });
        return res;
      },
      crear: async function(datos){
        var sb = clienteSupabase();
        if(!sb) return {error:{message:"Supabase no conectado"}};
        return await sb.from("vehiculos").insert([{
          empresa_id: datos.empresa_id || "demo",
          matricula: String(datos.matricula || "").toUpperCase(),
          km_actual: Number(datos.km_actual || 0),
          en_uso: false,
          usuario_id: null
        }]);
      },
      ocupar: async function(vehiculoId){
        var sb = clienteSupabase();
        if(!sb) return {error:{message:"Supabase no conectado"}};
        var usuario = usuarioActual();

        var actual = await sb.from("vehiculos").select("id,en_uso,usuario_id,matricula,km_actual").eq("id", vehiculoId).maybeSingle();
        if(actual.error) return actual;
        if(actual.data && actual.data.en_uso && String(actual.data.usuario_id || "") !== String(usuario)){
          return {error:{message:"Vehículo en uso por otro usuario"}};
        }

        return await sb.from("vehiculos").update({en_uso:true, usuario_id:usuario}).eq("id", vehiculoId);
      },
      liberar: async function(vehiculoId){
        var sb = clienteSupabase();
        if(!sb) return {error:{message:"Supabase no conectado"}};
        return await sb.from("vehiculos").update({en_uso:false, usuario_id:null}).eq("id", vehiculoId);
      },
      actualizarKm: async function(vehiculoId, km, motivo){
        var sb = clienteSupabase();
        if(!sb) return {error:{message:"Supabase no conectado"}};

        var kmFinal = Number(km || 0);
        var usuario = usuarioActual();

        var veh = await sb.from("vehiculos").select("id,matricula,km_actual").eq("id", vehiculoId).maybeSingle();
        if(veh.error) return veh;

        var kmAnterior = Number(veh.data && veh.data.km_actual ? veh.data.km_actual : 0);
        if(kmFinal < kmAnterior){
          return {error:{message:"Los km no pueden ser menores que los actuales (" + kmAnterior + ")"}};
        }

        var up = await sb.from("vehiculos").update({km_actual:kmFinal}).eq("id", vehiculoId);
        if(up.error) return up;

        await sb.from("vehiculos_km_historial").insert([{
          vehiculo_id: vehiculoId,
          matricula: veh.data ? veh.data.matricula : null,
          km_anterior: kmAnterior,
          km_nuevo: kmFinal,
          usuario: usuario,
          motivo: motivo || "Fichaje salida",
          fecha: new Date().toISOString()
        }]);

        return {data:{km_actual:kmFinal}, error:null};
      }
    };
  }

  function crearAviso(){
    var viejo = document.getElementById("zx_mod_vehiculos_banner");
    if(viejo) viejo.remove();
    var aviso = document.createElement("div");
    aviso.textContent = "VEHÍCULOS PRO V2619";
    aviso.style.position="fixed"; aviso.style.top="60px"; aviso.style.left="10px"; aviso.style.right="10px";
    aviso.style.zIndex="999999"; aviso.style.background="#dcfce7"; aviso.style.color="#166534";
    aviso.style.border="2px solid #22c55e"; aviso.style.borderRadius="14px"; aviso.style.padding="10px";
    aviso.style.fontWeight="800"; aviso.style.textAlign="center";
    document.body.appendChild(aviso);
    setTimeout(function(){ aviso.remove(); }, 3000);
  }

  function crearBotonFlotante(){
    if(document.getElementById("zx_btn_vehiculos_flotante")) return;
    var btn = document.createElement("button");
    btn.id="zx_btn_vehiculos_flotante"; btn.textContent="Vehículos"; btn.type="button";
    btn.style.position="fixed"; btn.style.right="12px"; btn.style.bottom="92px"; btn.style.zIndex="999997";
    btn.style.background="#2563eb"; btn.style.color="#fff"; btn.style.border="0"; btn.style.borderRadius="999px";
    btn.style.padding="12px 16px"; btn.style.fontWeight="900"; btn.style.fontSize="15px";
    btn.style.boxShadow="0 12px 28px rgba(0,0,0,.25)";
    btn.onclick=function(e){ e.preventDefault(); e.stopPropagation(); mostrarPantallaVehiculos(); };
    document.body.appendChild(btn);
  }

  function activarEventos(){
    document.addEventListener("click", function(e){
      var btn = e.target.closest("button, a");
      if(!btn) return;
      if(btn.id === "zx_btn_vehiculos_flotante" || btn.id === "zx_crear_vehiculo_modulo" || btn.id === "zx_recargar_vehiculos_modulo") return;
      var texto = String(btn.innerText || btn.textContent || "").toLowerCase();
      if(texto.indexOf("vehiculo") !== -1 || texto.indexOf("vehículo") !== -1 || texto.indexOf("vehículos") !== -1 || texto.indexOf("vehiculos") !== -1){
        e.preventDefault(); e.stopPropagation(); mostrarPantallaVehiculos();
      }
    }, true);
  }

  function contenedorPrincipal(){
    return document.getElementById("app") || document.querySelector(".container") || document.querySelector("main") || document.body;
  }

  function estadoVehiculo(v){
    if(v.en_uso) return '<span style="color:#991b1b;font-weight:900;">En uso' + (v.usuario_id ? ' · ' + v.usuario_id : '') + '</span>';
    return '<span style="color:#166534;font-weight:900;">Libre</span>';
  }

  function mostrarPantallaVehiculos(){
    var contenedor = contenedorPrincipal();
    contenedor.innerHTML = `
      <div class="card" style="margin:16px;">
        <h1>Vehículos</h1>
        <p class="muted">Módulo externo de vehículos V2619 conectado a Supabase</p>
        <button id="zx_crear_vehiculo_modulo" style="width:100%;padding:14px;margin-bottom:10px;background:#2563eb;color:#fff;border:none;border-radius:10px;font-weight:700;">+ Añadir vehículo</button>
        <button id="zx_recargar_vehiculos_modulo" style="width:100%;padding:14px;margin-bottom:15px;background:#e5e7eb;color:#111827;border:none;border-radius:10px;font-weight:700;">Recargar</button>
        <div id="listaVehiculosModulo"></div>
      </div>
    `;
    var btnCrear = document.getElementById("zx_crear_vehiculo_modulo");
    if(btnCrear) btnCrear.onclick = crearVehiculoModulo;
    var btnRecargar = document.getElementById("zx_recargar_vehiculos_modulo");
    if(btnRecargar) btnRecargar.onclick = cargarVehiculosModulo;
    cargarVehiculosModulo();
  }

  async function cargarVehiculosModulo(){
    var lista = document.getElementById("listaVehiculosModulo");
    if(!lista) return;
    if(!window.vehiculosAPI) window.vehiculosAPI = crearAPI();
    lista.innerHTML = "<p>Cargando vehículos...</p>";

    try{
      var res = await window.vehiculosAPI.listar();
      if(res.error) throw res.error;
      var data = res.data || [];
      if(data.length === 0){ lista.innerHTML = "<p>No hay vehículos en Supabase.</p>"; return; }
      lista.innerHTML = data.map(function(v){
        return `
          <div style="background:#fff;padding:12px;border-radius:10px;margin-bottom:10px;border:1px solid #ddd;">
            <b>${v.matricula || "-"}</b><br>
            <span>Km actuales: ${v.km_actual || 0}</span><br>
            ${estadoVehiculo(v)}<br>
            <small style="color:#64748b;">ID: ${v.id || "-"}</small>
          </div>
        `;
      }).join("");
    }catch(e){
      lista.innerHTML = "<p style='color:#991b1b;font-weight:800;'>Error cargando vehículos. Revisa la tabla vehiculos.</p>";
      console.error("Error cargando vehículos", e);
    }
  }

  async function crearVehiculoModulo(){
    var matricula = prompt("Matrícula:");
    if(!matricula) return;
    var km = Number(prompt("Kilómetros actuales:", "0") || 0);
    if(!window.vehiculosAPI) window.vehiculosAPI = crearAPI();
    try{
      var res = await window.vehiculosAPI.crear({empresa_id:"demo", matricula:matricula, km_actual:km});
      if(res.error) throw res.error;
      await cargarVehiculosModulo();
    }catch(e){
      alert("Error guardando vehículo: " + (e.message || e));
      console.error("Error guardando vehículo", e);
    }
  }

  window.crearVehiculoModulo = crearVehiculoModulo;

  function registrar(){
    if(!window.ZENTRYX || typeof window.ZENTRYX.registrarModulo !== "function"){ setTimeout(registrar,100); return; }
    window.vehiculosAPI = crearAPI();
    window.ZENTRYX.registrarModulo("vehiculos", MODULO);
    window.ZENTRYX_UI_abrirVehiculos = mostrarPantallaVehiculos;
    try{ MODULO.init(); }catch(e){ console.error("Error inicializando módulo vehículos:", e); alert("Error cargando módulo vehículos: " + ((e && e.message) || e)); }
  }

  window.ZENTRYX_UI_abrirVehiculos = mostrarPantallaVehiculos;
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", registrar);
  else registrar();
})();


