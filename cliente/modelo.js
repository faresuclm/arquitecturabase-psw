function Sistema() {
  this.usuarios = {};
  this.agregarUsuario = function (nick) {
    if (nick in this.usuarios) {
      console.log("El usuario '" + nick + "' ya existe.");
    } else {
      this.usuarios[nick] = new Usuario(nick);
    }
  };
}
function Usuario(nick) {
  this.nick = nick;
}
