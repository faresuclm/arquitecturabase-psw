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
const passport = require("passport");
const modelo = require("./servidor/modelo.js");
const PORT = config.server.port;

// ====== CONFIGURACIÓN CRÍTICA DE PASSPORT ======
// Importar estrategias de Google
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GoogleOneTapStrategy = require("passport-google-one-tap").GoogleOneTapStrategy;

let sistema = new modelo.Sistema();

// ====== MIDDLEWARE - ORDEN CORRECTO ======
app.use(express.static(__dirname + "/"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// ====== CONFIGURACIÓN DE COOKIE-SESSION (AUMENTAR LÍMITE) ======
app.use(
    cookieSession({
        name: "Sistema",
        keys: ["key1", "key2"],
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        sameSite: 'lax',
        httpOnly: true,
        secure: config.server.isProduction, // true en producción
        signed: true
    })
);

// ====== INICIALIZAR PASSPORT ANTES DE LAS ESTRATEGIAS ======
app.use(passport.initialize());
app.use(passport.session());

// ====== SERIALIZACIÓN SIMPLIFICADA ======
passport.serializeUser(function (user, done) {
    console.log("🔐 Serializando usuario:", user.emails ? user.emails[0].value : user.email);
    // Serializar SOLO el email para reducir tamaño de sesión
    const userSession = {
        email: user.emails ? user.emails[0].value : user.email,
        username: user.username || user.displayName || (user.emails ? user.emails[0].value.split('@')[0] : ''),
        provider: user.provider || 'local'
    };
    done(null, userSession);
});

passport.deserializeUser(function (userSession, done) {
    console.log("🔓 Deserializando usuario:", userSession.email);
    // Buscar usuario completo en la base de datos
    sistema.buscarUsuarioPorEmail(userSession.email, function(fullUser) {
        if (fullUser) {
            done(null, fullUser);
        } else {
            // Si no existe en BD, usar datos de sesión
            done(null, userSession);
        }
    });
});

// ====== ESTRATEGIA LOCAL (LOGIN CON EMAIL/PASSWORD) ======
passport.use(new LocalStrategy(
    {usernameField: "email", passwordField: "password"},
    function (email, password, done) {
        sistema.loginUsuario({"email": email, "password": password}, function (user) {
            return done(null, user);
        });
    }
));

// ====== ESTRATEGIA GOOGLE OAUTH 2.0 ======
passport.use(new GoogleStrategy({
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
        proxy: true // IMPORTANTE: para HTTPS detrás de Cloud Run
    },
    function (accessToken, refreshToken, profile, done) {
        console.log("✅ Google OAuth: Autenticación exitosa para", profile.emails[0].value);
        return done(null, profile);
    }
));

// ====== ESTRATEGIA GOOGLE ONE TAP ======
passport.use(
    new GoogleOneTapStrategy(
        {
            clientID: config.google.clientId,
            clientSecret: config.google.clientSecret,
            verifyCsrfToken: false,
        },
        function (profile, done) {
            console.log("✅ Google One Tap: Autenticación exitosa para", profile.emails[0].value);
            return done(null, profile);
        }
    )
);

// ====== MIDDLEWARE DE AUTENTICACIÓN ======
const haIniciado = function (request, response, next) {
    if (request.isAuthenticated()) {
        next();
    } else {
        response.redirect("/");
    }
};

// ====== RUTAS GET ======

app.get("/fallo", function (request, response) {
    console.error("❌ Fallo en autenticación");
    response.redirect("/?error=auth_failed&message=Error%20de%20autenticaci%C3%B3n");
});

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

// ====== RUTAS DE GOOGLE OAUTH ======

// Ruta para LOGIN con Google
app.get(
    "/auth/google/login",
    function(req, res, next) {
        req.session.googleOrigin = 'login';
        console.log("🔵 Iniciando Google OAuth desde LOGIN");
        next();
    },
    passport.authenticate("google", {
        scope: ["profile", "email"],
        prompt: "select_account" // Forzar selección de cuenta
    })
);

// Ruta para REGISTRO con Google
app.get(
    "/auth/google/registro",
    function(req, res, next) {
        req.session.googleOrigin = 'registro';
        console.log("🟢 Iniciando Google OAuth desde REGISTRO");
        next();
    },
    passport.authenticate("google", {
        scope: ["profile", "email"],
        prompt: "select_account"
    })
);

// CALLBACK de Google OAuth
app.get(
    "/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/fallo",
        session: true // IMPORTANTE: asegurar que se cree sesión
    }),
    function (req, res) {
        console.log("🔐 Google callback exitoso");
        console.log("Usuario en req.user:", req.user ? "SÍ ✅" : "NO ❌");

        if (!req.user) {
            console.error("❌ CRÍTICO: req.user es undefined después de autenticación");
            return res.redirect("/fallo");
        }

        console.log("Email del usuario:", req.user.emails ? req.user.emails[0].value : "No disponible");

        // Guardar sesión explícitamente antes de redirigir
        req.session.save((err) => {
            if (err) {
                console.error("❌ Error al guardar sesión:", err);
                return res.redirect("/fallo");
            }
            console.log("✅ Sesión guardada correctamente");
            res.redirect("/good");
        });
    }
);

