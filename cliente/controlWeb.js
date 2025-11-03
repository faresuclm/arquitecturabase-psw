function ControlWeb() {
  
  this.mostrarAgregarUsuario = function () {
    let cadena = '<div id="au" class="form-group">';
    cadena = cadena + '<label for="nick">Name:</label>';
    cadena = cadena + '<input type="text" class="form-control" id="nick" placeholder="Introduce tu nick">';
    cadena =
      cadena +
      '<button id="btnAU" type="submit" class="btn btn-primary">Submit</button>';
    cadena = cadena + "</div>";
    $("#au").append(cadena);
    $("#btnAU").on("click", function () {
      let nick = $("#nick").val();
      rest.agregarUsuario(nick);
      cw.eliminarFormulario();
    });
  };

  this.eliminarFormulario = function () {
    let cadena = '<div id="au" class="form-group">';
    cadena = cadena + '<label for="nick">Name:</label>';
    cadena = cadena + '<input type="text" class="form-control" id="nick">';
    cadena =
      cadena +
      '<button id="btnAU" type="submit" class="btn btn-primary">Submit</button>';
    cadena = cadena + "</div>";
    $("#btnAU").on("click", function () {
      $("#au").remove();
    });
  };

  this.comprobarSesion = function () {
    let nick = localStorage.getItem("nick");
    if (nick) {
      cw.mostrarMensaje("Bienvenido al sistema, " + nick);
    } else {
      cw.mostrarAgregarUsuario();
    }
  };

  this.mostrarMensaje = function (msg) {
    $("#mensaje").html(msg);
  };
}
