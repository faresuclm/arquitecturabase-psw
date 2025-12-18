const config = require("./config/config");
const bodyParser = require("body-parser");
const fs = require("fs");
const express = require("express");
const cookieSession = require("cookie-session");
const passport = require("passport");
const modelo = require("./servidor/modelo.js");

// === IMPORTS DE SEGURIDAD ===
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");

const app = express();

// CORRECCIÓN IMPORTANTE PARA CLOUD RUN:
app.set('trust proxy', 1);

const http = require("http");
const server = http.createServer(app);
const {Server} = require("socket.io");
const io = new Server(server);
const PORT = config.server.port;

// Importar configuración de Passport
const requirePassportSetup = require("./servidor/passport-setup");

let sistema = new modelo.Sistema();

// ====== MIDDLEWARES DE SEGURIDAD ======
app.use(helmet({contentSecurityPolicy: false}));

app.use((req, res, next) => {
    Object.defineProperty(req, 'query', {
        value: req.query,
        writable: true,
        enumerable: true,
        configurable: true
    });
    next();
});

app.use(mongoSanitize());

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {error: "Demasiados intentos, por favor intenta más tarde."},
    standardHeaders: true,
    legacyHeaders: false,
});

app.use("/loginUsuario", authLimiter);
app.use("/registrarUsuario", authLimiter);
app.use("/completarRegistroGoogle", authLimiter);
app.use("/solicitarRecuperacionPassword", authLimiter);

