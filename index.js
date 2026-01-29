// === INICIALIZACIÓN DE SECRET MANAGER ===
// DEBE ser lo primero para cargar secretos antes de cualquier otra configuración
const { initializeSecretManager } = require("./config/secretManager");

const bodyParser = require("body-parser");
const fs = require("fs");
const express = require("express");
const cookieSession = require("cookie-session");
const passport = require("passport");

// === IMPORTS DE SEGURIDAD ===
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");

// === IMPORTS DE ARQUITECTURA DESACOPLADA ===
const DatabaseInitializer = require("./servidor/databaseInitializer");
const UsuarioService = require("./servidor/servicios/usuarioService");
const GrupoService = require("./servidor/servicios/grupoService");
const MensajeService = require("./servidor/servicios/mensajeService");
const UsuarioController = require("./servidor/controladores/usuarioController");
const GrupoController = require("./servidor/controladores/grupoController");
const MensajeController = require("./servidor/controladores/mensajeController");
const RouterConfigurator = require("./servidor/routerConfigurator");
const SocketHandler = require("./servidor/websocket/socketHandler");

const app = express();

// CORRECCIÓN IMPORTANTE PARA CLOUD RUN:
app.set('trust proxy', 1);

const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// Importar configuración de Passport
const requirePassportSetup = require("./servidor/passport-setup");

// Variables globales para servicios y controladores
let usuarioService;
let grupoService;
let mensajeService;
let usuarioController;
let grupoController;
let mensajeController;
let socketHandler;
let config; // Se inicializará después de cargar secretos
let PORT;

// ====== MIDDLEWARES DE SEGURIDAD ======
app.use(helmet({ contentSecurityPolicy: false }));

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
    message: { error: "Demasiados intentos, por favor intenta más tarde." },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use("/loginUsuario", authLimiter);
app.use("/registrarUsuario", authLimiter);
app.use("/completarRegistroGoogle", authLimiter);
app.use("/solicitarRecuperacionPassword", authLimiter);

// ====== MIDDLEWARE GENERAL ======
app.use(express.static(__dirname + "/"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// ====== INICIALIZACIÓN DE LA APLICACIÓN ======
async function inicializarAplicacion() {
    try {
        console.log("🚀 Iniciando aplicación con arquitectura desacoplada...");

        // 0. Inicializar Secret Manager (carga secretos desde GCP en producción)
        await initializeSecretManager();
        console.log("✅ Secret Manager inicializado");

        // Ahora podemos cargar config de forma segura
        config = require("./config/config");
        PORT = config.server.port;

        // Debug: Verificar que los secretos se cargaron
        console.log("🔍 Verificando configuración:");
        console.log("   - MongoDB URL:", config.mongodb.url ? "✅ Cargado" : "❌ Falta");
        console.log("   - Session Keys:", config.server.sessionKeys.length, "claves");
        console.log("   - Google Client ID:", config.google.clientId ? "✅ Cargado" : "❌ Falta");
        console.log("   - Google Callback URL:", config.google.callbackUrl || "❌ Falta");
        console.log("   - Google Callback URI:", config.google.callbackUri || "❌ Falta");

        // ====== CONFIGURACIÓN DE SESIÓN (requiere config) ======
        app.use(
            cookieSession({
                name: "Sistema",
                keys: config.server.sessionKeys,
                maxAge: 24 * 60 * 60 * 1000,
                sameSite: config.server.isProduction ? 'none' : 'lax',
                httpOnly: true,
                secure: config.server.isProduction,
                signed: true
            })
        );

        // ====== INICIALIZAR PASSPORT ======
        app.use(passport.initialize());
        app.use(passport.session());

        // ====== RUTAS ESTÁTICAS (requieren config) ======
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

        // Rutas para páginas HTML con animaciones mejoradas
        app.get("/cliente/grupos.html", function (request, response) {
            var contenido = fs.readFileSync(__dirname + "/cliente/grupos.html");
            response.setHeader("Content-type", "text/html");
            response.send(contenido);
        });

        app.get("/cliente/chat.html", function (request, response) {
            var contenido = fs.readFileSync(__dirname + "/cliente/chat.html");
            response.setHeader("Content-type", "text/html");
            response.send(contenido);
        });

        app.get("/cliente/ajustes.html", function (request, response) {
            var contenido = fs.readFileSync(__dirname + "/cliente/ajustes.html");
            response.setHeader("Content-type", "text/html");
            response.send(contenido);
        });


        // 1. Conectar a la base de datos e inicializar repositorios
        const dbInitializer = new DatabaseInitializer();
        const { usuarioRepository, grupoRepository, mensajeRepository } = await dbInitializer.conectar();

        // 2. Crear servicios (lógica de negocio)
        // Crear grupoService primero
        grupoService = new GrupoService(grupoRepository);

        // Crear usuarioService con referencia a grupoService para eliminación en cascada
        usuarioService = new UsuarioService(usuarioRepository, grupoService);

        mensajeService = new MensajeService(mensajeRepository, grupoService);

        // 3. Inicializar grupos predeterminados
        await grupoService.inicializarGruposPredeterminados();

        // 4. Crear controladores (capa de presentación)
        usuarioController = new UsuarioController(usuarioService);
        grupoController = new GrupoController(grupoService);
        mensajeController = new MensajeController(mensajeService);


        // 5. Configurar Passport con el servicio de usuario
        const sistemaAdaptado = {
            buscarUsuarioPorEmail: async (email, callback) => {
                try {
                    const usuario = await usuarioService.buscarPorEmail(email);
                    callback(usuario);
                } catch (error) {
                    callback(null);
                }
            },
            verificarUsuarioGoogle: async (email, callback) => {
                try {
                    const usuario = await usuarioService.verificarUsuarioGoogle(email);
                    callback(usuario);
                } catch (error) {
                    callback(null);
                }
            },
            loginUsuario: (obj, callback) => {
                usuarioService.loginUsuario(obj)
                    .then(usuario => callback(usuario))
                    .catch(error => callback({ email: -1, error: error.message }));
            }
        };

        requirePassportSetup(passport, sistemaAdaptado);

        // 6. Configurar rutas
        const routerConfigurator = new RouterConfigurator(
            usuarioController,
            grupoController,
            mensajeController,
            passport
        );
        routerConfigurator.configurar(app);


        // 7. Configurar Socket.IO
        socketHandler = new SocketHandler(io, mensajeController);
        socketHandler.inicializar();

        // 8. Iniciar servidor
        server.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
            console.log(`🔒 Modo Producción: ${config.server.isProduction ? 'SÍ' : 'NO'}`);
            console.log("✅ Arquitectura desacoplada cargada exitosamente");
        });

    } catch (error) {
        console.error("❌ Error al inicializar la aplicación:", error);
        process.exit(1);
    }
}

// Iniciar la aplicación
inicializarAplicacion();

