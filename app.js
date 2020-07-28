const express = require('express');
const bodyParser = require('body-parser');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql'); // allows me to build scheam as string
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Event = require('./models/event');
const User = require('./models/user');

const app = express();

/**
 * Returns an array of event documents with detailed user information
 *
 * @param {number} eventIds Ids for events
 * @return {Array} events an array of events
 * Replacing creator and createdEvents with functions because when graphql tries to access a certain property
 * through an incoming query it will check if it's a string or a number and give that value. Or if its a f,
 * it will call that f and return its result.
 * So this returns the event doc, and also everything that is returned within the getUserById f.
 */
const events = async eventIds => {
  try {
    const events = await Event.find({ _id: { $in: eventIds } }); // mongodb query $in syntax
    return events.map(event => {
      return { ...event._doc, creator: getUserById.bind(this, event.creator) };
    });
  } catch (error) {
    throw err;
  }
};

/**
 * Returns user document and createdEvents based on id passed in as an argument
 *
 * @param {number} userId
 * @return {object} user, createdEvents
 */
const getUserById = async userId => {
  try {
    const user = await User.findById(userId);
    return {
      ...user._doc,
      createdEvents: events.bind(this, user._doc.createdEvents),
    };
  } catch (error) {
    throw error;
  }
};

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
        creator: User!
      }

      type User {
        _id: ID!
        email: String!
        password: String 
        createdEvents: [Event!]
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
          const events = await Event.find().populate('creator'); //populate allows us to grab the creator
          return events.map(event => {
            return {
              ...event._doc,
              creator: getUserById.bind(this, event._doc.creator),
            };
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
          createdEvent = {
            ...result._doc,
            creator: getUserById.bind(this, result._doc.creator),
          };
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
