const { getFirebaseAuthService } = require('../servicios/firebaseAuthService');
const config = require('../../config/config');

/**
 * Controlador de Firebase Authentication
 * Maneja las peticiones HTTP relacionadas con autenticación de Firebase
 */
class FirebaseAuthController {
    constructor(usuarioService) {
        this.usuarioService = usuarioService;
        this.firebaseAuth = getFirebaseAuthService();
    }

    /**
     * Verifica el token de Firebase y autentica al usuario
     * POST /api/auth/firebase/verify
     */
    async verificarYAutenticar(req, res) {
        try {
            const { idToken } = req.body;

            if (!idToken) {
                return res.status(400).json({
                    success: false,
                    error: 'Token de Firebase requerido'
                });
            }

            console.log('🔐 Verificando token de Firebase...');

            // Verificar token con Firebase
            const firebaseUser = await this.firebaseAuth.verificarToken(idToken);

            console.log('✅ Token verificado para:', firebaseUser.email);
            console.log('🔥 Firebase UID:', firebaseUser.uid);
            console.log('🔥 Provider:', firebaseUser.provider);

            // Validar dominio del email si está configurado
            if (config.firebase.authorizedDomains && config.firebase.authorizedDomains.length > 0) {
                const emailDomain = firebaseUser.email.split('@')[1];
                // Nota: Esta validación es opcional, Firebase ya valida los dominios autorizados
                console.log('📧 Dominio del email:', emailDomain);
            }

            // Verificar si el usuario existe en Firebase Authentication
            const existeEnFirebase = await this.firebaseAuth.existeUsuario(firebaseUser.email);
            console.log('🔥 Usuario existe en Firebase:', existeEnFirebase);

            if (existeEnFirebase) {
                const firebaseUserData = await this.firebaseAuth.obtenerUsuarioPorEmail(firebaseUser.email);
                console.log('📋 Datos de Firebase:', {
                    uid: firebaseUserData.uid,
                    email: firebaseUserData.email,
                    displayName: firebaseUserData.displayName,
                    photoURL: firebaseUserData.photoURL,
                    emailVerified: firebaseUserData.emailVerified
                });
            }

            // Buscar o crear usuario en nuestra BD
            let usuario = await this.usuarioService.buscarPorEmail(firebaseUser.email);

            if (!usuario) {
                console.log('👤 Creando nuevo usuario desde Firebase...');
                // Crear nuevo usuario
                usuario = await this.usuarioService.registrarUsuario({
                    email: firebaseUser.email,
                    username: firebaseUser.name || firebaseUser.email.split('@')[0],
                    firebaseUid: firebaseUser.uid,
                    photoURL: firebaseUser.picture,
                    confirmada: firebaseUser.emailVerified,
                    provider: 'google',
                    password: Math.random().toString(36).substring(2) + Date.now()
                });
                console.log('✅ Usuario creado:', usuario.email);
            } else if (!usuario.firebaseUid) {
                console.log('🔄 Actualizando usuario existente con Firebase UID...');
                // Actualizar usuario existente con Firebase UID
                await this.usuarioService.actualizarFirebaseUid(
                    usuario.email,
                    firebaseUser.uid,
                    firebaseUser.picture
                );
                // Recargar usuario con datos actualizados
                usuario = await this.usuarioService.buscarPorEmail(firebaseUser.email);
            }

            // Iniciar sesión con Passport
            req.logIn(usuario, (err) => {
                if (err) {
                    console.error('❌ Error al iniciar sesión:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'Error al iniciar sesión'
                    });
                }

                console.log('✅ Sesión iniciada para:', usuario.email);

                res.json({
                    success: true,
                    usuario: {
                        email: usuario.email,
                        username: usuario.username,
                        photoURL: usuario.photoURL,
                        provider: usuario.provider
                    }
                });
            });

        } catch (error) {
            console.error('❌ Error en autenticación Firebase:', error);
            res.status(401).json({
                success: false,
                error: error.message || 'Error en autenticación'
            });
        }
    }

    /**
     * Obtiene un custom token de Firebase para el usuario actual
     * GET /api/auth/firebase/custom-token
     */
    async obtenerCustomToken(req, res) {
        try {
            if (!req.user || !req.user.firebaseUid) {
                return res.status(401).json({
                    success: false,
                    error: 'Usuario no autenticado o sin Firebase UID'
                });
            }

            const customToken = await this.firebaseAuth.crearCustomToken(
                req.user.firebaseUid,
                { email: req.user.email }
            );

            res.json({
                success: true,
                customToken
            });

        } catch (error) {
            console.error('❌ Error al crear custom token:', error);
            res.status(500).json({
                success: false,
                error: 'Error al crear token'
            });
        }
    }

    /**
     * Cierra sesión y opcionalmente de Firebase también
     * POST /api/auth/firebase/logout
     */
    async cerrarSesion(req, res) {
        try {
            if (!req.user) {
                return res.json({ success: true, mensaje: "No había sesión" });
            }

            const email = req.user.email;

            req.logout((err) => {
                if (err) {
                    return res.status(500).json({ success: false, error: "Fallo al logout" });
                }

                res.clearCookie('connect.sid');
                res.clearCookie('Sistema');
                req.session = null;

                console.log('✅ Sesión cerrada para:', email);
                res.json({ success: true, mensaje: "Sesión cerrada" });
            });

        } catch (error) {
            console.error('❌ Error al cerrar sesión:', error);
            res.status(500).json({
                success: false,
                error: 'Error al cerrar sesión'
            });
        }
    }
}

module.exports = FirebaseAuthController;

