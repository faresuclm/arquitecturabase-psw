/**
 * DTOs para Usuario - Contratos de datos entre capas
 * Estos objetos definen la estructura de datos independiente de la BD
 */

class UsuarioDTO {
    constructor(data) {
        this.email = data.email;
        this.username = data.username;
        this.confirmada = data.confirmada || false;
        this.provider = data.provider || 'local';
        this.fechaRegistro = data.fechaRegistro || new Date();
        this.photoURL = data.photoURL || null; // URL de foto de perfil (Google)
    }
}

class UsuarioRegistroDTO {
    constructor(data) {
        this.email = data.email;
        this.username = data.username;
        this.password = data.password;
        this.confirmada = data.confirmada || false;
        this.provider = data.provider || 'local';
    }

    validar() {
        const errores = [];

        if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
            errores.push('Email inválido');
        }

        if (!this.username || !/^[a-zA-Z0-9_]{3,20}$/.test(this.username)) {
            errores.push('Username inválido (3-20 caracteres alfanuméricos)');
        }

        if (!this.password || this.password.length < 8) {
            errores.push('Contraseña debe tener mínimo 8 caracteres');
        }

        return {
            valido: errores.length === 0,
            errores
        };
    }
}

class UsuarioLoginDTO {
    constructor(data) {
        this.email = data.email;
        this.password = data.password;
    }

    validar() {
        const errores = [];

        if (!this.email) errores.push('Email requerido');
        if (!this.password) errores.push('Contraseña requerida');

        return {
            valido: errores.length === 0,
            errores
        };
    }
}

class UsuarioResponseDTO {
    constructor(usuario) {
        this.email = usuario.email;
        this.username = usuario.username;
        this.confirmada = usuario.confirmada;
        this.provider = usuario.provider;
        this.fechaRegistro = usuario.fechaRegistro;
        this.photoURL = usuario.photoURL || null; // URL de foto
        // NO incluir password, resetToken, etc.
    }
}

module.exports = {
    UsuarioDTO,
    UsuarioRegistroDTO,
    UsuarioLoginDTO,
    UsuarioResponseDTO
};

