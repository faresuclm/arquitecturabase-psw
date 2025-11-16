function ControlWeb() {

    this.mostrarRegistro = function () {
        $("#fmRegistro").remove();
        $("#fmLogin").remove();
        $("#registro").load("./cliente/registro.html", function () {
            $("#btnRegistro").on("click", function (e) {
                e.preventDefault();
                let email = $("#email").val();
                let pwd = $("#pwd").val();
                let nombre = $("#nombre").val();
                let apellidos = $("#apellidos").val();

                // Validación de campos vacíos (email y password son obligatorios)
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

                rest.registrarUsuario(email, pwd, nombre, apellidos);
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

        // Verificar si viene desde la confirmación de correo
        let urlParams = new URLSearchParams(window.location.search);
        let verificado = urlParams.get('verificado');
        let email = urlParams.get('email');

        if (nick) {
            // Obtener el nombre del usuario guardado en la cookie
            let displayName = $.cookie("userName") || nick;
            // Mostrar el navegador cuando hay sesión
            $("#mainNav").show();
            // Ocultar el contenedor principal cuando hay sesión
            $("#mainContainer").hide();
            cw.mostrarMensaje("Bienvenido " + displayName);
            // Ocultar/limpiar el formulario si ya hay sesión
            cw.eliminarFormulario();
        } else {
            // Ocultar el navegador cuando no hay sesión
            $("#mainNav").hide();
            // Mostrar el contenedor principal para login/registro
            $("#mainContainer").show();

            // Mostrar el formulario de login
            cw.mostrarLogin();

            // Si viene desde la verificación de correo, mostrar mensaje
            if (verificado === 'true') {
                setTimeout(function() {
                    cw.mostrarMensajeExito("¡Tu cuenta ha sido verificada exitosamente! Ahora puedes iniciar sesión.");
                    // Pre-rellenar el email si está disponible
                    if (email) {
                        $("#emailLogin").val(decodeURIComponent(email));
                    }
                    // Limpiar la URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                }, 500);
            } else if (verificado === 'false') {
                setTimeout(function() {
                    cw.mostrarMensajeError("Error al verificar la cuenta. El enlace puede haber expirado o ser inválido.");
                    // Limpiar la URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                }, 500);
            }
        }
    };

    this.mostrarMensaje = function (msg) {
        $("#msg").addClass("center-message");
        $("#msg").html(
            '<div style="' +
            'display: inline-block;' +
            'padding: 16px 32px;' +
            'font-size: 17px;' +
            'color: #1e40af;' +
            'font-weight: 600;' +
            'background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,249,255,0.95) 100%);' +
            'border-radius: 16px;' +
            'box-shadow: 0 8px 32px rgba(59, 130, 246, 0.15);' +
            'border: 1px solid rgba(59, 130, 246, 0.2);' +
            'backdrop-filter: blur(10px);' +
            'animation: fadeIn 0.5s ease-out;' +
            'text-align: center;' +
            '">' +
            '<span style="margin-right: 8px;">👋</span>' + msg +
            '</div>' +
            '<style>@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); }}</style>'
        );
    };

    this.mostrarMensajeExito = function (msg) {
        $("#msg").removeClass("center-message");
        $("#msg").html('<div class="alert alert-success alert-dismissible fade show" role="alert" style="box-shadow: 0 4px 20px rgba(34, 197, 94, 0.3); font-size: 15px;">' +
            '<strong>✓ Éxito:</strong> ' + msg +
            '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
            '<span aria-hidden="true">&times;</span>' +
            '</button>' +
            '</div>');
    };

    this.mostrarMensajeError = function (msg) {
        $("#msg").removeClass("center-message");
        $("#msg").html('<div class="alert alert-danger alert-dismissible fade show" role="alert" style="box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3); font-size: 15px;">' +
            '<strong>✗ Error:</strong> ' + msg +
            '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
            '<span aria-hidden="true">&times;</span>' +
            '</button>' +
            '</div>');
    };

    this.mostrarMensajeInfo = function (msg) {
        $("#msg").removeClass("center-message");
        $("#msg").html('<div class="alert alert-info alert-dismissible fade show" role="alert" style="box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3); font-size: 15px;">' +
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

        // Obtener el nombre para mostrarlo en el mensaje
        let displayName = $.cookie("userName") || nick;

        // Confirmación antes de cerrar sesión
        if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
            // Mostrar mensaje de despedida
            cw.mostrarMensajeInfo("Cerrando sesión de " + displayName + "...");

            // Notificar al servidor (opcional, pero buena práctica)
            rest.cerrarSesion(nick);

            // Eliminar las cookies
            $.removeCookie("nick");
            $.removeCookie("userName");

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
