function ControlWeb() {

    this.mostrarRegistro = function () {
        $("#fmRegistro").remove();
        $("#fmLogin").remove();
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

            $("#nombre, #apellidos").on("blur", function() {
                cw.validarCampoNombre($(this));
            });

            $("#pwd").on("blur", function() {
                cw.validarCampoPassword($(this), 8);
            });

            $("#btnRegistro").on("click", function (e) {
                e.preventDefault();

                let email = $("#email").val().trim();
                let pwd = $("#pwd").val();
                let nombre = $("#nombre").val().trim();
                let apellidos = $("#apellidos").val().trim();

                // Limpiar errores anteriores
                $(".form-control").removeClass("is-invalid is-valid");
                $(".invalid-feedback").hide();

                let isValid = true;

                // Validación de email (obligatorio)
                if (!cw.validarCampoEmail($("#email"))) {
                    isValid = false;
                }

                // Validación de contraseña (obligatorio, mínimo 8 caracteres)
                if (!cw.validarCampoPassword($("#pwd"), 8)) {
                    isValid = false;
                }

                // Validación de nombre (opcional, pero si se proporciona debe ser válido)
                if (nombre && !cw.validarCampoNombre($("#nombre"))) {
                    isValid = false;
                }

                // Validación de apellidos (opcional, pero si se proporciona debe ser válido)
                if (apellidos && !cw.validarCampoNombre($("#apellidos"))) {
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

                rest.registrarUsuario(email, pwd, nombre, apellidos, restaurarBoton);
            });

            $("#btnMostrarLogin").on("click", function (e) {
                e.preventDefault();
                cw.mostrarLogin();
            });

            // Prevenir doble clic en el botón de Google registro
            $("#btnGoogleRegistro").on("click", function (e) {
                if ($(this).hasClass('disabled')) {
                    e.preventDefault();
                    return false;
                }

                $(this).addClass('disabled');
                $(this).find('.google-icon').hide();
                $(this).find('.google-text').hide();
                $(this).find('.google-spinner').show();

                // Timeout de seguridad por si algo falla
                setTimeout(() => {
                    $(this).removeClass('disabled');
                    $(this).find('.google-icon').show();
                    $(this).find('.google-text').show();
                    $(this).find('.google-spinner').hide();
                }, 10000);
            });

            // Configurar handlers del modal de Google en registro
            cw.configurarHandlersModalGoogleRegistro();
        });
    }

    this.mostrarLogin = function () {
        $("#fmLogin").remove();
        $("#fmRegistro").remove();
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

            // Prevenir doble clic en el botón de Google
            $("#btnGoogleLogin").on("click", function (e) {
                if ($(this).hasClass('disabled')) {
                    e.preventDefault();
                    return false;
                }

                $(this).addClass('disabled');
                $(this).find('.google-icon').hide();
                $(this).find('.google-text').hide();
                $(this).find('.google-spinner').show();

                // Timeout de seguridad por si algo falla
                setTimeout(() => {
                    $(this).removeClass('disabled');
                    $(this).find('.google-icon').show();
                    $(this).find('.google-text').show();
                    $(this).find('.google-spinner').hide();
                }, 10000);
            });

            // Configurar handlers del modal de Google después de que el modal esté en el DOM
            cw.configurarHandlersModalGoogle();

            // Verificar si viene de Google OAuth (nuevo usuario que necesita establecer contraseña)
            let urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('google') === 'new_user') {
                let email = urlParams.get('email');
                let nombre = urlParams.get('nombre');
                if (email && nombre) {
                    console.log("📝 Detectado nuevo usuario Google, mostrando modal sobre login");
                    setTimeout(() => {
                        cw.mostrarModalPasswordGoogle(decodeURIComponent(email), decodeURIComponent(nombre));
                    }, 500);
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

        // Handler para enviar contraseña de Google REGISTRO
        $(document).off("submit", "#formPasswordGoogleReg").on("submit", "#formPasswordGoogleReg", function(e) {
            e.preventDefault();

            const password = $("#googlePasswordReg").val();

            console.log("📝 [REGISTRO] Enviando contraseña para completar registro Google");

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
                body: JSON.stringify({ password: password }),
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

                    // Establecer cookies
                    $.cookie("nick", data.email);
                    $.cookie("userName", data.nombre);

                    // Cerrar modal
                    $("#modalPasswordGoogleRegistro").modal('hide');

                    // Mostrar mensaje de éxito
                    cw.mostrarMensajeExito("¡Registro completado! Bienvenido, " + data.nombre);

                    setTimeout(function() {
                        // Redirigir a página principal
                        window.location.href = "/?google=success";
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

    this.mostrarModalPasswordGoogleRegistro = function(email, nombre) {
        console.log("📝 Mostrando modal de contraseña en REGISTRO para:", email);

        // Asegurar que los handlers están configurados
        cw.configurarHandlersModalGoogleRegistro();

        // Rellenar información del usuario
        $("#googleEmailReg").text(email);
        $("#googleNameReg").text(nombre || email);

        // Limpiar formulario
        $("#googlePasswordReg").val('');
        $("#googlePasswordStrengthReg").hide();
        $("#googlePasswordReg").removeClass("is-invalid is-valid");
        $(".invalid-feedback").hide();

        // Restaurar botón
        const btn = $("#btnConfirmPasswordGoogleReg");
        btn.prop('disabled', false);
        btn.find('.btn-text').show();
        btn.find('.btn-spinner').hide();

        // Mostrar el modal
        $("#modalPasswordGoogleRegistro").modal('show');

        // Dar foco al campo de contraseña
        $("#modalPasswordGoogleRegistro").on('shown.bs.modal', function () {
            $("#googlePasswordReg").focus();
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

        // Handler para enviar contraseña de Google (usar delegación de eventos)
        $(document).off("submit", "#formPasswordGoogle").on("submit", "#formPasswordGoogle", function(e) {
            e.preventDefault();

            const password = $("#googlePassword").val();
            const email = $("#googleEmail").text();

            console.log("📝 Handler activado - Password:", password ? "presente" : "vacío", "Email:", email);

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

            console.log("📝 Enviando contraseña para completar registro Google");
            console.log("📝 URL:", window.location.origin + '/completarRegistroGoogle');

            // Enviar al servidor
            fetch('/completarRegistroGoogle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: password }),
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

                    // Establecer cookies
                    $.cookie("nick", data.email);
                    $.cookie("userName", data.nombre);

                    // Cerrar modal
                    $("#modalPasswordGoogle").modal('hide');

                    // Mostrar mensaje de éxito
                    cw.mostrarMensajeExito("¡Registro completado! Bienvenido, " + data.nombre);

                    setTimeout(function() {
                        // Recargar la página para refrescar la sesión
                        window.location.href = "/?google=success";
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

    this.comprobarSesion = function () {
        // Usar la API de jquery-cookie: $.cookie('nick') para leer la cookie.
        let nick = $.cookie("nick");

        // Verificar parámetros de la URL
        let urlParams = new URLSearchParams(window.location.search);
        let verificado = urlParams.get('verificado');
        let email = urlParams.get('email');
        let error = urlParams.get('error');
        let googleSuccess = urlParams.get('google');
        let message = urlParams.get('message');
        let nombre = urlParams.get('nombre');

        // Verificar si debe mostrar registro directamente
        let view = urlParams.get('view');

        if (nick) {
            // Obtener el nombre del usuario guardado en la cookie
            let displayName = $.cookie("userName") || nick;
            // Mostrar el navegador cuando hay sesión
            $("#mainNav").show();
            // Ocultar el contenedor principal cuando hay sesión
            $("#mainContainer").hide();

            // Mostrar mensaje de éxito si viene de Google
            if (googleSuccess === 'login_success') {
                cw.mostrarMensajeExito("¡Inicio de sesión con Google exitoso! Bienvenido, " + displayName);
                // Limpiar la URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } else if (googleSuccess === 'success') {
                cw.mostrarMensajeExito("¡Bienvenido! Tu cuenta ha sido creada exitosamente.");
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                cw.mostrarMensaje("Bienvenido " + displayName);
            }

            // Ocultar/limpiar el formulario si ya hay sesión
            cw.eliminarFormulario();
        } else if (view === 'registro') {
            // Mostrar página de REGISTRO
            $("#mainNav").hide();
            $("#mainContainer").show();
            cw.mostrarRegistro();
        } else {
            // Ocultar el navegador cuando no hay sesión
            $("#mainNav").hide();
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

                // Usuario Google ya existe
                else if (googleSuccess === 'already_exists' && email) {
                    cw.mostrarMensajeError("El correo " + decodeURIComponent(email) + " ya tiene una cuenta. Por favor, inicia sesión.");
                }
                // Caso especial: Nuevo usuario de Google necesita definir contraseña en LOGIN
                else if (googleSuccess === 'new_user' && email) {
                    cw.mostrarModalPasswordGoogle(email, nombre);
                }

                // Limpiar la URL después de mostrar el mensaje (excepto para new_user)
                if (googleSuccess !== 'new_user' && (verificado || error || googleSuccess)) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }, 500);
        }
    };

    this.mostrarModalPasswordGoogle = function(email, nombre) {
        // Verificar que el modal existe (solo disponible si se cargó login.html)
        if ($("#modalPasswordGoogle").length === 0) {
            console.warn("⚠️ Modal de contraseña no disponible, recargando página...");
            setTimeout(() => {
                window.location.href = "/?google=new_user&email=" + encodeURIComponent(email) + "&nombre=" + encodeURIComponent(nombre || email);
            }, 500);
            return;
        }

        console.log("📝 Mostrando modal para definir contraseña:", email);

        // Asegurar que los handlers están configurados
        cw.configurarHandlersModalGoogle();

        // Rellenar información del usuario
        $("#googleEmail").text(email);
        $("#googleName").text(nombre || email);

        // Limpiar formulario
        $("#googlePassword").val('');
        $("#googlePasswordStrength").hide();
        $("#googlePassword").removeClass("is-invalid is-valid");
        $(".invalid-feedback").hide();

        // Restaurar botón
        const btn = $("#btnConfirmPasswordGoogle");
        btn.prop('disabled', false);
        btn.find('.btn-text').show();
        btn.find('.btn-spinner').hide();

        // Mostrar el modal
        $("#modalPasswordGoogle").modal('show');

        // Dar foco al campo de contraseña después de que el modal se muestre
        $("#modalPasswordGoogle").on('shown.bs.modal', function () {
            $("#googlePassword").focus();
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
}
