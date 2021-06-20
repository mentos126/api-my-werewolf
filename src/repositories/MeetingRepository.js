const Meeting = require('../models/Meeting')
const { meetingStatus } = require('../helpers/meeting')

class PlayerRepository {
  constructor (model) {
    this.model = model
  }

  create (author) {
    const newMeeting = {
      author,
      status: meetingStatus.INITIALIZED,
      players: [],
      hasCaptain: true,
      captain: '',
      cupid: [],
      witch: [],
      steps: [],
      counter: [],
      selection: [],
      inWaiting: []
    }
    const meeting = new Meeting(newMeeting)

    return meeting.save()
  }

  createTest () {
    const newMeeting = {
      author: {
        _id: '1',
        picture: '1.png',
        username: '1',
        role: 'werewolf'
      },
      status: meetingStatus.STARTED,
      players: [
        {
          _id: '1',
          picture: '1.png',
          username: '1',
          role: 'werewolf'
        },
        {
          _id: '2',
          picture: '2.png',
          username: '2',
          role: 'werewolf'
        },
        {
          _id: '3',
          picture: '3.png',
          username: '3',
          role: 'werewolf'
        },
        {
          _id: '4',
          picture: '4.png',
          username: '4',
          role: 'werewolf'
        },
        {
          _id: '5',
          picture: '5.png',
          username: '5',
          role: 'werewolf'
        },
        {
          _id: '6',
          picture: '6.png',
          username: '6',
          role: 'werewolf'
        },
        {
          _id: '7',
          picture: '7.png',
          username: '7',
          role: 'werewolf'
        },
        {
          _id: '8',
          picture: '8.png',
          username: '8',
          role: 'werewolf'
        },
        {
          _id: '9',
          picture: '9.png',
          username: '9',
          role: 'werewolf'
        },
        {
          _id: '10',
          picture: '10.png',
          username: '10',
          role: 'werewolf'
        },
        {
          _id: '11',
          picture: '11.png',
          username: '11',
          role: 'werewolf'
        }
      ],
      hasCaptain: true,
      captain: '',
      steps: [],
      counter: [],
      selection: [],
      inWaiting: []
    }
    const meeting = new Meeting(newMeeting)

    return meeting.save()
  }

  findAll () {
    return this.model.find()
  }

  findById (id) {
    return this.model.findById(id)
  }

  findByIdentifier (identifier) {
    return this.model.findOne({ identifier })
  }

  deleteById (id) {
    return this.model.findByIdAndDelete(id)
  }

  updateById (id, meeting) {
    const query = { _id: id }
    return this.model.findOneAndUpdate(query, {
      $set: meeting
    })
  }
}

module.exports = new PlayerRepository(Meeting)
