const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const crypto = require("crypto");

const app = express();
const port = 3000;
const cors = require("cors");
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const jwt = require("jsonwebtoken");
const moment = require("moment");

mongoose
  .connect("mongodb+srv://pavel123:pavel123@cluster0.ohahvqp.mongodb.net/")
  .then(() => {
    console.log("Conectado a MongoDB");
  })
  .catch((error) => {
    console.log("Error al conectar con mongoDb", error);
  });

app.listen(port, () => {
  console.log("El servidor se está ejecutando en el puerto 3000.");
});

const User = require("./models/user");
const Todo = require("./models/todo");

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    ///check if email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("Correo electrónico ya registrado");
    }

    const newUser = new User({
      name,
      email,
      password,
    });

    await newUser.save();

    res.status(202).json({ message: "Usuario registrado exitosamente" });
  } catch (error) {
    console.log("Error al registrar el usuario", error);
    res.status(500).json({ message: "Registro fallido" });
  }
});

const generateSecretKey = () => {
  const secretKey = crypto.randomBytes(32).toString("hex");

  return secretKey;
};

const secretKey = generateSecretKey();

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Email inválido" });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: "Contraseña no válida" });
    }

    const token = jwt.sign({ userId: user._id }, secretKey);

    res.status(200).json({ token });
  } catch (error) {
    console.log("Error de inicio de sesion", error);
    res.status(500).json({ message: "Error de inicio de sesion" });
  }
});

app.post("/todos/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const { title, category } = req.body;

    const newTodo = new Todo({
      title,
      category,
      dueDate: moment().format("YYYY-MM-DD"),
    });

    await newTodo.save();

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
    }

    user?.todos.push(newTodo._id);
    await user.save();

    res.status(200).json({ message: "Task agregado exitosamente", todo: newTodo });
  } catch (error) {
    res.status(200).json({ message: "Task no agregado" });
  }
});

app.get("/users/:userId/todos", async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId).populate("todos");
    if (!user) {
      return res.status(404).json({ error: "usuario no encontrado" });
    }

    res.status(200).json({ todos: user.todos });
  } catch (error) {
    res.status(500).json({ error: "Algo salió mal" });
  }
});

app.patch("/todos/:todoId/complete", async (req, res) => {
  try {
    const todoId = req.params.todoId;

    const updatedTodo = await Todo.findByIdAndUpdate(
      todoId,
      {
        status: "completado",
      },
      { new: true }
    );

    if (!updatedTodo) {
      return res.status(404).json({ error: "Task no encontrado" });
    }

    res
      .status(200)
      .json({ message: "Task marcado como completo", todo: updatedTodo });
  } catch (error) {
    res.status(500).json({ error: "Algo salió mal" });
  }
});

app.get("/todos/completed/:date", async (req, res) => {
  try {
    const date = req.params.date;

    const completedTodos = await Todo.find({
      status: "completado",
      createdAt: {
        $gte: new Date(`${date}T00:00:00.000Z`), // Start of the selected date
        $lt: new Date(`${date}T23:59:59.999Z`), // End of the selected date
      },
    }).exec();

    res.status(200).json({ completedTodos });
  } catch (error) {
    res.status(500).json({ error: "Algo salió mal" });
  }
});

app.get("/todos/count", async (req, res) => {
  try {
    const totalCompletedTodos = await Todo.countDocuments({
      status: "completado",
    }).exec();

    const totalPendingTodos = await Todo.countDocuments({
      status: "pendiente",
    }).exec();

    res.status(200).json({ totalCompletedTodos, totalPendingTodos });
  } catch (error) {
    res.status(500).json({ error: "Error de red" });
  }
});
