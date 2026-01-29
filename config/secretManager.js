const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

/**
 * Secret Manager - Carga secretos desde Google Cloud Secret Manager
 * En desarrollo usa dotenv (.env), en producción usa Secret Manager
 */
class SecretManager {
    constructor() {
        this.client = null;
        this.projectId = null;
        this.isProduction = process.env.NODE_ENV === 'production';
        this.secrets = {};
    }

    /**
     * Inicializa el cliente de Secret Manager
     */
    async initialize() {
        if (this.isProduction) {
            console.log('🔐 Inicializando Secret Manager para producción...');
            
            // En Cloud Run/App Engine, la autenticación es automática vía Workload Identity
            this.client = new SecretManagerServiceClient();
            
            // Obtener el Project ID desde metadatos de GCP o variable de entorno
            this.projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
            
            if (!this.projectId) {
                // Intentar obtener desde metadata server de GCP
                try {
                    const response = await fetch('http://metadata.google.internal/computeMetadata/v1/project/project-id', {
                        headers: { 'Metadata-Flavor': 'Google' }
                    });
                    this.projectId = await response.text();
                } catch (error) {
                    throw new Error('No se pudo obtener el GCP_PROJECT_ID. Configure la variable de entorno GCP_PROJECT_ID o GOOGLE_CLOUD_PROJECT');
                }
            }

            console.log(`📦 Usando proyecto GCP: ${this.projectId}`);
            
            // Cargar todos los secretos necesarios
            await this.loadAllSecrets();
        } else {
            console.log('🔓 Modo desarrollo: usando variables de .env (dotenv)');
            const dotenv = require('dotenv');
            const result = dotenv.config();

            if (result.error) {
                console.warn('⚠️  Error al cargar .env:', result.error.message);
            } else {
                console.log(`✅ Cargadas ${Object.keys(result.parsed || {}).length} variables desde .env`);
            }

            // En desarrollo, copiar todas las variables de process.env a this.secrets
            this.secrets = { ...process.env };
        }
    }

    /**
     * Carga todos los secretos desde Secret Manager
     */
    async loadAllSecrets() {
        const secretNames = [
            'MONGODB_USER',
            'MONGODB_PASSWORD',
            'MONGODB_URL',
            'EMAIL_USER',
            'EMAIL_PASSWORD',
            'EMAIL_FROM',
            'SESSION_KEY_1',
            'SESSION_KEY_2',
            'GCLIENT_ID',
            'GCLIENT_SECRET',
            'GCALLBACK_URL',
            'GCALLBACK_URI',
            'GCALLBACK_URI',
            'FIREBASE_SERVICE_ACCOUNT_JSON', // El contenido completo del JSON
            'BASE_URL',
            'URL_DEPLOYMENT',
            'APP_NAME'
        ];

        console.log('📥 Cargando secretos desde Secret Manager...');

        const loadPromises = secretNames.map(async (secretName) => {
            try {
                const value = await this.getSecret(secretName);
                this.secrets[secretName] = value;
                console.log(`  ✅ ${secretName} cargado`);
            } catch (error) {
                console.warn(`  ⚠️  ${secretName} no encontrado (puede ser opcional)`);
                this.secrets[secretName] = null;
            }
        });

        await Promise.all(loadPromises);
        
        // Inyectar secretos en process.env para compatibilidad
        Object.keys(this.secrets).forEach(key => {
            if (this.secrets[key]) {
                process.env[key] = this.secrets[key];
            }
        });

        console.log('✅ Secretos cargados exitosamente');
    }

    /**
     * Obtiene un secreto específico desde Secret Manager
     * @param {string} secretName - Nombre del secreto
     * @returns {Promise<string>} - Valor del secreto
     */
    async getSecret(secretName) {
        if (!this.isProduction) {
            return process.env[secretName];
        }

        // Verificar si ya está en caché
        if (this.secrets[secretName]) {
            return this.secrets[secretName];
        }

        // Construir el nombre completo del secreto
        const secretPath = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;

        try {
            const [version] = await this.client.accessSecretVersion({
                name: secretPath,
            });

            const payload = version.payload.data.toString('utf8');
            this.secrets[secretName] = payload;
            return payload;
        } catch (error) {
            console.error(`❌ Error al obtener secreto ${secretName}:`, error.message);
            throw error;
        }
    }

    /**
     * Obtiene el contenido del Firebase Service Account como objeto JSON
     * @returns {Promise<Object>} - Service Account JSON
     */
    async getFirebaseServiceAccount() {
        if (!this.isProduction) {
            // En desarrollo, leer desde el archivo
            const fs = require('fs');
            const path = require('path');
            const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
            const fullPath = path.resolve(serviceAccountPath);
            
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                return JSON.parse(content);
            } else {
                console.warn('⚠️  Archivo firebase-service-account.json no encontrado en desarrollo');
                return null;
            }
        }

        // En producción, obtener desde Secret Manager
        const jsonString = await this.getSecret('FIREBASE_SERVICE_ACCOUNT_JSON');
        return JSON.parse(jsonString);
    }

    /**
     * Obtiene todos los secretos cargados
     * @returns {Object} - Objeto con todos los secretos
     */
    getAllSecrets() {
        return { ...this.secrets };
    }
}

// Singleton
let secretManagerInstance = null;

/**
 * Inicializa y retorna la instancia del Secret Manager
 * @returns {Promise<SecretManager>}
 */
async function initializeSecretManager() {
    if (!secretManagerInstance) {
        secretManagerInstance = new SecretManager();
        await secretManagerInstance.initialize();
    }
    return secretManagerInstance;
}

/**
 * Obtiene la instancia del Secret Manager (debe estar inicializada previamente)
 * @returns {SecretManager}
 */
function getSecretManager() {
    if (!secretManagerInstance) {
        throw new Error('SecretManager no ha sido inicializado. Llame a initializeSecretManager() primero.');
    }
    return secretManagerInstance;
}

module.exports = {
    SecretManager,
    initializeSecretManager,
    getSecretManager
};

