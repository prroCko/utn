const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require("jsonwebtoken")
const mongoose = require("mongoose")

const app = express()
app.use(express.json())

// status
app.get("/", (req, res) => {
  res.json({ status: false })
})

const connectDb = async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/catalogo-de-juegos")
  console.log("✅ Conectado a MongoDB con éxito")
}

// Creación de esquema de Mongodb
// los datos que voy agregar estarán basados en estas validaciones
const gameSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, default: 0 },
  space: { type: Number, required: true },
  description: { type: String },
  genre: { type: String, required: true }
}, {
  versionKey: false
})

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}, {
  versionKey: false
})

// modelo un un objeto que nos da acceso a los métodos de mongodb
// findByIdAndUpdate() 
const Game = mongoose.model("Game", gameSchema)
const User = mongoose.model("User", userSchema)

const authMiddleware = (req, res, next) => {
  // ✅ validar el token -> validar la sesión
  const token = req.headers.authorization

  if (!token) {
    return res.status(401).json({ status: "Se necesita el permiso" })
  }

  const decoded = jwt.verify(token, "CLAVE_SECRETA")
  next();
}

// agregar un usuario en la db
app.post("/auth/register", async (req, res) => {
  const body = req.body

  const user = await User.findOne({ email: body.email })

  if (user) {
    return res.status(400).json({ message: "El usuario ya existe en nuestras base de datos" })
  }

  const hash = await bcrypt.hash(body.password, 10)

  const newUser = new User({
    name: body.name,
    email: body.email,
    password: hash
  })

  await newUser.save()

  res.json(newUser)
})

// creación de sesión -> una sesión me permite ingresar a los datos por cierto tiempo
app.post("/auth/login", async (req, res) => {
  const body = req.body

  const user = await User.findOne({ email: body.email })

  if (!user) {
    return res.status(401).json({ status: "Usuario no encontrado, credenciales invalidas" })
  }

  const passwordValidada = await bcrypt.compare(body.password, user.password)
  if (!passwordValidada) {
    return res.status(401).json({ status: "Usuario no encontrado, credenciales invalidas" })
  }

  const token = jwt.sign({ id: user.id, email: user.email }, "CLAVE_SECRETA", { expiresIn: "1h" })

  res.json({ token })
})

// get product
app.get("/games", authMiddleware, async (req, res) => {
  const games = await Game.find()
  res.json(games)
})

// add product
app.post("/games", authMiddleware, async (req, res) => {
  const body = req.body

  const { name, price, space, description, genre } = body

  if (!name || !price || !space || !description || !genre) {
    return response.status(400).json({ status: "Data invalida, intentalo nuevamente" })
  }

  const newGame = new Game({
    name,
    price,
    space,
    description,
    genre
  })

  await newGame.save()
  res.json(newGame)
})

app.patch("/games/:id", authMiddleware, async (req, res) => {
  const body = req.body
  const id = req.params.id

  const updatedGame = await Game.findByIdAndUpdate(id, body, { new: true })

  if (!updatedGame) {
    return res.status(404).json({ error: "Juego no encontrado" })
  }

  res.json(updatedGame)
})

app.delete("/games/:id", authMiddleware, async (req, res) => {
  const id = req.params.id

  const deletedGame = await Game.findByIdAndDelete(id)

  if (!deletedGame) {
    return res.status(404).json({ error: "No se encuentra el juego para borrar" })
  }

  res.json(deletedGame)
})

app.listen(3000, () => {
  connectDb()
  console.log(`Server conectado en http://localhost:3000`)
})