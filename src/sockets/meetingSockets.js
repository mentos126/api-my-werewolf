const shuffle = require('lodash.shuffle')
const repository = require('../repositories/MeetingRepository')
const { mostFrequent } = require('../helpers/frequency')
const { messages } = require('../helpers/messages')
const { canHaveCaptain, roles, shufflePlayerRole } = require('../helpers/roles')
const { getNextRegularStep, diePLayers } = require('../helpers/game')
const { meetingStatus, playerInPlayers, hasRole, playerHasRole, generateStep } = require('../helpers/meeting')

exports.meetingSockets = (socket, io) => {
  socket.on('getMeetingPlayers', ({ meetingIdentifier, player }) => {
    repository.findByIdentifier(meetingIdentifier)
      .then(meeting => {
        if (
          meeting &&
          player &&
          !playerInPlayers(meeting.players, player._id) &&
          meeting.status === meetingStatus.INITIALIZED
        ) {
          const newPlayerList = [...meeting.players, player]
          io.to(meeting.identifier).emit('getPlayers', newPlayerList)
          repository.updateById(meeting._id, { players: newPlayerList }).then(res => res)
        } else {
          io.to(meeting.identifier).emit('getPlayers', meeting.players)
        }
      })
  })

  socket.on('deleteMeetingPlayer', ({ meetingIdentifier, player }) => {
    repository.findByIdentifier(meetingIdentifier)
      .then(meeting => {
        if (meeting && meeting.status === meetingStatus.INITIALIZED) {
          if (playerInPlayers(meeting.players, player._id)) {
            const newPlayerList = meeting.players.filter(p => p._id !== player._id)
            io.to(meeting.identifier).emit(newPlayerList)
            repository.updateById(meeting._id, { players: newPlayerList }).then(res => res)
          } else {
            io.to(meeting.identifier).emit('getPlayers', meeting.players)
          }
        }
      })
      .finally(() => { io.to(meetingIdentifier).emit('getPlayers', player) })
  })

  socket.on('launchGame', ({ meetingIdentifier }) => {
    repository.findByIdentifier(meetingIdentifier)
      .then(meeting => {
        const hasCaptain = canHaveCaptain(meeting.players.length)
        const steps = [generateStep('leader', '*', messages.INSTALLATION)]

        const newMeeting = {
          author: meeting.author,
          status: meetingStatus.STARTED,
          identifier: meeting.identifier,
          players: shufflePlayerRole(meeting.players),
          hasCaptain,
          steps,
          counter: [],
          selection: [],
          cupid: [],
          witch: ['healing', 'poison'],
          captain: '',
          inWaiting: []
        }
        io.to(meetingIdentifier).emit('launchGame')
        repository.updateById(meeting._id, newMeeting).then(res => res)
      })
  })

  socket.on('gameInit', ({ token, meetingIdentifier }) => {
    repository.findByIdentifier(meetingIdentifier)
      .then(meeting => {
        if (meeting.steps.length >= 2) {
          io.to(meetingIdentifier).emit('game', meeting)
          return
        }

        if (playerInPlayers(meeting.players, token) && !meeting.counter.includes(token)) {
          meeting.counter.push(token)
          meeting.steps[meeting.steps.length - 1].done.push(token)
        }

        if (meeting.counter.length === meeting.players.length) {
          meeting.counter = []
          meeting.selection = []
          const preNextStep = [
            generateStep('leader', '*', messages.ALL_VILLAGE_SLEEP),
            generateStep('leader', '*', messages.PREPARATION_ROUND)
          ]

          let nextStep = [
            ...preNextStep,
            generateStep('leader', roles.CLAIRVOYANT, messages.CLAIRVOYANT_UP, 'clairvoyantSelect')
          ]

          if (hasRole(meeting.players, roles.CUPID)) {
            nextStep = [
              ...preNextStep,
              generateStep('leader', roles.CUPID, messages.CUPID_UP, 'cupidSelect')
            ]
          }

          if (hasRole(meeting.players, roles.THIEF)) {
            nextStep = [
              ...preNextStep,
              generateStep('leader', roles.THIEF, messages.THIEF_UP, 'thiefSelect')
            ]
          }

          if (meeting.hasCaptain) {
            nextStep = [generateStep('leader', '*', messages.SELECT_CAPTAIN, 'selectCaptain')]
          }

          meeting.steps = [...meeting.steps, ...nextStep]
        }

        io.to(meetingIdentifier).emit('game', meeting)
        repository.updateById(meeting._id, meeting).then(res => res)
      })
  })

  socket.on('selectCaptain', ({ token, meetingIdentifier, players }) => {
    repository.findByIdentifier(meetingIdentifier)
      .then(meeting => {
        if (playerInPlayers(meeting.players, token) && !meeting.counter.includes(token)) {
          meeting.counter.push(token)
          meeting.steps[meeting.steps.length - 1].done.push(token)
          const selectedCaptain = players[0]
          meeting.selection.push(selectedCaptain._id)
          meeting.steps[meeting.steps.length - 1].percent = Math.floor(meeting.selection.length * 100 / meeting.players.length)
        }

        if (meeting.counter.length === meeting.players.length) {
          meeting.captain = shuffle(mostFrequent(meeting.selection))[0]
          const player = meeting.players.find(p => p._id === meeting.captain)

          io.to(meetingIdentifier).emit('resultAction', {
            for: '*',
            action: messages.YOUR_CAPTAIN_IS,
            player,
            players: null,
            resume: null,
            showPartners: null
          })

          meeting.counter = []
          meeting.selection = []
          const preNextStep = [
            generateStep('leader', '*', messages.YOUR_CAPTAIN_IS, false, player),
            generateStep('leader', '*', messages.ALL_VILLAGE_SLEEP),
            generateStep('leader', '*', messages.PREPARATION_ROUND)
          ]

          let nextStep = generateStep('leader', roles.CLAIRVOYANT, messages.CLAIRVOYANT_UP, 'clairvoyantSelect')

          if (hasRole(meeting.players, roles.CUPID)) {
            nextStep = generateStep('leader', roles.CUPID, messages.CUPID_UP, 'cupidSelect')
          }

          if (hasRole(meeting.players, roles.THIEF)) {
            nextStep = generateStep('leader', roles.THIEF, messages.THIEF_UP, 'thiefSelect')
          }

          meeting.steps = [...meeting.steps, ...preNextStep, nextStep]
        }

        io.to(meetingIdentifier).emit('game', meeting)
        repository.updateById(meeting._id, meeting).then(res => res)
      })
  })

  // TODO add action ==> thiefSelect, cupidSelect and showCupidSelect

  socket.on('clairvoyantSelect', ({ token, meetingIdentifier, players }) => {
    repository.findByIdentifier(meetingIdentifier)
      .then(meeting => {
        if (playerInPlayers(meeting.players, token) && !meeting.counter.includes(token) && playerHasRole(meeting.players, token, 'clairvoyant')) {
          meeting.counter.push(token)
          meeting.steps[meeting.steps.length - 1].done.push(token)
          meeting.steps[meeting.steps.length - 1].percent = meeting.counter.length * 100 / 1
        }

        if (meeting.steps[meeting.steps.length - 1].percent >= 100) {
          meeting.counter = []
          meeting.selection = []
          const player = players[0]
          io.to(meetingIdentifier).emit('resultAction', {
            for: 'clairvoyant',
            action: messages.SELECTED_PLAYER,
            player: meeting.players.find(p => p._id === player._id),
            players: null,
            resume: null,
            showPartners: null
          })

          const preNextStep = [
            {
              writer: 'leader',
              to: '*',
              message: messages.CLAIRVOYANT_SELECT,
              action: false,
              percent: 0,
              done: []
            },
            {
              writer: 'leader',
              to: '*',
              message: messages.CLAIRVOYANT_SLEEP,
              action: false,
              percent: 0,
              done: []
            }
          ]

          meeting.steps = [...meeting.steps, ...preNextStep, ...getNextRegularStep(io, meeting, 'clairvoyantSelect')]
        }

        io.to(meetingIdentifier).emit('game', meeting)
        repository.updateById(meeting._id, meeting).then(res => res)
      })
  })

  socket.on('werewolfSelect', ({ token, meetingIdentifier, players }) => {
    repository.findByIdentifier(meetingIdentifier)
      .then(meeting => {
        if (playerInPlayers(meeting.players, token) && !meeting.counter.includes(token) && playerHasRole(meeting.players, token, 'werewolf')) {
          meeting.counter.push(token)
          meeting.steps[meeting.steps.length - 1].done.push(token)
          meeting.steps[meeting.steps.length - 1].percent = Math.floor(meeting.counter.length * 100 / meeting.players.filter(p => !p.death && p.role === 'werewolf').length)
          const selectedPlayer = players[0]
          meeting.selection.push(selectedPlayer._id)
        }

        if (meeting.steps[meeting.steps.length - 1].percent >= 100) {
          const playerSelected = shuffle(mostFrequent(meeting.selection))[0]
          const player = meeting.players.find(p => p._id === playerSelected)
          meeting.counter = []
          meeting.selection = []

          io.to(meetingIdentifier).emit('resultAction', {
            for: 'werewolf',
            action: messages.WEREWOLF_DEAD,
            player,
            players: null,
            resume: null,
            showPartners: null
          })

          meeting.inWaiting.push({
            from: 'werewolf',
            selected: player
          })

          const preNextStep = [
            generateStep('leader', '*', messages.WEREWOLF_SELECT),
            generateStep('leader', '*', messages.WEREWOLVES_SLEEP)
          ]

          meeting.steps = [...meeting.steps, ...preNextStep, ...getNextRegularStep(io, meeting, 'werewolfSelect')]
        }

        io.to(meetingIdentifier).emit('game', meeting)
        repository.updateById(meeting._id, meeting).then(res => res)
      })
  })

  // ! TODO WITCH

  socket.on('voteSelect', ({ token, meetingIdentifier, players }) => {
    repository.findByIdentifier(meetingIdentifier)
      .then(meeting => {
        if (playerInPlayers(meeting.players, token) && !meeting.counter.includes(token)) {
          meeting.counter.push(token)
          meeting.steps[meeting.steps.length - 1].done.push(token)
          meeting.steps[meeting.steps.length - 1].percent = Math.floor(meeting.counter.length * 100 / meeting.players.filter(p => !p.death).length)
          const selectedPlayer = players[0]
          meeting.selection.push(selectedPlayer._id)
          if (meeting.captain === token) {
            meeting.selection.push(selectedPlayer._id)
          }
        }

        if (meeting.steps[meeting.steps.length - 1].percent >= 100) {
          const playersSelected = mostFrequent(meeting.selection)
          meeting.counter = []
          meeting.selection = []
          let preNextStep = []

          if (playersSelected.length === 1) {
            const playerSelected = meeting.players.find(p => p._id === playersSelected[0])
            io.to(meetingIdentifier).emit('resultAction', {
              for: '*',
              action: messages.DEAD,
              player: playerSelected,
              players: null,
              resume: null,
              showPartners: null
            })

            meeting.inWaiting.push({
              from: '*',
              selected: playerSelected
            })

            let endSteps = diePLayers(io, meeting, playerSelected, messages.DEAD)
            if (!endSteps) {
              endSteps = [...getNextRegularStep(io, meeting, 'voteSelect')]
            }

            preNextStep = [
              generateStep('leader', '*', messages.DEAD, false, playerSelected),
              ...endSteps
            ]
            meeting.inWaiting = []
          } else {
            const players = meeting.players.filter(p => playersSelected.includes(p._id))
            io.to(meetingIdentifier).emit('resultAction', {
              for: '*',
              action: messages.PLAYERS_EQUALITY,
              player: null,
              players,
              resume: null,
              showPartners: players
            })

            preNextStep = [generateStep('leader', '*', messages.PLAYERS_EQUALITY, false, null, players)]

            if (meeting.hasCaptain) {
              preNextStep.push(generateStep('leader', roles.CAPTAIN, messages.CAPTAIN_SELECT, 'captainSelect', null, players))
            } else {
              preNextStep.push(generateStep('leader', '*', messages.RE_VOTE_SELECT, 'reVoteSelect', null, players))
            }
          }

          meeting.steps = [...meeting.steps, ...preNextStep]
        }

        io.to(meetingIdentifier).emit('game', meeting)
        repository.updateById(meeting._id, meeting).then(res => res)
      })
  })

  socket.on('captainSelect', ({ token, meetingIdentifier, players }) => {
    repository.findByIdentifier(meetingIdentifier)
      .then(meeting => {
        if (playerInPlayers(meeting.players, token) && !meeting.counter.includes(token) && meeting.captain === token) {
          meeting.counter.push(token)
          meeting.steps[meeting.steps.length - 1].done.push(token)
          meeting.steps[meeting.steps.length - 1].percent = Math.floor(meeting.counter.length * 100 / 1)
          const selectedPlayer = players[0]
          meeting.selection.push(selectedPlayer._id)
        }

        if (meeting.steps[meeting.steps.length - 1].percent >= 100) {
          const playerSelected = meeting.selection[0]
          meeting.counter = []
          meeting.selection = []

          io.to(meetingIdentifier).emit('resultAction', {
            for: '*',
            action: messages.CAPTAIN_SELECT,
            player: playerSelected,
            players: null,
            resume: null,
            showPartners: null
          })

          meeting.inWaiting.push({
            from: '*',
            selected: playerSelected
          })

          let endSteps = diePLayers(io, meeting, playerSelected, messages.CAPTAIN_SELECT)
          if (!endSteps) {
            endSteps = [...getNextRegularStep(io, meeting, 'voteSelect')]
          }

          const preNextStep = [
            generateStep('leader', '*', messages.DEAD, false, playerSelected),
            ...endSteps
          ]
          meeting.inWaiting = []

          meeting.steps = [...meeting.steps, ...preNextStep]
        }

        io.to(meetingIdentifier).emit('game', meeting)
        repository.updateById(meeting._id, meeting).then(res => res)
      })
  })

  socket.on('reVoteSelect', ({ token, meetingIdentifier, players }) => {
    repository.findByIdentifier(meetingIdentifier)
      .then(meeting => {
        if (playerInPlayers(meeting.players, token) && !meeting.counter.includes(token)) {
          meeting.counter.push(token)
          meeting.steps[meeting.steps.length - 1].done.push(token)
          meeting.steps[meeting.steps.length - 1].percent = Math.floor(meeting.counter.length * 100 / meeting.players.filter(p => !p.death).length)
          const selectedPlayer = players[0]
          meeting.selection.push(selectedPlayer._id)
          if (meeting.captain === token) {
            meeting.selection.push(selectedPlayer._id)
          }
        }

        if (meeting.steps[meeting.steps.length - 1].percent >= 100) {
          const playersSelected = mostFrequent(meeting.selection)
          meeting.counter = []
          meeting.selection = []
          let preNextStep = []

          if (playersSelected.length === 1) {
            const playerSelected = meeting.players.find(p => p._id === playersSelected[0])
            io.to(meetingIdentifier).emit('resultAction', {
              for: '*',
              action: messages.DEAD,
              player: playerSelected,
              players: null,
              resume: null,
              showPartners: null
            })

            meeting.inWaiting.push({
              from: '*',
              selected: playerSelected
            })

            let endSteps = diePLayers(io, meeting, playerSelected, messages.DEAD)
            if (!endSteps) {
              endSteps = [...getNextRegularStep(io, meeting, 'reVoteSelect')]
            }

            preNextStep = [
              generateStep('leader', '*', messages.DEAD, false, playerSelected),
              ...endSteps
            ]
            meeting.inWaiting = []
          } else {
            io.to(meetingIdentifier).emit('resultAction', {
              for: '*',
              action: messages.NO_SOLUTION,
              player: null,
              players,
              resume: null,
              showPartners: players
            })

            preNextStep = [
              generateStep('leader', '*', messages.NO_SOLUTION, false, null, players),
              ...getNextRegularStep(io, meeting, 'reVoteSelect')
            ]
          }

          meeting.steps = [...meeting.steps, ...preNextStep]
        }

        io.to(meetingIdentifier).emit('game', meeting)
        repository.updateById(meeting._id, meeting).then(res => res)
      })
  })

  // ! TODO HUNTER

  socket.on('changeCaptain', ({ token, meetingIdentifier, players }) => {
    repository.findByIdentifier(meetingIdentifier)
      .then(meeting => {
        if (playerInPlayers(meeting.players, token) && !meeting.counter.includes(token)) {
        }

        if (meeting.steps[meeting.steps.length - 1].percent >= 100) {
        }

        io.to(meetingIdentifier).emit('game', meeting)
        repository.updateById(meeting._id, meeting).then(res => res)
      })
  })

  socket.on('joinRoom', room => socket.join(room))

  socket.on('leaveRoom', room => socket.leave(room))
}
