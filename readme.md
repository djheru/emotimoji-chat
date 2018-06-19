# Sentiment Aware Chat

## Setup

### Installing Dependencies

```
npm init -y && npm i react react-dom next pusher pusher-js sentiment express body-parser cors dotenv axios
```

### Setup Environment Variables

```
# In .env
PUSHER_APP_ID=YOUR_APP_ID
PUSHER_APP_KEY=YOUR_APP_KEY
PUSHER_APP_SECRET=YOUR_APP_SECRET
PUSHER_APP_CLUSTER=YOUR_APP_CLUSTER
```

```javascript
// In next.config.js
require('dotenv').config();
const webpack = require('webpack');

module.exports = {
  webpack: (config) => {
    // Configure webpack to provide the env variables to React 
    const env = Object.keys(process.env).reduce((acc, curr) => {
      acc[`process.env.${curr}`] = JSON.stringify(process.env[curr]);
      return acc;
    }, {});
    
    config.plugins.push(new webpack.DefinePlugin(env));
    return config;
  }
};
```

## Server
- `touch ./server.js`
```javascript
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
const sentiment = new Sentiment();

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
    
    server.listen(port, (err) => {
      if (err) {
        console.log('Startup Error! Aborting...');
        throw err;
      }
      console.log(`> Ready on http://localhost:${port}`)
    });
  })
  .catch(e => (console.error(e.stack) && process.exit(1)));
```
- Update the npm scripts
```
  "scripts": {
    "dev": "node server.js",
    "build": "next build",
    "start": "NODE_ENV=production node server.js"
  },
```

## Client

- Create index page
	- `mkdir ./pages && touch ./pages/index.js`
```javascript
import React, { Component } from 'react';
import Layout from '../components/Layout';
import Chat from '../components/Chat';

class IndexPage extends Component {
  state = { user: null };

  handleKeyUp = ({ keyCode, target }) => {
    if (keyCode === 13) { // On pressing enter
      const { value: user } = target;
      this.setState({ user });
    }
  };

  render() {
    const { user } = this.state;

    const nameInputStyles = {
      background: 'transparent',
      color: '#999',
      border: 0,
      borderBottom: '1px solid #666',
      borderRadius: 0,
      fontSize: '3rem',
      fontWeight: 500,
      boxShadow: 'none !import'
    };

    return (
      <Layout pageTitle="Sentiment Aware Realtime Chat">
        <main className="container-fluid position-absolute h-100 bg-dark">
          <div className="row position-absolute w-100 h-100">
            <div className="row position-absolute w-100 h-100">
              <section className="col-md-8 d-flex flex-row flex-wrap align-items-center align-content-center px-5">
                <div className="px-5 mx-5">
                  <span className="d-block w-100 h1 text-light" style={{ marginTop: -50 }}>
                    {
                      (user) ?
                        (<span><span style={{ color: '#999'}}>Hello!</span> {user}</span>) :
                        'What is your name?'
                    }
                  </span>
                  {
                    (!user) ?
                      (
                        <input
                          type="text"
                          className="form-control mt-3 px-3 py-2"
                          onKeyUp={this.handleKeyUp}
                          autoComplete="off"
                          style={nameInputStyles} />
                      ) : null
                  }
                </div>
              </section>
              <section
                className="col-md-4 position-relative d-flex flex-wrap h-100 align-items-start align-content-between bg-white px-0">
              </section>
            </div>
          </div>
        </main>
      </Layout>
    );
  }
}

export default () => (<IndexPage/>);

```

- Create Layout component
	- `mkdir ./components && touch ./components/Layout.js`
	
```javascript
import React, { Fragment } from 'react';
import Head from 'next/head';

