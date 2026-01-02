/**
 * Controlador de Grupos - Maneja las peticiones HTTP
 */
class GrupoController {
    constructor(grupoService) {
        this.grupoService = grupoService;
    }

    async obtenerTodos(req, res) {
        try {
            const grupos = await this.grupoService.obtenerTodos();
            res.json(grupos);
        } catch (error) {
            console.error("Error al obtener grupos:", error.message);
            res.status(500).json({ error: error.message });
        }
    }

    async obtenerPorId(req, res) {
        try {
            const { grupoId } = req.params;
            const grupo = await this.grupoService.obtenerPorId(grupoId);

            if (!grupo) {
                return res.status(404).json({ error: "Grupo no encontrado" });
            }

            res.json(grupo);
        } catch (error) {
            console.error("Error al obtener grupo:", error.message);
            res.status(500).json({ error: error.message });
        }
    }

    async unirse(req, res) {
        try {
            const { grupoId } = req.params;
            const emailUsuario = req.user.email;

            const grupo = await this.grupoService.unirseAGrupo(grupoId, emailUsuario);

            res.json({ success: true, grupo });
        } catch (error) {
            console.error("Error al unirse a grupo:", error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async salir(req, res) {
        try {
            const { grupoId } = req.params;
            const emailUsuario = req.user.email;

            const grupo = await this.grupoService.salirDeGrupo(grupoId, emailUsuario);

            res.json({ success: true, grupo });
        } catch (error) {
            console.error("Error al salir de grupo:", error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async obtenerGruposDeUsuario(req, res) {
        try {
            const emailUsuario = req.user.email;
            const grupos = await this.grupoService.obtenerGruposDeUsuario(emailUsuario);
            res.json(grupos);
        } catch (error) {
            console.error("Error al obtener grupos del usuario:", error.message);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = GrupoController;

