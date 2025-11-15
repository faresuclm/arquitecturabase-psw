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
        this.cad.buscarUsuario(obj, function (usr) {
            if (!usr) {
                modelo.cad.insertarUsuario(obj, function (res) {
                    callback(res);
                });
            } else {
                callback({"email": -1});
            }
        });
    }

    this.buscarUsuario = function (obj, callback) {
        buscar(this.usuarios, obj, callback);
    }

    this.insertarUsuario = function (usuario, callback) {
        insertar(this.usuarios, usuario, callback);
    }

    function buscar(coleccion, criterio, callback) {
        coleccion.find(criterio).toArray(function (error, usuarios) {
            if (usuarios.length == 0) {
                callback(undefined);
            } else {
                callback(usuarios[0]);
            }
        });
    }

    function insertar(coleccion, elemento, callback) {
        coleccion.insertOne(elemento, function (err, result) {
            if (err) {
                console.log("error");
            } else {
                console.log("Nuevo elemento creado");
                callback(elemento);
            }
        });
    }

}

function Usuario(nick) {
    this.nick = nick;
}

module.exports.Sistema = Sistema;
