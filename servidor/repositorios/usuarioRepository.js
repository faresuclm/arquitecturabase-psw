const { ObjectId } = require("mongodb");
/**
 * Repositorio de Usuarios - Abstrae el acceso a la base de datos
 * Puede ser reemplazado por cualquier otra implementación (PostgreSQL, etc.)
 */
class UsuarioRepository {
    constructor(coleccionUsuarios) {
        this.usuarios = coleccionUsuarios;
    }
    async crearIndices() {
        try {
            await this.usuarios.createIndex({ email: 1 }, { unique: true });
            await this.usuarios.createIndex({ username: 1 }, {
                unique: true,
                partialFilterExpression: { username: { $exists: true } }
            });
            return true;
        } catch (e) {
            console.error("⚠️ Error creando índices de usuarios:", e);
            return false;
        }
    }
    async buscarPorEmail(email) {
        try {
            return await this.usuarios.findOne({ email });
        } catch (error) {
            console.error("Error al buscar usuario por email:", error);
            return null;
        }
    }
    async buscarPorUsername(username) {
        try {
            return await this.usuarios.findOne({
                username: { $regex: new RegExp('^' + username + '$', 'i') }
            });
        } catch (error) {
            console.error("Error al buscar usuario por username:", error);
            return null;
        }
    }
    async buscarPorCriterio(criterio) {
        try {
            const usuarios = await this.usuarios.find(criterio).toArray();
            return usuarios && usuarios.length > 0 ? usuarios[0] : null;
        } catch (error) {
            console.error("Error al buscar usuario:", error);
            return null;
        }
    }
    async verificarUsernameDisponible(username) {
        try {
            const usuarios = await this.usuarios.find({
                username: { $regex: new RegExp('^' + username + '$', 'i') }
            }).toArray();
            return !usuarios || usuarios.length === 0;
        } catch (error) {
            console.error("Error al verificar username:", error);
            return false;
        }
    }
    async crear(usuario) {
        try {
            const resultado = await this.usuarios.insertOne(usuario);
            if (resultado.insertedId) {
                console.log("✅ Usuario insertado en BD:", usuario.email);
                return usuario;
            }
            return null;
        } catch (error) {
            console.error("❌ Error al insertar usuario en BD:", error.message);
            throw new Error(error.message);
        }
    }
    async actualizar(usuario) {
        try {
            let filtroId;
            try {
                filtroId = typeof usuario._id === 'string' ? new ObjectId(usuario._id) : usuario._id;
            } catch (e) {
                throw new Error("ID de usuario inválido");
            }
            const resultado = await this.usuarios.findOneAndUpdate(
                { _id: filtroId },
                { $set: usuario },
                { upsert: false, returnDocument: "after" }
            );
            if (resultado.value) {
                console.log("✅ Usuario actualizado en BD:", resultado.value.email);
                return resultado.value;
            } else {
                throw new Error("Usuario no encontrado");
            }
        } catch (error) {
            console.error("❌ Error al actualizar usuario en BD:", error.message);
            throw error;
        }
    }
    async buscarOCrear(usuario) {
        try {
            const filtro = { email: usuario.email };
            const resultado = await this.usuarios.findOneAndUpdate(
                filtro,
                { $set: usuario },
                { upsert: true, returnDocument: "after" }
            );
            return resultado.value;
        } catch (error) {
            console.error("Error al buscar/crear usuario:", error);
            return null;
        }
    }
    async obtenerInfoUsuarios(emails) {
        try {
            const usuarios = await this.usuarios.find({ 
                email: { $in: emails } 
            }).toArray();
            const mapa = {};
            usuarios.forEach(u => {
                mapa[u.email] = {
                    username: u.username,
                    email: u.email
                };
            });
            // Añadir usuarios no encontrados con username por defecto
            emails.forEach(email => {
                if (!mapa[email]) {
                    mapa[email] = {
                        username: email.split('@')[0],
                        email: email
                    };
                }
            });
            // Convertir el mapa a un array de usuarios
            return Object.values(mapa);
        } catch (error) {
            console.error("Error al obtener info de usuarios:", error);
            return {};
        }
    }

    /**
     * Elimina un usuario de la base de datos
     * @param {string} email - Email del usuario a eliminar
     */
    async eliminar(email) {
        try {
            const resultado = await this.usuarios.deleteOne({ email });
            if (resultado.deletedCount > 0) {
                console.log("✅ Usuario eliminado de BD:", email);
                return true;
            } else {
                console.warn("⚠️ Usuario no encontrado para eliminar:", email);
                return false;
            }
        } catch (error) {
            console.error("❌ Error al eliminar usuario de BD:", error.message);
            throw error;
        }
    }
}
module.exports = UsuarioRepository;
