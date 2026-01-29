/**
 * Manejador de WebSocket - Desacoplado y robusto
 * Maneja eventos de Socket.IO con validación y prevención de duplicados
 */
class SocketHandler {
    constructor(io, mensajeController) {
        this.io = io;
        this.mensajeController = mensajeController;
        // Estructura mejorada: grupoId -> { email -> [socketIds] }
        this.usuariosOnlinePorGrupo = {};
    }

    inicializar() {
        this.io.on('connection', (socket) => {
            console.log('🔌 Cliente conectado:', socket.id);

            socket.on('unirseGrupo', (data) => this.manejarUnirseGrupo(socket, data));
            socket.on('enviarMensaje', (mensaje) => this.manejarEnviarMensaje(socket, mensaje));
            socket.on('escribiendo', (data) => this.manejarEscribiendo(socket, data));
            socket.on('dejoDeEscribir', (data) => this.manejarDejoDeEscribir(socket, data));
            socket.on('salirGrupo', (gId) => this.manejarSalirGrupo(socket, gId));
            socket.on('disconnect', () => this.manejarDesconexion(socket));
        });
    }

    /**
     * Maneja la unión de un usuario a un grupo con validación robusta
     * Previene duplicados y maneja múltiples conexiones del mismo usuario
     */
    manejarUnirseGrupo(socket, data) {
        try {
            // Validación de datos
            if (!data) {
                console.error('❌ Datos inválidos en unirseGrupo');
                return;
            }

            const grupoId = data.grupoId || data;
            const usuarioEmail = data.usuarioEmail;
            const usuarioUsername = data.usuarioUsername;

            if (!grupoId || !usuarioEmail) {
                console.error('❌ Faltan datos requeridos:', { grupoId, usuarioEmail });
                return;
            }

            // Limpiar conexión anterior del socket si existía
            this.limpiarUsuarioOnline(socket);

            // Unir socket al grupo
            socket.join(grupoId);
            socket.grupoId = grupoId;
            socket.usuarioEmail = usuarioEmail;
            socket.usuarioUsername = usuarioUsername || usuarioEmail.split('@')[0];

            // Inicializar estructura del grupo si no existe
            if (!this.usuariosOnlinePorGrupo[grupoId]) {
                this.usuariosOnlinePorGrupo[grupoId] = {};
            }

            // Registrar el socket para este usuario en este grupo
            if (!this.usuariosOnlinePorGrupo[grupoId][usuarioEmail]) {
                this.usuariosOnlinePorGrupo[grupoId][usuarioEmail] = {
                    username: socket.usuarioUsername,
                    sockets: new Set()
                };
            }

            this.usuariosOnlinePorGrupo[grupoId][usuarioEmail].sockets.add(socket.id);

            // Emitir lista actualizada de usuarios online
            this.emitirUsuariosOnline(grupoId);

            console.log(`✅ Usuario ${socket.usuarioUsername} (${usuarioEmail}) unido a grupo ${grupoId}`);
            console.log(`📊 Sockets activos en ${grupoId}:`,
                this.usuariosOnlinePorGrupo[grupoId][usuarioEmail].sockets.size);

        } catch (error) {
            console.error('❌ Error en manejarUnirseGrupo:', error);
        }
    }

    async manejarEnviarMensaje(socket, mensaje) {
        await this.mensajeController.enviarMensaje(mensaje, (msg) => {
            if (msg && msg.id !== -1) {
                this.io.to(mensaje.grupoId).emit('nuevoMensaje', msg);
                console.log(`📨 Mensaje enviado en grupo ${mensaje.grupoId}`);
            } else {
                console.error('❌ Error al enviar mensaje');
            }
        });
    }

    manejarEscribiendo(socket, data) {
        socket.to(data.grupoId).emit('usuarioEscribiendo', data);
    }

    manejarDejoDeEscribir(socket, data) {
        socket.to(data.grupoId).emit('usuarioDejoDeEscribir', data);
    }

    manejarSalirGrupo(socket, grupoId) {
        socket.leave(grupoId);
        this.limpiarUsuarioOnline(socket);
        console.log(`👋 Usuario salió del grupo ${grupoId}`);
    }

    manejarDesconexion(socket) {
        this.limpiarUsuarioOnline(socket);
        console.log('🔌 Cliente desconectado:', socket.id);
    }

    /**
     * Limpia un usuario de la lista de online cuando se desconecta
     * Maneja correctamente múltiples sockets del mismo usuario
     */
    limpiarUsuarioOnline(socket) {
        const gId = socket.grupoId;
        const usuarioEmail = socket.usuarioEmail;

        if (!gId || !usuarioEmail) {
            return;
        }

        if (!this.usuariosOnlinePorGrupo[gId]) {
            return;
        }

        // Si el usuario existe en este grupo
        if (this.usuariosOnlinePorGrupo[gId][usuarioEmail]) {
            // Eliminar este socket específico
            this.usuariosOnlinePorGrupo[gId][usuarioEmail].sockets.delete(socket.id);

            // Si no quedan más sockets para este usuario, eliminarlo completamente
            if (this.usuariosOnlinePorGrupo[gId][usuarioEmail].sockets.size === 0) {
                delete this.usuariosOnlinePorGrupo[gId][usuarioEmail];
                console.log(`👋 Usuario ${socket.usuarioUsername} (${usuarioEmail}) completamente desconectado del grupo ${gId}`);
            }

            this.emitirUsuariosOnline(gId);

            // Si no quedan usuarios en el grupo, limpiar el grupo
            if (Object.keys(this.usuariosOnlinePorGrupo[gId]).length === 0) {
                delete this.usuariosOnlinePorGrupo[gId];
                console.log(`🗑️ Grupo ${gId} limpiado (sin usuarios online)`);
            }
        }
    }

    /**
     * Emite la lista actualizada de usuarios online en un grupo
     * Asegura que no haya duplicados
     */
    emitirUsuariosOnline(grupoId) {
        if (!this.usuariosOnlinePorGrupo[grupoId]) {
            this.io.to(grupoId).emit('usuariosOnlineActualizados', {
                grupoId,
                usuarios: []
            });
            return;
        }

        // Obtener lista única de usuarios con sus datos (sin duplicados)
        const listaUsuarios = Object.keys(this.usuariosOnlinePorGrupo[grupoId]).map(email => ({
            email: email,
            username: this.usuariosOnlinePorGrupo[grupoId][email].username
        }));

        this.io.to(grupoId).emit('usuariosOnlineActualizados', {
            grupoId,
            usuarios: listaUsuarios
        });

        console.log(`📡 Usuarios online en ${grupoId}:`, listaUsuarios.length);
    }

    /**
     * Obtiene estadísticas de conexión para debug
     */
    obtenerEstadisticas(grupoId) {
        if (!this.usuariosOnlinePorGrupo[grupoId]) {
            return { usuariosUnicos: 0, socketsTotal: 0 };
        }

        const usuariosUnicos = Object.keys(this.usuariosOnlinePorGrupo[grupoId]).length;
        const socketsTotal = Object.values(this.usuariosOnlinePorGrupo[grupoId])
            .reduce((total, usuario) => total + usuario.sockets.size, 0);

        return { usuariosUnicos, socketsTotal };
    }
}

module.exports = SocketHandler;

