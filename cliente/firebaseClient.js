/**
 * Cliente de Firebase Authentication para el Frontend
 * Maneja la autenticación con Google usando Firebase Authentication
 */

class FirebaseClient {
    constructor() {
        this.initialized = false;
        this.firebase = null;
        this.auth = null;
        this.googleProvider = null;
        this.firebaseConfig = null;
    }

    /**
     * Obtiene la configuración de Firebase desde el servidor
     */
    async obtenerConfiguracion() {
        if (this.firebaseConfig) {
            return this.firebaseConfig;
        }

        try {
            const response = await fetch('/api/firebase-config');
            if (!response.ok) {
                throw new Error('Error al obtener configuración de Firebase');
            }
            this.firebaseConfig = await response.json();
            return this.firebaseConfig;
        } catch (error) {
            console.error('❌ Error al cargar configuración de Firebase:', error);
            throw error;
        }
    }

    /**
     * Inicializa Firebase en el cliente
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            console.log('🔥 Inicializando Firebase en cliente...');

            // Obtener configuración desde el servidor
            const firebaseConfig = await this.obtenerConfiguracion();

            // Importar Firebase desde CDN
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { getAuth, GoogleAuthProvider, signInWithPopup, signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

            // Inicializar Firebase
            this.app = initializeApp(firebaseConfig);
            this.auth = getAuth(this.app);
            this.googleProvider = new GoogleAuthProvider();

            // Configurar el proveedor de Google
            this.googleProvider.setCustomParameters({
                prompt: 'select_account'
            });

            // Guardar funciones
            this.signInWithPopup = signInWithPopup;
            this.signOut = signOut;

            this.initialized = true;
            console.log('✅ Firebase Client inicializado');

        } catch (error) {
            console.error('❌ Error al inicializar Firebase:', error);
            throw error;
        }
    }

    /**
     * Inicia sesión con Google usando Firebase Authentication
     * @returns {Promise<Object>} - Resultado del login
     */
    async loginConGoogle() {
        try {
            // Asegurar que Firebase está inicializado
            await this.initialize();

            console.log('🔐 Iniciando login con Google...');

            // Mostrar popup de Google Sign-In
            const result = await this.signInWithPopup(this.auth, this.googleProvider);
            const user = result.user;

            console.log('✅ Autenticado con Google:', user.email);

            // Obtener ID token de Firebase
            const idToken = await user.getIdToken();
            console.log('🎫 ID Token obtenido');

            // Enviar token al servidor para verificación
            const response = await fetch('/api/auth/firebase/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ idToken })
            });

            const data = await response.json();

            if (data.success) {
                console.log('✅ Login exitoso:', data.usuario.email);

                // Guardar datos del usuario en cookies/localStorage
                if (typeof $ !== 'undefined' && $.cookie) {
                    $.cookie("nick", data.usuario.email);
                    $.cookie("userName", data.usuario.username);
                }

                return {
                    success: true,
                    usuario: data.usuario
                };
            } else {
                throw new Error(data.error || 'Error en login');
            }

        } catch (error) {
            console.error('❌ Error en login con Google:', error);

            // Manejar errores específicos de Firebase
            if (error.code === 'auth/popup-closed-by-user') {
                throw new Error('Ventana de login cerrada');
            } else if (error.code === 'auth/cancelled-popup-request') {
                throw new Error('Login cancelado');
            } else {
                throw error;
            }
        }
    }

    /**
     * Cierra sesión del usuario
     * @returns {Promise<boolean>} - true si se cerró sesión correctamente
     */
    async logout() {
        try {
            await this.initialize();

            // Cerrar sesión en Firebase
            await this.signOut(this.auth);
            console.log('✅ Logout de Firebase exitoso');

            // Cerrar sesión en el servidor
            const response = await fetch('/api/auth/firebase/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                console.log('✅ Sesión cerrada en servidor');

                // Limpiar cookies
                if (typeof $ !== 'undefined' && $.cookie) {
                    $.removeCookie("nick");
                    $.removeCookie("userName");
                }

                return true;
            }

            return false;

        } catch (error) {
            console.error('❌ Error al cerrar sesión:', error);
            throw error;
        }
    }

    /**
     * Obtiene el usuario actualmente autenticado
     * @returns {Promise<Object|null>} - Usuario o null
     */
    async obtenerUsuarioActual() {
        try {
            await this.initialize();
            return this.auth.currentUser;
        } catch (error) {
            console.error('❌ Error al obtener usuario actual:', error);
            return null;
        }
    }

    /**
     * Observa cambios en el estado de autenticación
     * @param {Function} callback - Función a ejecutar cuando cambie el estado
     */
    async onAuthStateChanged(callback) {
        try {
            await this.initialize();
            return this.auth.onAuthStateChanged(callback);
        } catch (error) {
            console.error('❌ Error al observar estado de autenticación:', error);
        }
    }
}

// Singleton - instancia única del cliente
let firebaseClient = null;

/**
 * Obtiene la instancia del cliente de Firebase
 * @returns {FirebaseClient} - Instancia del cliente
 */
function getFirebaseClient() {
    if (!firebaseClient) {
        firebaseClient = new FirebaseClient();
    }
    return firebaseClient;
}

// Exportar para uso como módulo o global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FirebaseClient, getFirebaseClient };
}

// También disponible globalmente
if (typeof window !== 'undefined') {
    window.FirebaseClient = FirebaseClient;
    window.getFirebaseClient = getFirebaseClient;
}

