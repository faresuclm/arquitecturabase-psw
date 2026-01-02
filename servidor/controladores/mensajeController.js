/**
 * Controlador de Mensajes - Maneja las peticiones HTTP
 */
class MensajeController {
    constructor(mensajeService) {
        this.mensajeService = mensajeService;
    }

    async obtenerMensajesGrupo(req, res) {
        try {
            const { grupoId } = req.params;
            const mensajes = await this.mensajeService.obtenerMensajesGrupo(grupoId);
            res.json(mensajes);
        } catch (error) {
            console.error("Error al obtener mensajes:", error.message);
            res.status(500).json({ error: error.message });
        }
    }

    async enviarMensaje(mensaje, callback) {
        try {
            const mensajeCreado = await this.mensajeService.enviarMensaje(mensaje);
            callback(mensajeCreado);
        } catch (error) {
            console.error("Error al enviar mensaje:", error.message);
            callback({ id: -1, error: error.message });
        }
    }
}

module.exports = MensajeController;

