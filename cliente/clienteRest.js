function ClienteRest() {

    this.registrarUsuario = function (email, password) {
        $.ajax({
            type: 'POST',
            url: '/registrarUsuario',
            data: JSON.stringify({"email": email, "password": password}),
            success: function (data) {
                if (data.nick != -1) {
                    console.log("Usuario " + data.nick + " ha sido registrado");
                    $.cookie("nick", data.nick);
                    cw.limpiar();
                    cw.mostrarMensaje("Bienvenido al sistema,"+data.nick);
                    cw.mostrarLogin();
                } else {
                    console.log("El nick está ocupado");
                }
            },
            error: function (xhr, textStatus, errorThrown) {
                console.log("Status: " + textStatus);
                console.log("Error: " + errorThrown);
            },
            contentType: 'application/json'
        });
    }

    this.agregarUsuario = function (nick) {
        var cli = this;
        $.getJSON("/agregarUsuario/" + nick, function (data) {
            let msg = "El nick " + nick + " está ocupado";
            if (data.nick != -1) {
                console.log("Usuario " + nick + " ha sido registrado");
                msg = "Bienvenido al sistema, " + nick;
                //localStorage.setItem("nick", nick);
                // Usar la API de jquery-cookie: $.cookie('nick', nick) para setear la cookie
                $.cookie("nick", nick);
                // Solo eliminar el formulario cuando el registro haya sido exitoso
                if (typeof cw !== 'undefined' && cw.eliminarFormulario) {
                    cw.eliminarFormulario();
                }
            } else {
                console.log("El nick ya está ocupado");
            }
            cw.mostrarMensaje(msg);
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
