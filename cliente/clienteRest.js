function ClienteRest() {
  this.agregarUsuario = function (nick) {
    var cli = this;

    $.getJSON("/agregarUsuario/" + nick, function (data) {
      if (data.nick != -1) {
        console.log("Usuario " + nick + " ha sido registrado");
      } else {
        console.log("El nick ya está ocupado");
      }
    });
  };

  this.obtenerUsuarios = function () {
    var cli = this;
    $.getJSON("/obtenerUsuarios", function (data) {
      if (data.nick != -1) {
        console.log("Usuarios obtenidos");
        console.log(data);
      } else {
        console.log("No existen usuarios");
      }
    });
  };

  this.numeroUsuarios = function () {
    var cli = this;
    $.getJSON("/numeroUsuarios", function (data) {
      if (data.num != -1) {
        console.log("Número de usuarios: " + data.num);
      } else {
        console.log("No hay usuarios");
      }
    });
  };

  this.usuarioActivo = function (nick) {
    var cli = this;
    $.getJSON("/usuarioActivo/" + nick, function (data) {
      if (data.nick != "No existe") {
        console.log("El usuario " + nick + " está activo");
      } else {
        console.log("El usuario " + nick + " no está activo");
      }
    });
  };

  this.eliminarUsuario = function (nick) {
    var cli = this;
    $.getJSON("/eliminarUsuario/" + nick, function (data) {
      if (data.nick != -1) {
        console.log("Usuario " + nick + " ha sido eliminado con éxito");
      } else {
        console.log("El usuario " + nick + " no existe");
      }
    });
  };
}
