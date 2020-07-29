const bcrypt = require('bcryptjs');

const Event = require('../../models/event');
const User = require('../../models/user');

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
      return {
        ...event._doc,
        date: new Date(event._doc.date).toISOString(),
        creator: getUserById.bind(this, event.creator),
      };
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

module.exports = {
  events: async () => {
    try {
      const events = await Event.find();
      return events.map(event => {
        return {
          ...event._doc,
          date: new Date(event._doc.date).toISOString(),
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
      creator: '5f210cd93af6fd11dcf9588c',
    });

    let createdEvent;
    try {
      const result = await event.save();
      createdEvent = {
        ...result._doc,
        date: new Date(event._doc.date).toISOString(),
        creator: getUserById.bind(this, result._doc.creator),
      };
      const creator = await User.findById('5f210cd93af6fd11dcf9588c');
      if (!creator) {
        throw new Error('User not found.');
      }
      creator.createdEvents.push(event);

      await creator.save();
      return createdEvent;
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  createUser: async args => {
    try {
      const existingUser = await User.findOne({ email: args.userInput.email });
      if (existingUser) {
        throw new Error('This user already exists.');
      }
      const hashedPassword = await bcrypt.hash(args.userInput.password, 12);

      const user = new User({
        email: args.userInput.email,
        password: hashedPassword,
      });

      const result = await user.save();

      return { ...result._doc, password: null };
    } catch (err) {
      throw err;
    }
  },
};
