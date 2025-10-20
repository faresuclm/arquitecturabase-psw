
function Sistema() {
  
  this.usuarios = {};
  
  this.agregarUsuario = function (nick) {
    var activo = this.usuarioActivo(nick);
    if (activo == true) {
      this.usuarios[nick] = new Usuario(nick);
    }
  };

  this.obtenerUsuarios = function () {
    return this.usuarios;
  };

  this.usuarioActivo = function (nick) {
    if (nick in this.usuarios) {
      console.log("El usuario '" + nick + "' ya existe.");
    }
  };

  this.eliminarUsuario = function(nick) {
    if(nick in this.usuarios){
      delete this.usuarios.nick;
    }
  }

  this.numeroUsuarios = function () {
    return Object.keys(this.usuarios).length;
  };
}

function Usuario(nick) {
  this.nick = nick;
}
