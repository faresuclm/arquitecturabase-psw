const bodyParser = require("body-parser");
const fs = require("fs");
const express = require("express");
const cookieSession = require("cookie-session");
const app = express();
const LocalStrategy = require('passport-local').Strategy;
const passport = require("./servidor/passport-setup");
const modelo = require("./servidor/modelo.js");
const PORT = process.env.PORT || 3000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
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

app.get("/obtenerUsuarios", function (request, response) {
    let res = sistema.obtenerUsuarios();
    response.send(res);
});

app.get("/usuarioActivo/:nick", function (request, response) {
    let res = sistema.usuarioActivo(request.params.nick);
    response.send(res);
});

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
    let email = request.user.emails[0].value;
    sistema.usuarioGoogle({"email": email}, function (obj) {
        response.cookie("nick", obj.email);
        response.redirect("/");
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
    response.send({nick: request.user.email})
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

app.post('/loginUsuario', passport.authenticate("local", {
        failureRedirect: " /fallo",
        successRedirect: "/ok"
    })
);

/*
app.post("/loginUsuario", function (request, response) {
    sistema.loginUsuario(request.body, function (res) {
        if (res && res.email) {
            response.send({"nick": res.email, "nombre": res.nombre});
        } else {
            response.send({"nick": -1});
        }
    });
});*/

app.post("/cerrarSesion", function (request, response) {
    let nick = request.body.nick;
    console.log("Usuario " + nick + " ha cerrado sesión");
    // Aquí podrías agregar lógica adicional como:
    // - Registrar el logout en la base de datos
    // - Actualizar el estado del usuario
    // - Limpiar recursos asociados
    response.send({"resultado": "sesion_cerrada", "nick": nick});
});

app.listen(PORT, () => {
    console.log(`App está escuchando en el puerto ${PORT}`);
    console.log("Ctrl+C para salir");
});
