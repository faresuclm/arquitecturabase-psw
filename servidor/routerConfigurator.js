const express = require("express");

/**
 * Configurador de Rutas - Centraliza todas las rutas de la aplicación
 * Desacopla las rutas de los controladores
 */
class RouterConfigurator {
    constructor(usuarioController, grupoController, mensajeController, passport) {
        this.usuarioController = usuarioController;
        this.grupoController = grupoController;
        this.mensajeController = mensajeController;
        this.passport = passport;
    }

    configurar(app) {
        // Middleware de autenticación
        const haIniciado = (req, res, next) => {
            if (req.isAuthenticated()) {
                next();
            } else {
                res.redirect("/");
            }
        };

        // ====== RUTAS DE AUTENTICACIÓN ======
        app.post("/registrarUsuario", (req, res) => this.usuarioController.registrar(req, res));
        app.post("/loginUsuario", (req, res, next) => this.usuarioController.login(req, res, next));
        app.post("/cerrarSesion", (req, res) => this.usuarioController.cerrarSesion(req, res));
        app.get("/ok", (req, res) => this.usuarioController.obtenerSesion(req, res));

        app.get("/confirmarUsuario/:email/:key", (req, res) =>
            this.usuarioController.confirmar(req, res)
        );

        app.get("/verificarUsername/:username", (req, res) =>
            this.usuarioController.verificarUsername(req, res)
        );

        app.post("/solicitarRecuperacionPassword", (req, res) =>
            this.usuarioController.solicitarRecuperacion(req, res)
        );

        app.post("/restablecerPassword", (req, res) =>
            this.usuarioController.restablecerPassword(req, res)
        );

        app.post("/completarRegistroGoogle", (req, res) =>
            this.usuarioController.completarRegistroGoogle(req, res)
        );

        app.get("/restablecerPassword/:email/:token", (req, res) => {
            const { email, token } = req.params;
            res.redirect('/?resetPassword=true&email=' + encodeURIComponent(email) +
                        '&token=' + encodeURIComponent(token));
        });

        // ====== RUTAS DE GOOGLE OAUTH ======
        app.get("/auth/google/login",
            (req, res, next) => {
                req.session.googleOrigin = 'login';
                next();
            },
            this.passport.authenticate("google", {
                scope: ["profile", "email"],
                prompt: "select_account"
            })
        );

        app.get("/auth/google/registro",
            (req, res, next) => {
                req.session.googleOrigin = 'registro';
                next();
            },
            this.passport.authenticate("google", {
                scope: ["profile", "email"],
                prompt: "select_account"
            })
        );

        // ====== RUTA DE GOOGLE ONE TAP ======
        app.post("/auth/google/one-tap",
            this.passport.authenticate("google-one-tap", {
                failureRedirect: "/fallo",
                session: true
            }),
            (req, res) => {
                console.log('📍 En /auth/google/one-tap callback');
                console.log('👤 req.user:', req.user ? 'Existe' : 'NO EXISTE');
                console.log('🔑 req.isAuthenticated():', req.isAuthenticated ? req.isAuthenticated() : 'Método no disponible');

                if (req.user) {
                    console.log('✅ Usuario autenticado con One Tap, datos:', {
                        emails: req.user.emails,
                        displayName: req.user.displayName,
                        id: req.user.id
                    });
                } else {
                    console.error('❌ PROBLEMA: req.user es undefined/null después de authenticate (One Tap)');
                }

                // Marcar que viene de One Tap para la ruta /good
                req.session.googleOrigin = 'onetap';
                res.redirect("/good");
            }
        );

        app.get("/google/callback",
            this.passport.authenticate("google", {
                failureRedirect: "/fallo",
                session: true
            }),
            (req, res) => {
                console.log('📍 En /google/callback');
                console.log('👤 req.user:', req.user ? 'Existe' : 'NO EXISTE');
                console.log('🔑 req.isAuthenticated():', req.isAuthenticated ? req.isAuthenticated() : 'Método no disponible');
                console.log('📦 req.session:', req.session ? 'Existe' : 'NO EXISTE');

                if (req.user) {
                    console.log('✅ Usuario autenticado correctamente, datos:', {
                        emails: req.user.emails,
                        displayName: req.user.displayName,
                        id: req.user.id
                    });
                } else {
                    console.error('❌ PROBLEMA: req.user es undefined/null después de authenticate');
                }

                res.redirect("/good");
            }
        );

        app.get("/good", async (req, res) => {
            console.log('📍 En /good');
            console.log('👤 req.user completo:', JSON.stringify(req.user, null, 2));
            console.log('🔑 req.isAuthenticated():', req.isAuthenticated ? req.isAuthenticated() : 'N/A');
            console.log('📦 req.session:', req.session);

            if (!req.user) {
                console.error("❌ ERROR CRÍTICO: req.user es undefined/null");
                return res.redirect("/?error=auth_failed&message=" + encodeURIComponent("Usuario no válido en callback"));
            }

            // Buscar el email en diferentes ubicaciones del profile
            let email = null;

            // Opción 1: req.user.emails[0].value (formato estándar de Passport Google OAuth)
            if (req.user.emails && req.user.emails[0] && req.user.emails[0].value) {
                email = req.user.emails[0].value;
                console.log('✅ Email encontrado en req.user.emails[0].value:', email);
            }
            // Opción 2: req.user.email (formato alternativo)
            else if (req.user.email) {
                email = req.user.email;
                console.log('✅ Email encontrado en req.user.email:', email);
            }
            // Opción 3: req.user._json.email (formato de Google)
            else if (req.user._json && req.user._json.email) {
                email = req.user._json.email;
                console.log('✅ Email encontrado en req.user._json.email:', email);
            }

            if (!email) {
                console.error("❌ ERROR: No se pudo obtener el email del usuario");
                console.error("req.user completo:", JSON.stringify(req.user, null, 2));
                return res.redirect("/?error=auth_failed&message=" + encodeURIComponent("Email no disponible"));
            }

            const googleOrigin = req.session.googleOrigin || 'login';

            console.log(`🔐 Callback de Google OAuth - Email: ${email}, Origen: ${googleOrigin}`);

            try {
                // Verificar si el usuario existe en la base de datos
                const existeUsuario = await this.usuarioController.usuarioService.buscarPorEmail(email);

                if (existeUsuario) {
                    // ✅ USUARIO EXISTE - Login automático
                    console.log(`✅ Usuario ${email} ya existe - Iniciando sesión automáticamente`);

                    req.logIn(existeUsuario, (err) => {
                        if (err) {
                            console.error("❌ Error al iniciar sesión:", err);
                            return res.redirect("/?error=session_error");
                        }

                        // Establecer cookies de sesión
                        res.cookie("nick", existeUsuario.email);
                        res.cookie("userName", existeUsuario.username || email.split('@')[0]);

                        console.log(`✅ Sesión iniciada para ${email} - Redirigiendo a login_success`);

                        // Redirigir con parámetro de éxito
                        res.redirect("/?google=login_success");
                    });
                } else {
                    // ❌ USUARIO NO EXISTE - Mostrar modal para completar registro
                    console.log(`📝 Usuario ${email} NO existe - Mostrando modal de registro`);

                    // Guardar datos de Google en sesión para completar registro después
                    req.session.googleUserData = {
                        email: email,
                        confirmada: true,
                        provider: 'google'
                    };

                    // Redirigir al cliente con parámetros para mostrar modal
                    res.redirect("/?view=login&modal=google_complete_registration&email=" +
                                encodeURIComponent(email));
                }
            } catch (error) {
                console.error("❌ Error en callback de Google:", error);
                res.redirect("/?error=auth_failed&message=" + encodeURIComponent("Error al procesar tu cuenta"));
            }
        });

        app.get("/fallo", (req, res) => {
            console.error("❌ Fallo en autenticación");
            res.redirect("/?error=auth_failed&message=Error%20de%20autenticaci%C3%B3n");
        });

        // ====== RUTAS DE GRUPOS ======
        app.get("/api/grupos", haIniciado, (req, res) =>
            this.grupoController.obtenerTodos(req, res)
        );

        app.get("/api/grupos/:grupoId", haIniciado, (req, res) =>
            this.grupoController.obtenerPorId(req, res)
        );

        app.post("/api/grupos/:grupoId/unirse", haIniciado, (req, res) =>
            this.grupoController.unirse(req, res)
        );

        app.post("/api/grupos/:grupoId/salir", haIniciado, (req, res) =>
            this.grupoController.salir(req, res)
        );

        // ====== RUTAS DE MENSAJES ======
        app.get("/api/grupos/:grupoId/mensajes", haIniciado, (req, res) =>
            this.mensajeController.obtenerMensajesGrupo(req, res)
        );

        // ====== RUTAS DE USUARIOS ======
        app.post("/api/usuarios/info", haIniciado, (req, res) =>
            this.usuarioController.obtenerInfoUsuarios(req, res)
        );

        // Rutas de ajustes de perfil
        app.post("/api/usuario/actualizar-username", haIniciado, (req, res) =>
            this.usuarioController.actualizarUsername(req, res)
        );

        app.post("/api/usuario/actualizar-password", haIniciado, (req, res) =>
            this.usuarioController.actualizarPassword(req, res)
        );

        app.post("/api/usuario/eliminar-cuenta", haIniciado, (req, res) =>
            this.usuarioController.eliminarCuenta(req, res)
        );

        // Obtener grupos del usuario
        app.get("/api/usuario/mis-grupos", haIniciado, (req, res) =>
            this.grupoController.obtenerGruposDeUsuario(req, res)
        );

        console.log("✅ Rutas configuradas");
    }
}

module.exports = RouterConfigurator;

