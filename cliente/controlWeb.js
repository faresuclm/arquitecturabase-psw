function ControlWeb() {

    // === NUEVA FUNCIÓN PARA ONE TAP ===
    this.inicializarGoogleOneTap = function(clientId, callbackUri) {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            console.log("🟢 Inicializando Google One Tap...");

            // Cancelar cualquier instancia previa para limpiar el estado
            try {
                google.accounts.id.cancel();
                console.log('🔄 Instancia previa de One Tap cancelada');
            } catch (e) {
                console.log('⚠️ No había instancia previa para cancelar');
            }

            google.accounts.id.initialize({
                client_id: clientId,
                login_uri: callbackUri, // POST automático al servidor al endpoint de callback
                auto_select: false,
                cancel_on_tap_outside: false,
                itp_support: true // Soporte para Intelligent Tracking Prevention
            });

            // Mostrar el prompt (el pop-up) con un pequeño delay
            setTimeout(() => {
                google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed()) {
                        console.log("⚠️ One Tap no se mostró:", notification.getNotDisplayedReason());
                        if (notification.getNotDisplayedReason() === 'suppressed_by_user') {
                            console.log('ℹ️ Usuario puede hacer clic en el botón de Google para iniciar sesión');
                        }
                    } else if (notification.isSkippedMoment()) {
                        console.log("⏭️ One Tap status:", notification.getSkippedReason());
                    } else {
                        console.log("✅ One Tap mostrado correctamente");
                    }
                });
            }, 300); // Delay para asegurar que todo está limpio
        } else {
            console.log("⚠️ Librería de Google no cargada aún.");
        }
    };

    this.mostrarRegistro = function () {
        $("#fmRegistro").remove();
        $("#fmLogin").remove();
        $("#mainContainer").addClass("auth-container-wrapper");
        $("#registro").load("./cliente/registro.html", function () {
            // Toggle password visibility
            $(document).off("click", "#togglePasswordReg").on("click", "#togglePasswordReg", function (e) {
                e.preventDefault();
                e.stopPropagation();
                const input = $("#pwd");
                const isPassword = input.attr('type') === 'password';
                input.attr('type', isPassword ? 'text' : 'password');
                $(this).removeClass('fa-eye fa-eye-slash').addClass(isPassword ? 'fa-eye-slash' : 'fa-eye');
                $(this).attr('title', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
            });

            // Password strength indicator
            $("#pwd").on("input", function() {
                const pwd = $(this).val();
                if (pwd.length > 0) {
                    $("#passwordStrength").show();
                    const strength = cw.calcularFuerzaPassword(pwd);
                    const progressBar = $("#passwordStrength .progress-bar");
                    const strengthText = $("#passwordStrength .strength-text");

                    progressBar.css("width", strength.percentage + "%");
                    progressBar.removeClass("bg-danger bg-warning bg-info bg-success");
                    progressBar.addClass(strength.class);
                    strengthText.text(strength.text);
                    strengthText.css("color", strength.color);
                } else {
                    $("#passwordStrength").hide();
                }
            });

            // Real-time validation
            $("#email").on("blur", function() {
                cw.validarCampoEmail($(this));
            });


            $("#pwd").on("blur", function() {
                cw.validarCampoPassword($(this), 8);
            });

            // Validación en tiempo real de username
            $("#username").on("input", function() {
                const username = $(this).val().trim();
                const $field = $(this);
                const $availability = $(".username-availability");

                // Limpiar estado previo COMPLETAMENTE
                $field.removeClass("is-invalid is-valid");
                $field.siblings(".invalid-feedback").hide(); // Ocultar TODOS los mensajes de error
                $availability.hide();

                if (username.length === 0) return;

                // Validar formato
                if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
                    $field.addClass("is-invalid");
                    $field.siblings(".invalid-feedback").show();
                    return;
                }

                // Mostrar spinner de verificación
                $availability.html('<i class="fas fa-spinner fa-spin"></i> Verificando disponibilidad...').show();

                // Verificar disponibilidad en el servidor con debounce
                clearTimeout(cw.usernameTimeout);
                cw.usernameTimeout = setTimeout(function() {
                    console.log("🔍 Verificando username:", username);
                    $.getJSON("/verificarUsername/" + encodeURIComponent(username), function(data) {
                        console.log("📥 Respuesta del servidor:", data);
                        if (data.disponible) {
                            console.log("✅ Username disponible");
                            $field.addClass("is-valid");
                            $field.removeClass("is-invalid");
                            $field.siblings(".invalid-feedback").hide(); // IMPORTANTE: Ocultar mensaje de error
                            $availability.html('<span style="color: #22c55e;"><i class="fas fa-check-circle"></i> Nombre de usuario disponible</span>').show();
                        } else {
                            console.log("❌ Username NO disponible");
                            $field.addClass("is-invalid");
                            $field.removeClass("is-valid");
                            $field.siblings(".invalid-feedback").hide(); // Ocultar mensaje genérico
                            $availability.html('<span style="color: #ef4444;"><i class="fas fa-times-circle"></i> Nombre de usuario no disponible</span>').show();
                        }
                    }).fail(function(xhr, status, error) {
                        console.error("❌ Error al verificar username:", status, error);
                        $field.removeClass("is-valid is-invalid");
                        $availability.hide();
                    });
                }, 500);
            });

            $("#username").on("blur", function() {
                cw.validarCampoUsername($(this));
            });

            $("#btnRegistro").on("click", function (e) {
                e.preventDefault();

                let email = $("#email").val().trim();
                let username = $("#username").val().trim();
                let pwd = $("#pwd").val();

                // NO limpiar las clases de validación aquí para preservar el estado de username
                // Solo ocultar mensajes de error genéricos
                $(".invalid-feedback").hide();

                let isValid = true;

                // Validación de email (obligatorio)
                if (!cw.validarCampoEmail($("#email"))) {
                    isValid = false;
                }

                // Validación de username (obligatorio)
                if (!cw.validarCampoUsername($("#username"))) {
                    isValid = false;
                }

                // Validación de contraseña (obligatorio, mínimo 8 caracteres)
                if (!cw.validarCampoPassword($("#pwd"), 8)) {
                    isValid = false;
                }

                if (!isValid) {
                    cw.mostrarMensajeError("Por favor, corrige los errores en el formulario.");
                    return;
                }

                // Deshabilitar botón y mostrar spinner
                $(this).prop('disabled', true);
                $(this).find('.btn-text').hide();
                $(this).find('.btn-spinner').show();

                // Guardar referencia al botón
                const btnRegistro = $(this);

                // Función para restaurar el botón
                const restaurarBoton = function() {
                    btnRegistro.prop('disabled', false);
                    btnRegistro.find('.btn-text').show();
                    btnRegistro.find('.btn-spinner').hide();
                };

                rest.registrarUsuario(email, username, pwd, restaurarBoton);
            });

            $("#btnMostrarLogin").on("click", function (e) {
                e.preventDefault();
                cw.mostrarLogin();
            });

            // Botón Google REGISTRO - Configurar click handler para redirigir
            // Esperar a que el botón exista en el DOM
            setTimeout(function() {
                const btnGoogleRegistro = $("#btnGoogleRegistro");
                if (btnGoogleRegistro.length) {
                    // Eliminar handlers previos para evitar duplicados
                    btnGoogleRegistro.off("click");

                    // Agregar nuevo handler
                    btnGoogleRegistro.on("click", function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        const btn = $(this);
                        const googleText = btn.find('.google-text');
                        const googleSpinner = btn.find('.google-spinner');
                        const googleIcon = btn.find('.google-icon');

                        // Deshabilitar botón y mostrar spinner
                        btn.prop('disabled', true);
                        btn.addClass('disabled');
                        googleText.hide();
                        googleIcon.hide();
                        googleSpinner.show();

                        console.log('🔐 Iniciando registro con Google OAuth...');

                        // Redirigir a la ruta de autenticación de Google
                        setTimeout(function() {
                            window.location.href = '/auth/google/registro';
                        }, 100);
                    });

                    console.log('✅ Handler de Google Registro configurado');
                } else {
                    console.warn('⚠️ Botón Google Registro no encontrado en el DOM');
                }
            }, 200);

            // Configurar handlers del modal de Google en registro
            cw.configurarHandlersModalGoogleRegistro();
        });
    }

    this.mostrarLogin = function () {
        $("#fmLogin").remove();
        $("#fmRegistro").remove();
        $("#mainContainer").addClass("auth-container-wrapper");
        $("#registro").load("./cliente/login.html", function () {
            console.log("🔄 Login.html cargado, vinculando eventos...");

            // Toggle password visibility
            $(document).off("click", "#togglePasswordLogin").on("click", "#togglePasswordLogin", function (e) {
                e.preventDefault();
                e.stopPropagation();
                const input = $("#pwdLogin");
                const isPassword = input.attr('type') === 'password';
                input.attr('type', isPassword ? 'text' : 'password');
                $(this).removeClass('fa-eye fa-eye-slash').addClass(isPassword ? 'fa-eye-slash' : 'fa-eye');
                $(this).attr('title', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
            });

            // Real-time validation
            $("#emailLogin").on("blur", function() {
                cw.validarCampoEmail($(this));
            });

            $("#pwdLogin").on("blur", function() {
                cw.validarCampoPassword($(this), 1);
            });

            // Usar evento submit del formulario con delegación de eventos
            $(document).off("submit", "#loginForm").on("submit", "#loginForm", function (e) {
                e.preventDefault();
                console.log("🔐 Evento submit capturado");

                let email = $("#emailLogin").val().trim();
                let pwd = $("#pwdLogin").val();

                console.log("🔐 Datos del formulario:", { email: email, pwd: pwd ? "***" : "vacío" });

                // Limpiar errores anteriores
                $(".form-control").removeClass("is-invalid is-valid");
                $(".invalid-feedback").hide();

                let isValid = true;

                // Validación de email
                if (!cw.validarCampoEmail($("#emailLogin"))) {
                    isValid = false;
                }

                // Validación de contraseña (solo verificar que no esté vacía)
                if (!pwd || pwd.length === 0) {
                    $("#pwdLogin").addClass("is-invalid");
                    $("#pwdLogin").siblings(".invalid-feedback").show();
                    isValid = false;
                } else {
                    $("#pwdLogin").removeClass("is-invalid").addClass("is-valid");
                    $("#pwdLogin").siblings(".invalid-feedback").hide();
                }

                if (!isValid) {
                    console.warn("⚠️ Validación fallida");
                    cw.mostrarMensajeError("Por favor, corrige los errores en el formulario.");
                    return;
                }

                console.log("✅ Validación exitosa, enviando petición...");

                // Obtener referencia al botón de login
                const btnLogin = $("#btnLogin");

                // Deshabilitar botón y mostrar spinner
                btnLogin.prop('disabled', true);
                btnLogin.find('.btn-text').hide();
                btnLogin.find('.btn-spinner').show();

                // Función para restaurar el botón
                const restaurarBoton = function() {
                    btnLogin.prop('disabled', false);
                    btnLogin.find('.btn-text').show();
                    btnLogin.find('.btn-spinner').hide();
                };

                // Enviar datos al servidor
                console.log("🔐 Intentando iniciar sesión con:", email);
                rest.loginUsuario({"email": email, "password": pwd}, restaurarBoton);
            });

            $("#btnMostrarRegistro").on("click", function (e) {
                e.preventDefault();
                cw.mostrarRegistro();
            });

            $("#btnOlvidoPassword").on("click", function (e) {
                e.preventDefault();
                cw.mostrarRecuperarPassword();
            });

            // Botón Google LOGIN - Configurar click handler para redirigir
            // Esperar a que el botón exista en el DOM
            setTimeout(function() {
                const btnGoogleLogin = $("#btnGoogleLogin");
                if (btnGoogleLogin.length) {
                    // Eliminar handlers previos para evitar duplicados
                    btnGoogleLogin.off("click");

                    // Agregar nuevo handler
                    btnGoogleLogin.on("click", function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        const btn = $(this);
                        const googleText = btn.find('.google-text');
                        const googleSpinner = btn.find('.google-spinner');
                        const googleIcon = btn.find('.google-icon');

                        // Deshabilitar botón y mostrar spinner
                        btn.prop('disabled', true);
                        btn.addClass('disabled');
                        googleText.hide();
                        googleIcon.hide();
                        googleSpinner.show();

                        console.log('🔐 Iniciando login con Google OAuth...');

                        // Redirigir a la ruta de autenticación de Google
                        setTimeout(function() {
                            window.location.href = '/auth/google/login';
                        }, 100);
                    });

                    console.log('✅ Handler de Google Login configurado');
                } else {
                    console.warn('⚠️ Botón Google Login no encontrado en el DOM');
                }
            }, 200);

            // Inicializar One Tap SOLO en el login, usando config del servidor
            fetch('/api/config')
                .then(response => response.json())
                .then(config => {
                    cw.inicializarGoogleOneTap(config.GCLIENT_ID, config.GCALLBACK_URI);
                })
                .catch(err => console.error("Error cargando config para OneTap:", err));

            // Configurar handlers del modal de Google después de que el modal esté en el DOM
            cw.configurarHandlersModalGoogle();

            // Verificar si viene de Google OAuth (nuevo usuario que necesita establecer contraseña)
            let urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('google') === 'new_user') {
                let email = urlParams.get('email');
                if (email) {
                    console.log("📝 Detectado nuevo usuario Google, mostrando modal sobre login");
                    setTimeout(() => {
                        cw.mostrarModalPasswordGoogle(decodeURIComponent(email));
                    }, 500);
                }
            }

            // Verificar si viene de un registro exitoso con Google
            if (urlParams.get('registroExitoso') === 'true') {
                let email = urlParams.get('email');
                if (email) {
                    // Pre-rellenar el email en el formulario de login
                    $("#emailLogin").val(decodeURIComponent(email));
                    cw.mostrarMensajeExito("¡Registro completado exitosamente! Ya puedes iniciar sesión con tu cuenta de Google.");

                    // Limpiar la URL de los parámetros
                    window.history.replaceState({}, document.title, "/?view=login");
                }
            }

            console.log("✅ Eventos de login vinculados correctamente");
        });
    }

    this.configurarHandlersModalGoogleRegistro = function() {
        // Handler para toggle de contraseña en modal de Google REGISTRO
        $(document).off("click", "#toggleGooglePasswordReg").on("click", "#toggleGooglePasswordReg", function (e) {
            e.preventDefault();
            e.stopPropagation();
            const input = $("#googlePasswordReg");
            const isPassword = input.attr('type') === 'password';
            input.attr('type', isPassword ? 'text' : 'password');
            $(this).removeClass('fa-eye fa-eye-slash').addClass(isPassword ? 'fa-eye-slash' : 'fa-eye');
            $(this).attr('title', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
        });

        // Indicador de fuerza de contraseña
        $(document).off("input", "#googlePasswordReg").on("input", "#googlePasswordReg", function() {
            const pwd = $(this).val();
            if (pwd.length > 0) {
                $("#googlePasswordStrengthReg").show();
                const strength = cw.calcularFuerzaPassword(pwd);
                const progressBar = $("#googlePasswordStrengthReg .progress-bar");
                const strengthText = $("#googlePasswordStrengthReg .strength-text");

                progressBar.css("width", strength.percentage + "%");
                progressBar.removeClass("bg-danger bg-warning bg-info bg-success");
                progressBar.addClass(strength.class);
                strengthText.text(strength.text);
                strengthText.css("color", strength.color);
            } else {
                $("#googlePasswordStrengthReg").hide();
            }
        });

        // Validación en tiempo real de username en modal de Google REGISTRO
        $(document).off("input", "#googleUsernameReg").on("input", "#googleUsernameReg", function() {
            const username = $(this).val().trim();
            const $field = $(this);
            const $availability = $(".username-availability-google");

            $field.removeClass("is-invalid is-valid");
            $availability.hide();

            if (username.length === 0) return;

            if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
                $field.addClass("is-invalid");
                $field.siblings(".invalid-feedback").show();
                return;
            }

            $availability.html('<i class="fas fa-spinner fa-spin"></i> Verificando disponibilidad...').show();

            clearTimeout(cw.usernameGoogleTimeout);
            cw.usernameGoogleTimeout = setTimeout(function() {
                $.getJSON("/verificarUsername/" + encodeURIComponent(username), function(data) {
                    if (data.disponible) {
                        $field.addClass("is-valid");
                        $availability.html('<span style="color: #22c55e;"><i class="fas fa-check-circle"></i> Disponible</span>').show();
                    } else {
                        $field.addClass("is-invalid");
                        $availability.html('<span style="color: #ef4444;"><i class="fas fa-times-circle"></i> No disponible</span>').show();
                    }
                }).fail(function() {
                    $availability.hide();
                });
            }, 500);
        });

        // Handler para enviar contraseña de Google REGISTRO
        $(document).off("submit", "#formPasswordGoogleReg").on("submit", "#formPasswordGoogleReg", function(e) {
            e.preventDefault();

            const username = $("#googleUsernameReg").val().trim();
            const password = $("#googlePasswordReg").val();

            console.log("📝 [REGISTRO] Enviando datos para completar registro Google");

            // Validar username
            if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
                $("#googleUsernameReg").addClass("is-invalid");
                $("#googleUsernameReg").siblings(".invalid-feedback").show();
                cw.mostrarMensajeError("El nombre de usuario debe tener entre 3 y 20 caracteres");
                return;
            }

            if (!$("#googleUsernameReg").hasClass("is-valid")) {
                cw.mostrarMensajeError("Por favor, elige un nombre de usuario disponible");
                return;
            }

            // Validar contraseña
            if (!password || password.length < 8) {
                $("#googlePasswordReg").addClass("is-invalid");
                $("#googlePasswordReg").siblings(".invalid-feedback").show();
                cw.mostrarMensajeError("La contraseña debe tener al menos 8 caracteres");
                return;
            }

            // Deshabilitar botón y mostrar spinner
            const btn = $("#btnConfirmPasswordGoogleReg");
            btn.prop('disabled', true);
            btn.find('.btn-text').hide();
            btn.find('.btn-spinner').show();

            // Enviar al servidor
            fetch('/completarRegistroGoogle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password }),
                credentials: 'same-origin'
            })
                .then(response => {
                    console.log("📝 [REGISTRO] Respuesta recibida - Status:", response.status);
                    return response.json();
                })
                .then(data => {
                    console.log("✅ [REGISTRO] Datos parseados:", data);

                    if (data.success) {
                        console.log("✅ Registro Google completado exitosamente");

                        // Cerrar modal
                        $("#modalPasswordGoogleRegistro").modal('hide');

                        // Mostrar mensaje de éxito
                        cw.mostrarMensajeExito("¡Registro completado! Redirigiendo al login...");

                        setTimeout(function() {
                            // MODIFICACIÓN: Redirigir a página de login
                            window.location.href = "/?view=login&registroExitoso=true&email=" + encodeURIComponent(data.email);
                        }, 1500);
                    } else {
                        console.error("❌ Error al completar registro:", data.error);
                        cw.mostrarMensajeError(data.error || "Error al completar el registro");

                        // Restaurar botón
                        btn.prop('disabled', false);
                        btn.find('.btn-text').show();
                        btn.find('.btn-spinner').hide();
                    }
                })
                .catch(error => {
                    console.error("❌ Error en petición:", error);
                    cw.mostrarMensajeError("Error al completar el registro. Por favor, intenta de nuevo.");

                    // Restaurar botón
                    btn.prop('disabled', false);
                    btn.find('.btn-text').show();
                    btn.find('.btn-spinner').hide();
                });
        });
    };

    this.mostrarModalPasswordGoogleRegistro = function(email) {
        console.log("📝 Mostrando modal de contraseña en REGISTRO para:", email);

        // Asegurar que los handlers están configurados
        cw.configurarHandlersModalGoogleRegistro();

        // Rellenar información del usuario
        $("#googleEmailReg").text(email);

        // Limpiar formulario
        $("#googleUsernameReg").val('');
        $("#googleUsernameReg").removeClass("is-invalid is-valid");
        $("#googlePasswordReg").val('');
        $("#googlePasswordStrengthReg").hide();
        $("#googlePasswordReg").removeClass("is-invalid is-valid");
        $(".invalid-feedback").hide();
        $(".username-availability-google").hide();

        // Restaurar botón
        const btn = $("#btnConfirmPasswordGoogleReg");
        btn.prop('disabled', false);
        btn.find('.btn-text').show();
        btn.find('.btn-spinner').hide();

        // Mostrar el modal
        $("#modalPasswordGoogleRegistro").modal('show');

        // Dar foco al campo de username
        $("#modalPasswordGoogleRegistro").on('shown.bs.modal', function () {
            $("#googleUsernameReg").focus();
        });
    };

    this.configurarHandlersModalGoogle = function() {
        // Handler para toggle de contraseña en modal de Google (usar delegación de eventos)
        $(document).off("click", "#toggleGooglePassword").on("click", "#toggleGooglePassword", function (e) {
            e.preventDefault();
            e.stopPropagation();
            const input = $("#googlePassword");
            const isPassword = input.attr('type') === 'password';
            input.attr('type', isPassword ? 'text' : 'password');
            $(this).removeClass('fa-eye fa-eye-slash').addClass(isPassword ? 'fa-eye-slash' : 'fa-eye');
            $(this).attr('title', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
        });

        // Indicador de fuerza de contraseña en modal de Google
        $(document).off("input", "#googlePassword").on("input", "#googlePassword", function() {
            const pwd = $(this).val();
            if (pwd.length > 0) {
                $("#googlePasswordStrength").show();
                const strength = cw.calcularFuerzaPassword(pwd);
                const progressBar = $("#googlePasswordStrength .progress-bar");
                const strengthText = $("#googlePasswordStrength .strength-text");

                progressBar.css("width", strength.percentage + "%");
                progressBar.removeClass("bg-danger bg-warning bg-info bg-success");
                progressBar.addClass(strength.class);
                strengthText.text(strength.text);
                strengthText.css("color", strength.color);
            } else {
                $("#googlePasswordStrength").hide();
            }
        });

        // Validación en tiempo real de username en modal de Google LOGIN
        $(document).off("input", "#googleUsername").on("input", "#googleUsername", function() {
            const username = $(this).val().trim();
            const $field = $(this);
            const $availability = $(".username-availability-google-login");

            $field.removeClass("is-invalid is-valid");
            $availability.hide();

            if (username.length === 0) return;

            if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
                $field.addClass("is-invalid");
                $field.siblings(".invalid-feedback").show();
                return;
            }

            $availability.html('<i class="fas fa-spinner fa-spin"></i> Verificando disponibilidad...').show();

            clearTimeout(cw.usernameGoogleLoginTimeout);
            cw.usernameGoogleLoginTimeout = setTimeout(function() {
                $.getJSON("/verificarUsername/" + encodeURIComponent(username), function(data) {
                    if (data.disponible) {
                        $field.addClass("is-valid");
                        $availability.html('<span style="color: #22c55e;"><i class="fas fa-check-circle"></i> Disponible</span>').show();
                    } else {
                        $field.addClass("is-invalid");
                        $availability.html('<span style="color: #ef4444;"><i class="fas fa-times-circle"></i> No disponible</span>').show();
                    }
                }).fail(function() {
                    $availability.hide();
                });
            }, 500);
        });

        // Handler para enviar contraseña de Google (usar delegación de eventos)
        $(document).off("submit", "#formPasswordGoogle").on("submit", "#formPasswordGoogle", function(e) {
            e.preventDefault();

            const username = $("#googleUsername").val().trim();
            const password = $("#googlePassword").val();
            const email = $("#googleEmail").text();

            console.log("📝 Handler activado - Username:", username, "Password:", password ? "presente" : "vacío", "Email:", email);

            // Validar username
            if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
                $("#googleUsername").addClass("is-invalid");
                $("#googleUsername").siblings(".invalid-feedback").show();
                cw.mostrarMensajeError("El nombre de usuario debe tener entre 3 y 20 caracteres");
                return;
            }

            if (!$("#googleUsername").hasClass("is-valid")) {
                cw.mostrarMensajeError("Por favor, elige un nombre de usuario disponible");
                return;
            }

            // Validar contraseña
            if (!password || password.length < 8) {
                $("#googlePassword").addClass("is-invalid");
                $("#googlePassword").siblings(".invalid-feedback").show();
                cw.mostrarMensajeError("La contraseña debe tener al menos 8 caracteres");
                return;
            }

            // Deshabilitar botón y mostrar spinner
            const btn = $("#btnConfirmPasswordGoogle");
            btn.prop('disabled', true);
            btn.find('.btn-text').hide();
            btn.find('.btn-spinner').show();

            console.log("📝 Enviando datos para completar registro Google");
            console.log("📝 URL:", window.location.origin + '/completarRegistroGoogle');

            // Enviar al servidor
            fetch('/completarRegistroGoogle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: username, password: password }),
                credentials: 'same-origin' // Importante para mantener la sesión
            })
                .then(response => {
                    console.log("📝 Respuesta recibida - Status:", response.status);
                    return response.json();
                })
                .then(data => {
                    console.log("✅ Datos parseados:", data);

                    if (data.success) {
                        console.log("✅ Registro Google completado exitosamente");

                        // Cerrar modal
                        $("#modalPasswordGoogle").modal('hide');

                        // Mostrar mensaje de éxito
                        cw.mostrarMensajeExito("¡Cuenta creada! Redirigiendo al login...");

                        setTimeout(function() {
                            // MODIFICACIÓN: Redirigir a Login
                            window.location.href = "/?view=login&registroExitoso=true&email=" + encodeURIComponent(data.email);
                        }, 1500);
                    } else {
                        console.error("❌ Error al completar registro:", data.error);
                        cw.mostrarMensajeError(data.error || "Error al completar el registro");

                        // Restaurar botón
                        btn.prop('disabled', false);
                        btn.find('.btn-text').show();
                        btn.find('.btn-spinner').hide();
                    }
                })
                .catch(error => {
                    console.error("❌ Error en petición:", error);
                    cw.mostrarMensajeError("Error al completar el registro. Por favor, intenta de nuevo.");

                    // Restaurar botón
                    btn.prop('disabled', false);
                    btn.find('.btn-text').show();
                    btn.find('.btn-spinner').hide();
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

    this.comprobarSesion = async function () {
        // Usar la API de jquery-cookie: $.cookie('nick') para leer la cookie.
        let nick = $.cookie("nick");

        // Verificar parámetros de la URL
        let urlParams = new URLSearchParams(window.location.search);
        let verificado = urlParams.get('verificado');
        let email = urlParams.get('email');
        let error = urlParams.get('error');
        let googleSuccess = urlParams.get('google');
        let message = urlParams.get('message');

        // Verificar si debe mostrar registro directamente
        let view = urlParams.get('view');

        // Verificar si viene de enlace de recuperación de contraseña
        let resetPassword = urlParams.get('resetPassword');
        let token = urlParams.get('token');

        if (nick) {
            console.log('🔍 Cookie de sesión encontrada, verificando con servidor...');

            try {
                // ESPERAR verificación del servidor ANTES de continuar
                const response = await fetch('/ok', {
                    credentials: 'include',
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });

                if (!response.ok) {
                    console.error('❌ Sesión no válida en servidor');
                    // Sesión expirada, limpiar y redirigir
                    $.removeCookie("nick", { path: '/' });
                    $.removeCookie("userName", { path: '/' });
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.replace('/');
                    return;
                }

                const userData = await response.json();
                console.log('✅ Sesión válida confirmada:', userData.nick);

                // Actualizar cookies con datos frescos del servidor
                let displayName = userData.username || userData.nick.split('@')[0];
                $.cookie("nick", userData.nick, { path: '/' });
                $.cookie("userName", displayName, { path: '/' });

                // Mostrar el contenedor principal para la vista de grupos
                $("#mainContainer").show();
                // Remover la clase auth-container-wrapper si existe
                $("#mainContainer").removeClass("auth-container-wrapper");

                // Mostrar mensaje de éxito si viene de Google
                if (googleSuccess === 'login_success') {
                    cw.mostrarMensajeExito("¡Inicio de sesión con Google exitoso! Bienvenido, " + displayName);
                    // Limpiar la URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else if (googleSuccess === 'success') {
                    cw.mostrarMensajeExito("¡Bienvenido! Tu cuenta ha sido creada exitosamente.");
                    window.history.replaceState({}, document.title, window.location.pathname);
                }

                // Ocultar/limpiar el formulario si ya hay sesión
                cw.eliminarFormulario();

                console.log('📂 Cargando vista de grupos...');
                // Mostrar la vista de grupos de chat DESPUÉS de verificar sesión
                cw.mostrarGrupos();

            } catch (error) {
                console.error('❌ Error al verificar sesión:', error);
                // En caso de error, limpiar y mostrar login
                $.removeCookie("nick", { path: '/' });
                $.removeCookie("userName", { path: '/' });
                localStorage.clear();
                sessionStorage.clear();
                cw.mostrarLogin();
            }
        } else if (view === 'registro') {
            // Mostrar página de REGISTRO
            $("#mainContainer").show();
            cw.mostrarRegistro();
        } else if (resetPassword === 'true' && email && token) {
            // Mostrar página de RESTABLECER contraseña
            $("#mainContainer").show();
            cw.mostrarRestablecerPassword(email, token);
            // Limpiar la URL después de cargar el formulario
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            // Si viene de login con Google exitoso, esperar a que la sesión se establezca
            if (googleSuccess === 'login_success') {
                console.log('✅ Login con Google exitoso detectado');
                console.log('⏳ Esperando a que la sesión se establezca...');

                // Mostrar loader mientras se verifica la sesión
                $("#mainContainer").show();
                $("#mainContainer").html('<div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column;">' +
                    '<div style="width: 64px; height: 64px; border: 4px solid #e2e8f0; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>' +
                    '<div style="margin-top: 24px; color: #64748b; font-size: 16px; font-weight: 500;">¡Bienvenido! Iniciando sesión...</div>' +
                    '<style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}</style>' +
                    '</div>');

                // Verificar la sesión cada 500ms hasta que esté lista (máximo 5 intentos)
                let intentos = 0;
                const maxIntentos = 10;
                const verificarSesion = setInterval(async function() {
                    intentos++;
                    console.log(`🔄 Intento ${intentos}/${maxIntentos} - Verificando sesión...`);

                    try {
                        const response = await fetch('/ok', {
                            credentials: 'include',
                            cache: 'no-store',
                            headers: {
                                'Cache-Control': 'no-cache, no-store, must-revalidate',
                                'Pragma': 'no-cache',
                                'Expires': '0'
                            }
                        });

                        if (response.ok) {
                            const userData = await response.json();
                            console.log('✅ Sesión establecida correctamente:', userData.nick);
                            clearInterval(verificarSesion);

                            // Redirigir a grupos
                            window.location.href = '/cliente/grupos.html';
                        } else if (intentos >= maxIntentos) {
                            console.error('❌ Timeout: La sesión no se estableció a tiempo');
                            clearInterval(verificarSesion);

                            // Mostrar error y recargar
                            $("#mainContainer").html('<div style="text-align: center; padding: 40px;">' +
                                '<div style="color: #ef4444; font-size: 18px; margin-bottom: 16px;">Error al establecer la sesión</div>' +
                                '<div style="color: #64748b; margin-bottom: 24px;">Por favor, intenta de nuevo</div>' +
                                '<button onclick="window.location.href=\'/\'" style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;">Volver al Login</button>' +
                                '</div>');
                        }
                    } catch (error) {
                        console.error('Error al verificar sesión:', error);
                        if (intentos >= maxIntentos) {
                            clearInterval(verificarSesion);
                            window.location.href = '/?error=session_timeout';
                        }
                    }
                }, 500);

                return; // No continuar con el flujo normal
            }

            // Mostrar el contenedor principal para login/registro
            $("#mainContainer").show();

            // Mostrar el formulario de login
            cw.mostrarLogin();

            // Manejar diferentes mensajes según parámetros de URL
            setTimeout(function() {
                // Verificación de correo exitosa
                if (verificado === 'true') {
                    cw.mostrarMensajeExito("¡Tu cuenta ha sido verificada exitosamente! Ahora puedes iniciar sesión.");
                    // Pre-rellenar el email si está disponible
                    if (email) {
                        $("#emailLogin").val(decodeURIComponent(email));
                    }
                }
                // Error en verificación de correo
                else if (verificado === 'false') {
                    cw.mostrarMensajeError("Error al verificar la cuenta. El enlace puede haber expirado o ser inválido. Contacta con el administrador si el problema persiste.");
                }
                // Error de autenticación con Google
                else if (error === 'auth_failed') {
                    let errorMsg = message ? decodeURIComponent(message) : "Error al autenticar con Google. Por favor, intenta de nuevo.";
                    cw.mostrarMensajeError(errorMsg);
                }
                // Error de base de datos
                else if (error === 'db_error') {
                    let errorMsg = message ? decodeURIComponent(message) : "Error al procesar tu cuenta. Por favor, intenta de nuevo más tarde.";
                    cw.mostrarMensajeError(errorMsg);
                }
                // Error de timeout de sesión
                else if (error === 'session_timeout') {
                    cw.mostrarMensajeError("La sesión tardó demasiado en establecerse. Por favor, intenta iniciar sesión de nuevo.");
                }

                // Usuario Google ya existe
                else if (googleSuccess === 'already_exists' && email) {
                    cw.mostrarMensajeError("El correo " + decodeURIComponent(email) + " ya tiene una cuenta. Por favor, inicia sesión.");
                    // Pre-rellenar el email en el formulario de login
                    $("#emailLogin").val(decodeURIComponent(email));
                }
                // 📝 Nuevo usuario de Google - Mostrar modal para completar registro
                else if (googleSuccess === 'new_user' && email) {
                    console.log('📝 Usuario nuevo de Google detectado');
                    console.log('🔐 Mostrando modal para establecer usuario y contraseña');
                    cw.mostrarModalPasswordGoogle(email);
                }

                // Limpiar la URL después de mostrar el mensaje (excepto para new_user)
                if (googleSuccess !== 'new_user' && (verificado || error || googleSuccess)) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }, 500);
        }
    };

    this.mostrarModalPasswordGoogle = function(email) {
        // Verificar que el modal existe (solo disponible si se cargó login.html)
        if ($("#modalPasswordGoogle").length === 0) {
            console.warn("⚠️ Modal de contraseña no disponible, recargando página...");
            setTimeout(() => {
                window.location.href = "/?google=new_user&email=" + encodeURIComponent(email);
            }, 500);
            return;
        }

        console.log("📝 Mostrando modal para definir contraseña:", email);

        // Asegurar que los handlers están configurados
        cw.configurarHandlersModalGoogle();

        // Rellenar información del usuario
        $("#googleEmail").text(email);

        // Limpiar formulario
        $("#googleUsername").val('');
        $("#googleUsername").removeClass("is-invalid is-valid");
        $("#googlePassword").val('');
        $("#googlePasswordStrength").hide();
        $("#googlePassword").removeClass("is-invalid is-valid");
        $(".invalid-feedback").hide();
        $(".username-availability-google-login").hide();

        // Restaurar botón
        const btn = $("#btnConfirmPasswordGoogle");
        btn.prop('disabled', false);
        btn.find('.btn-text').show();
        btn.find('.btn-spinner').hide();

        // Mostrar el modal
        $("#modalPasswordGoogle").modal('show');

        // Dar foco al campo de username después de que el modal se muestre
        $("#modalPasswordGoogle").on('shown.bs.modal', function () {
            $("#googleUsername").focus();
        });
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

    // Funciones de validación
    this.validarCampoEmail = function(campo) {
        const email = campo.val().trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            campo.addClass("is-invalid").removeClass("is-valid");
            campo.siblings(".invalid-feedback").text("El correo electrónico es obligatorio").show();
            return false;
        }

        if (!emailRegex.test(email)) {
            campo.addClass("is-invalid").removeClass("is-valid");
            campo.siblings(".invalid-feedback").text("Por favor, introduce un correo válido").show();
            return false;
        }

        campo.removeClass("is-invalid").addClass("is-valid");
        campo.siblings(".invalid-feedback").hide();
        return true;
    };

    this.validarCampoUsername = function(campo) {
        const username = campo.val().trim();
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

        if (!username) {
            campo.addClass("is-invalid").removeClass("is-valid");
            campo.siblings(".invalid-feedback").text("El nombre de usuario es obligatorio").show();
            return false;
        }

        if (!usernameRegex.test(username)) {
            campo.addClass("is-invalid").removeClass("is-valid");
            campo.siblings(".invalid-feedback").text("El nombre de usuario debe tener entre 3 y 20 caracteres y solo puede contener letras, números y guiones bajos").show();
            return false;
        }

        // Verificar si tiene la clase is-valid (disponible)
        if (!campo.hasClass("is-valid")) {
            campo.addClass("is-invalid").removeClass("is-valid");
            campo.siblings(".invalid-feedback").text("Verifica la disponibilidad del nombre de usuario").show();
            return false;
        }

        campo.removeClass("is-invalid").addClass("is-valid");
        campo.siblings(".invalid-feedback").hide();
        return true;
    };

    this.validarCampoPassword = function(campo, minLength) {
        const pwd = campo.val();
        const campoId = campo.attr('id');
        let validationIcon = null;

        // Buscar el icono de validación correspondiente
        if (campoId === 'pwd') {
            validationIcon = $('#pwdValidationIcon');
        } else if (campoId === 'pwdLogin') {
            validationIcon = $('#pwdLoginValidationIcon');
        } else if (campoId === 'googlePassword') {
            validationIcon = $('#googlePwdValidationIcon');
        } else if (campoId === 'googlePasswordReg') {
            validationIcon = $('#googlePwdRegValidationIcon');
        }

        if (!pwd || pwd.length === 0) {
            campo.addClass("is-invalid").removeClass("is-valid");
            campo.siblings(".invalid-feedback").text("La contraseña es obligatoria").show();
            if (validationIcon) {
                validationIcon.find('i').removeClass('fa-check-circle').addClass('fa-exclamation-circle').css('color', '#dc3545');
                validationIcon.show();
            }
            return false;
        }

        if (pwd.length < minLength) {
            campo.addClass("is-invalid").removeClass("is-valid");
            campo.siblings(".invalid-feedback").text("La contraseña debe tener al menos " + minLength + " caracteres").show();
            if (validationIcon) {
                validationIcon.find('i').removeClass('fa-check-circle').addClass('fa-exclamation-circle').css('color', '#dc3545');
                validationIcon.show();
            }
            return false;
        }

        campo.removeClass("is-invalid").addClass("is-valid");
        campo.siblings(".invalid-feedback").hide();
        if (validationIcon) {
            validationIcon.find('i').removeClass('fa-exclamation-circle').addClass('fa-check-circle').css('color', '#10b981');
            validationIcon.show();
        }
        return true;
    };

    this.validarCampoNombre = function(campo) {
        const valor = campo.val().trim();

        // Si está vacío, es válido (campo opcional)
        if (!valor) {
            campo.removeClass("is-invalid is-valid");
            campo.siblings(".invalid-feedback").hide();
            return true;
        }

        // Verificar que no contenga números
        const contieneNumeros = /\d/.test(valor);

        if (contieneNumeros) {
            campo.addClass("is-invalid").removeClass("is-valid");
            campo.siblings(".invalid-feedback").show();
            return false;
        }

        campo.removeClass("is-invalid").addClass("is-valid");
        campo.siblings(".invalid-feedback").hide();
        return true;
    };

    this.calcularFuerzaPassword = function(pwd) {
        let strength = 0;

        if (pwd.length >= 8) strength += 25;
        if (pwd.length >= 12) strength += 25;
        if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 20;
        if (/\d/.test(pwd)) strength += 15;
        if (/[^a-zA-Z0-9]/.test(pwd)) strength += 15;

        let result = {
            percentage: strength,
            class: "",
            text: "",
            color: ""
        };

        if (strength < 30) {
            result.class = "bg-danger";
            result.text = "Débil";
            result.color = "#dc3545";
        } else if (strength < 50) {
            result.class = "bg-warning";
            result.text = "Regular";
            result.color = "#ffc107";
        } else if (strength < 75) {
            result.class = "bg-info";
            result.text = "Buena";
            result.color = "#17a2b8";
        } else {
            result.class = "bg-success";
            result.text = "Fuerte";
            result.color = "#28a745";
        }

        return result;
    };

    // Funciones de recuperación de contraseña
    this.mostrarRecuperarPassword = function () {
        $("#fmLogin").remove();
        $("#fmRegistro").remove();
        $("#fmRecuperarPassword").remove();
        $("#mainContainer").addClass("auth-container-wrapper");
        $("#registro").load("./cliente/recuperarPassword.html", function () {
            console.log("🔄 recuperarPassword.html cargado, vinculando eventos...");

            // Real-time validation
            $("#emailRecuperar").on("blur", function() {
                cw.validarCampoEmail($(this));
            });

            // Handler para el formulario
            $(document).off("submit", "#formRecuperarPassword").on("submit", "#formRecuperarPassword", function (e) {
                e.preventDefault();
                console.log("📧 Formulario de recuperación enviado");

                let email = $("#emailRecuperar").val().trim();

                // Limpiar errores anteriores
                $(".form-control").removeClass("is-invalid is-valid");
                $(".invalid-feedback").hide();

                // Validación de email
                if (!cw.validarCampoEmail($("#emailRecuperar"))) {
                    cw.mostrarMensajeError("Por favor, introduce un correo válido.");
                    return;
                }

                console.log("✅ Validación exitosa, enviando petición...");

                // Obtener referencia al botón
                const btnRecuperar = $("#btnRecuperar");

                // Deshabilitar botón y mostrar spinner
                btnRecuperar.prop('disabled', true);
                btnRecuperar.find('.btn-text').hide();
                btnRecuperar.find('.btn-spinner').show();

                // Función para restaurar el botón
                const restaurarBoton = function() {
                    btnRecuperar.prop('disabled', false);
                    btnRecuperar.find('.btn-text').show();
                    btnRecuperar.find('.btn-spinner').hide();
                };

                // Enviar datos al servidor
                console.log("📧 Solicitando recuperación de contraseña para:", email);
                rest.solicitarRecuperacionPassword(email, restaurarBoton);
            });

            $("#btnVolverLogin").on("click", function (e) {
                e.preventDefault();
                cw.mostrarLogin();
            });

            console.log("✅ Eventos de recuperación vinculados correctamente");
        });
    };

    this.mostrarRestablecerPassword = function (email, token) {
        $("#fmLogin").remove();
        $("#fmRegistro").remove();
        $("#fmRecuperarPassword").remove();
        $("#fmRestablecerPassword").remove();
        $("#mainContainer").addClass("auth-container-wrapper");
        $("#registro").load("./cliente/restablecerPassword.html", function () {
            console.log("🔄 restablecerPassword.html cargado, vinculando eventos...");

            // Toggle password visibility para nueva contraseña
            $(document).off("click", "#toggleNewPassword").on("click", "#toggleNewPassword", function (e) {
                e.preventDefault();
                e.stopPropagation();
                const input = $("#newPassword");
                const isPassword = input.attr('type') === 'password';
                input.attr('type', isPassword ? 'text' : 'password');
                $(this).removeClass('fa-eye fa-eye-slash').addClass(isPassword ? 'fa-eye-slash' : 'fa-eye');
                $(this).attr('title', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
            });

            // Toggle password visibility para confirmar contraseña
            $(document).off("click", "#toggleConfirmPassword").on("click", "#toggleConfirmPassword", function (e) {
                e.preventDefault();
                e.stopPropagation();
                const input = $("#confirmPassword");
                const isPassword = input.attr('type') === 'password';
                input.attr('type', isPassword ? 'text' : 'password');
                $(this).removeClass('fa-eye fa-eye-slash').addClass(isPassword ? 'fa-eye-slash' : 'fa-eye');
                $(this).attr('title', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
            });

            // Password strength indicator
            $("#newPassword").on("input", function() {
                const pwd = $(this).val();
                if (pwd.length > 0) {
                    $("#passwordStrength").show();
                    const strength = cw.calcularFuerzaPassword(pwd);
                    const progressBar = $("#passwordStrength .progress-bar");
                    const strengthText = $("#passwordStrength .strength-text");

                    progressBar.css("width", strength.percentage + "%");
                    progressBar.removeClass("bg-danger bg-warning bg-info bg-success");
                    progressBar.addClass(strength.class);
                    strengthText.text(strength.text);
                    strengthText.css("color", strength.color);
                } else {
                    $("#passwordStrength").hide();
                }
            });

            // Real-time validation
            $("#newPassword").on("blur", function() {
                cw.validarCampoPassword($(this), 8);
            });

            $("#confirmPassword").on("blur", function() {
                const newPwd = $("#newPassword").val();
                const confirmPwd = $(this).val();

                if (confirmPwd && confirmPwd !== newPwd) {
                    $(this).addClass("is-invalid").removeClass("is-valid");
                    $(this).siblings(".invalid-feedback").show();
                } else if (confirmPwd) {
                    $(this).removeClass("is-invalid").addClass("is-valid");
                    $(this).siblings(".invalid-feedback").hide();
                }
            });

            // Handler para el formulario
            $(document).off("submit", "#formRestablecerPassword").on("submit", "#formRestablecerPassword", function (e) {
                e.preventDefault();
                console.log("🔐 Formulario de restablecimiento enviado");

                let newPassword = $("#newPassword").val();
                let confirmPassword = $("#confirmPassword").val();

                // Limpiar errores anteriores
                $(".form-control").removeClass("is-invalid is-valid");
                $(".invalid-feedback").hide();

                let isValid = true;

                // Validación de nueva contraseña
                if (!cw.validarCampoPassword($("#newPassword"), 8)) {
                    isValid = false;
                }

                // Validación de confirmación de contraseña
                if (!confirmPassword || confirmPassword.length === 0) {
                    $("#confirmPassword").addClass("is-invalid");
                    $("#confirmPassword").siblings(".invalid-feedback").text("Debes confirmar tu contraseña").show();
                    isValid = false;
                } else if (newPassword !== confirmPassword) {
                    $("#confirmPassword").addClass("is-invalid");
                    $("#confirmPassword").siblings(".invalid-feedback").text("Las contraseñas no coinciden").show();
                    isValid = false;
                } else {
                    $("#confirmPassword").removeClass("is-invalid").addClass("is-valid");
                    $("#confirmPassword").siblings(".invalid-feedback").hide();
                }

                if (!isValid) {
                    cw.mostrarMensajeError("Por favor, corrige los errores en el formulario.");
                    return;
                }

                console.log("✅ Validación exitosa, enviando petición...");

                // Obtener referencia al botón
                const btnRestablecer = $("#btnRestablecer");

                // Deshabilitar botón y mostrar spinner
                btnRestablecer.prop('disabled', true);
                btnRestablecer.find('.btn-text').hide();
                btnRestablecer.find('.btn-spinner').show();

                // Función para restaurar el botón
                const restaurarBoton = function() {
                    btnRestablecer.prop('disabled', false);
                    btnRestablecer.find('.btn-text').show();
                    btnRestablecer.find('.btn-spinner').hide();
                };

                // Enviar datos al servidor
                console.log("🔐 Restableciendo contraseña para:", email);
                rest.restablecerPassword(email, token, newPassword, restaurarBoton);
            });

            $("#btnVolverLogin").on("click", function (e) {
                e.preventDefault();
                cw.mostrarLogin();
            });

            console.log("✅ Eventos de restablecimiento vinculados correctamente");
        });
    };

    this.mostrarGrupos = function () {
        console.log("🔄 Cargando vista de grupos...");
        $("#mainContainer").removeClass("auth-container-wrapper");
        $("#registro").html("").load("./cliente/grupos.html", function () {
            console.log("✅ Vista de grupos cargada");
        });
    };

    this.mostrarChat = function (grupoId, grupoNombre, usuariosActivos) {
        console.log("🔄 Cargando chat del grupo:", grupoNombre);
        $("#mainContainer").removeClass("auth-container-wrapper");
        $("#registro").html("").load("./cliente/chat.html", function () {
            console.log("✅ Chat cargado para grupo:", grupoNombre);
        });
    };
}