// ====== MIDDLEWARE GENERAL ======
app.use(express.static(__dirname + "/"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// ====== CONFIGURACIÓN DE SESIÓN ======
app.use(
    cookieSession({
        name: "Sistema",
        keys: config.server.sessionKeys,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',
        httpOnly: true,
        secure: config.server.isProduction,
        signed: true
    })
);

// ====== INICIALIZAR PASSPORT ======
app.use(passport.initialize());
app.use(passport.session());

requirePassportSetup(passport, sistema);

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
app.get("/auth/google/login",
    function (req, res, next) {
        req.session.googleOrigin = 'login';
        next();
    },
    passport.authenticate("google", {scope: ["profile", "email"], prompt: "select_account"})
);

// Ruta para REGISTRO con Google
app.get("/auth/google/registro",
    function (req, res, next) {
        req.session.googleOrigin = 'registro';
        next();
    },
    passport.authenticate("google", {scope: ["profile", "email"], prompt: "select_account"})
);

// CALLBACK de Google OAuth
app.get("/google/callback",
    passport.authenticate("google", {failureRedirect: "/fallo", session: true}),
    function (req, res) {
        res.redirect("/good");
    }
);

// Ruta /good (Lógica inteligente post-autenticación)
app.get("/good", function (request, response) {
    if (!request.user || !request.user.emails) {
        return response.redirect("/?error=auth_failed");
    }

    let email = request.user.emails[0].value;
    // let origin = request.session.googleOrigin || 'login'; // Ya no es estricto, usamos lógica inteligente

    sistema.verificarUsuarioGoogle(email, function (existeUsuario) {
        if (existeUsuario) {
            // == CASO 1: EL USUARIO YA EXISTE ==
            // Iniciar sesión automáticamente (Login directo)
            request.logIn(existeUsuario, function (err) {
                if (err) return response.redirect("/?error=session_error");
                response.cookie("nick", existeUsuario.email);
                response.cookie("userName", existeUsuario.username || email.split('@')[0]);
                // Redirigir al home logueado
                response.redirect("/?google=login_success");
            });

        } else {
            // == CASO 2: EL USUARIO NO EXISTE ==
            // Asumimos que quiere registrarse.
            // Guardamos datos temporales
            request.session.googleUserData = {
                email: email,
                confirmada: true,
                provider: 'google'
            };

            // Redirigimos al Login pero forzamos la apertura del modal de contraseña
            response.redirect("/?view=login&modal=google_complete_registration&email=" + encodeURIComponent(email));
        }
    });
});

app.get("/ok", function (request, response) {
    if (request.isAuthenticated() && request.user) {
        response.send({
            nick: request.user.email,
            username: request.user.username || request.user.email.split('@')[0]
        });
    } else {
        response.status(401).send({error: "No autenticado"});
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
    const {email, password, username} = request.body;
    sistema.registrarUsuario(request.body, function (res) {
        if (res.email === -1) {
            return response.status(409).send({nick: -1, error: res.error || "Error al registrar"});
        }
        response.send({"nick": res.email});
    });
});

app.post('/loginUsuario', function (request, response, next) {
    const {email, password} = request.body;
    if (!email || !password) return response.status(400).send({nick: -1, error: "Faltan datos"});

    passport.authenticate('local', function (err, user, info) {
        if (err) return response.status(500).send({nick: -1, error: "Error de servidor"});
        if (!user) return response.status(401).send({nick: -1, error: info ? info.message : "Credenciales inválidas"});

        request.logIn(user, function (err) {
            if (err) return response.status(500).send({nick: -1, error: "Error de sesión"});
            return response.send({"nick": user.email, "username": user.username});
        });
    })(request, response, next);
});

app.post("/cerrarSesion", function (request, response) {
    if (!request.user) return response.json({success: true, mensaje: "No había sesión"});

    let email = request.user.email;
    request.logout(function (err) {
        if (err) return response.status(500).json({success: false, error: "Fallo al logout"});

        response.clearCookie('connect.sid');
        response.clearCookie('Sistema');
        try {
            sistema.eliminarUsuario(email);
        } catch (e) {
        }

        request.session = null;
        response.json({success: true, mensaje: "Sesión cerrada"});
    });
});

app.post("/completarRegistroGoogle", function (request, response) {
    const {password, username} = request.body;
    if (!request.session.googleUserData) return response.status(400).send({
        success: false,
        error: "Sin datos de Google"
    });

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
        if (res.email === -1) return response.status(500).send({success: false, error: res.error});

        delete request.session.googleUserData;

        request.logIn(nuevoUsuario, function (err) {
            response.json({success: true, email: res.email, username: username});
        });
    });
});

app.post("/solicitarRecuperacionPassword", function (request, response) {
    const {email} = request.body;
    if (!email) return response.status(400).send({success: false});
    sistema.solicitarRecuperacionPassword(email, function (res) {
        if (!res.success) return response.status(404).send(res);
        response.send(res);
    });
});

app.post("/restablecerPassword", function (request, response) {
    const {email, token, newPassword} = request.body;
    sistema.restablecerPassword(email, token, newPassword, function (res) {
        if (!res.success) return response.status(400).send(res);
        response.send(res);
    });
});

// ====== RUTAS DE GRUPOS Y API ======
app.get("/api/grupos", haIniciado, (req, res) => sistema.obtenerGrupos(grupos => res.json(grupos)));
app.get("/api/grupos/:grupoId", haIniciado, (req, res) => sistema.obtenerGrupo(req.params.grupoId, g => g ? res.json(g) : res.status(404).json({error: "404"})));
app.post("/api/grupos/:grupoId/unirse", haIniciado, (req, res) => sistema.unirseAGrupo(req.params.grupoId, req.user.email, g => res.json({
    success: !!g,
    grupo: g
})));
app.post("/api/grupos/:grupoId/salir", haIniciado, (req, res) => sistema.salirDeGrupo(req.params.grupoId, req.user.email, g => res.json({
    success: !!g,
    grupo: g
})));
app.get("/api/grupos/:grupoId/mensajes", haIniciado, (req, res) => sistema.obtenerMensajes(req.params.grupoId, m => res.json(m)));
app.post("/api/usuarios/info", haIniciado, (req, res) => sistema.obtenerInfoUsuarios(req.body.emails || [], u => res.json(u)));
app.get("/verificarUsername/:username", function (req, res) {
    const username = req.params.username;
    sistema.verificarUsernameDisponible(username, function (disponible) {
        res.json({disponible: disponible});
    });
});

// ====== SOCKET.IO ======
const usuariosOnlinePorGrupo = {};

io.on('connection', (socket) => {
    socket.on('unirseGrupo', (data) => {
        const grupoId = data.grupoId || data;
        const usuarioEmail = data.usuarioEmail;
        const usuarioUsername = data.usuarioUsername;

        socket.join(grupoId);
        socket.grupoId = grupoId;
        socket.usuarioEmail = usuarioEmail;
        socket.usuarioUsername = usuarioUsername;

        if (!usuariosOnlinePorGrupo[grupoId]) usuariosOnlinePorGrupo[grupoId] = {};

        for (const sId in usuariosOnlinePorGrupo[grupoId]) {
            if (usuariosOnlinePorGrupo[grupoId][sId].email === usuarioEmail && sId !== socket.id) {
                delete usuariosOnlinePorGrupo[grupoId][sId];
            }
        }

        usuariosOnlinePorGrupo[grupoId][socket.id] = {email: usuarioEmail, username: usuarioUsername};

        const lista = Array.from(new Set(Object.values(usuariosOnlinePorGrupo[grupoId]).map(u => u.email)));
        io.to(grupoId).emit('usuariosOnlineActualizados', {grupoId, usuarios: lista});
    });

    socket.on('enviarMensaje', (mensaje) => {
        sistema.enviarMensaje(mensaje, (msg) => {
            if (msg && msg.id !== -1) io.to(mensaje.grupoId).emit('nuevoMensaje', msg);
        });
    });

    socket.on('escribiendo', (data) => socket.to(data.grupoId).emit('usuarioEscribiendo', data));
    socket.on('dejoDeEscribir', (data) => socket.to(data.grupoId).emit('usuarioDejoDeEscribir', data));

    const desconectar = () => {
        const gId = socket.grupoId;
        if (gId && usuariosOnlinePorGrupo[gId] && usuariosOnlinePorGrupo[gId][socket.id]) {
            delete usuariosOnlinePorGrupo[gId][socket.id];
            const lista = Array.from(new Set(Object.values(usuariosOnlinePorGrupo[gId]).map(u => u.email)));
            io.to(gId).emit('usuariosOnlineActualizados', {grupoId: gId, usuarios: lista});
            if (Object.keys(usuariosOnlinePorGrupo[gId]).length === 0) delete usuariosOnlinePorGrupo[gId];
        }
    };

    socket.on('salirGrupo', (gId) => {
        socket.leave(gId);
        desconectar();
    });
    socket.on('disconnect', desconectar);
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
    console.log(`🔒 Modo Producción: ${config.server.isProduction ? 'SÍ' : 'NO'}`);
});