/**
 * DTOs para Grupo - Contratos de datos entre capas
 */

class GrupoDTO {
    constructor(data) {
        this.id = data.id;
        this.nombre = data.nombre;
        this.descripcion = data.descripcion;
        this.miembros = data.miembros || [];
        this.fechaCreacion = data.fechaCreacion || new Date();
        this.ultimoMensaje = data.ultimoMensaje || null;
    }
}

class GrupoResponseDTO {
    constructor(grupo) {
        this.id = grupo.id;
        this.nombre = grupo.nombre;
        this.descripcion = grupo.descripcion;
        this.miembros = grupo.miembros || [];
        this.fechaCreacion = grupo.fechaCreacion;
        this.ultimoMensaje = grupo.ultimoMensaje;
        this.numeroMiembros = grupo.miembros ? grupo.miembros.length : 0;
    }
}

class GrupoCrearDTO {
    constructor(data) {
        this.nombre = data.nombre;
        this.descripcion = data.descripcion;
    }

    validar() {
        const errores = [];

        if (!this.nombre || this.nombre.trim().length < 3) {
            errores.push('Nombre debe tener al menos 3 caracteres');
        }

        return {
            valido: errores.length === 0,
            errores
        };
    }
}

module.exports = {
    GrupoDTO,
    GrupoResponseDTO,
    GrupoCrearDTO
};

