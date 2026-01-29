/**
 * DTOs para Mensaje - Contratos de datos entre capas
 */

class MensajeDTO {
    constructor(data) {
        this.id = data.id || Date.now().toString();
        this.grupoId = data.grupoId;
        this.autor = data.autor;
        this.nombreAutor = data.nombreAutor;
        this.contenido = data.contenido;
        this.fecha = data.fecha || new Date();
        this.leido = data.leido || false;
    }
}

class MensajeCrearDTO {
    constructor(data) {
        this.grupoId = data.grupoId;
        this.autor = data.autor;
        this.nombreAutor = data.nombreAutor;
        this.contenido = data.contenido;
    }

    validar() {
        const errores = [];

        if (!this.grupoId) errores.push('GrupoId requerido');
        if (!this.autor) errores.push('Autor requerido');
        if (!this.nombreAutor) errores.push('Nombre de autor requerido');
        if (!this.contenido || this.contenido.trim().length === 0) {
            errores.push('Contenido requerido');
        }
        if (this.contenido && this.contenido.length > 1000) {
            errores.push('Contenido demasiado largo (máx. 1000 caracteres)');
        }

        return {
            valido: errores.length === 0,
            errores
        };
    }
}

class MensajeResponseDTO {
    constructor(mensaje) {
        this.id = mensaje.id;
        this.grupoId = mensaje.grupoId;
        this.autor = mensaje.autor;
        this.nombreAutor = mensaje.nombreAutor;
        this.contenido = mensaje.contenido;
        this.fecha = mensaje.fecha;
        this.leido = mensaje.leido;
    }
}

module.exports = {
    MensajeDTO,
    MensajeCrearDTO,
    MensajeResponseDTO
};

