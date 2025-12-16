const config = require("../config/config");
const GoogleOneTapStrategy = require("passport-google-one-tap").GoogleOneTapStrategy;
const passport = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.serializeUser(function (user, done) {
    done(null, user);
});
passport.deserializeUser(function (user, done) {
    done(null, user);
});

passport.use(new GoogleStrategy({
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl
    },
    function (accessToken, refreshToken, profile, done) {
        return done(null, profile);
    }
));

passport.use(
    new GoogleOneTapStrategy(
        {
            client_id: config.google.clientId, //prod-oneTap
            clientSecret: config.google.clientSecret,
            verifyCsrfToken: false, // whether to validate the csrf token or not
        },
        function (profile, done) {
            return done(null, profile);
        }
    )
);

// Exportar passport para que `require('./servidor/passport-setup')` devuelva el objeto passport
module.exports = passport;