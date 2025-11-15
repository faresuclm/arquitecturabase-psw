function ControlWeb() {

    this.mostrarRegistro = function () {
        $("#fmRegistro").remove();
        $("#registro").load("./cliente/registro.html", function () {
            $("#btnRegistro").on("click", function (e) {
                e.preventDefault();
                let email = $("#email").val();
                let pwd = $("#pwd").val();
                if (email && pwd) {
                    rest.registrarUsuario(nick);
                    console.log(email + " " + pwd);
                }
            });
        });
    }


    this.mostrarAgregarUsuario = function () {
        $('#bnv').remove();
        $('#mAU').remove();
        let cadena = '<div id="mAU">';
        cadena = cadena + '<div class="card"><div class="card-body">';
        cadena = cadena + '<div class="form-group">';
        cadena = cadena + '<label for="nick">Nick:</label>';
        cadena = cadena + '<p><input type="text" class="form-control" id="nick" placeholder="introduce un nick"></p>';
        cadena = cadena + '<button id="btnAU" type="submit" class="btn btn-primary">Submit</button>';
        cadena = cadena + '<div><a href="/auth/google">' +
            '<img src="/cliente/img/web_neutral_rd_ctn@2x.png" style="height:40px;"></a></div>';
        cadena = cadena + '</div>';
        cadena = cadena + '</div></div></div>'
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
            //cw.mostrarAgregarUsuario();
            cw.mostrarRegistro();
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