// Ruta /good (después de autenticación exitosa)
app.get("/good", function (request, response) {
    console.log("📍 Entrando a /good");
    console.log("request.user existe:", !!request.user);
    console.log("request.isAuthenticated():", request.isAuthenticated());

    if (!request.user || !request.user.emails || request.user.emails.length === 0) {
        console.error("❌ Error: Usuario no autenticado o sin email en callback de Google");
        console.error("request.user:", request.user);
        console.error("Tamaño de sesión:", JSON.stringify(request.session || {}).length, "bytes");
        return response.redirect("/?error=auth_failed&message=" + encodeURIComponent("Error de autenticación con Google"));
    }

    let email = request.user.emails[0].value;
    let origin = request.session.googleOrigin || 'login';
    console.log("🔐 Google OAuth: Verificando usuario:", email, "| Origen:", origin);

    sistema.verificarUsuarioGoogle(email, function (existeUsuario) {
        if (existeUsuario) {
            if (origin === 'login') {
                console.log("✅ Usuario Google existente, iniciando sesión automática:", email);
                request.logIn(existeUsuario, function(err) {
                    if (err) {
                        console.error("❌ Error al crear sesión:", err);
                        return response.redirect("/?error=session_error");
                    }

                    response.cookie("nick", existeUsuario.email);
                    response.cookie("userName", existeUsuario.username || email.split('@')[0]);
                    response.redirect("/?google=login_success");
                });
            } else {
                console.log("⚠️ Usuario Google ya registrado, desde REGISTRO:", email);
                return response.redirect("/?view=login&google=already_exists&email=" + encodeURIComponent(email));
            }
        } else {
            console.log("📝 Nuevo usuario Google, solicitando contraseña:", email, "| Origen:", origin);

            request.session.googleUserData = {
                email: email,
                confirmada: true,
                provider: 'google'
            };

            if (origin === 'login') {
                response.redirect("/?google=new_user&email=" + encodeURIComponent(email));
            } else {
                response.redirect("/?view=registro&google=new_user&email=" + encodeURIComponent(email));
            }
        }
    });
});

// Callback de Google One Tap
app.post('/oneTap/callback',
    passport.authenticate('google-one-tap', {failureRedirect: '/fallo'}),
    function (req, res) {
        console.log("🔐 Google One Tap: Autenticación exitosa");
        req.session.save((err) => {
            if (err) {
                console.error("❌ Error al guardar sesión:", err);
                return res.redirect("/fallo");
            }
            res.redirect('/good');
        });
    }
);

