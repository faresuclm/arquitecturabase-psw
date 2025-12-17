const config = require("../config/config");
const { ObjectId } = require("mongodb"); // Importar ObjectId directamente

function CAD() {
    const mongo = require("mongodb").MongoClient;

    this.usuarios;
    this.grupos;
    this.mensajes;

    this.conectar = async function (callback) {
        let cad = this;
        let client = new mongo(config.mongodb.getUri());
        await client.connect();
        const database = client.db("sistema");
        cad.usuarios = database.collection("usuarios");
        cad.grupos = database.collection("grupos");
        cad.mensajes = database.collection("mensajes");

        // === CREAR ÍNDICES ÚNICOS (Mejora de Robustez) ===
        // Esto asegura que la base de datos rechace duplicados incluso si hay condiciones de carrera
        try {
            await cad.usuarios.createIndex({ email: 1 }, { unique: true });
            // Username único, pero permitiendo que no exista (sparse) para usuarios incompletos
            // partialFilterExpression es más moderno y flexible que sparse
            await cad.usuarios.createIndex({ username: 1 }, {
                unique: true,
                partialFilterExpression: { username: { $exists: true } }
            });
            console.log("✅ Índices de base de datos verificados");
        } catch (e) {
            console.error("⚠️ Error creando índices:", e);
        }

        callback(database);
    };

    this.buscarOCrearUsuario = function (usr, callback) {
        buscarOCrear(this.usuarios, usr, callback);
    };

    function buscarOCrear(coleccion, criterio, callback) {
        // Filtrar por email para buscar
        const filtro = {email: criterio.email};

        coleccion.findOneAndUpdate(
            filtro,
            {$set: criterio},
            {upsert: true, returnDocument: "after"},
            function (err, doc) {
                if (err) {
                    console.error("Error al buscar/crear usuario:", err);
                    callback(null);
                } else if (doc && doc.value) {
                    // console.log("Usuario encontrado/creado:", doc.value.email);
                    callback(doc.value);
                } else {
                    console.error("❌ No se pudo obtener el documento actualizado");
                    callback(null);
                }
            }
        );
    }

    this.buscarUsuario = function (criterio, callback) {
        buscar(this.usuarios, criterio, callback);
    }

    this.buscarUsuarioPorUsername = function (username, callback) {
        // Buscar con case-insensitive
        this.usuarios.findOne({
            username: { $regex: new RegExp('^' + username + '$', 'i') }
        }, callback);
    }

    this.verificarUsernameDisponible = function (username, callback) {
        // Buscar con case-insensitive para evitar duplicados con diferentes mayúsculas
        this.usuarios.find({
            username: { $regex: new RegExp('^' + username + '$', 'i') }
        }).toArray(function(error, usuarios) {
            if (error) {
                console.error("❌ Error al verificar username:", error);
                callback(false);
            } else {
                const disponible = !usuarios || usuarios.length === 0;
                callback(disponible);
            }
        });
    }

    this.insertarUsuario = function (usuario, callback) {
        insertar(this.usuarios, usuario, callback);
    }

    function buscar(coleccion, criterio, callback) {
        coleccion.find(criterio).toArray(function (error, usuarios) {
            if (error) {
                console.error("Error al buscar usuario:", error);
                callback(undefined);
            } else if (usuarios && usuarios.length > 0) {
                callback(usuarios[0]);
            } else {
                callback(undefined);
            }
        });
    }

    function insertar(coleccion, elemento, callback) {
        coleccion.insertOne(elemento, function (err, result) {
            if (err) {
                console.error("❌ Error al insertar usuario en BD:", err.message);
                callback({email: -1, error: err.message});
            } else {
                console.log("✅ Usuario insertado en BD:", elemento.email);
                callback(elemento);
            }
        });
    }

    this.actualizarUsuario = function (obj, callback) {
        actualizar(this.usuarios, obj, callback);
    }

    function actualizar(coleccion, obj, callback) {
        // PROTECCIÓN DE OBJECTID: Convertir string a ObjectId si es necesario
        let filtroId;
        try {
            filtroId = typeof obj._id === 'string' ? new ObjectId(obj._id) : obj._id;
        } catch (e) {
            console.error("ID inválido para actualización:", obj._id);
            return callback({email: -1, error: "ID de usuario inválido"});
        }

        coleccion.findOneAndUpdate(
            {_id: filtroId},
            {$set: obj},
            {upsert: false, returnDocument: "after"},
            function (err, doc) {
                if (err) {
                    console.error("❌ Error al actualizar usuario en BD:", err.message);
                    callback({email: -1, error: err.message});
                } else if (doc && doc.value) {
                    console.log("✅ Usuario actualizado en BD:", doc.value.email);
                    callback(doc.value);
                } else {
                    console.warn("⚠️ Usuario no encontrado para actualizar con ID:", obj._id);
                    callback({email: -1, error: "Usuario no encontrado"});
                }
            }
        );
    }

    // ===================== MÉTODOS PARA GRUPOS =====================

    this.insertarGrupo = function (grupo, callback) {
        this.grupos.insertOne(grupo, function (err, result) {
            if (err) {
                console.error("❌ Error al insertar grupo:", err.message);
                callback({id: -1, error: err.message});
            } else {
                callback(grupo);
            }
        });
    }

    this.obtenerGrupos = function (callback) {
        this.grupos.find({}).sort({fechaCreacion: -1}).toArray(function (error, grupos) {
            if (error) {
                console.error("Error al obtener grupos:", error);
                callback([]);
            } else {
                callback(grupos || []);
            }
        });
    }

    this.obtenerGrupo = function (grupoId, callback) {
        this.grupos.findOne({id: grupoId}, function (error, grupo) {
            if (error) {
                console.error("Error al obtener grupo:", error);
                callback(null);
            } else {
                callback(grupo);
            }
        });
    }

    this.actualizarGrupo = function (grupo, callback) {
        this.grupos.findOneAndUpdate(
            {id: grupo.id},
            {$set: grupo},
            {upsert: false, returnDocument: "after"},
            function (err, doc) {
                if (err) {
                    console.error("❌ Error al actualizar grupo:", err.message);
                    callback({id: -1, error: err.message});
                } else if (doc && doc.value) {
                    callback(doc.value);
                } else {
                    callback({id: -1, error: "Grupo no encontrado"});
                }
            }
        );
    }

    // ===================== MÉTODOS PARA MENSAJES =====================

    this.insertarMensaje = function (mensaje, callback) {
        this.mensajes.insertOne(mensaje, function (err, result) {
            if (err) {
                console.error("❌ Error al insertar mensaje:", err.message);
                callback({id: -1, error: err.message});
            } else {
                callback(mensaje);
            }
        });
    }

    this.obtenerMensajes = function (grupoId, callback) {
        this.mensajes.find({grupoId: grupoId}).sort({fecha: 1}).toArray(function (error, mensajes) {
            if (error) {
                console.error("Error al obtener mensajes:", error);
                callback([]);
            } else {
                callback(mensajes || []);
            }
        });
    }
}

module.exports.CAD = CAD;