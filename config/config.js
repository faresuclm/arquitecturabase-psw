require('dotenv').config();

/**
 * Configuración centralizada.
 * Integra validación estricta para asegurar que Secret Manager ha inyectado las variables.
 */
const config = {
    // === SERVIDOR ===
    server: {
        port: process.env.PORT || 8080,
        nodeEnv: process.env.NODE_ENV || 'development',
        isProduction: process.env.NODE_ENV === 'production',
        // Claves de sesión. En producción DEBEN venir de Secret Manager.
        sessionKeys: [
            process.env.SESSION_KEY_1,
            process.env.SESSION_KEY_2
        ].filter(k => k) // Filtra undefined o vacíos
    },

    // === MONGODB ===
    mongodb: {
        user: process.env.MONGODB_USER,
        password: process.env.MONGODB_PASSWORD,
        url: process.env.MONGODB_URL, // Ej: arquitecturabase-psw.c1gqmp7.mongodb.net
        getUri: function() {
            // Construcción segura de la URI usando las variables inyectadas
            return `mongodb+srv://${this.user}:${this.password}@${this.url}/?retryWrites=true&w=majority`;
        }
    },

    // === EMAIL (Brevo) ===
    email: {
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM,
        verificationUrl: process.env.EMAIL_VERIFICATION_URL || 'http://localhost:3000/',
    },

    // === GOOGLE OAUTH ===
    google: {
        clientId: process.env.GCLIENT_ID,
        clientSecret: process.env.GCLIENT_SECRET,
        callbackUrl: process.env.GCALLBACK_URL,
        callbackUri: process.env.GCALLBACK_URI,
    },

    // === APP INFO ===
    app: {
        name: process.env.APP_NAME || 'esiiChat',
        urlDeployment: process.env.URL_DEPLOYMENT,
    },

    // === VALIDACIÓN DE SEGURIDAD ===
    validate: function() {
        // En producción, estas variables son OBLIGATORIAS.
        // Si falta alguna, significa que Secret Manager falló o no se configuró.
        if (this.server.isProduction) {
            const required = [
                'MONGODB_PASSWORD',
                'MONGODB_USER',
                'EMAIL_PASSWORD',
                'GCLIENT_SECRET',
                'SESSION_KEY_1'
            ];

            const missing = required.filter(key => !process.env[key]);

            if (missing.length > 0) {
                console.error("❌ ERROR CRÍTICO: Faltan secretos de entorno:", missing);
                throw new Error("La aplicación no puede arrancar sin los secretos requeridos.");
            }
        }
    }
};

// Ejecutar validación al cargar
config.validate();

module.exports = config;