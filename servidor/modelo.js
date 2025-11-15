const datos = require("./cad.js");

function Sistema() {
    this.usuarios = {};
    this.cad = new datos.CAD();

    this.cad.conectar(function (db) {
        console.log("Conectado a Mongo Atlas");
    });

    this.usuarioGoogle = function (usr, callback) {
        this.cad.buscarOCrearUsuario(usr, function (obj) {
            callback(obj);
        });
    };

    this.agregarUsuario = function (nick) {
        let res = {nick: -1};
        if (!this.usuarios[nick]) {
            this.usuarios[nick] = new Usuario(nick);
            res.nick = nick;
        } else {
            console.log("el nick " + nick + " está en uso");
        }
        return res;
    };

    this.obtenerUsuarios = function () {
        let res = {nick: -1};
        if (Object.keys(this.usuarios).length > 0) {
            res = this.usuarios;
        } else {
            console.log("no hay usuarios");
        }
        return res;
    };

    this.usuarioActivo = function (nick) {
        let res = {nick: -1};
        if (nick in this.usuarios) {
            return this.usuarios[nick];
        } else {
            res.nick = "No existe";
            console.log("El usuario '" + nick + "' no existe.");
            return res;
        }
    };

    this.eliminarUsuario = function (nick) {
        let res = {eliminado: "No se ha eliminado"};
        if (nick in this.usuarios) {
            delete this.usuarios[nick];
            res.eliminado = "Eliminado con éxito";
        }
        return res;
    };

    this.numeroUsuarios = function () {
        let res = {num: -1};
        res.num = Object.keys(this.usuarios).length;
        return res;
    };

    this.registrarUsuario = function (obj, callback) {
        let modelo = this;
        if (!obj.nick) {
            obj.nick = obj.email;
        }
        // Buscar si ya existe un usuario con ese email
        this.cad.buscarUsuario({"email": obj.email}, function (usr) {
            if (!usr) {
                // El usuario no existe, proceder con el registro
                modelo.cad.insertarUsuario(obj, function (res) {
                    callback(res);
                });
            } else {
                // El usuario ya existe
                console.log("El email " + obj.email + " ya está registrado");
                callback({"email": -1});
            }
        });
    }

    this.loginUsuario = function (obj, callback) {
        // Buscar usuario por email y password
        this.cad.buscarUsuario({"email": obj.email, "password": obj.password}, function (usr) {
            if (usr) {
                // Usuario encontrado con credenciales correctas
                console.log("Usuario " + usr.email + " ha iniciado sesión correctamente");
                callback({"email": usr.email, "nombre": usr.nombre || usr.email});
            } else {
                // Usuario no encontrado o credenciales incorrectas
                console.log("Credenciales incorrectas para el email: " + obj.email);
                callback({"email": -1});
            }
        });
    }

}

function Usuario(nick) {
    this.nick = nick;
}

module.exports.Sistema = Sistema;
