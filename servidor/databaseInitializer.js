const config = require("../config/config");
const mongo = require("mongodb").MongoClient;
const UsuarioRepository = require("./repositorios/usuarioRepository");
const GrupoRepository = require("./repositorios/grupoRepository");
const MensajeRepository = require("./repositorios/mensajeRepository");

/**
 * Inicializador de Base de Datos - Maneja la conexión y creación de repositorios
 * Desacopla la implementación de MongoDB del resto de la aplicación
 */
class DatabaseInitializer {
    constructor() {
        this.client = null;
        this.database = null;
        this.usuarioRepository = null;
        this.grupoRepository = null;
        this.mensajeRepository = null;
    }

    async conectar() {
        try {
            this.client = new mongo(config.mongodb.getUri());
            await this.client.connect();
            this.database = this.client.db("sistema");

            // Crear repositorios
            this.usuarioRepository = new UsuarioRepository(this.database.collection("usuarios"));
            this.grupoRepository = new GrupoRepository(this.database.collection("grupos"));
            this.mensajeRepository = new MensajeRepository(this.database.collection("mensajes"));

            // Crear índices
            await this.usuarioRepository.crearIndices();

            console.log("✅ Conectado a Mongo Atlas");
            console.log("✅ Índices de base de datos verificados");

            return {
                usuarioRepository: this.usuarioRepository,
                grupoRepository: this.grupoRepository,
                mensajeRepository: this.mensajeRepository,
                database: this.database
            };
        } catch (error) {
            console.error("❌ Error al conectar a la base de datos:", error);
            throw error;
        }
    }

    async desconectar() {
        if (this.client) {
            await this.client.close();
            console.log("✅ Desconectado de Mongo Atlas");
        }
    }
}

module.exports = DatabaseInitializer;

