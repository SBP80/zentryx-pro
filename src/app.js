// ===============================
// ZENTRYX V2535.4 - APP COMPLETO
// ===============================

// CONFIG SUPABASE (ya tendrás tus claves)
const supabaseUrl = 'https://TU_URL.supabase.co';
const supabaseKey = 'TU_KEY';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ===============================
// LOGIN
// ===============================
async function login() {
  const usuario = document.getElementById('usuario').value;
  const password = document.getElementById('password').value;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('usuario', usuario)
    .single();

  if (error || !data) {
    alert('Usuario o contraseña incorrectos');
    return;
  }

  if (data.password !== password) {
    alert('Usuario o contraseña incorrectos');
    return;
  }

  localStorage.setItem('user', JSON.stringify(data));

  if (data.password_pendiente) {
    mostrarCambioPassword(data.id);
  } else {
    cargarApp();
  }
}

// ===============================
// CAMBIO PASSWORD PRIMER LOGIN
// ===============================
async function guardarNuevaPassword(id) {
  const nueva = document.getElementById('nuevaPassword').value;

  await supabase
    .from('users')
    .update({
      password: nueva,
      password_pendiente: false
    })
    .eq('id', id);

  alert('Password creada');

  cargarApp();
}

// ===============================
// SUBIR FOTO
// ===============================
async function subirFotoUsuario(file, usuarioId) {
  const nombreArchivo = `user_${usuarioId}_${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from('usuarios')
    .upload(nombreArchivo, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error(error);
    alert('Error subiendo imagen');
    return null;
  }

  const { data } = supabase.storage
    .from('usuarios')
    .getPublicUrl(nombreArchivo);

  return data.publicUrl;
}

// ===============================
// CREAR USUARIO
// ===============================
async function crearUsuario() {
  const nombre = document.getElementById('nombre').value;
  const usuario = document.getElementById('usuarioNuevo').value;

  const { data, error } = await supabase
    .from('users')
    .insert([{
      nombre,
      usuario,
      password: '',
      password_pendiente: true,
      rol: 'operario'
    }])
    .select()
    .single();

  if (error) {
    alert('Error creando usuario');
    console.error(error);
    return;
  }

  // SUBIR FOTO
  const fileInput = document.getElementById('fotoUsuario');

  if (fileInput.files.length > 0) {
    const fotoUrl = await subirFotoUsuario(fileInput.files[0], data.id);

    await supabase
      .from('users')
      .update({ foto_url: fotoUrl })
      .eq('id', data.id);
  }

  alert('Usuario creado');
}

// ===============================
// CARGAR FOTO EN UI
// ===============================
function pintarFoto(usuario) {
  const img = document.getElementById('fotoUser');

  if (!img) return;

  img.src = usuario.foto_url || 'https://via.placeholder.com/80';
}

// ===============================
// CARGAR APP
// ===============================
function cargarApp() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  const user = JSON.parse(localStorage.getItem('user'));

  pintarFoto(user);
}

// ===============================
// CAMBIO PASSWORD UI
// ===============================
function mostrarCambioPassword(id) {
  document.getElementById('login').style.display = 'none';
  document.getElementById('cambioPass').style.display = 'block';

  window.userCambioPass = id;
}

// ===============================
// EVENTOS
// ===============================
document.getElementById('btnLogin')?.addEventListener('click', login);

document.getElementById('btnGuardarPassword')?.addEventListener('click', () => {
  guardarNuevaPassword(window.userCambioPass);
});

document.getElementById('btnCrearUsuario')?.addEventListener('click', crearUsuario);