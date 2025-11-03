function ControlWeb() {
  this.mostrarAgregarUsuario = function () {
    // Añadir el formulario dentro del contenedor #au. No crear otro elemento con id "au".
    let cadena = '<div class="mb-3">';
    cadena += '<label for="nick">Name:</label>';
    cadena += '<input type="text" class="form-control" id="nick" placeholder="Introduce tu nick">';
    cadena += '<button id="btnAU" type="submit" class="btn btn-primary">Submit</button>';
    cadena += '</div>';
    // Vaciar previamente para evitar duplicados y luego añadir
    $("#au").empty().append(cadena);
    $("#btnAU").on("click", function () {
      let nick = $("#nick").val();
      rest.agregarUsuario(nick);
      // No eliminar el formulario aquí: eliminarlo solo cuando el registro
      // haya sido confirmado por el servidor (en ClienteRest.agregarUsuario).
    });
  };

  this.eliminarFormulario = function () {
    // Vacía el contenedor del formulario en lugar de eliminarlo para
    // mantener la estructura del DOM y evitar referencias rotas.
    if ($("#au").length) {
      $("#au").empty();
    }
  };

  this.comprobarSesion = function () {
    // Usar la API de jquery-cookie: $.cookie('nick') para leer la cookie.
    let nick = $.cookie("nick");
    if (nick) {
      cw.mostrarMensaje("Bienvenido al sistema, " + nick);
      // Ocultar/limpiar el formulario si ya hay sesión
      cw.eliminarFormulario();
    } else {
      cw.mostrarAgregarUsuario();
    }
  };

  this.mostrarMensaje = function (msg) {
    $("#mensaje").html(msg);
  };

  this.salir = function () {
    // Eliminar la cookie con la API correcta de jquery-cookie
    // (se expone como $.removeCookie)
    $.removeCookie("nick");
    location.reload();
  };
}
