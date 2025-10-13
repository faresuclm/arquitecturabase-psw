function Sistema() {
  this.usuarios = {};
  this.agregarUsuario = function (nick) {
    this.usuarios[nick] = new Usuario(nick);
  };
}
function Usuario(nick) {
  this.nick = nick;
}
