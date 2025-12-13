function CAD() {
    const mongo = require("mongodb").MongoClient;
    const ObjectId = require("mongodb").ObjectId;
    this.usuarios;

    this.conectar = async function (callback) {
        let cad = this;
        let client = new mongo(
            "mongodb+srv://" +
            process.env.MONGODB_USER +
            ":" +
            process.env.MONGODB_PASSWORD +
            "@" +
            process.env.MONGODB_URL +
            "/?retryWrites=true&w=majority"
        );
        await client.connect();
        const database = client.db("sistema");
        cad.usuarios = database.collection("usuarios");
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
                    console.log("Usuario encontrado/creado:", doc.value.email);
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
        coleccion.findOneAndUpdate(
            {_id: ObjectId(obj._id)},
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
                    console.warn("⚠️ Usuario no encontrado para actualizar");
                    callback({email: -1, error: "Usuario no encontrado"});
                }
            }
        );
    }

}

module.exports.CAD = CAD;
