const bcrypt = require("bcrypt");
const correo = require("../../cliente/email.js");
const { UsuarioDTO, UsuarioResponseDTO } = require("../dto/usuarioDTO");

const SALT_ROUNDS = 10;

/**
 * Servicio de Usuario - Lógica de negocio independiente de la BD
 */
class UsuarioService {
    constructor(usuarioRepository, grupoService = null) {
        this.usuarioRepository = usuarioRepository;
        this.grupoService = grupoService;
    }

    async registrarUsuario(datosRegistro) {
        // Validar datos de entrada
        if (!datosRegistro.email || !datosRegistro.password || !datosRegistro.username) {
            throw new Error("Faltan datos obligatorios");
        }

        if (!/^[a-zA-Z0-9_]{3,20}$/.test(datosRegistro.username)) {
            throw new Error("Username inválido (3-20 caracteres alfanuméricos)");
        }

        if (datosRegistro.password.length < 8) {
            throw new Error("Contraseña debe tener mínimo 8 caracteres");
        }

        // Verificar si el usuario ya existe
        const usuarioExistente = await this.usuarioRepository.buscarPorEmail(datosRegistro.email);

        // Si existe y viene de Google, completar registro
        if (usuarioExistente && usuarioExistente.provider === 'google' &&
            !usuarioExistente.password && datosRegistro.provider === 'google') {

            const usernameOcupado = await this.usuarioRepository.buscarPorUsername(datosRegistro.username);
            if (usernameOcupado && usernameOcupado.email !== datosRegistro.email) {
                throw new Error("El nombre de usuario ya está en uso");
            }

            const passwordHash = await bcrypt.hash(datosRegistro.password, SALT_ROUNDS);
            usuarioExistente.password = passwordHash;
            usuarioExistente.username = datosRegistro.username;
            usuarioExistente.confirmada = true;

            const usuarioActualizado = await this.usuarioRepository.actualizar(usuarioExistente);
            return new UsuarioResponseDTO(usuarioActualizado);
        }

        if (usuarioExistente) {
            throw new Error("El email ya está registrado");
        }

        // Verificar username disponible
        const usernameOcupado = await this.usuarioRepository.buscarPorUsername(datosRegistro.username);
        if (usernameOcupado) {
            throw new Error("El nombre de usuario ya está en uso");
        }

        // Hash de la contraseña
        const passwordHash = await bcrypt.hash(datosRegistro.password, SALT_ROUNDS);

        // Crear usuario
        const nuevoUsuario = {
            email: datosRegistro.email,
            username: datosRegistro.username,
            password: passwordHash,
            key: Date.now().toString(),
            confirmada: datosRegistro.confirmada || false,
            provider: datosRegistro.provider || 'local',
            fechaRegistro: new Date()
        };

        const usuarioCreado = await this.usuarioRepository.crear(nuevoUsuario);

        // Enviar email de confirmación si no está confirmada
        if (!usuarioCreado.confirmada) {
            try {
                await correo.enviarEmail(usuarioCreado.email, usuarioCreado.key, "Confirmar cuenta");
                console.log(`✉️ Email de confirmación enviado a ${usuarioCreado.email}`);
            } catch (error) {
                console.error("❌ Error al enviar email de confirmación:", error);
                // No lanzamos error para no revertir el registro, pero lo logueamos
            }
        }

        return new UsuarioResponseDTO(usuarioCreado);
    }

    async loginUsuario(credenciales) {
        if (!credenciales.email || !credenciales.password) {
            throw new Error("Faltan datos");
        }

        const usuario = await this.usuarioRepository.buscarPorEmail(credenciales.email);

        if (!usuario) {
            throw new Error("Usuario no encontrado");
        }

        if (usuario.provider === 'google' && !usuario.password) {
            throw new Error("Cuenta de Google. Usa el botón de Google.");
        }

        if (usuario.confirmada === false) {
            const error = new Error("Cuenta no verificada");
            error.confirmada = false;
            throw error;
        }

        const passwordValido = await bcrypt.compare(credenciales.password, usuario.password);

        if (!passwordValido) {
            throw new Error("Contraseña incorrecta");
        }

        return new UsuarioResponseDTO(usuario);
    }

    async confirmarUsuario(email, key) {
        const usuario = await this.usuarioRepository.buscarPorCriterio({
            email,
            confirmada: false,
            key
        });

        if (!usuario) {
            throw new Error("Usuario no encontrado o ya confirmado");
        }

        usuario.confirmada = true;
        const usuarioActualizado = await this.usuarioRepository.actualizar(usuario);

        return new UsuarioResponseDTO(usuarioActualizado);
    }

