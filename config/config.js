require('dotenv').config();

/**
 * Configuración centralizada de variables de entorno
 * Este archivo gestiona todas las variables de entorno del proyecto
 */

const config = {
    // Configuración del servidor
    server: {
        port: parseInt(process.env.PORT) || 3000,
        nodeEnv: process.env.NODE_ENV || 'development',
        isProduction: process.env.NODE_ENV === 'production',
    },

    // Configuración de MongoDB
    mongodb: {
        user: process.env.MONGODB_USER,
        password: process.env.MONGODB_PASSWORD,
        url: process.env.MONGODB_URL,
        // Construir la URI completa de conexión
        getUri: function() {
            return `mongodb+srv://${this.user}:${this.password}@${this.url}/?retryWrites=true&w=majority`;
        }
    },

    // Configuración de Email
    email: {
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM,
        verificationUrl: process.env.EMAIL_VERIFICATION_URL,
    },

    // Configuración de Google OAuth
    google: {
        projectId: process.env.GCLOUD_PROJECT,
        clientId: process.env.GCLIENT_ID,
        clientSecret: process.env.GCLIENT_SECRET,
        callbackUrl: process.env.GCALLBACK_URL,      // ← OAuth 2.0
        callbackUri: process.env.GCALLBACK_URI,      // ← One Tap
    },

    // Configuración de la aplicación
    app: {
        name: process.env.APP_NAME || 'esiiChat',
        urlDeployment: process.env.URL_DEPLOYMENT,
        baseUrl: process.env.BASE_URL || process.env.URL_DEPLOYMENT,
        apiUrl: process.env.API_URL || process.env.URL_DEPLOYMENT,
    },

    // Validación de configuración requerida
    validate: function() {
        const requiredVars = {
            'MONGODB_USER': this.mongodb.user,
            'MONGODB_PASSWORD': this.mongodb.password,
            'MONGODB_URL': this.mongodb.url,
            'EMAIL_USER': this.email.user,
            'EMAIL_PASSWORD': this.email.password,
            'GCLIENT_ID': this.google.clientId,
            'GCLIENT_SECRET': this.google.clientSecret,
        };

        const missing = [];
        for (const [key, value] of Object.entries(requiredVars)) {
            if (!value) {
                missing.push(key);
            }
        }

        if (missing.length > 0) {
            console.warn('⚠️  Advertencia: Faltan las siguientes variables de entorno:');
            missing.forEach(varName => console.warn(`   - ${varName}`));
        }

        return missing.length === 0;
    }
};

// Validar configuración al cargar el módulo (solo en desarrollo)
if (!config.server.isProduction) {
    config.validate();
}

module.exports = config;

