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

        app.get("/google/callback",
            this.passport.authenticate("google", {
                failureRedirect: "/fallo",
                session: true
            }),
            (req, res) => res.redirect("/good")
        );

        app.get("/good", async (req, res) => {
            if (!req.user || !req.user.emails) {
                return res.redirect("/?error=auth_failed");
            }

            const email = req.user.emails[0].value;

            try {
                // Usar el servicio a través del controlador
                const existeUsuario = await this.usuarioController.usuarioService.buscarPorEmail(email);

                if (existeUsuario) {
                    // Usuario existe - Login directo
                    req.logIn(existeUsuario, (err) => {
                        if (err) return res.redirect("/?error=session_error");
                        res.cookie("nick", existeUsuario.email);
                        res.cookie("userName", existeUsuario.username || email.split('@')[0]);
                        res.redirect("/?google=login_success");
                    });
                } else {
                    // Usuario nuevo - Completar registro
                    req.session.googleUserData = {
                        email: email,
                        confirmada: true,
                        provider: 'google'
                    };
                    res.redirect("/?view=login&modal=google_complete_registration&email=" +
                                encodeURIComponent(email));
                }
            } catch (error) {
                console.error("Error en /good:", error);
                res.redirect("/?error=auth_failed");
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

