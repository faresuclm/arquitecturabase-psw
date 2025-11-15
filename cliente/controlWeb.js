function ControlWeb() {

    this.mostrarRegistro = function () {
        $("#fmRegistro").remove();
        $("#fmLogin").remove();
        $("#registro").load("./cliente/registro.html", function () {
            $("#btnRegistro").on("click", function (e) {
                e.preventDefault();
                let email = $("#email").val();
                let pwd = $("#pwd").val();

                // Validación de campos vacíos
                if (!email || !pwd) {
                    cw.mostrarMensajeError("Por favor, completa todos los campos obligatorios (email y contraseña).");
                    return;
                }

                // Validación básica de email
                let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    cw.mostrarMensajeError("Por favor, introduce un email válido.");
                    return;
                }

                // Validación de contraseña mínima
                if (pwd.length < 6) {
                    cw.mostrarMensajeError("La contraseña debe tener al menos 6 caracteres.");
                    return;
                }

                rest.registrarUsuario(email, pwd);
                console.log(email + " " + pwd);
            });

            $("#btnMostrarLogin").on("click", function (e) {
                e.preventDefault();
                cw.mostrarLogin();
            });
        });
    }

    this.mostrarLogin = function () {
        $("#fmLogin").remove();
        $("#fmRegistro").remove();
        $("#registro").load("./cliente/login.html", function () {
            $("#btnLogin").on("click", function (e) {
                e.preventDefault();
                let email = $("#emailLogin").val();
                let pwd = $("#pwdLogin").val();

                // Validación de campos vacíos
                if (!email || !pwd) {
                    cw.mostrarMensajeError("Por favor, completa todos los campos obligatorios (email y contraseña).");
                    return;
                }

                // Validación básica de email
                let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    cw.mostrarMensajeError("Por favor, introduce un email válido.");
                    return;
                }

                // Enviar datos al servidor
                rest.loginUsuario({"email": email, "password": pwd});
                console.log(email + " login attempt");
            });

            $("#btnMostrarRegistro").on("click", function (e) {
                e.preventDefault();
                cw.mostrarRegistro();
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
            cw.mostrarLogin();
        }
    };

    this.mostrarMensaje = function (msg) {
        $("#msg").html(msg);
    };

    this.mostrarMensajeExito = function (msg) {
        $("#msg").html('<div class="alert alert-success alert-dismissible fade show" role="alert">' +
            '<strong>✓ Éxito:</strong> ' + msg +
            '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
            '<span aria-hidden="true">&times;</span>' +
            '</button>' +
            '</div>');
    };

    this.mostrarMensajeError = function (msg) {
        $("#msg").html('<div class="alert alert-danger alert-dismissible fade show" role="alert">' +
            '<strong>✗ Error:</strong> ' + msg +
            '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
            '<span aria-hidden="true">&times;</span>' +
            '</button>' +
            '</div>');
    };

    this.mostrarMensajeInfo = function (msg) {
        $("#msg").html('<div class="alert alert-info alert-dismissible fade show" role="alert">' +
            '<strong>ℹ Info:</strong> ' + msg +
            '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
            '<span aria-hidden="true">&times;</span>' +
            '</button>' +
            '</div>');
    };

    this.salir = function () {
        let nick = $.cookie("nick");

        if (!nick) {
            cw.mostrarMensajeInfo("No hay ninguna sesión activa.");
            return;
        }

        // Confirmación antes de cerrar sesión
        if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
            // Mostrar mensaje de despedida
            cw.mostrarMensajeInfo("Cerrando sesión de " + nick + "...");

            // Notificar al servidor (opcional, pero buena práctica)
            rest.cerrarSesion(nick);

            // Eliminar la cookie
            $.removeCookie("nick");

            // Esperar un momento antes de recargar
            setTimeout(function() {
                location.reload();
            }, 1000);
        }
    };

    this.limpiar = function () {
        $("#fmRegistro").remove();
        $("#fmLogin").remove();
        $("#registro").empty();
        $("#au").empty();
    }
}
