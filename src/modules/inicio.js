(function(){
"use strict";

function app(){
  return document.getElementById("app");
}

window.ZX_inicio=function(){

  app().innerHTML=`

    <div class="card">
      <h2>Inicio</h2>
      <p>Sistema activo</p>
    </div>

    <div class="card">
      <button onclick="ZX_fichaje()">Fichaje</button>
      <button onclick="ZX_usuarios()">Usuarios</button>
    </div>

  `;
};

})();