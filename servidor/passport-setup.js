const config = require("../config/config");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GoogleOneTapStrategy = require("passport-google-one-tap").GoogleOneTapStrategy;
const LocalStrategy = require('passport-local').Strategy;

module.exports = function(passport, sistema) {

    // ====== SERIALIZACIÓN ======
    passport.serializeUser(function (user, done) {
        const email = user.emails ? user.emails[0].value : user.email;
        const displayName = user.displayName || user.username || email.split('@')[0];

        const userSession = {
            email: email,
            username: displayName,
            provider: user.provider || (user.emails ? 'google' : 'local')
        };
        done(null, userSession);
    });

    // ====== DESERIALIZACIÓN (CORREGIDA) ======
    passport.deserializeUser(function (userSession, done) {
        sistema.buscarUsuarioPorEmail(userSession.email, function(fullUser) {
            if (fullUser) {
                // Usuario existe en BD: Devolvemos el usuario completo
                done(null, fullUser);
            } else {
                // MODIFICACIÓN CRÍTICA:
                // Si el usuario no existe en BD, asumimos que es un NUEVO REGISTRO de Google.
                // Devolvemos un objeto temporal para que la ruta /good pueda procesarlo.
                // Si devolvemos null aquí, la sesión muere y el registro falla.
                const tempUser = {
                    email: userSession.email,
                    username: userSession.username,
                    provider: userSession.provider,
                    emails: [{ value: userSession.email }], // Formato que espera /good
                    isNew: true // Bandera útil por si quieres controlar acceso
                };
                done(null, tempUser);
            }
        });
    });

    // ====== ESTRATEGIA LOCAL ======
    passport.use(new LocalStrategy(
        { usernameField: "email", passwordField: "password" },
        function (email, password, done) {
            sistema.loginUsuario({ "email": email, "password": password }, function (user) {
                if (user.email === -1) {
                    return done(null, false, { message: user.error });
                }
                return done(null, user);
            });
        }
    ));

    // ====== ESTRATEGIA GOOGLE OAUTH 2.0 ======
    passport.use(new GoogleStrategy({
            clientID: config.google.clientId,
            clientSecret: config.google.clientSecret,
            callbackURL: config.google.callbackUrl,
            proxy: true
        },
        function (accessToken, refreshToken, profile, done) {
            // ✅ LOGS DE DEBUGGING
            console.log('🎯 Google Strategy ejecutada exitosamente!');
            console.log('📧 Email en profile.emails:', profile.emails ? profile.emails[0].value : '❌ NO HAY');
            console.log('📧 Email en profile.email:', profile.email || '❌ NO HAY');
            console.log('📧 Email en profile._json.email:', profile._json ? profile._json.email : '❌ NO HAY');
            console.log('👤 Display Name:', profile.displayName || '❌ NO HAY NOMBRE');
            console.log('🆔 Google ID:', profile.id || '❌ NO HAY ID');

            // Normalizar el email si viene en diferentes formatos
            if (!profile.emails || !profile.emails[0]) {
                console.warn('⚠️ profile.emails no está disponible, intentando obtener de otras fuentes...');

                if (profile.email) {
                    profile.emails = [{ value: profile.email, verified: true }];
                    console.log('✅ Email normalizado desde profile.email');
                } else if (profile._json && profile._json.email) {
                    profile.emails = [{ value: profile._json.email, verified: true }];
                    console.log('✅ Email normalizado desde profile._json.email');
                } else {
                    console.error('❌ ERROR CRÍTICO: No se pudo obtener el email del profile de Google');
                }
            }

            console.log('📦 Profile final:', JSON.stringify(profile, null, 2));

            return done(null, profile);
        }
    ));

    // ====== ESTRATEGIA GOOGLE ONE TAP ======
    passport.use(new GoogleOneTapStrategy(
        {
            clientID: config.google.clientId,
            clientSecret: config.google.clientSecret,
            verifyCsrfToken: false,
        },
        function (profile, done) {
            // ✅ LOGS DE DEBUGGING
            console.log('🎯 Google One Tap Strategy ejecutada exitosamente!');
            console.log('📧 Email en profile.emails:', profile.emails ? profile.emails[0].value : '❌ NO HAY');
            console.log('📧 Email en profile.email:', profile.email || '❌ NO HAY');
            console.log('📧 Email en profile._json.email:', profile._json ? profile._json.email : '❌ NO HAY');
            console.log('👤 Display Name:', profile.displayName || '❌ NO HAY NOMBRE');
            console.log('🆔 Google ID:', profile.id || '❌ NO HAY ID');

            // Normalizar el email si viene en diferentes formatos
            if (!profile.emails || !profile.emails[0]) {
                console.warn('⚠️ profile.emails no está disponible, intentando obtener de otras fuentes...');

                if (profile.email) {
                    profile.emails = [{ value: profile.email, verified: true }];
                    console.log('✅ Email normalizado desde profile.email');
                } else if (profile._json && profile._json.email) {
                    profile.emails = [{ value: profile._json.email, verified: true }];
                    console.log('✅ Email normalizado desde profile._json.email');
                } else {
                    console.error('❌ ERROR CRÍTICO: No se pudo obtener el email del profile de Google One Tap');
                }
            }

            console.log('📦 Profile final (One Tap):', JSON.stringify(profile, null, 2));

            return done(null, profile);
        }
    ));
};