const passport = require('passport');
const data = require('../data/data');
const db = require('../mysql/db');
const utils = require('../utils');
const LocalSchema = require('passport-local').Strategy;

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await db.query(`SELECT * FROM users WHERE id = ${id}`);
    done(null, user[0] ?? null);
});

passport.use("login", new LocalSchema({
    usernameField: "email",
    passwordField: "password",
    passReqToCallback: true
}, async (req, email, password, done) => {
    const user = await db.query(`SELECT * FROM users WHERE email = '${email}'`);
    if (!user[0]) return done(null, false, req.flash("error", "Usuario no encontrado"));
    if (utils.decryptWithAES(data.server.encryptionKey, user[0].password) !== password) return done(null, false, req.flash("error", "Contraseña incorrecta"));
    done(null, user[0], req.flash("success", `Bienvenid@ de vuelta, ${user[0].name}`));
}));