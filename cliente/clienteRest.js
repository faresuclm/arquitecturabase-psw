function ClienteRest() {

    this.registrarUsuario = function (email, username, password, callback) {
        let userData = {
            "email": email,
            "username": username,
            "password": password
        };

        $.ajax({
            type: 'POST',
            url: '/registrarUsuario',
            data: JSON.stringify(userData),
            success: function (data) {
                // Restaurar el botón
                if (callback) callback();

                if (data.nick != -1) {
                    console.log("Usuario " + data.nick + " ha sido registrado");

                    // Mostrar modal de verificación (persistente)
                    cw.mostrarModalVerificacion(data.nick);
                } else {
                    console.log("El email ya está registrado");
                    cw.mostrarMensajeError("El email ya está registrado. Por favor, utiliza otro email o inicia sesión.");
                }
            },
            error: function (xhr, textStatus, errorThrown) {
                // Restaurar el botón en caso de error
                if (callback) callback();

                console.error("❌ Error en registro:");
                console.error("  Status HTTP:", xhr.status);
                console.error("  Mensaje:", textStatus);

                // Intentar obtener el mensaje de error del servidor
                let errorMsg = "Error al registrar usuario. ";
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                } else if (xhr.status === 0) {
                    errorMsg += "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
                } else if (xhr.status === 400) {
                    errorMsg += "Datos inválidos. Verifica el formulario.";
                } else if (xhr.status === 409) {
                    errorMsg += "El email o nombre de usuario ya está registrado.";
                } else if (xhr.status === 500) {
                    errorMsg += "Error del servidor. Intenta de nuevo más tarde.";
                } else {
                    errorMsg += "Por favor, intenta de nuevo.";
                }
                cw.mostrarMensajeError(errorMsg);
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

                    // Usar el username como displayName
                    let displayName = data.username || data.nick;

                    $.cookie("userName", displayName);
                    console.log("✅ Cookies establecidas:", {nick: data.nick, userName: displayName});

                    console.log("🔄 Redirigiendo después de login exitoso...");

                    // Restaurar el botón primero
                    if (callback) callback();

                    // Recargar la página para iniciar con estado limpio
                    // Esto asegura que comprobarSesion() se ejecute correctamente
                    window.location.replace('/');
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

    this.solicitarRecuperacionPassword = function (email, callback) {
        console.log("📤 Enviando petición de recuperación de contraseña para:", email);
        $.ajax({
            type: 'POST',
            url: '/solicitarRecuperacionPassword',
            data: JSON.stringify({ email: email }),
            contentType: 'application/json',
            dataType: 'json',
            success: function (data) {
                console.log("📥 Respuesta recibida del servidor:", data);

                // Restaurar el botón
                if (callback) callback();

                if (data.success) {
                    console.log("✅ Email de recuperación enviado exitosamente");
                    cw.mostrarMensajeExito("¡Correo enviado! Revisa tu bandeja de entrada para restablecer tu contraseña.");

                    // Volver al login después de 3 segundos
                    setTimeout(function() {
                        cw.mostrarLogin();
                    }, 3000);
                } else {
                    console.warn("⚠️ Error al enviar correo de recuperación");
                    cw.mostrarMensajeError(data.error || "No se pudo enviar el correo de recuperación. Verifica que el correo esté registrado.");
                }
            },
            error: function (xhr, textStatus, errorThrown) {
                // Restaurar el botón en caso de error
                if (callback) callback();

                console.error("❌ Error en solicitud de recuperación:", textStatus);
                let mensajeError = "Error al solicitar recuperación de contraseña. ";
                if (xhr.status === 0) {
                    mensajeError += "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
                } else if (xhr.status === 404) {
                    mensajeError += "No existe una cuenta con este correo electrónico.";
                } else if (xhr.status === 500) {
                    mensajeError += "Error del servidor. Intenta de nuevo más tarde.";
                } else {
                    mensajeError += "Por favor, intenta de nuevo.";
                }
                cw.mostrarMensajeError(mensajeError);
            },
            timeout: 10000
        });
    };

    this.restablecerPassword = function (email, token, newPassword, callback) {
        console.log("📤 Enviando petición de restablecimiento de contraseña para:", email);
        $.ajax({
            type: 'POST',
            url: '/restablecerPassword',
            data: JSON.stringify({
                email: email,
                token: token,
                newPassword: newPassword
            }),
            contentType: 'application/json',
            dataType: 'json',
            success: function (data) {
                console.log("📥 Respuesta recibida del servidor:", data);

                // Restaurar el botón
                if (callback) callback();

                if (data.success) {
                    console.log("✅ Contraseña restablecida exitosamente");
                    cw.mostrarMensajeExito("¡Contraseña restablecida exitosamente! Ya puedes iniciar sesión con tu nueva contraseña.");

                    // Volver al login después de 2 segundos
                    setTimeout(function() {
                        cw.mostrarLogin();
                        // Pre-rellenar el email si está disponible
                        if (email) {
                            setTimeout(function() {
                                $("#emailLogin").val(email);
                            }, 500);
                        }
                    }, 2000);
                } else {
                    console.warn("⚠️ Error al restablecer contraseña");
                    cw.mostrarMensajeError(data.error || "No se pudo restablecer la contraseña. El enlace puede haber expirado.");
                }
            },
            error: function (xhr, textStatus, errorThrown) {
                // Restaurar el botón en caso de error
                if (callback) callback();

                console.error("❌ Error en restablecimiento de contraseña:", textStatus);
                let mensajeError = "Error al restablecer la contraseña. ";
                if (xhr.status === 0) {
                    mensajeError += "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
                } else if (xhr.status === 400) {
                    mensajeError += "El enlace es inválido o ha expirado. Solicita uno nuevo.";
                } else if (xhr.status === 404) {
                    mensajeError += "No existe una cuenta con este correo electrónico.";
                } else if (xhr.status === 500) {
                    mensajeError += "Error del servidor. Intenta de nuevo más tarde.";
                } else {
                    mensajeError += "Por favor, intenta de nuevo.";
                }
                cw.mostrarMensajeError(mensajeError);
            },
            timeout: 10000
        });
    };
}
