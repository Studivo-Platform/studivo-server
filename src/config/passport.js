const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User }       = require('../models/User');
const { env }        = require('./env');

passport.use(
    new GoogleStrategy({
        clientID:     env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL:  env.GOOGLE_CALLBACK_URL,
    },
    
    async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails[0].value;
            const name  = profile.displayName;
            const photo = profile.photos[0]?.value || null;

            // Check if user already exists with this email
            let user = await User.findOne({ email });

            if (user) {
            // User exists (maybe registered with email/password before)
            // Just log them in — no need to create a new account
            return done(null, user);
            }

            // First time Google login — create account automatically
            // No password needed for Google users
            user = await User.create({
                name,
                email,
                password:     require('crypto').randomBytes(32).toString('hex'), // Random password — they use Google to login
                role:         'student',
                profileImage: photo,
                isVerified:   true,   // Google already verified their email
                googleId:     profile.id,
            });

            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    })
);

module.exports = passport;