app.get("/ok", function (request, response) {
    if (request.isAuthenticated() && request.user) {
        response.send({
            nick: request.user.email,
            username: request.user.username || request.user.email.split('@')[0]
        });
    } else {
        response.status(401).send({ error: "No autenticado" });
    }
});

app.get("/confirmarUsuario/:email/:key", function (request, response) {
    let email = request.params.email;
    let key = request.params.key;
    sistema.confirmarUsuario({"email": email, "key": key}, function (usr) {
        if (usr.email != -1) {
            response.redirect('/?verificado=true&email=' + encodeURIComponent(email));
        } else {
            response.redirect('/?verificado=false');
        }
    });
});

app.get("/restablecerPassword/:email/:token", function (request, response) {
    let email = request.params.email;
    let token = request.params.token;
    response.redirect('/?resetPassword=true&email=' + encodeURIComponent(email) + '&token=' + encodeURIComponent(token));
});

// ====== RUTAS POST ======

app.post("/registrarUsuario", function (request, response) {
    const { email, password, username } = request.body;

    if (!email || !password || !username) {
        return response.status(400).send({
            nick: -1,
            error: "Datos incompletos"
        });
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return response.status(400).send({
            nick: -1,
            error: "Username inválido"
        });
    }

    sistema.registrarUsuario(request.body, function (res) {
        if (res.email === -1) {
            return response.status(409).send({
                nick: -1,
                error: res.error || "Error al registrar usuario"
            });
        }
        response.send({"nick": res.email});
    });
});

app.post('/loginUsuario', function(request, response, next) {
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
            console.warn("⚠️ Login fallido: Usuario no encontrado o credenciales incorrectas");
            return response.status(401).send({
                nick: -1,
                error: "Credenciales incorrectas o cuenta no verificada"
            });
        }

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
            return response.send({
                "nick": user.email,
                "username": user.username || user.email.split('@')[0]
            });
        });
    })(request, response, next);
});

app.post("/cerrarSesion", function (request, response) {
    let email = null;
    if (request.user && request.user.email) {
        email = request.user.email;
    }

    console.log("🔐 Usuario cerrando sesión:", email || "desconocido");

    if (!request.user) {
        console.log("⚠️ No hay sesión activa para cerrar");
        return response.json({
            success: true,
            mensaje: "No había sesión activa"
        });
    }

    request.logout(function(err) {
        if (err) {
            console.error("❌ Error al cerrar sesión:", err);
            return response.status(500).json({
                success: false,
                error: "Error al cerrar sesión"
            });
        }

        response.clearCookie('connect.sid');
        response.clearCookie('Sistema');

        if (email) {
            try {
                sistema.eliminarUsuario(email);
                console.log("✅ Usuario eliminado del sistema:", email);
            } catch (error) {
                console.error("⚠️ Error al eliminar usuario:", error);
            }
        }

        request.session.destroy(function(err) {
            if (err) {
                console.error("⚠️ Error al destruir sesión:", err);
            }

            console.log("✅ Sesión cerrada correctamente para:", email);
            response.json({
                success: true,
                mensaje: "Sesión cerrada correctamente"
            });
        });
    });
});

