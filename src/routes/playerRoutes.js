const express = require('express')
const app = express.Router()
const repository = require('../repositories/PlayerRepository')

app.get('/', (req, res) => {
  repository.findAll()
    .then(players => res.json(players))
    .catch(error => console.log(error))
})

app.get('/:id', (req, res) => {
  const { id } = req.params
  repository.findById(id)
    .then(player => res.json(player))
    .catch(error => console.log(error))
})

app.post('/', (req, res) => {
  const { username, picture } = req.body
  repository.create(username, picture)
    .then(player => res.json(player))
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
  const player = {
    token: req.body.token,
    username: req.body.username,
    picture: req.body.picture,
    role: req.body.role
  }
  repository.updateById(id, player)
    .then(() => res.status(200).json([]))
    .catch(error => console.log(error))
})

module.exports = app
