const { hasRole, generateStep } = require('./meeting')
const { messages } = require('./messages')
const { roles } = require('./roles')

exports.getNextRegularStep = (io, meeting, actualStep) => {
  // * voyante ==> regarde le role d'une carte
  // * loups garou ==> vote pour la victime
  // ! sorciere ==> voit la victime soit elle la guéri et/ou elle décide de tuer quelqu'un
  // ! *OK NOT WITCH* village ==> voit la/les victimes
  // !    |=> mort cupidon => mort des deux
  // !    |=> mort capitaine => selectionne prochain
  // !    |=> mort chasseur => tue quelqu'un
  // ! vote ==> captain === double
  // !    |=> captain désigne si égualité
  // !    |=> si toujours égualité alors
  // !      => revote ==> puis si toujours égualité alors pas de mort
  // !    |=> révélation de la carte du mort
  // ! endormissement ==> rebelotte

  if (meeting.players.every(p => p.role === roles.WEREWOLF)) {
    return [generateStep('leader', '*', messages.WEREWOLF_WIN)]
  }

  if (meeting.players.every(p => p.role === !roles.WEREWOLF)) {
    return [generateStep('leader', '*', messages.WEREWOLF_LOOSE)]
  }

  let playerSelected = null
  let nextStep = []
  const goToVote = [
    generateStep('leader', '*', messages.DEBATE),
    generateStep('leader', '*', messages.VOTES, 'voteSelect')
  ]

  switch (actualStep) {
    case 'clairvoyantSelect':
      nextStep.push(generateStep('leader', roles.WEREWOLF, messages.WEREWOLVES_UP, 'werewolfSelect'))
      io.to(meeting.identifier).emit('resultAction', {
        for: roles.WEREWOLF,
        action: messages.WEREWOLVES_SHOW,
        player: null,
        players: null,
        resume: null,
        showPartners: meeting.players.filter(p => p.role === roles.WEREWOLF && !p.death)
      })
      break
    case 'werewolfSelect':
      playerSelected = meeting.inWaiting[0].selected
      nextStep = [
        generateStep('leader', '*', messages.MORNING),
        generateStep('leader', '*', messages.WEREWOLF_DEAD, false, playerSelected)
      ]

      if (hasRole(meeting.players, roles.WITCH)) {
        nextStep = [generateStep('leader', roles.WITCH, messages.WITCH_UP)]
      } else {
        let endSteps = this.diePLayers(io, meeting, playerSelected, messages.PLAYERS_DEAD)
        if (!endSteps) {
          endSteps = goToVote
        }
        nextStep = [...nextStep, ...endSteps]
        meeting.inWaiting = []
      }
      break
    // ! case 'witchSelect' 'hunterSelect'
    case 'voteSelect':
    case 'reVoteSelect':
    case 'captainSelect':
      nextStep = [
        generateStep('leader', '*', messages.SURVIVORS),
        generateStep('leader', '*', messages.ROUND)
      ]
      if (hasRole(meeting.players, roles.CLAIRVOYANT)) {
        nextStep.push(generateStep('leader', roles.CLAIRVOYANT, messages.CLAIRVOYANT_UP, 'clairvoyantSelect'))
      } else {
        nextStep.push(generateStep('leader', roles.WEREWOLF, messages.WEREWOLVES_UP, 'werewolfSelect'))
      }
      break
    default:
      break
  }

  return nextStep
}

exports.diePLayers = (io, meeting, playerSelected, action) => {
  io.to(meeting.identifier).emit('resultAction', {
    for: '*',
    action,
    player: null,
    players: null,
    resume: meeting.inWaiting,
    showPartners: null
  })

  meeting.players = meeting.players.map(p => {
    if (p._id === playerSelected._id) {
      p.death = true
    }
    return p
  })
  if (meeting.cupid.includes(playerSelected._id)) {
    meeting.players = meeting.players.map(p => {
      if (meeting.cupid.includes(p._id)) {
        p.death = true
      }
      return p
    })
  }

  if (playerSelected.role === 'hunter') {
    return [generateStep('leader', roles.HUNTER, messages.HUNTER_SELECT, 'hunterSelect')]
  } else if (playerSelected._id === meeting.captain) {
    return [generateStep('leader', roles.CAPTAIN, messages.CHANGE_CAPTAIN, 'changeCaptain')]
  }

  return false
}
