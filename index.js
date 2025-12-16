const config = require("./config/config");
const bodyParser = require("body-parser");
const fs = require("fs");
const express = require("express");
const cookieSession = require("cookie-session");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const LocalStrategy = require('passport-local').Strategy;
const passport = require("./servidor/passport-setup");
const modelo = require("./servidor/modelo.js");
const PORT = config.server.port;
const haIniciado = function (request, response, next) {
    if (request.user) {
        next();
    } else {
        response.redirect("/")
    }
}
let sistema = new modelo.Sistema();

// Middleware
app.use(express.static(__dirname + "/"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(
    cookieSession({
        name: "Sistema",
        keys: ["key1", "key2"],
    })
);
app.use(passport.initialize());
passport.use(new
LocalStrategy({usernameField: "email", passwordField: "password"}, function (email, password, done) {
        sistema.loginUsuario({"email": email, "password": password}, function (user) {
            return done(null, user);
        })
    }
));
app.use(passport.session());


// ------------------------ GET -----------------------------
app.get("/fallo", function (request, response) {
    response.send({nick: "nook"});
});

// Endpoint para obtener configuración del cliente
app.get("/api/config", function (request, response) {
    response.json({
        GCLIENT_ID: config.google.clientId,
        GCALLBACK_URI: config.google.callbackUri
    });
});

app.get("/", function (request, response) {
    var contenido = fs.readFileSync(__dirname + "/cliente/index.html");
    response.setHeader("Content-type", "text/html");
    response.send(contenido);
});

app.get("/agregarUsuario/:nick", function (request, response) {
    let nick = request.params.nick;
    let res = sistema.agregarUsuario(nick);
    response.send(res);
});

app.get("/obtenerUsuarios",haIniciado,function(request,response){
    let lista=sistema.obtenerUsuarios();
    response.send(lista);
});

app.get("/usuarioActivo/:nick", function (request, response) {
    let res = sistema.usuarioActivo(request.params.nick);
    response.send(res);
});

app.get("/cerrarSesion",haIniciado,function(request,response){
    let nick=request.user.nick;
    request.logout();
    response.redirect("/");
    if (nick){
        sistema.eliminarUsuario(nick);
    }
})

app.get("/numeroUsuarios", function (request, response) {
    let res = sistema.numeroUsuarios();
    response.send(res);
});

app.get("/eliminarUsuario/:nick", function (request, response) {
    let nick = request.params.nick;
    let res = sistema.eliminarUsuario(nick);
    response.send(res);
});

// Ruta para LOGIN con Google
app.get(
    "/auth/google/login",
    function(req, res, next) {
        req.session.googleOrigin = 'login';
        console.log("🔵 Iniciando Google OAuth desde LOGIN");
        next();
    },
    passport.authenticate("google", {scope: ["profile", "email"]})
);

// Ruta para REGISTRO con Google
app.get(
    "/auth/google/registro",
    function(req, res, next) {
        req.session.googleOrigin = 'registro';
        console.log("🟢 Iniciando Google OAuth desde REGISTRO");
        next();
    },
    passport.authenticate("google", {scope: ["profile", "email"]})
);

app.get(
    "/google/callback",
    passport.authenticate("google", {failureRedirect: "/fallo"}),
    function (req, res) {
        console.log("🔐 Google callback exitoso");
        console.log("Usuario autenticado:", req.user ? "Sí" : "No");
        console.log("Estructura completa de req.user:", JSON.stringify(req.user, null, 2));

        if (req.user) {
            console.log("Email del usuario:", req.user.emails ? req.user.emails[0].value : "No disponible");
            console.log("Display Name:", req.user.displayName);
            console.log("Name:", JSON.stringify(req.user.name));
        }

        // El origen ya fue guardado en la sesión antes de la autenticación
        const origin = req.session.googleOrigin || 'login';
        console.log("🔍 Origen desde sesión:", origin);

        res.redirect("/good");
    }
);

/*
app.get("/good", function (request, response) {
  let nick = request.user.emails[0].value;
  if (nick) {
    sistema.agregarUsuario(nick);
  }
  //console.log(request.user.emails[0].value);
  response.cookie("nick", nick);
  response.redirect("/");
});
*/

app.get("/good", function (request, response) {
    // Verificar que el usuario existe y tiene emails
    if (!request.user || !request.user.emails || request.user.emails.length === 0) {
        console.error("❌ Error: Usuario no autenticado o sin email en callback de Google");
        return response.redirect("/?error=auth_failed&message=" + encodeURIComponent("Error de autenticación con Google"));
    }

    let email = request.user.emails[0].value;
    let origin = request.session.googleOrigin || 'login';
    console.log("🔐 Google OAuth: Verificando usuario:", email, "| Origen:", origin);

    // Intentar obtener el nombre del perfil de Google
    let displayName = email;
    let nombre = '';
    let apellidos = '';

    if (request.user.displayName) {
        displayName = request.user.displayName;
    }

    if (request.user.name && request.user.name.givenName) {
        nombre = request.user.name.givenName;
        displayName = nombre;
        if (request.user.name.familyName) {
            apellidos = request.user.name.familyName;
            displayName += ' ' + apellidos;
        }
    }

    // Verificar si el usuario ya existe
    sistema.verificarUsuarioGoogle(email, function (existeUsuario) {
        if (existeUsuario) {
            // Usuario YA EXISTE
            if (origin === 'login') {
                // LOGIN: Hacer login automático
                console.log("✅ Usuario Google existente, iniciando sesión automática:", email);
                request.logIn(existeUsuario, function(err) {
                    if (err) {
                        console.error("❌ Error al crear sesión:", err);
                        return response.redirect("/?error=session_error");
                    }

                    response.cookie("nick", existeUsuario.email);

                    let fullName = '';
                    if (existeUsuario.nombre && existeUsuario.apellidos) {
                        fullName = existeUsuario.nombre + ' ' + existeUsuario.apellidos;
                    } else if (existeUsuario.nombre) {
                        fullName = existeUsuario.nombre;
                    } else {
                        fullName = displayName;
                    }

                    response.cookie("userName", fullName);
                    response.redirect("/?google=login_success");
                });
            } else {
                // REGISTRO: Mostrar mensaje de error
                console.log("⚠️ Usuario Google ya registrado, desde REGISTRO:", email);
                return response.redirect("/?google=already_exists&email=" + encodeURIComponent(email) +
                                       "&nombre=" + encodeURIComponent(displayName));
            }
        } else {
            // Usuario NO EXISTE - Guardar datos y pedir contraseña
            console.log("📝 Nuevo usuario Google, solicitando contraseña:", email, "| Origen:", origin);

            // Guardar datos de Google en la sesión
            request.session.googleUserData = {
                email: email,
                nombre: nombre,
                apellidos: apellidos,
                displayName: displayName,
                confirmada: true,
                provider: 'google'
            };

            if (origin === 'login') {
                // LOGIN: Mostrar modal en página de login
                response.redirect("/?google=new_user&email=" + encodeURIComponent(email) +
                                "&nombre=" + encodeURIComponent(displayName));
            } else {
                // REGISTRO: Mostrar modal en página de registro
                response.redirect("/?view=registro&google=new_user&email=" + encodeURIComponent(email) +
                                "&nombre=" + encodeURIComponent(displayName));
            }
        }
    });
});

app.get("/fallo", function (request, response) {
    response.send({nick: "nook"});
});

app.get("/confirmarUsuario/:email/:key", function (request, response) {
    let email = request.params.email;
    let key = request.params.key;
    sistema.confirmarUsuario({"email": email, "key": key}, function (usr) {
        if (usr.email != -1) {
            // Usuario confirmado exitosamente, redirigir al login con mensaje de éxito
            response.redirect('/?verificado=true&email=' + encodeURIComponent(email));
        } else {
            // Error en la confirmación
            response.redirect('/?verificado=false');
        }
    });
})

app.get("/restablecerPassword/:email/:token", function (request, response) {
    let email = request.params.email;
    let token = request.params.token;
    // Redirigir al frontend con los parámetros para restablecer la contraseña
    response.redirect('/?resetPassword=true&email=' + encodeURIComponent(email) + '&token=' + encodeURIComponent(token));
});

app.get("/ok", function (request, response) {
    response.send({
        nick: request.user.email,
        nombre: request.user.nombre,
        apellidos: request.user.apellidos
    })
});


// ------------------------ POST -----------------------------

app.post('/oneTap/callback',
    passport.authenticate('google-one-tap', {failureRedirect: '/fallo'}),
    function (req, res) {
        console.log("🔐 Google One Tap: Autenticación exitosa");
        res.redirect('/good');
    });


// ===================== ENDPOINTS DE GRUPOS =====================

app.get("/api/grupos", haIniciado, function(request, response) {
    sistema.obtenerGrupos(function(grupos) {
        response.json(grupos);
    });
});

app.post("/api/grupos", haIniciado, function(request, response) {
    const { nombre, descripcion } = request.body;
    const creador = request.user.email;

    if (!nombre || nombre.trim() === "") {
        return response.status(400).json({ error: "El nombre del grupo es obligatorio" });
    }

    sistema.crearGrupo(nombre, descripcion, creador, function(grupo) {
        if (grupo.id === -1) {
            return response.status(500).json({ error: "Error al crear el grupo" });
        }
        response.json(grupo);
    });
});

app.get("/api/grupos/:grupoId", haIniciado, function(request, response) {
    const grupoId = request.params.grupoId;
    sistema.obtenerGrupo(grupoId, function(grupo) {
        if (!grupo) {
            return response.status(404).json({ error: "Grupo no encontrado" });
        }
        response.json(grupo);
    });
});

app.post("/api/grupos/:grupoId/unirse", haIniciado, function(request, response) {
    const grupoId = request.params.grupoId;
    const emailUsuario = request.user.email;

    sistema.unirseAGrupo(grupoId, emailUsuario, function(grupo) {
        if (!grupo) {
            return response.status(404).json({ error: "Grupo no encontrado" });
        }
        response.json(grupo);
    });
});

app.post("/api/grupos/:grupoId/salir", haIniciado, function(request, response) {
    const grupoId = request.params.grupoId;
    const emailUsuario = request.user.email;

    console.log(`📝 Solicitud de salida: Usuario ${emailUsuario} <- Grupo ${grupoId}`);

    sistema.salirDeGrupo(grupoId, emailUsuario, function(grupo) {
        if (!grupo) {
            console.error(`❌ Error: Grupo ${grupoId} no encontrado`);
            return response.status(404).json({
                success: false,
                error: "Grupo no encontrado"
            });
        }
        if (grupo.id === -1) {
            console.error(`❌ Error: ${grupo.error}`);
            return response.status(403).json({
                success: false,
                error: grupo.error || "No puedes salir de este grupo"
            });
        }
        console.log(`✅ Usuario ${emailUsuario} salió exitosamente del grupo ${grupoId}`);
        response.json({
            success: true,
            grupo: grupo,
            mensaje: "Has salido del grupo exitosamente"
        });
    });
});

app.get("/api/grupos/:grupoId/mensajes", haIniciado, function(request, response) {
    const grupoId = request.params.grupoId;
    sistema.obtenerMensajes(grupoId, function(mensajes) {
        response.json(mensajes);
    });
});


app.post("/completarRegistroGoogle", function (request, response) {
    const { password } = request.body;

    console.log("📝 [1/7] Completando registro de usuario Google");
    console.log("📝 Datos recibidos - Password length:", password ? password.length : 0);

    // Verificar que existe la sesión con datos de Google
    if (!request.session.googleUserData) {
        console.error("❌ No hay datos de Google en la sesión");
        console.error("❌ Session keys:", Object.keys(request.session));
        return response.status(400).send({
            success: false,
            error: "No hay datos de registro pendientes"
        });
    }

    console.log("✅ [2/7] Sesión encontrada con datos de Google");

    // Validar contraseña
    if (!password || password.length < 8) {
        console.warn("⚠️ Contraseña inválida");
        return response.status(400).send({
            success: false,
            error: "La contraseña debe tener al menos 8 caracteres"
        });
    }

    console.log("✅ [3/7] Contraseña validada");

    // Obtener datos de Google de la sesión
    const googleData = request.session.googleUserData;
    console.log("📝 Datos de Google:", { email: googleData.email, nombre: googleData.nombre });

    // Crear objeto de usuario completo
    const nuevoUsuario = {
        email: googleData.email,
        password: password,
        nombre: googleData.nombre,
        apellidos: googleData.apellidos,
        confirmada: true, // Google OAuth está pre-verificado
        provider: 'google',
        fechaRegistro: new Date()
    };

    console.log("📝 [4/7] Iniciando registro en BD...");

    // Registrar usuario en la base de datos
    sistema.registrarUsuario(nuevoUsuario, function (res) {
        console.log("📝 [5/7] Callback de registrarUsuario recibido");
        console.log("📝 Resultado:", res);

        if (res.email === -1) {
            console.error("❌ Error al registrar usuario Google:", res.error);
            return response.status(500).send({
                success: false,
                error: res.error || "Error al crear el usuario"
            });
        }

        console.log("✅ Usuario Google registrado con contraseña:", res.email);
        console.log("📝 [6/7] Buscando usuario para login automático...");

        // Buscar el usuario recién creado para hacer login
        sistema.buscarUsuarioPorEmail(res.email, function(usuario) {
            console.log("📝 Callback de buscarUsuarioPorEmail recibido");
            console.log("📝 Usuario encontrado:", usuario ? "SÍ" : "NO");

            if (!usuario) {
                console.error("❌ Usuario NO encontrado después de registro");
                return response.status(500).send({
                    success: false,
                    error: "Usuario creado pero no se pudo iniciar sesión"
                });
            }

            console.log("✅ Usuario encontrado, iniciando login automático...");

            // Hacer login automático
            request.logIn(usuario, function(err) {
                console.log("📝 Callback de logIn recibido");

                if (err) {
                    console.error("❌ Error al crear sesión:", err);
                    return response.status(500).send({
                        success: false,
                        error: "Usuario creado pero error al iniciar sesión"
                    });
                }

                // Limpiar datos de sesión temporal
                delete request.session.googleUserData;

                console.log("✅ [7/7] Login automático exitoso para:", usuario.email);
                console.log("📝 Enviando respuesta SUCCESS al cliente...");

                // Limpiar datos de sesión temporal
                delete request.session.googleUserData;

                // Enviar respuesta
                const responseData = {
                    success: true,
                    email: usuario.email,
                    nombre: googleData.displayName
                };

                console.log("📝 Datos de respuesta:", JSON.stringify(responseData));

                response.json(responseData);

                console.log("✅ Respuesta JSON enviada exitosamente");
            });
        });
    });
});

app.post("/registrarUsuario", function (request, response) {
    // Validar datos de entrada
    const { email, password, nombre, apellidos } = request.body;

    if (!email || !password) {
        return response.status(400).send({
            nick: -1,
            error: "Email y contraseña son obligatorios"
        });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return response.status(400).send({
            nick: -1,
            error: "Formato de email inválido"
        });
    }

    // Validar longitud de contraseña
    if (password.length < 8) {
        return response.status(400).send({
            nick: -1,
            error: "La contraseña debe tener al menos 8 caracteres"
        });
    }

    // Validar nombre y apellidos si están presentes
    if (nombre && /\d/.test(nombre)) {
        return response.status(400).send({
            nick: -1,
            error: "El nombre no puede contener números"
        });
    }

    if (apellidos && /\d/.test(apellidos)) {
        return response.status(400).send({
            nick: -1,
            error: "Los apellidos no pueden contener números"
        });
    }

    sistema.registrarUsuario(request.body, function (res) {
        if (res.email === -1) {
            return response.status(409).send({
                nick: -1,
                error: "El email ya está registrado"
            });
        }
        response.send({"nick": res.email});
    });
});

app.post('/loginUsuario', function(request, response, next) {
    // Validar datos de entrada
    const { email, password } = request.body;

    if (!email || !password) {
        return response.status(400).send({
            nick: -1,
            error: "Email y contraseña son obligatorios"
        });
    }

    passport.authenticate('local', function(err, user, info) {
        if (err) {
            console.error("❌ Error crítico en autenticación:", err);
            return response.status(500).send({
                nick: -1,
                error: "Error en el servidor"
            });
        }

        if (!user) {
            // Usuario no encontrado o credenciales incorrectas
            console.warn("⚠️ Login fallido: Usuario no encontrado o credenciales incorrectas");
            return response.status(401).send({
                nick: -1,
                error: "Credenciales incorrectas o cuenta no verificada"
            });
        }

        // Verificar que el usuario ha confirmado su cuenta
        if (user.confirmada === false) {
            console.warn("⚠️ Login bloqueado: Cuenta no verificada -", user.email);
            return response.status(403).send({
                nick: -1,
                error: "Por favor, verifica tu correo electrónico antes de iniciar sesión"
            });
        }

        request.logIn(user, function(err) {
            if (err) {
                console.error("❌ Error al crear sesión:", err);
                return response.status(500).send({
                    nick: -1,
                    error: "Error al crear la sesión"
                });
            }

            console.log("✅ Login exitoso:", user.email);

            // Construir el nombre completo
            let nombreCompleto = '';
            if (user.nombre && user.apellidos) {
                nombreCompleto = user.nombre + ' ' + user.apellidos;
            } else if (user.nombre) {
                nombreCompleto = user.nombre;
            } else {
                nombreCompleto = user.email;
            }

            return response.send({
                "nick": user.email,
                "nombre": user.nombre,
                "apellidos": user.apellidos,
                "nombreCompleto": nombreCompleto
            });
        });
    })(request, response, next);
});

app.post("/cerrarSesion", function (request, response) {
    // Guardar email antes de destruir la sesión
    let email = null;
    if (request.user && request.user.email) {
        email = request.user.email;
    }

    console.log("🔐 Usuario cerrando sesión:", email || "desconocido");

    // Si no hay usuario en la sesión, devolver éxito de todas formas
    if (!request.user) {
        console.log("⚠️ No hay sesión activa para cerrar");
        return response.json({
            success: true,
            mensaje: "No había sesión activa"
        });
    }

    // Limpiar sesión de Passport
    request.logout(function(err) {
        if (err) {
            console.error("❌ Error al cerrar sesión:", err);
            return response.status(500).json({
                success: false,
                error: "Error al cerrar sesión"
            });
        }

        // Limpiar cookie de sesión ANTES de destruir la sesión
        response.clearCookie('connect.sid');
        response.clearCookie('Sistema');

        // Eliminar usuario del sistema si existe
        if (email) {
            try {
                sistema.eliminarUsuario(email);
                console.log("✅ Usuario eliminado del sistema:", email);
            } catch (error) {
                console.error("⚠️ Error al eliminar usuario:", error);
            }
        }

        // Destruir la sesión completamente
        request.session.destroy(function(err) {
            if (err) {
                console.error("⚠️ Error al destruir sesión:", err);
                // Aún así enviamos respuesta exitosa
            }

            console.log("✅ Sesión cerrada correctamente para:", email);

            // Enviar respuesta JSON
            response.json({
                success: true,
                mensaje: "Sesión cerrada correctamente"
            });
        });
    });
});

app.post("/solicitarRecuperacionPassword", function (request, response) {
    const { email } = request.body;

    if (!email) {
        return response.status(400).send({
            success: false,
            error: "El correo electrónico es obligatorio"
        });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return response.status(400).send({
            success: false,
            error: "Formato de email inválido"
        });
    }

    sistema.solicitarRecuperacionPassword(email, function (res) {
        if (!res.success) {
            return response.status(404).send(res);
        }
        response.send(res);
    });
});

app.post("/restablecerPassword", function (request, response) {
    const { email, token, newPassword } = request.body;

    if (!email || !token || !newPassword) {
        return response.status(400).send({
            success: false,
            error: "Datos incompletos"
        });
    }

    if (newPassword.length < 8) {
        return response.status(400).send({
            success: false,
            error: "La contraseña debe tener al menos 8 caracteres"
        });
    }

    sistema.restablecerPassword(email, token, newPassword, function (res) {
        if (!res.success) {
            return response.status(400).send(res);
        }
        response.send(res);
    });
});

// ===================== CONFIGURACIÓN DE SOCKET.IO =====================
// Estructura para rastrear usuarios online por grupo
// { grupoId: { socketId: { email, nombre } } }
const usuariosOnlinePorGrupo = {};

io.on('connection', (socket) => {
    console.log('🔌 Usuario conectado:', socket.id);

    // Unirse a un grupo (sala)
    socket.on('unirseGrupo', (data) => {
        const grupoId = typeof data === 'string' ? data : data.grupoId;
        const usuarioEmail = data.usuarioEmail;
        const usuarioNombre = data.usuarioNombre;

        socket.join(grupoId);

        // Guardar información del usuario
        socket.grupoId = grupoId;
        socket.usuarioEmail = usuarioEmail;
        socket.usuarioNombre = usuarioNombre;

        // Registrar usuario online en el grupo
        if (!usuariosOnlinePorGrupo[grupoId]) {
            usuariosOnlinePorGrupo[grupoId] = {};
        }
        usuariosOnlinePorGrupo[grupoId][socket.id] = {
            email: usuarioEmail,
            nombre: usuarioNombre
        };

        console.log(`👥 Socket ${socket.id} (${usuarioEmail}) se unió al grupo ${grupoId}`);

        // Notificar a otros usuarios que este usuario se conectó
        socket.to(grupoId).emit('usuarioConectado', {
            grupoId: grupoId,
            email: usuarioEmail,
            nombre: usuarioNombre
        });

        // Enviar lista actualizada de usuarios online a todos
        const usuariosOnline = Object.values(usuariosOnlinePorGrupo[grupoId] || {})
            .map(u => u.email);
        io.to(grupoId).emit('usuariosOnlineActualizados', {
            grupoId: grupoId,
            usuarios: usuariosOnline
        });

        console.log(`📊 Usuarios online en grupo ${grupoId}:`, usuariosOnline);
    });

    // Salir de un grupo
    socket.on('salirGrupo', (grupoId) => {
        socket.leave(grupoId);

        // Remover usuario de la lista de online
        if (usuariosOnlinePorGrupo[grupoId] && usuariosOnlinePorGrupo[grupoId][socket.id]) {
            const usuarioInfo = usuariosOnlinePorGrupo[grupoId][socket.id];
            delete usuariosOnlinePorGrupo[grupoId][socket.id];

            console.log(`👋 Socket ${socket.id} (${usuarioInfo.email}) salió del grupo ${grupoId}`);

            // Notificar a otros usuarios
            socket.to(grupoId).emit('usuarioDesconectado', {
                grupoId: grupoId,
                email: usuarioInfo.email,
                nombre: usuarioInfo.nombre
            });

            // Enviar lista actualizada
            const usuariosOnline = Object.values(usuariosOnlinePorGrupo[grupoId] || {})
                .map(u => u.email);
            io.to(grupoId).emit('usuariosOnlineActualizados', {
                grupoId: grupoId,
                usuarios: usuariosOnline
            });

            // Limpiar grupo si está vacío
            if (Object.keys(usuariosOnlinePorGrupo[grupoId]).length === 0) {
                delete usuariosOnlinePorGrupo[grupoId];
            }
        }
    });

    // Recibir y broadcast mensaje
    socket.on('enviarMensaje', (mensaje) => {
        console.log('💬 Mensaje recibido para grupo:', mensaje.grupoId);

        // Guardar en base de datos
        sistema.enviarMensaje(mensaje, function(mensajeGuardado) {
            if (mensajeGuardado && mensajeGuardado.id !== -1) {
                // Enviar a todos en la sala incluyendo al emisor
                io.to(mensaje.grupoId).emit('nuevoMensaje', mensajeGuardado);
                console.log('✅ Mensaje enviado a sala:', mensaje.grupoId);
            } else {
                console.error('❌ Error al guardar mensaje');
                socket.emit('errorMensaje', { error: 'Error al enviar el mensaje' });
            }
        });
    });

    // Usuario está escribiendo
    socket.on('escribiendo', (data) => {
        socket.to(data.grupoId).emit('usuarioEscribiendo', {
            nombreUsuario: data.nombreUsuario,
            grupoId: data.grupoId
        });
    });

    // Usuario dejó de escribir
    socket.on('dejoDeEscribir', (data) => {
        socket.to(data.grupoId).emit('usuarioDejoDeEscribir', {
            nombreUsuario: data.nombreUsuario,
            grupoId: data.grupoId
        });
    });

    // Desconexión
    socket.on('disconnect', () => {
        console.log('🔌 Usuario desconectado:', socket.id);

        // Limpiar usuario de todos los grupos
        const grupoId = socket.grupoId;
        if (grupoId && usuariosOnlinePorGrupo[grupoId] && usuariosOnlinePorGrupo[grupoId][socket.id]) {
            const usuarioInfo = usuariosOnlinePorGrupo[grupoId][socket.id];
            delete usuariosOnlinePorGrupo[grupoId][socket.id];

            // Notificar a otros usuarios
            socket.to(grupoId).emit('usuarioDesconectado', {
                grupoId: grupoId,
                email: usuarioInfo.email,
                nombre: usuarioInfo.nombre
            });

            // Enviar lista actualizada
            const usuariosOnline = Object.values(usuariosOnlinePorGrupo[grupoId] || {})
                .map(u => u.email);
            io.to(grupoId).emit('usuariosOnlineActualizados', {
                grupoId: grupoId,
                usuarios: usuariosOnline
            });

            // Limpiar grupo si está vacío
            if (Object.keys(usuariosOnlinePorGrupo[grupoId]).length === 0) {
                delete usuariosOnlinePorGrupo[grupoId];
            }

            console.log(`🧹 Usuario ${usuarioInfo.email} eliminado del grupo ${grupoId}`);
        }
    });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
    console.log(`🔌 WebSocket habilitado en el puerto ${PORT}`);
    console.log("Ctrl+C para salir");
}).on('error', (err) => {
    console.error('Error al iniciar el servidor:', err);
    process.exit(1);
});
