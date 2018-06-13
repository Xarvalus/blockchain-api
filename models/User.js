import bcrypt from 'bcrypt-nodejs'
import mongoose from 'mongoose'
import { Ed25519Keypair } from 'bigchaindb-driver'

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  passwordResetToken: String,
  passwordResetExpires: Date,

  tokens: Array,

  profile: {
    name: String,
    gender: String,
    location: String,
    website: String,
    picture: String
  }
}, { timestamps: true })

/**
 * Password hash middleware.
 */
userSchema.pre('save', function save(next) {
  const user = this
  if (!user.isModified('password')) { return next() }
  bcrypt.genSalt(10, (err, salt) => {
    if (err) { return next(err) }
    bcrypt.hash(user.password, salt, null, (err, hash) => {
      if (err) { return next(err) }
      user.password = hash
      next()
    })
  })
})

/**
 * Helper method for validating user's password.
 */
userSchema.methods.comparePassword = function comparePassword(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    cb(err, isMatch)
  })
}

/**
 * Fake users collection, persistent within single running of App
 */
const users = {}

/**
 * Return public and private keys of user
 *
 * NOTE: Potentially stored in some safe client (eg similar approach to wallets)
 * on user side or within app database and secured by passphrase supplied by user.
 * Decision shall be made by experienced team of security experts.
 */
userSchema.methods.userKeys = function userKeys(user: string): Ed25519Keypair {
  if (!users[user]) {
    users[user] = new Ed25519Keypair()
  }

  return users[user]
}

const User = mongoose.model('User', userSchema)

module.exports = User
