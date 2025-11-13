
require('dotenv').config({path: './secrets.env'});
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
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    function (accessToken, refreshToken, profile, done) {
        return done(null, profile);
    }
));

passport.use(
    new GoogleOneTapStrategy(
        {
            client_id: process.env.GOOGLE_CLIENT_ID, //prod-oneTap
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            verifyCsrfToken: false, // whether to validate the csrf token or not
        },
        function (profile, done) {
            return done(null, profile);
        }
    )
);

// Exportar passport para que `require('./servidor/passport-setup')` devuelva el objeto passport
module.exports = passport;