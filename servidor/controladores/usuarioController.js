/**
 * Controlador de Usuario - Maneja las peticiones HTTP
 * Desacoplado de la lógica de negocio y base de datos
 */
class UsuarioController {
    constructor(usuarioService) {
        this.usuarioService = usuarioService;
    }

    async registrar(req, res) {
        try {
            const { email, username, password, provider, confirmada } = req.body;

            const usuario = await this.usuarioService.registrarUsuario({
                email,
                username,
                password,
                provider,
                confirmada
            });

            res.status(201).json({
                nick: usuario.email,
                username: usuario.username
            });
        } catch (error) {
            console.error("Error en registro:", error.message);
            res.status(409).json({
                nick: -1,
                error: error.message
            });
        }
    }

    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    nick: -1,
                    error: "Faltan datos"
                });
            }

            const usuario = await this.usuarioService.loginUsuario({ email, password });

            // Iniciar sesión con Passport
            req.logIn(usuario, (err) => {
                if (err) {
                    return res.status(500).json({
                        nick: -1,
                        error: "Error de sesión"
                    });
                }
                res.json({
                    nick: usuario.email,
                    username: usuario.username
                });
            });
        } catch (error) {
            console.error("Error en login:", error.message);

            if (error.confirmada === false) {
                return res.status(403).json({
                    nick: -1,
                    confirmada: false,
                    error: error.message
                });
            }

            res.status(401).json({
                nick: -1,
                error: error.message
            });
        }
    }

    async confirmar(req, res) {
        try {
            const { email, key } = req.params;

            await this.usuarioService.confirmarUsuario(email, key);

            res.redirect('/?verificado=true&email=' + encodeURIComponent(email));
        } catch (error) {
            console.error("Error en confirmación:", error.message);
            res.redirect('/?verificado=false');
        }
    }

    async verificarUsername(req, res) {
        try {
            const { username } = req.params;
            const disponible = await this.usuarioService.verificarUsernameDisponible(username);
            res.json({ disponible });
        } catch (error) {
            console.error("Error al verificar username:", error.message);
            res.status(500).json({ disponible: false, error: error.message });
        }
    }

    async solicitarRecuperacion(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ success: false, error: "Email requerido" });
            }

            await this.usuarioService.solicitarRecuperacionPassword(email);
            res.json({ success: true });
        } catch (error) {
            console.error("Error en recuperación:", error.message);
            res.status(404).json({ success: false, error: error.message });
        }
    }

    async restablecerPassword(req, res) {
        try {
            const { email, token, newPassword } = req.body;

            await this.usuarioService.restablecerPassword(email, token, newPassword);
            res.json({ success: true });
        } catch (error) {
            console.error("Error al restablecer:", error.message);
            res.status(400).json({ success: false, error: error.message });
        }
    }

    async completarRegistroGoogle(req, res) {
        try {
            const { password, username } = req.body;

            if (!req.session.googleUserData) {
                return res.status(400).json({
                    success: false,
                    error: "Sin datos de Google"
                });
            }

            const googleData = req.session.googleUserData;

            const usuario = await this.usuarioService.registrarUsuario({
                email: googleData.email,
                password,
                username,
                confirmada: true,
                provider: 'google'
            });

            delete req.session.googleUserData;

            req.logIn(usuario, (err) => {
                if (err) {
                    return res.status(500).json({ success: false, error: "Error de sesión" });
                }
                res.json({
                    success: true,
                    email: usuario.email,
                    username: usuario.username
                });
            });
        } catch (error) {
            console.error("Error completar registro Google:", error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async obtenerSesion(req, res) {
        if (req.isAuthenticated() && req.user) {
            res.json({
                nick: req.user.email,
                username: req.user.username || req.user.email.split('@')[0]
            });
        } else {
            res.status(401).json({ error: "No autenticado" });
        }
    }

    async cerrarSesion(req, res) {
        if (!req.user) {
            return res.json({ success: true, mensaje: "No había sesión" });
        }

        const email = req.user.email;

        req.logout((err) => {
            if (err) {
                return res.status(500).json({ success: false, error: "Fallo al logout" });
            }

            // Limpiar cookies de sesión y Google OAuth
            res.clearCookie('connect.sid');
            res.clearCookie('Sistema');
            res.clearCookie('g_state0');
            res.clearCookie('g_csrf_token');
            req.session = null;

            res.json({ success: true, mensaje: "Sesión cerrada", googleLogout: true });
        });
    }

    async obtenerInfoUsuarios(req, res) {
        try {
            const { emails } = req.body;
            const info = await this.usuarioService.obtenerInfoUsuarios(emails || []);
            res.json(info);
        } catch (error) {
            console.error("Error al obtener info usuarios:", error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Actualiza el nombre de usuario
     */
    async actualizarUsername(req, res) {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ success: false, error: "No autenticado" });
            }

            const { nuevoUsername } = req.body;
            const email = req.user.email;

            if (!nuevoUsername) {
                return res.status(400).json({ success: false, error: "Username requerido" });
            }

            const usuario = await this.usuarioService.actualizarUsername(email, nuevoUsername);

            // Actualizar sesión
            req.user.username = usuario.username;

            res.json({
                success: true,
                username: usuario.username,
                message: "Nombre de usuario actualizado correctamente"
            });
        } catch (error) {
            console.error("Error al actualizar username:", error.message);
            res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * Actualiza la contraseña del usuario
     */
    async actualizarPassword(req, res) {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ success: false, error: "No autenticado" });
            }

            const { passwordActual, passwordNueva } = req.body;
            const email = req.user.email;

            if (!passwordNueva) {
                return res.status(400).json({ success: false, error: "Nueva contraseña requerida" });
            }

            await this.usuarioService.actualizarPassword(email, passwordActual, passwordNueva);

            res.json({
                success: true,
                message: "Contraseña actualizada correctamente"
            });
        } catch (error) {
            console.error("Error al actualizar contraseña:", error.message);
            res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * Elimina la cuenta del usuario
     */
    async eliminarCuenta(req, res) {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ success: false, error: "No autenticado" });
            }

            const { password } = req.body;
            const email = req.user.email;

            const resultado = await this.usuarioService.eliminarCuenta(email, password);

            // Cerrar sesión después de eliminar
            req.logout((err) => {
                if (err) {
                    console.error("Error al hacer logout:", err);
                }
                res.clearCookie('connect.sid');
                res.clearCookie('Sistema');
                req.session = null;

                res.json(resultado);
            });
        } catch (error) {
            console.error("Error al eliminar cuenta:", error.message);
            res.status(400).json({ success: false, error: error.message });
        }
    }
}

module.exports = UsuarioController;

