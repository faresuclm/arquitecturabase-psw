
const bodyParser = require("body-parser");
const fs = require("fs");
const express = require("express");
const cookieSession = require("cookie-session");
const app = express();
const LocalStrategy = require('passport-local').Strategy;
const passport = require("./servidor/passport-setup");
const modelo = require("./servidor/modelo.js");
const PORT = parseInt(process.env.PORT) || 8080;
const haIniciado = function (request, response, next) {
    if (request.user) {
        next();
    } else {
        response.redirect("/")
    }
}
let sistema = new modelo.Sistema();

// Middleware
app.use(express.static(__dirname + "/"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(
    cookieSession({
        name: "Sistema",
        keys: ["key1", "key2"],
    })
);
app.use(passport.initialize());
passport.use(new
LocalStrategy({usernameField: "email", passwordField: "password"}, function (email, password, done) {
        sistema.loginUsuario({"email": email, "password": password}, function (user) {
            return done(null, user);
        })
    }
));
app.use(passport.session());


// ------------------------ GET -----------------------------
app.get("/fallo", function (request, response) {
    response.send({nick: "nook"});
});

app.get("/", function (request, response) {
    var contenido = fs.readFileSync(__dirname + "/cliente/index.html");
    response.setHeader("Content-type", "text/html");
    response.send(contenido);
});

app.get("/agregarUsuario/:nick", function (request, response) {
    let nick = request.params.nick;
    let res = sistema.agregarUsuario(nick);
    response.send(res);
});

app.get("/obtenerUsuarios",haIniciado,function(request,response){
    let lista=sistema.obtenerUsuarios();
    response.send(lista);
});

app.get("/usuarioActivo/:nick", function (request, response) {
    let res = sistema.usuarioActivo(request.params.nick);
    response.send(res);
});

app.get("/cerrarSesion",haIniciado,function(request,response){
    let nick=request.user.nick;
    request.logout();
    response.redirect("/");
    if (nick){
        sistema.eliminarUsuario(nick);
    }
})

app.get("/numeroUsuarios", function (request, response) {
    let res = sistema.numeroUsuarios();
    response.send(res);
});

app.get("/eliminarUsuario/:nick", function (request, response) {
    let nick = request.params.nick;
    let res = sistema.eliminarUsuario(nick);
    response.send(res);
});

app.get(
    "/auth/google",
    passport.authenticate("google", {scope: ["profile", "email"]})
);
app.get(
    "/google/callback",
    passport.authenticate("google", {failureRedirect: "/fallo"}),
    function (req, res) {
        console.log("Google callback exitoso");
        console.log("Usuario autenticado:", req.user ? "Sí" : "No");
        if (req.user) {
            console.log("Email del usuario:", req.user.emails ? req.user.emails[0].value : "No disponible");
        }
        res.redirect("/good");
    }
);

/*
app.get("/good", function (request, response) {
  let nick = request.user.emails[0].value;
  if (nick) {
    sistema.agregarUsuario(nick);
  }
  //console.log(request.user.emails[0].value);
  response.cookie("nick", nick);
  response.redirect("/");
});
*/

app.get("/good", function (request, response) {
    // Verificar que el usuario existe y tiene emails
    if (!request.user || !request.user.emails || request.user.emails.length === 0) {
        console.error("Error: Usuario no autenticado o sin email");
        return response.redirect("/?error=auth_failed");
    }

    let email = request.user.emails[0].value;
    // Intentar obtener el nombre del perfil de Google
    let displayName = email; // Por defecto usar el email
    if (request.user.displayName) {
        displayName = request.user.displayName;
    } else if (request.user.name && request.user.name.givenName) {
        displayName = request.user.name.givenName;
        if (request.user.name.familyName) {
            displayName += ' ' + request.user.name.familyName;
        }
    }

    sistema.usuarioGoogle({"email": email}, function (obj) {
        if (obj && obj.email) {
            response.cookie("nick", obj.email);
            response.cookie("userName", displayName);
            response.redirect("/");
        } else {
            console.error("Error al crear/buscar usuario en la base de datos");
            response.redirect("/?error=db_error");
        }
    });
});

app.get("/fallo", function (request, response) {
    response.send({nick: "nook"});
});

app.get("/confirmarUsuario/:email/:key", function (request, response) {
    let email = request.params.email;
    let key = request.params.key;
    sistema.confirmarUsuario({"email": email, "key": key}, function (usr) {
        if (usr.email != -1) {
            // Usuario confirmado exitosamente, redirigir al login con mensaje de éxito
            response.redirect('/?verificado=true&email=' + encodeURIComponent(email));
        } else {
            // Error en la confirmación
            response.redirect('/?verificado=false');
        }
    });
})

app.get("/ok", function (request, response) {
    response.send({
        nick: request.user.email,
        nombre: request.user.nombre,
        apellidos: request.user.apellidos
    })
});


// ------------------------ POST -----------------------------

app.post('/oneTap/callback',
    passport.authenticate('google-one-tap', {failureRedirect: '/fallo'}),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/good');
    });


app.post("/registrarUsuario", function (request, response) {
    sistema.registrarUsuario(request.body, function (res) {
        response.send({"nick": res.email});
    });
});

app.post('/loginUsuario', function(request, response, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) {
            return response.send({"nick": -1});
        }
        if (!user) {
            return response.send({"nick": -1});
        }
        request.logIn(user, function(err) {
            if (err) {
                return response.send({"nick": -1});
            }
            // Construir el nombre completo
            let nombreCompleto = '';
            if (user.nombre && user.apellidos) {
                nombreCompleto = user.nombre + ' ' + user.apellidos;
            } else if (user.nombre) {
                nombreCompleto = user.nombre;
            } else {
                nombreCompleto = user.email;
            }

            return response.send({
                "nick": user.email,
                "nombre": user.nombre,
                "apellidos": user.apellidos,
                "nombreCompleto": nombreCompleto
            });
        });
    })(request, response, next);
});

app.post("/cerrarSesion", function (request, response) {
    let nick = request.body.nick;
    console.log("Usuario " + nick + " ha cerrado sesión");
    // Aquí podrías agregar lógica adicional como:
    // - Registrar el logout en la base de datos
    // - Actualizar el estado del usuario
    // - Limpiar recursos asociados
    response.send({"resultado": "sesion_cerrada", "nick": nick});
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`App está escuchando en el puerto ${PORT}`);
    console.log("Ctrl+C para salir");
}).on('error', (err) => {
    console.error('Error al iniciar el servidor:', err);
    process.exit(1);
});
