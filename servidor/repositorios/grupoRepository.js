/**
 * Repositorio de Grupos - Abstrae el acceso a la base de datos
 */
class GrupoRepository {
    constructor(coleccionGrupos) {
        this.grupos = coleccionGrupos;
    }

    async crear(grupo) {
        try {
            await this.grupos.insertOne(grupo);
            return grupo;
        } catch (error) {
            console.error("❌ Error al insertar grupo:", error.message);
            throw error;
        }
    }

    async obtenerTodos() {
        try {
            return await this.grupos.find({}).sort({ fechaCreacion: -1 }).toArray();
        } catch (error) {
            console.error("Error al obtener grupos:", error);
            return [];
        }
    }

    async obtenerPorId(grupoId) {
        try {
            return await this.grupos.findOne({ id: grupoId });
        } catch (error) {
            console.error("Error al obtener grupo:", error);
            return null;
        }
    }

    async actualizar(grupo) {
        try {
            const resultado = await this.grupos.findOneAndUpdate(
                { id: grupo.id },
                { $set: grupo },
                { upsert: false, returnDocument: "after" }
            );

            if (resultado.value) {
                return resultado.value;
            } else {
                throw new Error("Grupo no encontrado");
            }
        } catch (error) {
            console.error("❌ Error al actualizar grupo:", error.message);
            throw error;
        }
    }

    async agregarMiembro(grupoId, emailUsuario) {
        try {
            const resultado = await this.grupos.findOneAndUpdate(
                { id: grupoId },
                { $addToSet: { miembros: emailUsuario } },
                { returnDocument: "after" }
            );
            return resultado.value;
        } catch (error) {
            console.error("Error al agregar miembro:", error);
            throw error;
        }
    }

    async eliminarMiembro(grupoId, emailUsuario) {
        try {
            const resultado = await this.grupos.findOneAndUpdate(
                { id: grupoId },
                { $pull: { miembros: emailUsuario } },
                { returnDocument: "after" }
            );
            return resultado.value;
        } catch (error) {
            console.error("Error al eliminar miembro:", error);
            throw error;
        }
    }

    async actualizarUltimoMensaje(grupoId, ultimoMensaje) {
        try {
            await this.grupos.updateOne(
                { id: grupoId },
                { $set: { ultimoMensaje } }
            );
            return true;
        } catch (error) {
            console.error("Error al actualizar último mensaje:", error);
            return false;
        }
    }

    /**
     * Limpia miembros duplicados en todos los grupos
     * Útil para migración o limpieza de datos
     */
    async limpiarDuplicados() {
        try {
            const grupos = await this.grupos.find({}).toArray();
            let gruposActualizados = 0;

            for (const grupo of grupos) {
                // Convertir array a Set y de vuelta a array para eliminar duplicados
                const miembrosUnicos = [...new Set(grupo.miembros)];

                // Solo actualizar si había duplicados
                if (miembrosUnicos.length !== grupo.miembros.length) {
                    await this.grupos.updateOne(
                        { id: grupo.id },
                        { $set: { miembros: miembrosUnicos } }
                    );
                    gruposActualizados++;
                    console.log(`✅ Grupo "${grupo.nombre}": ${grupo.miembros.length} → ${miembrosUnicos.length} miembros`);
                }
            }

            console.log(`🧹 Limpieza completada: ${gruposActualizados} grupos actualizados`);
            return gruposActualizados;
        } catch (error) {
            console.error("Error al limpiar duplicados:", error);
            throw error;
        }
    }
}

module.exports = GrupoRepository;

