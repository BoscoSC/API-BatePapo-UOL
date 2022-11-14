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

const userSchema = joi.object({
  name: joi.string().required(),
});
const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().required(),
});

try {
  await mongoClient.connect();
} catch (err) {
  res.sendStatus(500);
}

const db = mongoClient.db("batePapoUol");
const participantsCollection = db.collection("participants");
const messagesCollection = db.collection("messages");

//rotas
app.post("/participants", async (req, res) => {
  const user = req.body;
  const timeSent = `${dayjs(Date.now()).$H}:${dayjs(Date.now()).$m}:${
    dayjs(Date.now()).$s
  }`;

  const { error } = userSchema.validate(user, { abortEarly: true });

  if (error) {
    return res.status(400).send(error.detail.message);
  }

  try {
    const userExists = await participantsCollection.findOne({
      name: user.name,
    });
    if (userExists) {
      console.log(userExists);

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
  try {
    const participants = await participantsCollection.find().toArray();
    res.send(participants);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/messages", async (req, res) => {
  const message = req.body;
  const userHeader = req.headers.user;
  const timeSent = `${dayjs(Date.now()).$H}:${dayjs(Date.now()).$m}:${
    dayjs(Date.now()).$s
  }`;

  try {
    const userExists = await participantsCollection.findOne({
      name: userHeader,
    });

    if (!userHeader || !userExists) {
      return res.sendStatus(422);
    }

    const { error } = messageSchema.validate(message, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      return res.status(422).send(errors);
    }

    await messagesCollection.insertOne({
      ...message,
      from: userHeader,
      time: timeSent,
    });

    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/messages", async (req, res) => {
  const limit = parseInt(req.query.limit);
  const userHeader = req.headers.user;

  try {
    if (limit) {
      const usersMessage = await messagesCollection
        .find({ name: userHeader })
        .toArray()
        .slice(-limit);
      const messageToUser = await messagesCollection
        .find({ to: userHeader })
        .toArray()
        .slice(-limit);
      const arr = [...usersMessage, ...messageToUser];
      res.send(arr);
    }
    const usersMessage = await messagesCollection
      .find({ name: userHeader })
      .toArray();
    const messageToUser = await messagesCollection
      .find({ to: userHeader })
      .toArray();
    const arr = [...usersMessage, ...messageToUser];
    res.send(arr);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/status", async (req, res) => {
  const userHeader = req.headers.user;

  try {
    if (!userHeader) {
      return res.sendStatus(404);
    }
    const timeSent = `${dayjs(Date.now()).$H}:${dayjs(Date.now()).$m}:${
      dayjs(Date.now()).$s
    }`;

    await participantsCollection.updateOne(
      {
        name: userHeader,
      },
      { $set: { name: userHeader, time: timeSent } }
    );
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.listen(5000, () => console.log(`listening on port: ${5000}`));
