/**
 * Repositorio de Mensajes - Abstrae el acceso a la base de datos
 */
class MensajeRepository {
    constructor(coleccionMensajes) {
        this.mensajes = coleccionMensajes;
    }

    async crear(mensaje) {
        try {
            await this.mensajes.insertOne(mensaje);
            return mensaje;
        } catch (error) {
            console.error("❌ Error al insertar mensaje:", error.message);
            throw error;
        }
    }

    async obtenerPorGrupo(grupoId) {
        try {
            return await this.mensajes.find({ grupoId }).sort({ fecha: 1 }).toArray();
        } catch (error) {
            console.error("Error al obtener mensajes:", error);
            return [];
        }
    }

    async marcarComoLeido(mensajeId) {
        try {
            await this.mensajes.updateOne(
                { id: mensajeId },
                { $set: { leido: true } }
            );
            return true;
        } catch (error) {
            console.error("Error al marcar mensaje como leído:", error);
            return false;
        }
    }

    async obtenerNoLeidos(grupoId, usuarioEmail) {
        try {
            return await this.mensajes.find({
                grupoId,
                autor: { $ne: usuarioEmail },
                leido: false
            }).toArray();
        } catch (error) {
            console.error("Error al obtener mensajes no leídos:", error);
            return [];
        }
    }
}

module.exports = MensajeRepository;

