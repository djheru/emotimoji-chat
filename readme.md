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
