require('dotenv').config()
const bodyParser = require('body-parser')
const express = require('express')
const https = require('https')
const cors = require('cors')

const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(Cors())

app.post('/newsletter-signup', function (req, res) {
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
      console.log('success')
      // res.send('success, user added to mail chimp')
    } else {
      console.log('error')
      // res.send('error, unable to complete request')
    }

    console.log(response.statusCode)
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
      console.log('success')
      res.send('success, user added to mail chimp')

      //   res.render('success', {
      //     message: 'Thanks for subscribing to our newsletter',
      //     emoji: 'fas fa-thumbs-up',
      //     title: ' Success Page',
      //   })
    } else {
      console.log('error')
      res.send('error, unable to complete request')
      //   res.render('success', {
      //     message: 'Sorry! unable to subscribe to our news letter',
      //     emoji: 'fa fa-thumbs-down',
      //     title: 'Error Page',
      //   })
    }

    console.log(response.statusCode)
  })

  request.write(jsonData)
  request.end()
})

app.listen(process.env.Port || '7777', () => {
  console.log('server runneer at port 7777')
})
