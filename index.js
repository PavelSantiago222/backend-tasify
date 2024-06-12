const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const crypto = require("crypto");

const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const jwt = require("jsonwebtoken");
const moment = require("moment");

mongoose
  .connect("mongodb+srv://sujan:sujan@cluster0.zjqdesc.mongodb.net/")
  .then(() => {
    console.log("Conectado a MongoDB");
  })
  .catch((error) => {
    console.log("Error al conectar a MongoDB", error);
  });

app.listen(port, () => {
  console.log("El servidor está corriendo en el puerto 3000");
});

const User = require("./models/user");
const Todo = require("./models/todo");

app.post("/registro", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) {
      console.log("Email ya registrado");
    }

    const nuevoUsuario = new User({
      name,
      email,
      password,
    });

    await nuevoUsuario.save();

    res.status(202).json({ mensaje: "Usuario registrado exitosamente" });
  } catch (error) {
    console.log("Error al registrar al usuario", error);
    res.status(500).json({ mensaje: "Error en el registro" });
  }
});

const generarClaveSecreta = () => {
  const claveSecreta = crypto.randomBytes(32).toString("hex");

  return claveSecreta;
};

const claveSecreta = generarClaveSecreta();

app.post("/iniciar-sesion", async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await User.findOne({ email });
    if (!usuario) {
      return res.status(401).json({ mensaje: "Correo electrónico inválido" });
    }

    if (usuario.password !== password) {
      return res.status(401).json({ mensaje: "Contraseña inválida" });
    }

    const token = jwt.sign({ userId: usuario._id }, claveSecreta);

    res.status(200).json({ token });
  } catch (error) {
    console.log("Error en el inicio de sesión", error);
    res.status(500).json({ mensaje: "Error en el inicio de sesión" });
  }
});

app.post("/tareas/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const { title, category } = req.body;

    const nuevaTarea = new Todo({
      title,
      category,
      fechaLimite: moment().format("YYYY-MM-DD"),
    });

    await nuevaTarea.save();

    const usuario = await User.findById(userId);
    if (!usuario) {
      res.status(404).json({ error: "Usuario no encontrado" });
    }

    usuario?.tareas.push(nuevaTarea._id);
    await usuario.save();

    res.status(200).json({ mensaje: "Tarea agregada exitosamente", tarea: nuevaTarea });
  } catch (error) {
    res.status(200).json({ mensaje: "Tarea no agregada" });
  }
});

app.get("/usuarios/:userId/tareas", async (req, res) => {
  try {
    const userId = req.params.userId;

    const usuario = await User.findById(userId).populate("tareas");
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.status(200).json({ tareas: usuario.tareas });
  } catch (error) {
    res.status(500).json({ error: "Algo salió mal" });
  }
});

app.patch("/tareas/:tareaId/completar", async (req, res) => {
  try {
    const tareaId = req.params.tareaId;

    const tareaActualizada = await Todo.findByIdAndUpdate(
      tareaId,
      {
        estado: "completada",
      },
      { new: true }
    );

    if (!tareaActualizada) {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }

    res
      .status(200)
      .json({ mensaje: "Tarea marcada como completada", tarea: tareaActualizada });
  } catch (error) {
    res.status(500).json({ error: "Algo salió mal" });
  }
});

app.get("/tareas/completadas/:fecha", async (req, res) => {
  try {
    const fecha = req.params.fecha;

    const tareasCompletadas = await Todo.find({
      estado: "completada",
      createdAt: {
        $gte: new Date(`${fecha}T00:00:00.000Z`),
        $lt: new Date(`${fecha}T23:59:59.999Z`),
      },
    }).exec();

    res.status(200).json({ tareasCompletadas });
  } catch (error) {
    res.status(500).json({ error: "Algo salió mal" });
  }
});

app.get("/tareas/total", async (req, res) => {
  try {
    const totalTareasCompletadas = await Todo.countDocuments({
      estado: "completada",
    }).exec();

    const totalTareasPendientes = await Todo.countDocuments({
      estado: "pendiente",
    }).exec();

    res.status(200).json({ totalTareasCompletadas, totalTareasPendientes });
  } catch (error) {
    res.status(500).json({ error: "Error de red" });
  }
});
