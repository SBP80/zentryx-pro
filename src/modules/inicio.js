import { layout, bindLayoutEvents } from "../ui/layout.js";

export function renderInicio(app, state, handlers) {
  const content = `
    <h3>Panel principal</h3>
    <p>Usuarios: <b>${state.users.length}</b></p>
    <p>Sistema preparado para sincronización</p>
  `;

  app.innerHTML = layout("Inicio", content, state);
  bindLayoutEvents(app, state, handlers);
}