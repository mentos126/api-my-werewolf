const express = require('express')
const app = express.Router()
const repository = require('../repositories/MeetingRepository')

app.get('/test', (req, res) => {
  repository.createTest()
    .then(meeting => res.json(meeting))
    .catch(error => console.log(error))
})

app.get('/:id', (req, res) => {
  repository.findByIdentifier(req.params.id)
    .then(meeting => res.json(meeting))
    .catch(error => console.log(error))
})

app.post('/', (req, res) => {
  const author = req.body.player
  repository.create(author)
    .then(meeting => res.json(meeting))
    .catch(error => console.log(error))
})

app.get('/:id/player/:player/is-contributor', (req, res) => {
  const { id, player } = req.params
  repository.findByIdentifier(id)
    .then(meeting => {
      res.json(meeting.author === player)
    })
    .catch(error => console.log(error))
})

app.delete('/:id', (req, res) => {
  const { id } = req.params
  repository.deleteById(id)
    .then(() => res.status(200).json([]))
    .catch(error => console.log(error))
})

app.put('/:id', (req, res) => {
  const { id } = req.params
  const meeting = {
    players: req.body.players,
    attributedRoles: req.body.attributedRoles
  }
  repository.updateById(id, meeting)
    .then(() => res.status(200).json([]))
    .catch(error => console.log(error))
})

module.exports = app
