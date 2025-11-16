function ClienteRest() {

    this.registrarUsuario = function (email, password, nombre, apellidos) {
        let userData = {
            "email": email,
            "password": password
        };

        // Agregar nombre y apellidos si están presentes
        if (nombre) {
            userData.nombre = nombre;
        }
        if (apellidos) {
            userData.apellidos = apellidos;
        }

        $.ajax({
            type: 'POST',
            url: '/registrarUsuario',
            data: JSON.stringify(userData),
            success: function (data) {
                if (data.nick != -1) {
                    console.log("Usuario " + data.nick + " ha sido registrado");
                    let displayName = nombre || data.nick;

                    // Mostrar mensaje de verificación de correo
                    cw.mostrarMensajeInfo("¡Registro exitoso! Por favor, verifica tu correo electrónico (" + data.nick + ") para completar el registro. Te hemos enviado un enlace de verificación.");

                    // Redirigir al login después de 4 segundos
                    setTimeout(function() {
                        cw.mostrarLogin();
                    }, 4000);
                } else {
                    console.log("El email ya está registrado");
                    cw.mostrarMensajeError("El email ya está registrado. Por favor, utiliza otro email o inicia sesión.");
                }
            },
            error: function (xhr, textStatus, errorThrown) {
                console.log("Status: " + textStatus);
                console.log("Error: " + errorThrown);
                let mensajeError = "Error al registrar usuario. ";
                if (xhr.status === 0) {
                    mensajeError += "No se pudo conectar con el servidor.";
                } else if (xhr.status === 400) {
                    mensajeError += "Datos inválidos.";
                } else if (xhr.status === 500) {
                    mensajeError += "Error del servidor.";
                } else {
                    mensajeError += "Error desconocido: " + textStatus;
                }
                cw.mostrarMensajeError(mensajeError);
            },
            contentType: 'application/json'
        });
    }

    this.loginUsuario = function (usr) {
        $.ajax({
            type: 'POST',
            url: '/loginUsuario',
            data: JSON.stringify(usr),
            success: function (data) {
                if (data.nick && data.nick != -1) {
                    console.log("Usuario " + data.nick + " ha iniciado sesión");
                    $.cookie("nick", data.nick);
                    // Guardar el nombre para mostrarlo
                    let displayName = data.nombre || data.nick;
                    $.cookie("userName", displayName);
                    cw.mostrarMensajeExito("¡Inicio de sesión exitoso! Bienvenido de nuevo, " + displayName);
                    setTimeout(function() {
                        cw.limpiar();
                        // Mostrar el navegador y ocultar el contenedor
                        $("#mainNav").show();
                        $("#mainContainer").hide();
                        cw.mostrarMensaje("Bienvenido al sistema, " + displayName);
                    }, 2000);
                } else {
                    console.log("Credenciales incorrectas o correo no verificado");
                    cw.mostrarMensajeError("No se puede iniciar sesión. Verifica que tus credenciales sean correctas y que hayas confirmado tu correo electrónico.");
                }
            },
            error: function (xhr, textStatus, errorThrown) {
                console.log("Status: " + textStatus);
                console.log("Error: " + errorThrown);
                let mensajeError = "Error al iniciar sesión. ";
                if (xhr.status === 0) {
                    mensajeError += "No se pudo conectar con el servidor.";
                } else if (xhr.status === 401) {
                    mensajeError += "Credenciales inválidas o correo no verificado.";
                } else if (xhr.status === 400) {
                    mensajeError += "Datos inválidos.";
                } else if (xhr.status === 500) {
                    mensajeError += "Error del servidor.";
                } else {
                    mensajeError += "Error desconocido: " + textStatus;
                }
                cw.mostrarMensajeError(mensajeError);
            },
            contentType: 'application/json'
        });
    }

    this.agregarUsuario = function (nick) {
        var cli = this;
        $.getJSON("/agregarUsuario/" + nick, function (data) {
            if (data.nick != -1) {
                console.log("Usuario " + nick + " ha sido registrado");
                $.cookie("nick", nick);
                // Solo eliminar el formulario cuando el registro haya sido exitoso
                if (typeof cw !== 'undefined' && cw.eliminarFormulario) {
                    cw.eliminarFormulario();
                }
                cw.mostrarMensajeExito("¡Registro exitoso! Bienvenido al sistema, " + nick);
            } else {
                console.log("El nick ya está ocupado");
                cw.mostrarMensajeError("El nick '" + nick + "' ya está ocupado. Por favor, elige otro nick.");
            }
        }).fail(function(xhr, textStatus, errorThrown) {
            console.log("Error al agregar usuario: " + textStatus);
            cw.mostrarMensajeError("Error al registrar usuario. Por favor, intenta de nuevo más tarde.");
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

    this.cerrarSesion = function (nick) {
        $.ajax({
            type: 'POST',
            url: '/cerrarSesion',
            data: JSON.stringify({"nick": nick}),
            success: function (data) {
                console.log("Sesión cerrada correctamente para: " + nick);
            },
            error: function (xhr, textStatus, errorThrown) {
                console.log("Error al cerrar sesión: " + textStatus);
                // No mostrar error al usuario ya que la sesión se cerrará de todas formas
            },
            contentType: 'application/json'
        });
    };
}
