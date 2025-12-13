function ClienteRest() {

    this.registrarUsuario = function (email, password, nombre, apellidos, callback) {
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
                // Restaurar el botón
                if (callback) callback();

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
                // Restaurar el botón en caso de error
                if (callback) callback();

                console.error("❌ Error en login:");
                console.error("  Status HTTP:", xhr.status);
                console.error("  Mensaje:", textStatus);
                let mensajeError = "Error al registrar usuario. ";
                if (xhr.status === 0) {
                    mensajeError += "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
                } else if (xhr.status === 400) {
                    mensajeError += "Datos inválidos. Verifica que el email sea correcto.";
                } else if (xhr.status === 409) {
                    mensajeError += "El email ya está registrado.";
                } else if (xhr.status === 500) {
                    mensajeError += "Error del servidor. Intenta de nuevo más tarde.";
                } else {
                    mensajeError += "Por favor, intenta de nuevo.";
                }
                cw.mostrarMensajeError(mensajeError);
            },
            contentType: 'application/json',
            timeout: 10000 // 10 segundos de timeout
        });
    }

    this.loginUsuario = function (usr, callback) {
        console.log("📤 Enviando petición de login para:", usr.email);
        $.ajax({
            type: 'POST',
            url: '/loginUsuario',
            data: JSON.stringify(usr),
            contentType: 'application/json',
            dataType: 'json',
            success: function (data) {
                console.log("📥 Respuesta recibida del servidor:", data);

                if (data.nick && data.nick != -1) {
                    console.log("✅ Usuario " + data.nick + " ha iniciado sesión");
                    $.cookie("nick", data.nick);

                    // Construir el nombre completo para mostrar
                    let displayName = '';
                    if (data.nombreCompleto) {
                        displayName = data.nombreCompleto;
                    } else if (data.nombre && data.apellidos) {
                        displayName = data.nombre + ' ' + data.apellidos;
                    } else if (data.nombre) {
                        displayName = data.nombre;
                    } else {
                        displayName = data.nick;
                    }

                    $.cookie("userName", displayName);
                    console.log("✅ Cookies establecidas:", {nick: data.nick, userName: displayName});

                    console.log("🔄 Iniciando redirección inmediata...");

                    // Limpiar formularios
                    cw.limpiar();

                    // Mostrar el navegador y ocultar el contenedor
                    $("#mainNav").show();
                    $("#mainContainer").hide();

                    console.log("✅ Redirección completada");

                    // Mostrar mensaje de bienvenida
                    cw.mostrarMensaje("Bienvenido " + displayName);

                    // Restaurar el botón AL FINAL con un pequeño delay para asegurar que la UI se actualice
                    setTimeout(function() {
                        if (callback) callback();
                    }, 100);
                } else {
                    console.warn("⚠️ Login rechazado - nick:", data.nick);
                    // Restaurar botón inmediatamente si falla
                    if (callback) callback();
                    cw.mostrarMensajeError("No se puede iniciar sesión. Verifica que tus credenciales sean correctas y que hayas confirmado tu correo electrónico.");
                }
            },
            error: function (xhr, textStatus, errorThrown) {
                // Restaurar el botón en caso de error
                if (callback) callback();

                console.error("❌ Error en login - Status:", textStatus);
                console.error("❌ Error:", errorThrown);
                console.error("❌ HTTP Status:", xhr.status);
                console.error("❌ Response:", xhr.responseText);
                let mensajeError = "Error al iniciar sesión. ";
                if (xhr.status === 0) {
                    mensajeError += "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
                } else if (xhr.status === 401) {
                    mensajeError += "Credenciales inválidas. Verifica tu correo y contraseña.";
                } else if (xhr.status === 403) {
                    mensajeError += "Tu cuenta no ha sido verificada. Por favor, verifica tu correo electrónico.";
                } else if (xhr.status === 400) {
                    mensajeError += "Datos inválidos. Por favor, verifica tu información.";
                } else if (xhr.status === 404) {
                    mensajeError += "No existe una cuenta con este correo electrónico. Por favor, regístrate primero.";
                } else if (xhr.status === 500) {
                    mensajeError += "Error del servidor. Intenta de nuevo más tarde.";
                } else {
                    mensajeError += "Por favor, intenta de nuevo.";
                }
                cw.mostrarMensajeError(mensajeError);
            },
            contentType: 'application/json',
            timeout: 10000 // 10 segundos de timeout
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
