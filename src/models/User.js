const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type:     String,
        required: [true, 'Name is required'],
        trim:     true,
        minlength: [2,  'Name must be at least 2 characters'],
        maxlength: [50, 'Name must be at most 50 characters'],
    },

    email: {
        type:      String,
        required:  [true, 'Email is required'],
        unique:    true,
        trim:      true,
        match: [
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            'Please provide a valid email address',
        ],
    },

    password: {
        type:      String,
        required:  [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select:    false,
    },

    role: {
        type:    String,
        enum:    ['student', 'seller', 'admin'],
        default: 'student',
    },

    university: {
        type:  String,
        trim:  true,
    },

    phone: {
        type:  String,
        trim:  true,
    },

    profileImage: {
        type:    String,
        default: null,
    },

    isVerified: {
        type:    Boolean,
        default: false,
    },

    isActive: {
        type:    Boolean,
        default: true,
    },

    verificationToken: {
        type:   String,
        select: false,
    },

    verificationTokenExpires: {
        type:   Date,
        select: false,
    },

    resetPasswordToken: {
        type:   String,
        select: false,
    },
    resetPasswordExpires: {
        type:   Date,
        select: false,
    },

    googleId: {
        type:   String,
        default: null,
        select: false,
    },

    refreshTokens: {
        type:   [String],
        select: false,
    },
},
    {
        timestamps: true,
    }
);

//  Indexes
userSchema.index({ role: 1 });   // Faster queries when filtering by role

//  Pre-save Hook
// Runs before every .save() call — hashes password if it was changed
userSchema.pre('save', async function () {
    // Only hash if password field was modified (not on every update)

    if (!this.isModified('password')) {
        return;
    }

    const SALT_ROUNDS = 12;
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

// Instance Methods
// comparePassword: used during login to verify the entered password
userSchema.methods.comparePassword = async function (candidatePassword) {
    // 'this.password' is not selected by default, so we need to explicitly select it
    return bcrypt.compare(candidatePassword, this.password);

};

// toJSON: remove sensitive fields when converting to JSON
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.verificationToken;
    delete obj.verificationTokenExpires;
    delete obj.resetPasswordToken;
    delete obj.resetPasswordExpires;
    delete obj.refreshTokens;
    delete obj.__v;
    return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = { User };