    async buscarPorEmail(email) {
        const usuario = await this.usuarioRepository.buscarPorEmail(email);
        return usuario ? new UsuarioResponseDTO(usuario) : null;
    }

    async verificarUsuarioGoogle(email) {
        const usuario = await this.usuarioRepository.buscarPorEmail(email);
        return usuario ? new UsuarioResponseDTO(usuario) : null;
    }

    async verificarUsernameDisponible(username) {
        return await this.usuarioRepository.verificarUsernameDisponible(username);
    }

    async solicitarRecuperacionPassword(email) {
        const usuario = await this.usuarioRepository.buscarPorEmail(email);

        if (!usuario) {
            throw new Error("Usuario no encontrado");
        }

        if (usuario.provider === 'google' && !usuario.password) {
            throw new Error("Usa Google para entrar");
        }

        const resetToken = Date.now() + Math.random().toString(36).substring(2);
        usuario.resetToken = resetToken;
        usuario.resetTokenExpiry = Date.now() + 3600000; // 1 hora

        await this.usuarioRepository.actualizar(usuario);
        
        try {
            await correo.enviarEmailRecuperacion(email, resetToken);
            console.log(`✉️ Email de recuperación enviado a ${email}`);
        } catch (error) {
            console.error("❌ Error al enviar email de recuperación:", error);
            throw new Error("Error al enviar el email de recuperación. Inténtalo más tarde.");
        }

        return { success: true };
    }

    async restablecerPassword(email, token, newPassword) {
        const usuario = await this.usuarioRepository.buscarPorCriterio({
            email,
            resetToken: token
        });

        if (!usuario || Date.now() > usuario.resetTokenExpiry) {
            throw new Error("Token inválido o expirado");
        }

        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        usuario.password = passwordHash;
        delete usuario.resetToken;
        delete usuario.resetTokenExpiry;

        await this.usuarioRepository.actualizar(usuario);

        return { success: true };
    }

    async obtenerInfoUsuarios(emails) {
        return await this.usuarioRepository.obtenerInfoUsuarios(emails);
    }


    /**
     * Actualiza el nombre de usuario
     */
    async actualizarUsername(email, nuevoUsername) {
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(nuevoUsername)) {
            throw new Error("Username inválido (3-20 caracteres alfanuméricos)");
        }

        const usernameOcupado = await this.usuarioRepository.buscarPorUsername(nuevoUsername);
        if (usernameOcupado && usernameOcupado.email !== email) {
            throw new Error("El nombre de usuario ya está en uso");
        }

        const usuario = await this.usuarioRepository.buscarPorEmail(email);
        if (!usuario) {
            throw new Error("Usuario no encontrado");
        }

        usuario.username = nuevoUsername;
        await this.usuarioRepository.actualizar(usuario);

        return new UsuarioResponseDTO(usuario);
    }

    /**
     * Actualiza la contraseña del usuario
     */
    async actualizarPassword(email, passwordActual, passwordNueva) {
        const usuario = await this.usuarioRepository.buscarPorEmail(email);
        if (!usuario) {
            throw new Error("Usuario no encontrado");
        }

        if (usuario.password && passwordActual) {
            const passwordValido = await bcrypt.compare(passwordActual, usuario.password);
            if (!passwordValido) {
                throw new Error("Contraseña actual incorrecta");
            }
        }

        if (passwordNueva.length < 8) {
            throw new Error("La nueva contraseña debe tener mínimo 8 caracteres");
        }

        const passwordHash = await bcrypt.hash(passwordNueva, SALT_ROUNDS);
        usuario.password = passwordHash;
        await this.usuarioRepository.actualizar(usuario);

        return { success: true };
    }

    /**
     * Elimina la cuenta del usuario
     */
    async eliminarCuenta(email, password) {
        const usuario = await this.usuarioRepository.buscarPorEmail(email);
        if (!usuario) {
            throw new Error("Usuario no encontrado");
        }

        if (usuario.password && password) {
            const passwordValido = await bcrypt.compare(password, usuario.password);
            if (!passwordValido) {
                throw new Error("Contraseña incorrecta");
            }
        }

        if (this.grupoService) {
            try {
                await this.grupoService.eliminarUsuarioDeTodosLosGrupos(email);
            } catch (error) {
                console.error("Error al eliminar usuario de grupos:", error);
            }
        }

        await this.usuarioRepository.eliminar(email);

        return { success: true, message: "Cuenta eliminada correctamente" };
    }
}

module.exports = UsuarioService;

