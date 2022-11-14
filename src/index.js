import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

const app = express();

dotenv.config();
app.use(cors());
app.use(express.json());
const mongoClient = new MongoClient(process.env.MONGO_URI);

const users = [];
const userSchema = {
  name: joi.string().required().min(1),
};

try {
  await mongoClient.connect();
} catch (err) {
  console.log(err);
}

const db = mongoClient.db("batePapoUol");
const participantsCollection = db.collection("participants");
const messagesCollection = db.collection("messages");

const timeSent = `${dayjs(Date.now()).$H}:${dayjs(Date.now()).$m}:${
  dayjs(Date.now()).$s
}`;

//rotas
app.post("/participants", async (req, res) => {
  const user = req.body;
  const timeSent = `${dayjs(Date.now()).$H}:${dayjs(Date.now()).$m}:${
    dayjs(Date.now()).$s
  }`;

  const { error } = userSchema.validate(user, { abortEarly: false });

  if (error) {
    const errors = error.details.map((detail) => detail.message);
    return res.status(400).send(errors);
  }

  try {
    const userExists = await participantsCollection.findOne({
      name: user.name,
    });
    if (userExists) {
      return res.sendStatus(409);
    }

    await participantsCollection.insertOne({ ...user, lastStatus: timeSent });

    await messagesCollection.insertOne({
      from: user.name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: timeSent,
    });

    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }

  res.send();
});

app.get("/participants", async (req, res) => {
  await participantsCollection.find({});
  res.sendStatus(200);
});

app.post("/messages", async (req, res) => {});

app.get("/messages", async (req, res) => {});

app.post("/status", async (req, res) => {});

console.log(timeSent);
app.listen(5000, () => console.log(`listening on port: ${5000}`));
