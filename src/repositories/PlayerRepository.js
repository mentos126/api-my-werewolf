const Player = require('../models/Player')

class PlayerRepository {
  constructor (model) {
    this.model = model
  }

  create (username, picture) {
    const newPLayer = {
      username,
      picture
    }
    const player = new Player(newPLayer)

    return player.save()
  }

  findAll () {
    return this.model.find()
  }

  findById (id) {
    return this.model.findById(id)
  }

  deleteById (id) {
    return this.model.findByIdAndDelete(id)
  }

  updateById (id, player) {
    const query = { _id: id }
    return this.model.findOneAndUpdate(query, {
      $set: player
    })
  }
}

module.exports = new PlayerRepository(Player)