const Layout = (props) => {
  return (
    <Fragment>
      <Head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"/>
        <link
          rel="stylesheet"
          href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css"
          integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm"
          crossOrigin="anonymous"/>
        <title>{ props.pageTitle || 'Realtime Chat, Y\'all!' }</title>
      </Head>
      { props.children }
    </Fragment>
  );
};
```

- Create Chat component
	- `touch components/Chat.js`

```javascript
import React, { Component, Fragment } from 'react';
import axios from 'axios';
import Pusher from 'pusher-js';

const encrypted = true;

class Chat extends Component {
  state = { chats: [] };

  componentDidMount() {
    console.log(process.env);
    const { PUSHER_APP_CLUSTER: cluster, PUSHER_APP_KEY: appKey } = process.env;
    const pusherConfig = {cluster, encrypted};
    this.pusher = new Pusher(appKey, pusherConfig);

    this.channel = this.pusher.subscribe('chat-room');
    this.channel.bind('new-message', ({ chat = null }) => {
      const { chats } = this.state;
      if (chat) {
        chats.push(chat);
      }
      this.setState({ chats });
    });

    this.pusher.connection.bind('connected', () => {
      axios.post('/messages')
        .then(response => {
          const chats = response.data.messages;
          this.setState({ chats });
        });
    });
  }

  componentWillUnmount() {
    this.pusher.disconnect();
  }

  handleKeyUp = ({ keyCode, shiftKey, target }) => {
    if (keyCode === 13 && !shiftKey) {
      const timestamp = +new Date;
      const { value: message } = target;
      const { activeUser: user } = this.props;
      const chat = { user, message, timestamp };
      target.value = '';
      axios.post('/message', chat);
    }
  };

  render() {
    return (
      (this.props.activeUser) ?
        <Fragment>
          <div className="border-bottom border-gray w-100 d-flex align-items-center bg-white" style={{height: 90}}>
            <h2 className="text-dark mb-0 mx-4 px-2">{this.props.activeUser}</h2>
          </div>
          <div className="border-bottom border-gray w-100 d-flex align-items-center bg-light" style={{minHeight: 90}}>
            <textarea
              className="form-control px-3 py-2"
              onKeyUp={this.handleKeyUp}
              placeholder="Enter a chat message"
              style={{ resize: 'none' }}></textarea>
          </div>
        </Fragment> : null
    );
  }
}

export default Chat;
```

- Add the component to the index

```javascript
// Replace the empty <section> at the bottom with:
  <section
	className="col-md-4 position-relative d-flex flex-wrap h-100 align-items-start align-content-between bg-white px-0">
	{
	  (user) ? <Chat /> : null
	}
  </section>
```

- Add the routes to the server

```javascript
// After the GET catch-all route
const chatHistory = { messages: [] };
server.post('/message', (req, res, next) => {
  const { user = null, message = '', timestamp = +new Date } = req.body;
  const sentiment = sentimentInstance.analyze(message).score;
  const chat = { user, message, timestamp, sentiment };

  chatHistory.messages.push(chat);
  pusher.trigger('chat-room', 'new-message', { chat })
});

server.post('/messages', (req, res, next) => {
  res.json({ ...chatHistory, status: 'success' });
});
```

- Add a component to display messages
	- `touch ./components/ChatMessage.js`

```javascript
import React from 'react';

const ChatMessage = ({ position = 'left', message }) => {
  const isRight = position.toLowerCase() === 'right';
  const align = (isRight) ? 'text-right' : 'text-left';
  const justify = (isRight) ? 'justify-content-end' : 'justify-content-start';

  const messageBoxStyles = {
    maxWidth: '70%',
    flexGrow: 0
  };

  const messageStyles = {
    fontWeight: 500,
    lineHeight: 1.4,
    whiteSpace: 'pre-wrap'
  };

  return (
    <div className={`w-100 my-1 d-flex ${justify}`}>
      <div className="bg-light rounded border border-gray p-2" style={messageBoxStyles}>
          <span className={`d-block text-secondary ${align}`} style={messageStyles}>
            {message}
          </span>
      </div>
    </div>
  )
};

export default ChatMessage;
```
