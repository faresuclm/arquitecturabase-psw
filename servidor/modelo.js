const datos = require("./cad.js");
const correo = require("../cliente/email.js");
const bcrypt = require("bcrypt");
const SALT_ROUNDS = 10;

function Sistema() {
    this.usuarios = {};
    this.grupos = {};
    this.cad = new datos.CAD();
    let sistema = this;

    this.cad.conectar(function (db) {
        console.log("Conectado a Mongo Atlas");
        sistema.inicializarGruposPredeterminados();
    });

    this.verificarUsuarioGoogle = function (email, callback) {
        this.cad.buscarUsuario({"email": email}, function (usr) {
            callback(usr);
        });
    }

    this.buscarUsuarioPorEmail = function (email, callback) {
        this.cad.buscarUsuario({"email": email}, function (usr) {
            callback(usr);
        });
    }

    this.verificarUsernameDisponible = function (username, callback) {
        this.cad.verificarUsernameDisponible(username, callback);
    }

    this.agregarUsuario = function (nick) {
        if (!this.usuarios[nick]) {
            this.usuarios[nick] = new Usuario(nick);
            return {nick: nick};
        }
        return {nick: -1};
    };
    this.eliminarUsuario = function (nick) {
        if (nick in this.usuarios) {
            delete this.usuarios[nick];
            return {eliminado: true};
        }
        return {eliminado: false};
    };

    // ====== REGISTRO ROBUSTO ======
    this.registrarUsuario = function (obj, callback) {
        let modelo = this;

        if (!obj.email || !obj.password || !obj.username) {
            return callback({"email": -1, "error": "Faltan datos obligatorios"});
        }
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(obj.username)) {
            return callback({"email": -1, "error": "Username inválido (3-20 carácteres alfanuméricos)"});
        }
        if (obj.password.length < 8) {
            return callback({"email": -1, "error": "Contraseña debe tener mín. 8 caracteres"});
        }

        this.cad.buscarUsuario({"email": obj.email}, function (usr) {
            // Completar registro si viene de Google
            if (usr && usr.provider === 'google' && !usr.password && obj.provider === 'google') {
                console.log("🔄 Completando registro de usuario Google:", obj.email);

                modelo.cad.buscarUsuarioPorUsername(obj.username, function (existingUser) {
                    if (existingUser && existingUser.email !== obj.email) {
                        return callback({"email": -1, "error": "El nombre de usuario ya está en uso"});
                    }

                    bcrypt.hash(obj.password, SALT_ROUNDS, function (err, hash) {
                        if (err) return callback({"email": -1, "error": "Error de cifrado"});

                        usr.password = hash;
                        usr.username = obj.username;
                        usr.confirmada = true;

                        modelo.cad.actualizarUsuario(usr, function (res) {
                            callback(res);
                        });
                    });
                });
                return;
            }

            if (usr) {
                return callback({"email": -1, "error": "El email ya está registrado"});
            }

            modelo.cad.buscarUsuarioPorUsername(obj.username, function (usrByUsername) {
                if (usrByUsername) return callback({"email": -1, "error": "El nombre de usuario ya está en uso"});

                bcrypt.hash(obj.password, SALT_ROUNDS, function (err, hash) {
                    if (err) return callback({"email": -1, "error": "Error interno"});

                    obj.password = hash;
                    obj.key = Date.now().toString();
                    if (obj.confirmada === undefined) obj.confirmada = false;
                    if (!obj.fechaRegistro) obj.fechaRegistro = new Date();

                    modelo.cad.insertarUsuario(obj, function (res) {
                        if (res && res.email) {
                            if (obj.confirmada === false) {
                                correo.enviarEmail(obj.email, obj.key, "Confirmar cuenta");
                            }
                        }
                        callback(res);
                    });
                });
            });
        });
    }

    this.loginUsuario = function (obj, callback) {
        if (!obj.email || !obj.password) return callback({"email": -1, "error": "Faltan datos"});

        this.cad.buscarUsuario({"email": obj.email}, function (usr) {
            if (!usr) return callback({"email": -1, "error": "Usuario no encontrado"});

            if (usr.provider === 'google' && !usr.password) {
                return callback({"email": -1, "error": "Cuenta de Google. Usa el botón de Google."});
            }
            if (usr.confirmada === false) {
                return callback({"email": -1, "confirmada": false, "error": "Cuenta no verificada"});
            }

            bcrypt.compare(obj.password, usr.password, function (err, result) {
                if (result) callback(usr);
                else callback({"email": -1, "error": "Contraseña incorrecta"});
            });
        });
    }

    this.confirmarUsuario = function (obj, callback) {
        let modelo = this;
        this.cad.buscarUsuario({"email": obj.email, "confirmada": false, "key": obj.key}, function (usr) {
            if (usr) {
                usr.confirmada = true;
                modelo.cad.actualizarUsuario(usr, function (res) {
                    callback({"email": res.email});
                })
            } else {
                callback({"email": -1});
            }
        })
    }

    this.solicitarRecuperacionPassword = function (email, callback) {
        let modelo = this;
        this.cad.buscarUsuario({"email": email}, function (usr) {
            if (!usr) return callback({"success": false, "error": "Usuario no encontrado"});
            if (usr.provider === 'google' && !usr.password) return callback({
                "success": false,
                "error": "Usa Google para entrar"
            });

            const resetToken = Date.now() + Math.random().toString(36).substring(2);
            usr.resetToken = resetToken;
            usr.resetTokenExpiry = Date.now() + 3600000;

            modelo.cad.actualizarUsuario(usr, function (res) {
                correo.enviarEmailRecuperacion(email, resetToken);
                callback({"success": true});
            });
        });
    }

    this.restablecerPassword = function (email, token, newPassword, callback) {
        let modelo = this;
        this.cad.buscarUsuario({"email": email, "resetToken": token}, function (usr) {
            if (!usr || Date.now() > usr.resetTokenExpiry) return callback({
                "success": false,
                "error": "Token inválido o expirado"
            });

            bcrypt.hash(newPassword, SALT_ROUNDS, function (err, hash) {
                usr.password = hash;
                delete usr.resetToken;
                delete usr.resetTokenExpiry;
                modelo.cad.actualizarUsuario(usr, function (res) {
                    callback({"success": true});
                });
            });
        });
    }

    // ===================== GESTIÓN DE GRUPOS (ACTUALIZADO) =====================
    this.inicializarGruposPredeterminados = function () {
        let modelo = this;
        // Se añaden los nuevos grupos solicitados para un total de 9
        let gruposDef = [
            {nombre: "Desarrollo Web", descripcion: "FullStack y Tecnologías Web"},
            {nombre: "Sistemas", descripcion: "Sistemas Operativos y Administración"},
            {nombre: "Cloud e IA", descripcion: "Inteligencia Artificial y Computación en la Nube"},
            {nombre: "Redes", descripcion: "Redes de Computadores y Protocolos"},
            {nombre: "TFG", descripcion: "Trabajo Fin de Grado"},
            {nombre: "Bases de Datos", descripcion: "SQL, NoSQL y Diseño de Datos"},
            {nombre: "Ingeniería del Software", descripcion: "Patrones, Metodologías y Calidad"},
            {nombre: "Ciberseguridad", descripcion: "Seguridad Informática y Hacking Ético"},
            {nombre: "Programación Básica", descripcion: "Algoritmia y Estructuras de Datos"}
        ];

        this.cad.obtenerGrupos(function (existentes) {
            let nombres = existentes.map(g => g.nombre);
            gruposDef.filter(g => !nombres.includes(g.nombre)).forEach(g => {
                g.id = "grupo_" + g.nombre.replace(/\s+/g, '_').toLowerCase();
                g.miembros = [];
                g.fechaCreacion = new Date();
                modelo.cad.insertarGrupo(g, () => {
                });
            });
        });
    }

    this.obtenerGrupos = function (cb) {
        this.cad.obtenerGrupos(cb);
    }
    this.obtenerGrupo = function (id, cb) {
        this.cad.obtenerGrupo(id, cb);
    }

    this.unirseAGrupo = function (gId, email, cb) {
        let modelo = this;
        this.cad.obtenerGrupo(gId, g => {
            if (!g) return cb(null);
            if (!g.miembros.includes(email)) {
                g.miembros.push(email);
                modelo.cad.actualizarGrupo(g, cb);
            } else cb(g);
        });
    }

    this.salirDeGrupo = function (gId, email, cb) {
        let modelo = this;
        this.cad.obtenerGrupo(gId, g => {
            if (!g) return cb(null);
            if (g.miembros.includes(email)) {
                g.miembros = g.miembros.filter(m => m !== email);
                modelo.cad.actualizarGrupo(g, cb);
            } else cb(g);
        });
    }

    this.enviarMensaje = function (m, cb) {
        let msg = {...m, id: Date.now().toString(), fecha: new Date(), leido: false};
        let modelo = this;
        this.cad.insertarMensaje(msg, (res) => {
            modelo.cad.obtenerGrupo(m.grupoId, g => {
                if (g) {
                    g.ultimoMensaje = {autor: m.nombreAutor, contenido: m.contenido, fecha: msg.fecha};
                    modelo.cad.actualizarGrupo(g, () => cb(res));
                } else cb(res);
            });
        });
    }

    this.obtenerMensajes = function (gId, cb) {
        this.cad.obtenerMensajes(gId, cb);
    }

    this.obtenerInfoUsuarios = function (emails, cb) {
        let res = {}, count = 0;
        if (emails.length === 0) return cb({});
        emails.forEach(email => {
            this.cad.buscarUsuario({email}, u => {
                res[email] = {username: u ? u.username : email.split('@')[0]};
                count++;
                if (count === emails.length) cb(res);
            });
        });
    }
}

function Usuario(nick) {
    this.nick = nick;
}

module.exports.Sistema = Sistema;