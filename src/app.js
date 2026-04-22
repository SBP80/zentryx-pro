import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
  "https://idtaamivqbiuxtjywuux.supabase.co",
  "sb_publishable_ToDLKonbF2QnTXi56o1nfQ_10IdaPJx"
);

// pintar login
document.getElementById("app").innerHTML = `
  <div style="display:flex;flex-direction:column;gap:10px;padding:20px;">
    <input id="usuario" placeholder="Usuario">
    <input id="password" type="password" placeholder="Contraseña">
    <button id="loginBtn">Entrar</button>
  </div>
`;

// evento login
document.getElementById("loginBtn").addEventListener("click", async () => {
  const usuario = document.getElementById("usuario").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("usuario", usuario)
    .eq("password", password)
    .single();

  if (error || !data) {
    alert("Usuario o contraseña incorrectos");
    return;
  }

  alert("Bienvenido " + data.nombre);
});