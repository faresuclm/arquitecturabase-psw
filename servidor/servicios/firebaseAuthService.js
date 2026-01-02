const admin = require('firebase-admin');
const config = require('../../config/config');
const path = require('path');

/**
 * Servicio de Firebase Authentication
 * Maneja la autenticación con Firebase y Google Sign-In
 */
class FirebaseAuthService {
    constructor() {
        this.initialized = false;
    }

    /**
     * Inicializa Firebase Admin SDK
     */
    initialize() {
        if (this.initialized) {
            return;
        }

        try {
            // Cargar el service account desde la ruta configurada
            const serviceAccountPath = path.resolve(config.firebase.serviceAccountPath);
            const serviceAccount = require(serviceAccountPath);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: config.firebase.client.projectId
            });

            this.auth = admin.auth();
            this.initialized = true;
            console.log('✅ Firebase Authentication inicializado');
        } catch (error) {
            console.error('❌ Error al inicializar Firebase:', error);
            throw error;
        }
    }

    /**
     * Verifica el ID token de Firebase del cliente
     * @param {string} idToken - Token de Firebase del cliente
     * @returns {Promise<Object>} - Datos del usuario verificado
     */
    async verificarToken(idToken) {
        try {
            const decodedToken = await this.auth.verifyIdToken(idToken);
            return {
                uid: decodedToken.uid,
                email: decodedToken.email,
                emailVerified: decodedToken.email_verified,
                name: decodedToken.name,
                picture: decodedToken.picture,
                provider: decodedToken.firebase.sign_in_provider
            };
        } catch (error) {
            console.error('❌ Error al verificar token de Firebase:', error);
            throw new Error('Token inválido o expirado');
        }
    }

    /**
     * Obtiene un usuario de Firebase por email
     * @param {string} email - Email del usuario
     * @returns {Promise<Object|null>} - Usuario o null
     */
    async obtenerUsuarioPorEmail(email) {
        try {
            const userRecord = await this.auth.getUserByEmail(email);
            return {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
                emailVerified: userRecord.emailVerified,
                photoURL: userRecord.photoURL
            };
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                return null;
            }
            console.error('❌ Error al obtener usuario de Firebase:', error);
            throw error;
        }
    }

    /**
     * Crea un custom token para autenticación
     * @param {string} uid - UID del usuario
     * @param {Object} claims - Claims adicionales
     * @returns {Promise<string>} - Custom token
     */
    async crearCustomToken(uid, claims = {}) {
        try {
            const customToken = await this.auth.createCustomToken(uid, claims);
            return customToken;
        } catch (error) {
            console.error('❌ Error al crear custom token:', error);
            throw error;
        }
    }

    /**
     * Genera un link de verificación de email
     * @param {string} email - Email del usuario
     * @returns {Promise<string>} - Link de verificación
     */
    async generarLinkVerificacion(email) {
        try {
            const actionCodeSettings = {
                url: process.env.URL_DEPLOYMENT || 'http://localhost:3000',
                handleCodeInApp: false
            };

            const link = await this.auth.generateEmailVerificationLink(email, actionCodeSettings);
            return link;
        } catch (error) {
            console.error('❌ Error al generar link de verificación:', error);
            throw error;
        }
    }

    /**
     * Genera un link de reset de contraseña
     * @param {string} email - Email del usuario
     * @returns {Promise<string>} - Link de reset
     */
    async generarLinkResetPassword(email) {
        try {
            const actionCodeSettings = {
                url: process.env.URL_DEPLOYMENT || 'http://localhost:3000',
                handleCodeInApp: false
            };

            const link = await this.auth.generatePasswordResetLink(email, actionCodeSettings);
            return link;
        } catch (error) {
            console.error('❌ Error al generar link de reset:', error);
            throw error;
        }
    }

    /**
     * Obtiene un usuario de Firebase por UID
     * @param {string} uid - UID del usuario
     * @returns {Promise<Object>} - Usuario
     */
    async obtenerUsuarioPorUid(uid) {
        try {
            const userRecord = await this.auth.getUser(uid);
            return {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
                emailVerified: userRecord.emailVerified,
                photoURL: userRecord.photoURL,
                providerData: userRecord.providerData,
                metadata: {
                    creationTime: userRecord.metadata.creationTime,
                    lastSignInTime: userRecord.metadata.lastSignInTime
                }
            };
        } catch (error) {
            console.error('❌ Error al obtener usuario de Firebase por UID:', error);
            throw error;
        }
    }

    /**
     * Lista todos los usuarios de Firebase
     * @param {number} maxResults - Número máximo de resultados
     * @returns {Promise<Array>} - Lista de usuarios
     */
    async listarUsuarios(maxResults = 1000) {
        try {
            const listUsersResult = await this.auth.listUsers(maxResults);
            console.log(`📋 Total de usuarios en Firebase: ${listUsersResult.users.length}`);

            return listUsersResult.users.map(userRecord => ({
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
                photoURL: userRecord.photoURL,
                emailVerified: userRecord.emailVerified,
                disabled: userRecord.disabled,
                metadata: {
                    creationTime: userRecord.metadata.creationTime,
                    lastSignInTime: userRecord.metadata.lastSignInTime
                },
                providerData: userRecord.providerData.map(p => ({
                    providerId: p.providerId,
                    uid: p.uid,
                    displayName: p.displayName,
                    email: p.email,
                    photoURL: p.photoURL
                }))
            }));
        } catch (error) {
            console.error('❌ Error al listar usuarios de Firebase:', error);
            throw error;
        }
    }

    /**
     * Verifica si un usuario existe en Firebase
     * @param {string} email - Email del usuario
     * @returns {Promise<boolean>} - true si existe
     */
    async existeUsuario(email) {
        try {
            const user = await this.obtenerUsuarioPorEmail(email);
            return user !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * Actualiza el displayName y photoURL de un usuario en Firebase
     * @param {string} uid - UID del usuario
     * @param {Object} data - Datos a actualizar
     * @returns {Promise<Object>} - Usuario actualizado
     */
    async actualizarUsuario(uid, data) {
        try {
            const updateData = {};
            if (data.displayName) updateData.displayName = data.displayName;
            if (data.photoURL) updateData.photoURL = data.photoURL;
            if (data.email) updateData.email = data.email;
            if (data.emailVerified !== undefined) updateData.emailVerified = data.emailVerified;

            const userRecord = await this.auth.updateUser(uid, updateData);
            console.log('✅ Usuario actualizado en Firebase:', userRecord.email);

            return {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
                photoURL: userRecord.photoURL,
                emailVerified: userRecord.emailVerified
            };
        } catch (error) {
            console.error('❌ Error al actualizar usuario en Firebase:', error);
            throw error;
        }
    }
}

// Singleton
let firebaseAuthService = null;

function getFirebaseAuthService() {
    if (!firebaseAuthService) {
        firebaseAuthService = new FirebaseAuthService();
        firebaseAuthService.initialize();
    }
    return firebaseAuthService;
}

module.exports = {
    FirebaseAuthService,
    getFirebaseAuthService
};