app.post("/completarRegistroGoogle", function (request, response) {
    const { password, username } = request.body;

    console.log("📝 [1/8] Completando registro de usuario Google");

    if (!request.session.googleUserData) {
        console.error("❌ No hay datos de Google en la sesión");
        return response.status(400).send({
            success: false,
            error: "No hay datos de registro pendientes"
        });
    }

    if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return response.status(400).send({
            success: false,
            error: "Username inválido"
        });
    }

    if (!password || password.length < 8) {
        return response.status(400).send({
            success: false,
            error: "La contraseña debe tener al menos 8 caracteres"
        });
    }

    const googleData = request.session.googleUserData;
    const nuevoUsuario = {
        email: googleData.email,
        password: password,
        username: username,
        confirmada: true,
        provider: 'google',
        fechaRegistro: new Date()
    };

    sistema.registrarUsuario(nuevoUsuario, function (res) {
        if (res.email === -1) {
            console.error("❌ Error al registrar usuario Google:", res.error);
            return response.status(500).send({
                success: false,
                error: res.error || "Error al crear el usuario"
            });
        }

        console.log("✅ Usuario Google registrado:", res.email);

        sistema.buscarUsuarioPorEmail(res.email, function(usuario) {
            if (!usuario) {
                return response.status(500).send({
                    success: false,
                    error: "Usuario creado pero no se pudo iniciar sesión"
                });
            }

            request.logIn(usuario, function(err) {
                if (err) {
                    console.error("❌ Error al crear sesión:", err);
                    return response.status(500).send({
                        success: false,
                        error: "Usuario creado pero error al iniciar sesión"
                    });
                }

                delete request.session.googleUserData;

                response.json({
                    success: true,
                    email: usuario.email,
                    username: usuario.username
                });
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

// ====== RUTAS DE GRUPOS ======
app.get("/api/grupos", haIniciado, function(request, response) {
    sistema.obtenerGrupos(function(grupos) {
        response.json(grupos);
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
        if (!grupo || grupo.id === -1) {
            return response.status(500).json({
                success: false,
                error: grupo?.error || "Error al unirse al grupo"
            });
        }
        response.json({
            success: true,
            grupo: grupo
        });
    });
});

app.post("/api/grupos/:grupoId/salir", haIniciado, function(request, response) {
    const grupoId = request.params.grupoId;
    const emailUsuario = request.user.email;

    sistema.salirDeGrupo(grupoId, emailUsuario, function(grupo) {
        if (!grupo || grupo.id === -1) {
            return response.status(500).json({
                success: false,
                error: grupo?.error || "Error al abandonar el grupo"
            });
        }
        response.json({
            success: true,
            grupo: grupo
        });
    });
});

app.get("/api/grupos/:grupoId/mensajes", haIniciado, function(request, response) {
    const grupoId = request.params.grupoId;
    sistema.obtenerMensajes(grupoId, function(mensajes) {
        response.json(mensajes);
    });
});

app.post("/api/usuarios/info", haIniciado, function(request, response) {
    const { emails } = request.body;

    if (!emails || !Array.isArray(emails)) {
        return response.status(400).json({ error: "Se requiere un array de emails" });
    }

    sistema.obtenerInfoUsuarios(emails, function(usuarios) {
        response.json(usuarios);
    });
});

// ====== SOCKET.IO ======
const usuariosOnlinePorGrupo = {};

io.on('connection', (socket) => {
    console.log('🔌 Usuario conectado:', socket.id);

    socket.on('unirseGrupo', (data) => {
        const grupoId = typeof data === 'string' ? data : data.grupoId;
        const usuarioEmail = data.usuarioEmail;
        const usuarioUsername = data.usuarioUsername;

        socket.join(grupoId);
        socket.grupoId = grupoId;
        socket.usuarioEmail = usuarioEmail;
        socket.usuarioUsername = usuarioUsername;

        if (!usuariosOnlinePorGrupo[grupoId]) {
            usuariosOnlinePorGrupo[grupoId] = {};
        }

        for (const socketId in usuariosOnlinePorGrupo[grupoId]) {
            if (usuariosOnlinePorGrupo[grupoId][socketId].email === usuarioEmail && socketId !== socket.id) {
                delete usuariosOnlinePorGrupo[grupoId][socketId];
            }
        }

        usuariosOnlinePorGrupo[grupoId][socket.id] = {
            email: usuarioEmail,
            username: usuarioUsername
        };

        socket.to(grupoId).emit('usuarioConectado', {
            grupoId: grupoId,
            email: usuarioEmail,
            username: usuarioUsername
        });

        const usuariosOnlineSet = new Set();
        Object.values(usuariosOnlinePorGrupo[grupoId] || {}).forEach(u => {
            usuariosOnlineSet.add(u.email);
        });
        const usuariosOnline = Array.from(usuariosOnlineSet);

        io.to(grupoId).emit('usuariosOnlineActualizados', {
            grupoId: grupoId,
            usuarios: usuariosOnline
        });
    });

    socket.on('salirGrupo', (grupoId) => {
        socket.leave(grupoId);

        if (usuariosOnlinePorGrupo[grupoId] && usuariosOnlinePorGrupo[grupoId][socket.id]) {
            const usuarioInfo = usuariosOnlinePorGrupo[grupoId][socket.id];
            delete usuariosOnlinePorGrupo[grupoId][socket.id];

            socket.to(grupoId).emit('usuarioDesconectado', {
                grupoId: grupoId,
                email: usuarioInfo.email,
                username: usuarioInfo.username
            });

            const usuariosOnlineSet = new Set();
            Object.values(usuariosOnlinePorGrupo[grupoId] || {}).forEach(u => {
                usuariosOnlineSet.add(u.email);
            });
            const usuariosOnline = Array.from(usuariosOnlineSet);

            io.to(grupoId).emit('usuariosOnlineActualizados', {
                grupoId: grupoId,
                usuarios: usuariosOnline
            });

            if (Object.keys(usuariosOnlinePorGrupo[grupoId]).length === 0) {
                delete usuariosOnlinePorGrupo[grupoId];
            }
        }
    });

    socket.on('enviarMensaje', (mensaje) => {
        sistema.enviarMensaje(mensaje, function(mensajeGuardado) {
            if (mensajeGuardado && mensajeGuardado.id !== -1) {
                io.to(mensaje.grupoId).emit('nuevoMensaje', mensajeGuardado);
            } else {
                socket.emit('errorMensaje', { error: 'Error al enviar el mensaje' });
            }
        });
    });

    socket.on('escribiendo', (data) => {
        socket.to(data.grupoId).emit('usuarioEscribiendo', {
            nombreUsuario: data.nombreUsuario,
            grupoId: data.grupoId
        });
    });

    socket.on('dejoDeEscribir', (data) => {
        socket.to(data.grupoId).emit('usuarioDejoDeEscribir', {
            nombreUsuario: data.nombreUsuario,
            grupoId: data.grupoId
        });
    });

    socket.on('disconnect', () => {
        const grupoId = socket.grupoId;
        if (grupoId && usuariosOnlinePorGrupo[grupoId] && usuariosOnlinePorGrupo[grupoId][socket.id]) {
            const usuarioInfo = usuariosOnlinePorGrupo[grupoId][socket.id];
            delete usuariosOnlinePorGrupo[grupoId][socket.id];

            socket.to(grupoId).emit('usuarioDesconectado', {
                grupoId: grupoId,
                email: usuarioInfo.email,
                username: usuarioInfo.username
            });

            const usuariosOnlineSet = new Set();
            Object.values(usuariosOnlinePorGrupo[grupoId] || {}).forEach(u => {
                usuariosOnlineSet.add(u.email);
            });
            const usuariosOnline = Array.from(usuariosOnlineSet);

            io.to(grupoId).emit('usuariosOnlineActualizados', {
                grupoId: grupoId,
                usuarios: usuariosOnline
            });

            if (Object.keys(usuariosOnlinePorGrupo[grupoId]).length === 0) {
                delete usuariosOnlinePorGrupo[grupoId];
            }
        }
    });
});

// ====== INICIAR SERVIDOR ======
server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
    console.log(`🔌 WebSocket habilitado`);
    console.log(`🔐 Google Client ID: ${config.google.clientId ? 'Configurado ✅' : 'NO configurado ❌'}`);
    console.log(`🔐 Callback URL: ${config.google.callbackUrl || 'NO configurado ❌'}`);
    console.log("Ctrl+C para salir");
}).on('error', (err) => {
    console.error('Error al iniciar el servidor:', err);
    process.exit(1);
});