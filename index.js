const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const cors = require('cors')
const bcrypt = require('bcrypt')
require('dotenv').config()
const jwt = require('jsonwebtoken')



app.use(bodyParser.json())
app.use(cors())



mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})

const db = mongoose.connection

db.on('error', console.error.bind(console, 'MongoDB connection error:'));

db.once('open', function() {
  console.log('Connected to MongoDB cluster')
})


const currentDate = new Date();
const formattedDate = currentDate.toLocaleString('en-US', { 
  month: 'long', 
  day: 'numeric', 
  year: 'numeric', 
  hour: 'numeric', 
  minute: 'numeric', 
  second: 'numeric', 
  hour12: true 
})

console.log(formattedDate);



const Schema = mongoose.Schema

const userSchema = new Schema({
    email: { type: String, required: true },
    password: { type: String, required: true }
})

const User = mongoose.model('User', userSchema)


const noteSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, 
    date: { type: String }
})

const Note = mongoose.model('Note', noteSchema)






app.post('/signup', async (req, res) => {

    const { email, password, confirmPassword } = req.body

    if (!email || !password || !confirmPassword) {
        return res.status(400).json({
            message: 'All field are required'
        })
    }

    if (password !== confirmPassword) {
        return res.status(401).json({
            message: 'Passwords do not match'
        })
    }

    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds)
    let hashedPassword = await bcrypt.hash(password, salt)

    let newUser = {
        email: email,
        password: hashedPassword
    }

    try {
        let data = await User.create(newUser)
        res.status(201).json({
            message: 'User created successfully',
            data
        })
    }
    catch (err) {
        res.status(500).json({
            message: err.message
        })
    }
})




app.post('/login', async (req, res) => {

    try {
        const { email, password } = req.body
        console.log(email, password)

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required'
            })
        }

        const user = await User.findOne({ email })

        if (!user) {
            return res.status(401).json({
                message: 'Authentication failed. User not found.'
            })
        }

        const passwordMatches = await bcrypt.compare(password, user.password)

        if (!passwordMatches) {
            return res.status(401).json({
                message: 'Authentication failed. Invalid credentials'
            })
        }

        const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET)

        res.status(200).json({
            message: 'Authentication successful',
            token
        })
    }

    catch (err) {
        res.status(500).json({
            message: err.message
        })
    }
})






app.get('/notes', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const userEmail = decoded.email
        const user = await User.findOne({ email: userEmail })

        const notes = await Note.find({ userId: user._id })

        res.status(200).json({
            message: 'Notes fetched successfully',
            data: notes
        })
    }
    catch (err) {
        res.status(500).json({
            message: err.message
        })
    }
})







app.post('/addnote', async (req, res) => {
    const { title, description } = req.body

    try {
        const token = req.headers.authorization.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const userEmail = decoded.email
        const user = await User.findOne({ email: userEmail })

        let newNote = {
            title: title,
            description: description,
            userId: user._id,
            date: currentDate
        }

        console.log(newNote)

        const note = await Note.create(newNote)
        res.status(200).json({
            message: 'Note saved successfully',
            note
        })
    }
    catch (err) {
        res.status(500).json({
            message: err.message
        })
    }
})



app.delete('/deleteall', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const userEmail = decoded.email
        const user = await User.findOne({ email: userEmail })

        const notes = await Note.deleteMany({ userId: user._id })

        res.status(200).json({
            message: 'Notes deleted successfully',
            data: notes
        })
    }
    catch (err) {
        res.status(500).json({
            message: err.message
        })
    }
})


app.post('/deleteone', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const userEmail = decoded.email
        const user = await User.findOne({ email: userEmail })

        const title = req.body.title
        const note = await Note.findOneAndDelete({ userId: user._id, title: title })

        if (!note) {
            return res.status(404).json({
                message: 'Note not found'
            })
        }

        res.status(200).json({
            message: 'Note deleted successfully',
            data: note
        })
    }
    catch (err) {
        res.status(500).json({
            message: err.message
        })
    }
})



app.listen(3001, () => {
    console.log('Server is up and running at port 3001')
})