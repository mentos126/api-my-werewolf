exports.meetingStatus = {
  INITIALIZED: 0,
  STARTED: 1,
  FINISHED: 2
}

exports.playerInPlayers = (players, token) => {
  for (const p of players) {
    if (p._id === token) {
      return true
    }
  }

  return false
}

exports.hasRole = (players, role) => {
  return players.find(p => {
    return !p.death && p.role === role
  }) || false
}

exports.playerHasRole = (players, token, role) => players.find(p => p._id === token && p.role === role) || false

exports.generateStep = (writer, to, message, action = false, player = null, players = null, resume = null, percent = 0, done = []) => {
  return { writer, to, message, action, percent, done, player, players, resume }
}
