// ===============================
// ZENTRYX V2615 - VEHÍCULOS SUPABASE
// ===============================
(function(){
  "use strict";
  const MODULO = {
    nombre: "vehiculos",
    version: "2615",
    activo: true,
    init: function(){
      console.log("Vehículos Supabase activo V2615");
      crearAviso();
      crearBotonFlotante();
      registrarUI();
      activarEventos();
      return true;
    },
    abrir: function(){ mostrarPantallaVehiculos(); }
  };

  function clienteSupabase(){
    return window.sb || window.supabaseClient || window.supabase || null;
  }

  function crearAviso(){
    var viejo = document.getElementById("zx_mod_vehiculos_banner");
    if(viejo) viejo.remove();
    var aviso = document.createElement("div");
    aviso.textContent = "VEHÍCULOS SUPABASE V2615";
    aviso.style.position = "fixed";
    aviso.style.top = "60px";
    aviso.style.left = "10px";
    aviso.style.right = "10px";
    aviso.style.zIndex = "999999";
    aviso.style.background = "#dcfce7";
    aviso.style.color = "#166534";
    aviso.style.border = "2px solid #22c55e";
    aviso.style.borderRadius = "14px";
    aviso.style.padding = "10px";
    aviso.style.fontWeight = "800";
    aviso.style.textAlign = "center";
    document.body.appendChild(aviso);
    setTimeout(function(){ aviso.remove(); }, 3000);
  }

  function crearBotonFlotante(){
    if(document.getElementById("zx_btn_vehiculos_flotante")) return;
    var btn = document.createElement("button");
    btn.id = "zx_btn_vehiculos_flotante";
    btn.textContent = "Vehículos";
    btn.type = "button";
    btn.style.position = "fixed";
    btn.style.right = "12px";
    btn.style.bottom = "92px";
    btn.style.zIndex = "999997";
    btn.style.background = "#2563eb";
    btn.style.color = "#fff";
    btn.style.border = "0";
    btn.style.borderRadius = "999px";
    btn.style.padding = "12px 16px";
    btn.style.fontWeight = "900";
    btn.style.fontSize = "15px";
    btn.style.boxShadow = "0 12px 28px rgba(0,0,0,.25)";
    btn.onclick = function(e){
      e.preventDefault();
      e.stopPropagation();
      mostrarPantallaVehiculos();
    };
    document.body.appendChild(btn);
  }

  function registrarUI(){
    window.ZENTRYX_UI_abrirVehiculos = mostrarPantallaVehiculos;
  }

  function activarEventos(){
    document.addEventListener("click", function(e){
      var btn = e.target.closest("button, a");
      if(!btn) return;
      if(btn.id === "zx_btn_vehiculos_flotante") return;
      if(btn.id === "zx_crear_vehiculo_modulo") return;
      if(btn.id === "zx_recargar_vehiculos_modulo") return;
      var texto = String(btn.innerText || btn.textContent || "").toLowerCase();
      if(texto.indexOf("vehiculo") !== -1 || texto.indexOf("vehículo") !== -1 || texto.indexOf("vehículos") !== -1 || texto.indexOf("vehiculos") !== -1){
        e.preventDefault();
        e.stopPropagation();
        mostrarPantallaVehiculos();
      }
    }, true);
  }

  function contenedorPrincipal(){
    return document.getElementById("app") || document.querySelector(".container") || document.querySelector("main") || document.body;
  }

  function mostrarPantallaVehiculos(){
    var contenedor = contenedorPrincipal();
    contenedor.innerHTML = `
      <div class="card" style="margin:16px;">
        <h1>Vehículos</h1>
        <p class="muted">Módulo externo de vehículos V2615 conectado a Supabase</p>
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
    var sb = clienteSupabase();
    if(!sb || typeof sb.from !== "function"){
      lista.innerHTML = "<p style='color:#991b1b;font-weight:800;'>No se encuentra Supabase en la app.</p>";
      return;
    }
    lista.innerHTML = "<p>Cargando vehículos...</p>";
    try{
      var res = await sb.from("vehiculos").select("*").order("created_at", { ascending:false });
      if(res.error) throw res.error;
      var data = res.data || [];
      if(data.length === 0){
        lista.innerHTML = "<p>No hay vehículos en Supabase.</p>";
        return;
      }
      lista.innerHTML = data.map(function(v){
        return `
          <div style="background:#fff;padding:12px;border-radius:10px;margin-bottom:10px;border:1px solid #ddd;">
            <b>${v.matricula || "-"}</b><br>
            <span>Km actuales: ${v.km_actual || 0}</span><br>
            <small style="color:#64748b;">ID: ${v.id || "-"}</small>
          </div>
        `;
      }).join("");
    }catch(e){
      lista.innerHTML = "<p style='color:#991b1b;font-weight:800;'>Error cargando vehículos. Revisa que exista la tabla vehiculos.</p>";
      console.error("Error cargando vehículos", e);
    }
  }

  async function crearVehiculoModulo(){
    var matricula = prompt("Matrícula:");
    if(!matricula) return;
    var km = Number(prompt("Kilómetros actuales:", "0") || 0);
    var sb = clienteSupabase();
    if(!sb || typeof sb.from !== "function"){
      alert("No se encuentra Supabase en la app.");
      return;
    }
    try{
      var payload = { empresa_id: "demo", matricula: String(matricula).toUpperCase(), km_actual: km };
      var res = await sb.from("vehiculos").insert([payload]);
      if(res.error) throw res.error;
      await cargarVehiculosModulo();
    }catch(e){
      alert("Error guardando vehículo. Revisa la tabla vehiculos en Supabase.");
      console.error("Error guardando vehículo", e);
    }
  }

  window.crearVehiculoModulo = crearVehiculoModulo;

  function registrar(){
    if(!window.ZENTRYX || typeof window.ZENTRYX.registrarModulo !== "function"){
      setTimeout(registrar, 100);
      return;
    }
    window.ZENTRYX.registrarModulo("vehiculos", MODULO);
    window.ZENTRYX_UI_abrirVehiculos = mostrarPantallaVehiculos;
    try{ MODULO.init(); }catch(e){
      console.error("Error inicializando módulo vehículos:", e);
      alert("Error cargando módulo vehículos: " + ((e && e.message) || e));
    }
  }

  window.ZENTRYX_UI_abrirVehiculos = mostrarPantallaVehiculos;
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", registrar);
  }else{
    registrar();
  }
})();
