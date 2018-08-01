import React, { Component, Fragment } from 'react';
import axios from 'axios';
import Pusher from 'pusher-js';
import ChatMessage from './ChatMessage';

const emojis = {
  sad: [55357, 56864],
  happy: [55357, 56832],
  neutral: [55357, 56848]
};

const RIGHT = 'right';
const LEFT = 'left';

const encrypted = true;

class Chat extends Component {
  state = { chats: [] };

  scrollToBottom = () => {
    this.chatsEnd.scrollIntoView({ behavior: 'smooth' });
  };

  componentDidMount() {
    this.scrollToBottom();
    const cluster = process.env.PUSHER_APP_CLUSTER;
    const appKey = process.env.PUSHER_APP_KEY;
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

  componentDidUpdate() {
    this.scrollToBottom();
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

  renderChat = (chat, idx) => {
    const previousIndex = Math.max(0, idx - 1);
    const previousChat = this.state.chats[previousIndex];
    const position = (chat.user === this.props.activeUser) ? RIGHT : LEFT; // user messages on right

    const isFirst = (previousIndex === idx);
    const inSequence = (chat.user === previousChat.user);
    const hasDelay = Math.ceil((chat.timestamp - previousChat.timestamp) / (1000 * 60));

    let mood;
    if (chat.sentiment === 0) {
      mood = emojis.neutral;
    } else {
      mood = (chat.sentiment > 0) ? emojis.happy : emojis.sad;
    }

    return (
      <Fragment key={idx}>
        {
          (isFirst || !inSequence || hasDelay) ?
            (
              <div
                className={`d-block w-100 font-weight-bold text-dark mt-4 pb-1 px-1 text-${position}`}
                style={{ fontSize: '0.9rem' }}>
                <span className="d-block" style={{ fontSize: '1.6rem' }}>
                  {String.fromCodePoint(...mood)}
                </span>
                <span>{ chat.user || 'Anonymous' }</span>
              </div>
            ) : null
        }
        <ChatMessage message={chat.message} position={position} />
      </Fragment>
    )
  }

  render() {
    return (
      (this.props.activeUser) ?
        <Fragment>
          <div className="border-bottom border-gray w-100 d-flex align-items-center bg-white" style={{height: 90}}>
            <h2 className="text-dark mb-0 mx-4 px-2">{this.props.activeUser}</h2>
          </div>
          <div
            className="px-4 pb-4 w-100 d-flex flex-row flex-wrap align-items-start align-content-start position-relative"
            style={{ height: 'calc(100% - 180px)', overflowY: 'scroll' }}>
            { this.state.chats.map(this.renderChat) }
            <div style={{ clear: 'both', float: 'left'}} ref={(el) => { this.chatsEnd = el }}></div>
          </div>
          <div className="border-bottom border-gray w-100 d-flex align-items-center bg-light" style={{minHeight: 90}}>
            <textarea
              className="form-control px-3 py-2"
              onKeyUp={this.handleKeyUp}
              placeholder="Enter a chat message"
              style={{ resize: 'none' }}/>
          </div>
        </Fragment> : null
    );
  }
}

export default Chat;
