import { layout, bindLayoutEvents } from "../ui/layout.js";
import { saveState } from "../core/store.js";

export function renderConfiguracion(app, state, handlers) {
  const content = `
    <h3>Configuración</h3>

    <input id="c_nombre" value="${state.company.nombre}" placeholder="Nombre empresa" style="width:100%;height:40px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">

    <button id="save_config" style="width:100%;height:42px;">Guardar</button>
  `;

  app.innerHTML = layout("Configuración", content, state);
  bindLayoutEvents(app, state, handlers);

  document.getElementById("save_config").onclick = () => {
    state.company.nombre = document.getElementById("c_nombre").value.trim() || "Zentryx";
    saveState(state);
    renderConfiguracion(app, state, handlers);
  };
}