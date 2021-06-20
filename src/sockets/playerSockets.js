const repository = require('../repositories/PlayerRepository')

exports.playerSockets = (socket, io) => {
  socket.on('test', player => {
    repository.findAll()
      .then(players => {
        io.emit('test', [...players, player])
      })
  })
}
