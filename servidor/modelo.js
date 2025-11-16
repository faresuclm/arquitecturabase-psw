const datos = require("./cad.js");
const correo = require("../cliente/email.js");
const bcrypt = require("bcrypt");
const SALT_ROUNDS = 10; // Número de rondas para el salt de bcrypt


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
        this.cad.buscarUsuario(obj, function (usr) {
            if (!usr) {
                // El usuario no existe, luego lo puedo registrar
                // Cifrar la contraseña con bcrypt antes de guardarla
                bcrypt.hash(obj.password, SALT_ROUNDS, function(err, hash) {
                    if (err) {
                        console.error("Error al cifrar la contraseña:", err);
                        callback({"email": -1});
                        return;
                    }

                    // Reemplazar la contraseña en texto plano por el hash
                    obj.password = hash;
                    obj.key = Date.now().toString();
                    obj.confirmada = false;

                    modelo.cad.insertarUsuario(obj, function (res) {
                        callback(res);
                    });
                    correo.enviarEmail(obj.email, obj.key, "Confirmar cuenta");
                });
            } else {
                callback({"email": -1});
            }
        });
    }

    /*
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
    }*/

    this.loginUsuario = function (obj, callback) {
        this.cad.buscarUsuario({"email": obj.email, "confirmada": true}, function (usr) {
            if (usr) {
                // Usuario encontrado y confirmado, ahora comparar la contraseña
                bcrypt.compare(obj.password, usr.password, function(err, result) {
                    if (err) {
                        console.error("Error al comparar contraseñas:", err);
                        callback({"email": -1});
                        return;
                    }

                    if (result) {
                        // Contraseña correcta
                        callback(usr);
                    } else {
                        // Contraseña incorrecta
                        console.log("Contraseña incorrecta para el usuario:", usr.email);
                        callback({"email": -1});
                    }
                });
            } else {
                // Usuario no encontrado o no confirmado
                callback({"email": -1});
            }
        });
    }


    this.confirmarUsuario = function (obj, callback) {
        let modelo = this;
        this.cad.buscarUsuario({"email": obj.email, "confirmada": false, "key": obj.key}, function (usr) {
            if (usr) {
                usr.confirmada = true;
                modelo.cad.actualizarUsuario(usr, function (res) {
                    callback({"email": res.email}); //callback(res)
                })
            } else {
                callback({"email": -1});
            }
        })
    }

}

function Usuario(nick) {
    this.nick = nick;
}

module.exports.Sistema = Sistema;
