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
            const email = profile.emails?.[0]?.value?.toLowerCase();
            const name  = profile.displayName;
            const photo = profile.photos?.[0]?.value || null;

            if (!email) {
                return done(new Error('Google account does not expose an email address'), null);
            }

            // Google proves identity only. The app owns role/profile decisions.
            let user = await User.findOne({
                $or: [{ googleId: profile.id }, { email }],
            }).select('+googleId');

            if (user) {
                let changed = false;

                if (!user.googleId) {
                    user.googleId = profile.id;
                    changed = true;
                }

                if (!user.profileImage && photo) {
                    user.profileImage = photo;
                    changed = true;
                }

                if (user.isVerified === false) {
                    user.isVerified = true;
                    changed = true;
                }

                if (changed) {
                    await user.save({ validateBeforeSave: false });
                }

                return done(null, user);
            }

            // First Google login creates an incomplete application profile.
            user = await User.create({
                name,
                email,
                password:     require('crypto').randomBytes(32).toString('hex'),
                role:         null,
                isProfileCompleted: false,
                profileImage: photo,
                isVerified:   true,
                googleId:     profile.id,
            });

            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    })
);

module.exports = passport;
