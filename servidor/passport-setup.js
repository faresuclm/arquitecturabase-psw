
const passport = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
passport.serializeUser(function (user, done) {
    done(null, user);
});
passport.deserializeUser(function (user, done) {
    done(null, user);
});
passport.use(new GoogleStrategy({
        clientID: "49772563360-9jbunh4ad24jo77878kndvg69p4hjaje.apps.googleusercontent.com",
        clientSecret: "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",
        callbackURL: "http://localhost:3000/google/callback"
    },
    function (accessToken, refreshToken, profile, done) {
        return done(null, profile);
    }
));