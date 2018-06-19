const cors = require('cors');
const next = require('next');
const Pusher = require('pusher');
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv').config();
const Sentiment = require('sentiment');

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;

const app = next({ dev });
const handler = app.getRequestHandler();
const sentimentInstance = new Sentiment();

// Ensure credentials are set properly in .env
const {
  PUSHER_APP_ID: appId,
  PUSHER_APP_KEY: key,
  PUSHER_APP_SECRET: secret,
  PUSHER_APP_CLUSTER: cluster
} = process.env;
const encrypted = true;
const pusherConfig = { appId, key, secret, cluster, encrypted };
const pusher = new Pusher(pusherConfig);

app.prepare()
  .then( () => {
    const server = express();
    server.use(cors());
    server.use(bodyParser.json());
    server.use(bodyParser.urlencoded({ extended: true }));

    server.get('*', (req, res) => {
      return handler(req, res);
    });

    const chatHistory = { messages: [] };
    server.post('/message', (req, res, next) => {
      const { user = null, message = '', timestamp = +new Date } = req.body;
      const sentimentAnalysis = sentimentInstance.analyze(message).score;
      console.log('Sentiment Analysis: ', JSON.stringify(sentimentAnalysis, null, '\t'));
      const sentiment = sentimentAnalysis.score;
      const chat = { user, message, timestamp, sentiment };

      chatHistory.messages.push(chat);
      pusher.trigger('chat-room', 'new-message', { chat });
      res.json({ status: 'success' })
    });

    server.post('/messages', (req, res, next) => {
      res.json({ ...chatHistory, status: 'success' });
    });

    server.listen(port, (err) => {
      if (err) {
        console.log('Startup Error! Aborting...');
        throw err;
      }
      console.log(`> Ready on http://localhost:${port}`)
    });
  })
  .catch(e => (console.error(e.stack) && process.exit(1)));
