import express from 'express'
import cors from 'cors'
// $FlowFixMe
import graphqlHTTP from 'express-graphql'
// $FlowFixMe
import { buildSchema } from 'graphql'
import compression from 'compression'
import session from 'express-session'
import bodyParser from 'body-parser'
import logger from 'morgan'
import chalk from 'chalk'
import errorHandler from 'errorhandler'
import lusca from 'lusca'
import dotenv from 'dotenv'
import path from 'path'
import mongoose from 'mongoose'
import { Connection } from 'bigchaindb-driver'
import passport from 'passport'
import expressValidator from 'express-validator'
import expressStatusMonitor from 'express-status-monitor'

const MongoStore = require('connect-mongo')(session)

/**
 * Load environment variables from .env file, where API keys and passwords are configured
 */
dotenv.load({ path: '.env' })

/**
 * Controllers (route handlers)
 */
/* eslint-disable import/first */
import userController from './controllers/user'
import apiController from './controllers/api'
import blockchainController from './controllers/blockchain'
/* eslint-enable import/first */

/**
 * API keys and Passport configuration
 */
import passportConfig from './config/passport' // eslint-disable-line import/first

/**
 * Create Express server
 */
const app = express()
app.use(cors({ origin: process.env.CORS_FRONTEND_URL, optionsSuccessStatus: 200 }))

/**
 * Connect to MongoDB
 */
mongoose.Promise = global.Promise
mongoose.connect(process.env.MONGODB_URI)
mongoose.connection.on('error', (err) => {
  console.error(err)
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'))
  process.exit()
})

// @TODO should *not* be initialized as `global` variable
/**
 * Connect to BigchainDB
 */
global.bigchaindb = new Connection(process.env.BIGCHAINDB_URI)

/**
 * Express configuration
 */
app.set('host', '0.0.0.0')
app.set('port', process.env.PORT || 8080)
app.use(expressStatusMonitor())
app.use(compression())
app.use(logger('dev'))
app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }))
app.use(expressValidator())
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  store: new MongoStore({
    url: process.env.MONGODB_URI,
    autoReconnect: true,
    clear_interval: 3600
  })
}))
app.use(passport.initialize())
app.use(passport.session())

// @TODO CSRF protection (although notably important) is out of scope of PoC application
// app.use((req, res, next) => {
//   if (req.path === '/api/upload') {
//     next()
//   } else {
//     lusca.csrf()(req, res, next)
//   }
// })

app.use(lusca.xframe('SAMEORIGIN'))
app.use(lusca.xssProtection(true))
// $FlowFixMe
app.use((req, res, next) => {
  res.locals.user = req.user
  next()
})
// $FlowFixMe
app.use((req, res, next) => {
  // After successful login, redirect back to the intended page
  if (!req.user &&
      req.path !== '/login' &&
      req.path !== '/signup' &&
      !req.path.match(/^\/auth/) &&
      !req.path.match(/\./)) {
    req.session.returnTo = req.path
  } else if (req.user &&
      req.path === '/account') {
    req.session.returnTo = req.path
  }
  next()
})
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }))

/**
 * Primary app routes
 */
// $FlowFixMe
app.get('/', (req, res) => res.status(200).send({ status: 'Working!' }))

// @TODO rewrite into GraphQL instead of API endpoints
app.get('/transactions', blockchainController.getTransactions)
app.post('/create-transaction', blockchainController.postCreateTransaction)
app.post('/transfer-transaction', blockchainController.postTransferTransaction)
app.get('/asset/:id', blockchainController.getAsset)

app.get('/login', userController.getLogin)
app.post('/login', userController.postLogin)
app.get('/logout', userController.logout)
app.get('/forgot', userController.getForgot)
app.post('/forgot', userController.postForgot)
app.get('/reset/:token', userController.getReset)
app.post('/reset/:token', userController.postReset)
app.get('/signup', userController.getSignup)
app.post('/signup', userController.postSignup)
app.get('/account', passportConfig.isAuthenticated, userController.getAccount)
app.post('/account/profile', passportConfig.isAuthenticated, userController.postUpdateProfile)
app.post('/account/password', passportConfig.isAuthenticated, userController.postUpdatePassword)
app.post('/account/delete', passportConfig.isAuthenticated, userController.postDeleteAccount)
app.get('/account/unlink/:provider', passportConfig.isAuthenticated, userController.getOauthUnlink)


/**
 * GraphQL
 */
const schema = buildSchema(`
  type Query {
    hello: String
  }
`)

const root = { hello: (): string => 'Hello world!' }

app.use('/graphql', graphqlHTTP({
  schema,
  rootValue: root,
  graphiql: true,
}))

/**
 * API examples routes
 */
app.get('/api', apiController.getApi)

/**
 * Error Handler
 */
app.use(errorHandler())

/**
 * Start Express server
 */
app.listen(app.get('port'), () => {
  console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env'))
  console.log('  Press CTRL-C to stop\n')
})

module.exports = app
