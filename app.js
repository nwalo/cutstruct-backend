require('dotenv').config()
const bodyParser = require('body-parser')
const express = require('express')
const session = require('express-session')
const https = require('https')
const cors = require('cors')
const _ = require('lodash')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const mongoose = require('mongoose')
const findOrCreate = require('mongoose-findorcreate')

// INITIALIZE MALWARES

const app = express()
app.use(express.json())
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  }),
)
app.use(passport.initialize())
app.use(passport.session())

// DATABASE CONNECTION - MONGODB

// mongoose.connect(process.env.MONGO_URL, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })

mongoose.connect('mongodb://localhost:27017/blarkMateDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

// SCHEMA DEFINITIONS

const userSchema = new mongoose.Schema({
  username: String,
  lastName: String,
  firstName: String,
  gender: String,
  country: String,
  phone: Number,
})

userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)

// MODEL DEFINITIONS

const User = mongoose.model('User', userSchema)

passport.use(User.createStrategy())

// GLOBAL SERIALIZATION

passport.serializeUser(function (user, done) {
  done(null, user.id)
})

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user)
  })
})

app.get('/', (req, res) => {
  res.send('BLARKMATE SERVER IS RUNNING ... ')
})

app.post('/login', function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  })

  passport.authenticate('local', function (err, user, info) {
    if (err) {
      res.send({ status: 401, reason: err })
      return
    } else {
      req.logIn(user, function (error, resp) {
        //This creates a log in session
        if (error) {
          res.send({ status: 401, reason: 'Invalid username or password' })
        } else {
          res.send({ status: 200 })
        }
      })
    }
  })(req, res)
})

app.get('/logout', function (req, res) {
  req.logout()
  res.redirect('/login')
})

app.post('/newsletter-reg', function (req, res) {
  const email = req.body.email_reg
  const data = {
    members: [
      {
        email_address: email,
        status: 'subscribed',
        merge_fields: {
          FNAME: req.body.firstname_reg,
        },
      },
    ],
  }

  const jsonData = JSON.stringify(data)

  let url = process.env.AUDIENCE_ID
  let options = {
    method: 'POST',
    auth: process.env.MAILCHIMP_API,
  }

  const request = https.request(url, options, function (response) {
    if (response.statusCode === 200) {
      res.send({ status: response.statusCode })
      console.log(response.statusCode)
    } else {
      console.log(response.statusCode)
      res.send({
        status: response.statusCode,
        reason: 'Unable to add user to newsletter',
      })
    }
  })

  request.write(jsonData)
  request.end()
})

app.post('/newsletter', function (req, res) {
  const email = req.body.email
  const data = {
    members: [
      {
        email_address: email,
        status: 'subscribed',
        // merge_fields: {
        // 	FNAME: fName,
        // 	LNAME: lName
        // }
      },
    ],
  }

  const jsonData = JSON.stringify(data)

  let url = process.env.AUDIENCE_ID
  let options = {
    method: 'POST',
    auth: process.env.MAILCHIMP_API,
  }

  const request = https.request(url, options, function (response) {
    if (response.statusCode === 200) {
      res.send({ status: response.statusCode })
      console.log(response.statusCode)
    } else {
      console.log(response.statusCode)
      res.send({
        status: response.statusCode,
        reason: 'Unable to add user to newsletter',
      })
    }
  })

  request.write(jsonData)
  request.end()
})

app.post('/register', function (req, res) {
  User.register(
    {
      username: req.body.username,
    },
    req.body.password,
    function (err) {
      if (err) {
        console.log('err')
        res.send({ status: 401, reason: err })
        // res.send(401)
        // res.render('register', {
        //   errorMsg: 'Error ! User registration failed.',
        //   title: 'Register',
        // })
      } else {
        passport.authenticate('local')(req, res, function () {
          User.updateOne(
            {
              _id: req.user.id,
            },
            {
              firstName: _.capitalize(req.body.firstName),
              lastName: _.capitalize(req.body.lastName),
              gender: _.capitalize(req.body.gender),
              country: _.capitalize(req.body.country),
              phone: req.body.phone,
            },
            function (err) {
              if (!err) {
                console.log('registered')
                res.send({ status: 200 })

                // // LOG IN USER AFTER REGISTRATION
                // const user = new User({
                //   username: req.body.username,
                //   password: req.body.password,
                // })

                // passport.authenticate('local', function (err, user, info) {
                //   if (err) {
                //     console.log(err)
                //     res.redirect('/register')
                //   }
                //   if (!user) {
                //     return res.render('login', {
                //       errorMsg: 'Invalid username or password !',
                //       title: 'Login',
                //     })
                //   }

                //   req.logIn(user, function (err) {
                //     if (err) {
                //       console.log(err)
                //     } else {
                //       res.redirect('/enroll/80_solo_techniques')
                //     }
                //   })
                // })(req, res)
              } else {
                res.send({ status: 401, reason: err })
              }
            },
          )
          // res.redirect('/login');
        })
      }
    },
  )
})

let port = process.env.PORT
if (port == null || port == '') {
  port = 7777
}

app.listen(port, function () {
  console.log('server running at port ' + port)
})
