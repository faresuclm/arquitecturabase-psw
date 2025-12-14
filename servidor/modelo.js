const datos = require("./cad.js");
const correo = require("../cliente/email.js");
const bcrypt = require("bcrypt");
const SALT_ROUNDS = 10; // Número de rondas para el salt de bcrypt


function Sistema() {
    this.usuarios = {};
    this.cad = new datos.CAD();

    this.cad.conectar(function (db) {
        console.log("Conectado a Mongo Atlas");
    });

    this.verificarUsuarioGoogle = function (email, callback) {
        console.log("🔍 Verificando si usuario existe:", email);
        this.cad.buscarUsuario({"email": email}, function (usr) {
            if (usr) {
                console.log("✅ Usuario encontrado en BD");
                callback(usr);
            } else {
                console.log("⚠️ Usuario NO existe en BD");
                callback(null);
            }
        });
    }

    this.buscarUsuarioPorEmail = function (email, callback) {
        this.cad.buscarUsuario({"email": email}, function (usr) {
            callback(usr);
        });
    }

    this.usuarioGoogle = function (usr, callback) {
        // Asegurarse de que los usuarios de Google están confirmados por defecto
        if (!usr.confirmada) {
            usr.confirmada = true;
        }
        // Marcar como usuario de Google
        if (!usr.provider) {
            usr.provider = 'google';
        }
        // Fecha de registro
        if (!usr.fechaRegistro) {
            usr.fechaRegistro = new Date();
        }

        this.cad.buscarOCrearUsuario(usr, function (obj) {
            if (obj && obj.email) {
                console.log("✅ Usuario Google autenticado/creado:", obj.email, "| Provider:", obj.provider || 'google');
            } else {
                console.error("❌ Error al buscar/crear usuario de Google");
            }
            callback(obj);
        });
    };

    this.agregarUsuario = function (nick) {
        let res = {nick: -1};
        if (!this.usuarios[nick]) {
            this.usuarios[nick] = new Usuario(nick);
            res.nick = nick;
        } else {
            console.log("el nick " + nick + " está en uso");
        }
        return res;
    };

    this.obtenerUsuarios = function () {
        let res = {nick: -1};
        if (Object.keys(this.usuarios).length > 0) {
            res = this.usuarios;
        } else {
            console.log("no hay usuarios");
        }
        return res;
    };

    this.usuarioActivo = function (nick) {
        let res = {nick: -1};
        if (nick in this.usuarios) {
            return this.usuarios[nick];
        } else {
            res.nick = "No existe";
            console.log("El usuario '" + nick + "' no existe.");
            return res;
        }
    };

    this.eliminarUsuario = function (nick) {
        let res = {eliminado: "No se ha eliminado"};
        if (nick in this.usuarios) {
            delete this.usuarios[nick];
            res.eliminado = "Eliminado con éxito";
        }
        return res;
    };

    this.numeroUsuarios = function () {
        let res = {num: -1};
        res.num = Object.keys(this.usuarios).length;
        return res;
    };

    this.registrarUsuario = function (obj, callback) {
        let modelo = this;

        // Validaciones básicas
        if (!obj.email || !obj.password) {
            console.error("Error: email y contraseña son obligatorios");
            return callback({"email": -1, "error": "Email y contraseña son obligatorios"});
        }

        if (obj.password.length < 8) {
            console.error("Error: contraseña muy corta");
            return callback({"email": -1, "error": "La contraseña debe tener al menos 8 caracteres"});
        }

        if (!obj.nick) {
            obj.nick = obj.email;
        }

        // Buscar si el usuario ya existe
        this.cad.buscarUsuario({"email": obj.email}, function (usr) {
            if (!usr) {
                // El usuario no existe, luego lo puedo registrar
                // Cifrar la contraseña con bcrypt antes de guardarla
                bcrypt.hash(obj.password, SALT_ROUNDS, function(err, hash) {
                    if (err) {
                        console.error("Error al cifrar la contraseña:", err);
                        callback({"email": -1, "error": "Error al procesar la contraseña"});
                        return;
                    }

                    // Reemplazar la contraseña en texto plano por el hash
                    obj.password = hash;
                    obj.key = Date.now().toString();

                    // Solo establecer confirmada como false si no está definido (registro normal)
                    // Si viene de Google, ya tiene confirmada: true
                    if (obj.confirmada === undefined) {
                        obj.confirmada = false;
                    }

                    if (!obj.fechaRegistro) {
                        obj.fechaRegistro = new Date();
                    }

                    console.log("📝 Registrando usuario:", obj.email, "| Provider:", obj.provider || 'local', "| Confirmada:", obj.confirmada);

                    modelo.cad.insertarUsuario(obj, function (res) {
                        if (res && res.email) {
                            console.log("✅ Usuario registrado exitosamente:", res.email);

                            // Solo enviar email de verificación si NO está confirmado (registro normal, no Google)
                            if (obj.confirmada === false) {
                                console.log("📧 Enviando email de verificación a:", obj.email);
                                correo.enviarEmail(obj.email, obj.key, "Confirmar cuenta");
                            } else {
                                console.log("✅ Usuario pre-verificado (Google), no se envía email");
                            }
                        } else {
                            console.error("❌ Error al registrar usuario en base de datos");
                        }
                        callback(res);
                    });
                });
            } else {
                console.log("El usuario ya existe:", obj.email);
                callback({"email": -1, "error": "El email ya está registrado"});
            }
        });
    }

    /*
    this.loginUsuario = function (obj, callback) {
        // Buscar usuario por email y password
        this.cad.buscarUsuario({"email": obj.email, "password": obj.password}, function (usr) {
            if (usr) {
                // Usuario encontrado con credenciales correctas
                console.log("Usuario " + usr.email + " ha iniciado sesión correctamente");
                callback({"email": usr.email, "nombre": usr.nombre || usr.email});
            } else {
                // Usuario no encontrado o credenciales incorrectas
                console.log("Credenciales incorrectas para el email: " + obj.email);
                callback({"email": -1});
            }
        });
    }*/

    this.loginUsuario = function (obj, callback) {
        // Validaciones básicas
        if (!obj.email || !obj.password) {
            console.error("Error: email y contraseña son obligatorios");
            return callback({"email": -1, "error": "Email y contraseña son obligatorios"});
        }

        // Primero buscar el usuario sin filtrar por confirmada
        this.cad.buscarUsuario({"email": obj.email}, function (usr) {
            if (!usr) {
                // Usuario no encontrado
                console.log("Usuario no encontrado:", obj.email);
                return callback({"email": -1, "error": "Usuario no encontrado"});
            }

            // Verificar si es un usuario de Google sin contraseña
            if (usr.provider === 'google' && !usr.password) {
                console.log("Usuario de Google intentando login con contraseña:", obj.email);
                return callback({
                    "email": -1,
                    "error": "Esta cuenta fue creada con Google. Por favor, inicia sesión usando el botón de Google."
                });
            }

            // Verificar si el usuario ha confirmado su cuenta
            if (usr.confirmada === false) {
                console.log("Usuario no ha confirmado su cuenta:", obj.email);
                return callback({"email": -1, "confirmada": false, "error": "Cuenta no verificada"});
            }

            // Verificar que el usuario tiene contraseña
            if (!usr.password) {
                console.error("Usuario sin contraseña:", obj.email);
                return callback({
                    "email": -1,
                    "error": "Cuenta sin contraseña configurada. Contacta con el administrador."
                });
            }

            // Usuario encontrado y confirmado, ahora comparar la contraseña
            bcrypt.compare(obj.password, usr.password, function(err, result) {
                if (err) {
                    console.error("Error al comparar contraseñas:", err);
                    return callback({"email": -1, "error": "Error al verificar contraseña"});
                }

                if (result) {
                    // Contraseña correcta
                    console.log("Login exitoso para:", usr.email);
                    callback(usr);
                } else {
                    // Contraseña incorrecta
                    console.log("Contraseña incorrecta para el usuario:", usr.email);
                    callback({"email": -1, "error": "Contraseña incorrecta"});
                }
            });
        });
    }

    this.confirmarUsuario = function (obj, callback) {
        let modelo = this;
        this.cad.buscarUsuario({"email": obj.email, "confirmada": false, "key": obj.key}, function (usr) {
            if (usr) {
                usr.confirmada = true;
                modelo.cad.actualizarUsuario(usr, function (res) {
                    callback({"email": res.email}); //callback(res)
                })
            } else {
                callback({"email": -1});
            }
        })
    }

    this.solicitarRecuperacionPassword = function (email, callback) {
        let modelo = this;

        // Buscar el usuario por email
        this.cad.buscarUsuario({"email": email}, function (usr) {
            if (!usr) {
                console.log("Usuario no encontrado para recuperación:", email);
                return callback({"success": false, "error": "No existe una cuenta con este correo"});
            }

            // Verificar que es un usuario local (no de Google sin contraseña)
            if (usr.provider === 'google' && !usr.password) {
                console.log("Usuario de Google sin contraseña:", email);
                return callback({
                    "success": false,
                    "error": "Esta cuenta fue creada con Google. Por favor, inicia sesión con Google."
                });
            }

            // Generar token de recuperación (timestamp + random)
            const resetToken = Date.now().toString() + Math.random().toString(36).substring(2, 15);
            const resetTokenExpiry = Date.now() + 3600000; // 1 hora desde ahora

            // Actualizar usuario con el token
            usr.resetToken = resetToken;
            usr.resetTokenExpiry = resetTokenExpiry;

            modelo.cad.actualizarUsuario(usr, function (res) {
                if (res && res.email) {
                    console.log("✅ Token de recuperación generado para:", email);

                    // Enviar email con el token
                    correo.enviarEmailRecuperacion(email, resetToken);

                    callback({"success": true, "email": email});
                } else {
                    console.error("❌ Error al actualizar usuario con token de recuperación");
                    callback({"success": false, "error": "Error al procesar la solicitud"});
                }
            });
        });
    }

    this.restablecerPassword = function (email, token, newPassword, callback) {
        let modelo = this;

        // Buscar el usuario por email y token
        this.cad.buscarUsuario({"email": email, "resetToken": token}, function (usr) {
            if (!usr) {
                console.log("Usuario o token no válido para restablecimiento:", email);
                return callback({"success": false, "error": "Enlace inválido o expirado"});
            }

            // Verificar que el token no haya expirado
            if (!usr.resetTokenExpiry || Date.now() > usr.resetTokenExpiry) {
                console.log("Token expirado para:", email);
                return callback({"success": false, "error": "El enlace ha expirado. Solicita uno nuevo."});
            }

            // Validar la nueva contraseña
            if (!newPassword || newPassword.length < 8) {
                return callback({"success": false, "error": "La contraseña debe tener al menos 8 caracteres"});
            }

            // Cifrar la nueva contraseña
            bcrypt.hash(newPassword, SALT_ROUNDS, function(err, hash) {
                if (err) {
                    console.error("Error al cifrar la nueva contraseña:", err);
                    return callback({"success": false, "error": "Error al procesar la contraseña"});
                }

                // Actualizar la contraseña y eliminar el token
                usr.password = hash;
                delete usr.resetToken;
                delete usr.resetTokenExpiry;

                modelo.cad.actualizarUsuario(usr, function (res) {
                    if (res && res.email) {
                        console.log("✅ Contraseña restablecida exitosamente para:", email);
                        callback({"success": true, "email": email});
                    } else {
                        console.error("❌ Error al actualizar contraseña");
                        callback({"success": false, "error": "Error al actualizar la contraseña"});
                    }
                });
            });
        });
    }

}

function Usuario(nick) {
    this.nick = nick;
}

module.exports.Sistema = Sistema;
