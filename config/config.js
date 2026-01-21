/**
 * Configuración centralizada.
 * Integra validación estricta para asegurar que Secret Manager ha inyectado las variables.
 *
 * IMPORTANTE: Este módulo requiere que initializeSecretManager() se llame ANTES de usar config.
 * En desarrollo usa dotenv (.env), en producción usa Google Cloud Secret Manager.
 *
 * NOTA: Usa getters para leer variables de forma lazy, permitiendo que se carguen después
 * de que el módulo sea importado.
 */

const config = {
    // === SERVIDOR ===
    server: {
        get port() {
            return process.env.PORT || 8080;
        },
        get nodeEnv() {
            return process.env.NODE_ENV || 'development';
        },
        get isProduction() {
            return process.env.NODE_ENV === 'production';
        },
        get sessionKeys() {
            // Claves de sesión. En producción DEBEN venir de Secret Manager.
            return [
                process.env.SESSION_KEY_1,
                process.env.SESSION_KEY_2
            ].filter(k => k); // Filtra undefined o vacíos
        }
    },

    // === MONGODB ===
    mongodb: {
        get user() {
            return process.env.MONGODB_USER;
        },
        get password() {
            return process.env.MONGODB_PASSWORD;
        },
        get url() {
            return process.env.MONGODB_URL; // Ej: arquitecturabase-psw.c1gqmp7.mongodb.net
        },
        getUri: function() {
            // Construcción segura de la URI usando las variables inyectadas
            const uri = `mongodb+srv://${this.user}:${this.password}@${this.url}/?retryWrites=true&w=majority`;
            // Debug en desarrollo
            if (process.env.NODE_ENV !== 'production') {
                console.log('🔍 MongoDB URI construida (sin password):',
                    `mongodb+srv://${this.user}:****@${this.url}/?retryWrites=true&w=majority`);
            }
            return uri;
        }
    },

    // === EMAIL (Brevo) ===
    email: {
        get user() {
            return process.env.EMAIL_USER;
        },
        get password() {
            return process.env.EMAIL_PASSWORD;
        },
        get from() {
            return process.env.EMAIL_FROM;
        },
        get verificationUrl() {
            return process.env.EMAIL_VERIFICATION_URL || 'http://localhost:3000/';
        }
    },

    // === GOOGLE OAUTH ===
    google: {
        get clientId() {
            return process.env.GCLIENT_ID;
        },
        get clientSecret() {
            return process.env.GCLIENT_SECRET;
        },
        get callbackUrl() {
            return process.env.GCALLBACK_URL;
        },
        get callbackUri() {
            return process.env.GCALLBACK_URI;
        }
    },

    // === APP INFO ===
    app: {
        get name() {
            return process.env.APP_NAME || 'esiiChat';
        },
        get urlDeployment() {
            return process.env.URL_DEPLOYMENT || process.env.BASE_URL;
        }
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

