const { MensajeDTO, MensajeResponseDTO } = require("../dto/mensajeDTO");

/**
 * Servicio de Mensajes - Lógica de negocio independiente de la BD
 */
class MensajeService {
    constructor(mensajeRepository, grupoService) {
        this.mensajeRepository = mensajeRepository;
        this.grupoService = grupoService;
    }

    async enviarMensaje(datosMensaje) {
        if (!datosMensaje.grupoId || !datosMensaje.autor ||
            !datosMensaje.nombreAutor || !datosMensaje.contenido) {
            throw new Error("Faltan datos del mensaje");
        }

        if (datosMensaje.contenido.trim().length === 0) {
            throw new Error("Contenido vacío");
        }

        if (datosMensaje.contenido.length > 1000) {
            throw new Error("Mensaje demasiado largo");
        }

        const mensaje = new MensajeDTO({
            id: Date.now().toString(),
            grupoId: datosMensaje.grupoId,
            autor: datosMensaje.autor,
            nombreAutor: datosMensaje.nombreAutor,
            contenido: datosMensaje.contenido,
            fecha: new Date(),
            leido: false
        });

        const mensajeCreado = await this.mensajeRepository.crear(mensaje);

        // Actualizar último mensaje del grupo
        await this.grupoService.actualizarUltimoMensaje(mensaje.grupoId, mensaje);

        return new MensajeResponseDTO(mensajeCreado);
    }

    async obtenerMensajesGrupo(grupoId) {
        const mensajes = await this.mensajeRepository.obtenerPorGrupo(grupoId);
        return mensajes.map(m => new MensajeResponseDTO(m));
    }

    async marcarComoLeido(mensajeId) {
        return await this.mensajeRepository.marcarComoLeido(mensajeId);
    }

    async obtenerNoLeidos(grupoId, usuarioEmail) {
        const mensajes = await this.mensajeRepository.obtenerNoLeidos(grupoId, usuarioEmail);
        return mensajes.map(m => new MensajeResponseDTO(m));
    }
}

module.exports = MensajeService;

