const mongoose = require('mongoose')
const { Schema } = mongoose

const playerSchema = new Schema({
  username: {
    type: String
  },
  picture: {
    type: String
  }
})

const Player = mongoose.model('Player', playerSchema)

module.exports = Player
