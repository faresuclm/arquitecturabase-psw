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
    let res = { nick: -1 };
    if (!this.usuarios[nick]) {
      this.usuarios[nick] = new Usuario(nick);
      res.nick = nick;
    } else {
      console.log("el nick " + nick + " está en uso");
    }
    return res;
  };

  this.obtenerUsuarios = function () {
    let res = { nick: -1 };
    if (Object.keys(this.usuarios).length > 0) {
      res = this.usuarios;
    } else {
      console.log("no hay usuarios");
    }
    return res;
  };

  this.usuarioActivo = function (nick) {
    let res = { nick: -1 };
    if (nick in this.usuarios) {
      return this.usuarios[nick];
    } else {
      res.nick = "No existe";
      console.log("El usuario '" + nick + "' no existe.");
      return res;
    }
  };

  this.eliminarUsuario = function (nick) {
    let res = { eliminado: "No se ha eliminado" };
    if (nick in this.usuarios) {
      delete this.usuarios[nick];
      res.eliminado = "Eliminado con éxito";
    }
    return res;
  };

  this.numeroUsuarios = function () {
    let res = { num: -1 };
    res.num = Object.keys(this.usuarios).length;
    return res;
  };
}

function Usuario(nick) {
  this.nick = nick;
}

module.exports.Sistema = Sistema;
