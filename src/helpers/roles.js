const shuffle = require('lodash.shuffle')

const ROLES = {
  CLAIRVOYANT: 'clairvoyant',
  CUPID: 'cupid',
  HUNTER: 'hunter',
  LITTLE_GIRL: 'little-girl',
  THIEF: 'thief',
  VILLAGER: 'villager',
  WEREWOLF: 'werewolf',
  WITCH: 'witch',
  CAPTAIN: 'captain'
}

const getRolesByPlayersLength = playersLength => {
  if (playersLength > 18 || playersLength < 6) {
    return false
  }

  const roles = []
  let werewolfIterations = 2
  for (const role in ROLES) {
    switch (role) {
      case 'CLAIRVOYANT':
        roles.push(ROLES.CLAIRVOYANT)
        break
      case 'CUPID':
        if (playersLength > 8) {
          roles.push(ROLES.CUPID)
        }
        break
      case 'HUNTER':
        if (playersLength > 8) {
          roles.push(ROLES.HUNTER)
        }
        break
      case 'LITTLE_GIRL':
        if (
          playersLength > 15 ||
          playersLength === 10 ||
          playersLength === 12 ||
          playersLength === 14
        ) {
          roles.push(ROLES.LITTLE_GIRL)
        }
        break
      case 'THIEF':
        if (playersLength > 11) {
          roles.push(ROLES.THIEF)
        }
        break
      case 'WEREWOLF':
        if (playersLength > 11) {
          werewolfIterations = 3
        }
        if (playersLength > 16) {
          werewolfIterations = 4
        }
        for (let i = 0; i < werewolfIterations; i++) {
          roles.push(ROLES.WEREWOLF)
        }
        break
    }
  }
  const initialLength = roles.length
  for (let i = initialLength; i < playersLength; i++) {
    roles.push(ROLES.VILLAGER)
  }

  return roles
}

exports.roles = ROLES

exports.canHaveCaptain = playersLength => playersLength < 9

exports.shufflePlayerRole = players => {
  const roles = shuffle(getRolesByPlayersLength(players.length))
  players.map((player, index) => {
    player.role = roles[index]
    player.death = false
  })
  return players
}
