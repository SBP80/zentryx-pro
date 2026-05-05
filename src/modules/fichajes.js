// ===============================
// ZENTRYX V2608 - KM + VEHÍCULO + HISTÓRICO
// ===============================

(function(){
  "use strict";

  const MODULO = {
    nombre: "fichajes",
    version: "2608",

    init: function(){
      console.log("Módulo fichajes V2608 activo");
      interceptarSalida();
    }
  };

  function interceptarSalida(){

    document.addEventListener("click", function(e){

      const btn = e.target.closest("button");
      if(!btn) return;

      const txt = (btn.innerText || "").toLowerCase();

      if(!txt.includes("salida")) return;

      if(btn.dataset.ok==="1"){
        btn.dataset.ok="0";
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const km = prompt("Introduce km del vehículo:");

      if(km===null){
        alert("Debes introducir km");
        return;
      }

      if(isNaN(km) || km<=0){
        alert("Km no válido");
        return;
      }

      window.ZENTRYX_KM_SALIDA = Number(km);

      btn.dataset.ok="1";

      setTimeout(async ()=>{

        btn.click();

        // 🔥 DESPUÉS DE FICHAR → actualizar vehículo
        setTimeout(async ()=>{

          try{

            if(!window.sb) return;

            const vehiculoId = document.getElementById("fichaje_vehiculo_id")?.value;
            if(!vehiculoId) return;

            const kmFinal = window.ZENTRYX_KM_SALIDA;

            // actualizar km actual
            await window.sb
              .from("org_vehiculos")
              .update({ km_actual: kmFinal })
              .eq("id", vehiculoId);

            console.log("Vehículo actualizado con km:", kmFinal);

            // 🔥 guardar histórico
            await window.sb
              .from("org_vehiculos_km_historial")
              .insert({
                vehiculo_id: vehiculoId,
                km: kmFinal,
                fecha: new Date().toISOString()
              });

            console.log("Histórico guardado");

          }catch(err){
            console.error("Error guardando km:", err);
          }

        }, 300);

      }, 50);

    }, true);
  }

  function start(){
    if(!window.ZENTRYX){
      setTimeout(start,100);
      return;
    }

    window.ZENTRYX.registrarModulo("fichajes", MODULO);
    MODULO.init();
  }

  start();

})();
