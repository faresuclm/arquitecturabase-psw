const { GrupoDTO, GrupoResponseDTO } = require("../dto/grupoDTO");

/**
 * Servicio de Grupos - Lógica de negocio independiente de la BD
 */
class GrupoService {
    constructor(grupoRepository) {
        this.grupoRepository = grupoRepository;
    }

    async inicializarGruposPredeterminados() {
        const gruposDef = [
            {nombre: "Desarrollo Web", descripcion: "FullStack y Tecnologías Web"},
            {nombre: "Sistemas", descripcion: "Sistemas Operativos y Administración"},
            {nombre: "Cloud e IA", descripcion: "Inteligencia Artificial y Computación en la Nube"},
            {nombre: "Redes", descripcion: "Redes de Computadores y Protocolos"},
            {nombre: "TFG", descripcion: "Trabajo Fin de Grado"},
            {nombre: "Bases de Datos", descripcion: "SQL, NoSQL y Diseño de Datos"},
            {nombre: "Ingeniería del Software", descripcion: "Patrones, Metodologías y Calidad"},
            {nombre: "Ciberseguridad", descripcion: "Seguridad Informática y Hacking Ético"},
            {nombre: "Programación Básica", descripcion: "Algoritmia y Estructuras de Datos"}
        ];

        const existentes = await this.grupoRepository.obtenerTodos();
        const nombresExistentes = existentes.map(g => g.nombre);

        for (const grupoDef of gruposDef) {
            if (!nombresExistentes.includes(grupoDef.nombre)) {
                const grupo = {
                    id: "grupo_" + grupoDef.nombre.replace(/\s+/g, '_').toLowerCase(),
                    nombre: grupoDef.nombre,
                    descripcion: grupoDef.descripcion,
                    miembros: [],
                    fechaCreacion: new Date()
                };
                await this.grupoRepository.crear(grupo);
            }
        }

        // Limpiar duplicados en grupos existentes
        console.log('🧹 Limpiando duplicados en grupos...');
        await this.limpiarDuplicados();
    }

    async obtenerTodos() {
        const grupos = await this.grupoRepository.obtenerTodos();
        return grupos.map(g => new GrupoResponseDTO(g));
    }

    async obtenerPorId(grupoId) {
        const grupo = await this.grupoRepository.obtenerPorId(grupoId);
        return grupo ? new GrupoResponseDTO(grupo) : null;
    }

    async unirseAGrupo(grupoId, emailUsuario) {
        const grupo = await this.grupoRepository.obtenerPorId(grupoId);

        if (!grupo) {
            throw new Error("Grupo no encontrado");
        }

        // Usar $addToSet para evitar duplicados
        const grupoActualizado = await this.grupoRepository.agregarMiembro(grupoId, emailUsuario);

        return new GrupoResponseDTO(grupoActualizado);
    }

    async salirDeGrupo(grupoId, emailUsuario) {
        const grupo = await this.grupoRepository.obtenerPorId(grupoId);

        if (!grupo) {
            throw new Error("Grupo no encontrado");
        }

        if (!grupo.miembros.includes(emailUsuario)) {
            return new GrupoResponseDTO(grupo);
        }

        grupo.miembros = grupo.miembros.filter(m => m !== emailUsuario);
        const grupoActualizado = await this.grupoRepository.actualizar(grupo);

        return new GrupoResponseDTO(grupoActualizado);
    }

    async actualizarUltimoMensaje(grupoId, mensaje) {
        const ultimoMensaje = {
            autor: mensaje.nombreAutor,
            contenido: mensaje.contenido,
            fecha: mensaje.fecha
        };

        await this.grupoRepository.actualizarUltimoMensaje(grupoId, ultimoMensaje);
    }

    /**
     * Elimina un usuario de todos los grupos
     * Se usa cuando se elimina una cuenta
     */
    async eliminarUsuarioDeTodosLosGrupos(emailUsuario) {
        const grupos = await this.grupoRepository.obtenerTodos();

        for (const grupo of grupos) {
            if (grupo.miembros.includes(emailUsuario)) {
                grupo.miembros = grupo.miembros.filter(m => m !== emailUsuario);
                await this.grupoRepository.actualizar(grupo);
            }
        }

        console.log(`✅ Usuario ${emailUsuario} eliminado de todos los grupos`);
    }

    /**
     * Obtiene los grupos a los que pertenece un usuario
     */
    async obtenerGruposDeUsuario(emailUsuario) {
        const todosLosGrupos = await this.grupoRepository.obtenerTodos();
        const gruposDelUsuario = todosLosGrupos.filter(g => g.miembros.includes(emailUsuario));
        return gruposDelUsuario.map(g => new GrupoResponseDTO(g));
    }

    /**
     * Limpia miembros duplicados en todos los grupos
     */
    async limpiarDuplicados() {
        return await this.grupoRepository.limpiarDuplicados();
    }
}

module.exports = GrupoService;

