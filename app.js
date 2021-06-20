require('dotenv').config()
const config = require('./src/config/config')
const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const mongoose = require('mongoose')
const path = require('path')
const cors = require('cors')
const meetingRoutes = require('./src/routes/meetingRoutes')
const playerRoutes = require('./src/routes/playerRoutes')
const { playerSockets } = require('./src/sockets/playerSockets')
const { meetingSockets } = require('./src/sockets/meetingSockets')

mongoose.connect(config.APP_MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
})

app.use(cors())
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.use(express.json())
app.use('/assets', express.static('public'))
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))

app.use('/meeting', meetingRoutes)
app.use('/player', playerRoutes)

try {
  io.on('connection', socket => {
    playerSockets(socket, io)
    meetingSockets(socket, io)
  })
} catch (err) {
  console.error(err)
  throw err
}

http.listen(config.APP_PORT, () => { console.log('listening on *:' + config.APP_PORT) })
