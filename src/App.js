import React, { Component } from 'react';
import * as RxDb from 'rxdb'
import { QueryChangeDetector } from 'rxdb'
import { ToastContainer, toast } from 'react-toastify';
import * as moment from 'moment';
import  {schema}  from './Schema'
import 'react-toastify/dist/ReactToastify.min.css';
import logo from './logo.svg';
import './App.css';

// QueryChangeDetector.enable();
QueryChangeDetector.enableDebugging();

RxDb.plugin(require('pouchdb-adapter-idb'))
RxDb.plugin(require('pouchdb-adapter-http'))

const syncURL = 'http://localhost:5984'
const dbName = 'chatdb'


class App extends Component {
  constructor (props) {
    super(props);
    this.state = {
      newMessage: '',
      messages: []
    };

    this.subscriptions = [];
    this.addMessage = this.addMessage.bind(this);
    this.handleMessageChange = this.handleMessageChange.bind(this);

  }

  async componentWillMount () {
    this.db = await this.createDatabase();

    const subscription = this.db.messages.find().sort({id:  1 }).$.subscribe(messages => {
      if (!messages) return;
      toast('reloading messages');
      this.setState({messages: messages})
    });
    this.subscriptions.push(subscription);
  }

  componentWillUnmount () {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
  async createDatabase () {
    const db = await RxDb.create(
      {
        name: dbName,
        adapter: 'idb',
        password: '12345678'
      }
    );

    db.waitForLeadership().then(() => document.title = '*** ' + document.title);

    // Create the message collection.
    const messageCollection = await db.collection({
      name: 'messages',
      schema: schema
    })

    // Set up for repliction
    messageCollection.sync({
      remote: syncURL + dbName + '/'
    });

    // Replication stat handling
    const replicationState =  messageCollection.sync({remote: syncURL + dbName + '/'});

    this.subscriptions.push(
      replicationState.change$.subscribe(change => {
        toast('Replication changed');
        console.dir(change);
      })
    );

    this.subscriptions.push(replicationState.docs$.subscribe(docData => { console.dir(docData)}));
    this.subscriptions.push(
      replicationState.active$.subscribe(active => toast('Replication Active'))
    );
    this.subscriptions.push(
      replicationState.complete$.subscribe(completed => toast('Replication completed'))
    );
    this.subscriptions.push(
      replicationState.error$.subscribe(error => {
        toast('Replication error')
        console.dir(error);
      })
    )

    return db;
  }

  renderMessages () {
    return this.state.messages.map(({id, message}) => {
      const date = moment(id, 'x').fromNow();
      return (
          <div key={id}>
              <p>{date}</p>
              <p>{message}</p>
          </div>
      );
    });
  }

  handleMessageChange(event) {
    this.setState({newMessage: event.target.value});
  }

  async addMessage () {
    const id = Date.now().toString();
    const newMessage = {
      id,
      message: this.state.newMessage
    }
    await this.db.messages.insert(newMessage);
    this.setState({newMessage: ''});
  }

  render() {
    return (
      <div className="App">
      <ToastContainer autoClose={3000} />
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <div> { this.renderMessages() } </div>
        <div id='add-message-div'>
            <h3> Add new message </h3>
            <input type='text' placeholder='Message' value={ this.state.newMessage }
            onChange={this.handleMessageChange} />
            <button onClick={this.addMessage}> Add new message</button>
        </div>
      </div>
    );
  }
}

export default App;
