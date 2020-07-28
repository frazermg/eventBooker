const express = require('express');
const bodyParser = require('body-parser');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql'); // allows me to build scheam as string
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Event = require('./models/event');
const User = require('./models/user');

const app = express();

app.use(bodyParser.json());

app.use(
  '/graphql',
  graphqlHTTP({
    schema: buildSchema(`
      type Event {
        _id: ID! 
        title: String!
        description: String!
        price: Float!
        date: String!
      }

      type User {
        _id: ID!
        email: String!
        password: String 
      }
      
      input EventInput {
        title: String!
        description: String!
        price: Float!
        date: String!
      }

      input UserInput {
        email: String!
        password: String
      }

      type RootQuery {
        events: [Event!]!
      }

      type RootMutation {
        createEvent(eventInput: EventInput): Event
        createUser(userInput: UserInput): User
      }

      schema {
        query: RootQuery
        mutation: RootMutation
      }
    `),
    rootValue: {
      events: async () => {
        try {
          const events = await Event.find();
          return events.map(event => {
            return { ...event._doc };
          });
        } catch (err) {
          throw err;
        }
      },
      createEvent: async args => {
        const event = new Event({
          title: args.eventInput.title,
          description: args.eventInput.description,
          price: +args.eventInput.price,
          date: new Date(args.eventInput.date),
          creator: '5f1f6e7ad241983afc4de006',
        });
        let createdEvent;
        try {
          const result = await event.save();
          createdEvent = { ...result._doc };
          const user = await User.findById('5f1f6e7ad241983afc4de006');
          if (!user) {
            throw new Error('User not found.');
          }
          user.createdEvents.push(event);
          const result_1 = await user.save();
          return createdEvent;
        } catch (err) {
          console.log(err);
          throw err;
        }
      },
      createUser: async args => {
        try {
          const user = await User.findOne({ email: args.userInput.email });
          if (user) {
            throw new Error('This user already exists.');
          }
          const hashedPassword = await bcrypt.hash(args.userInput.password, 12);
          const user_1 = new User({
            email: args.userInput.email,
            password: hashedPassword,
          });
          const result = await user_1.save();
          return { ...result._doc, password: null };
        } catch (err) {
          throw err;
        }
      },
    },
    graphiql: true,
  })
);

mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@development-vy208.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`,
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => {
    app.listen(3000);
  })
  .catch(err => {
    console.log(err);
  });
