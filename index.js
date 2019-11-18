'use strict';

// Imports dependencies and set up http server
const
  express = require('express'),
  bodyParser = require('body-parser'),
  app = express().use(bodyParser.json()); // creates express http server
const request = require('request');

const PAGE_ACCESS_TOKEN = "EAAHhK7oMsDcBAOi23rCS3rOx3EJX1Rz3X2GJyo4YDvj1M3ZCYBRvl0p65Rg416uZCvWPp7QRXVOuSZBYoQ9ffZCOGUFxwIVxBSZAr0PRL3hgNsQV9A19mcMYXG2XmTY9iTKUkCZBwXQoBSlG3F38WfdLojwBQZBteW0eI0YtdurYv7SrsKVTv3W";

// Sets server port and logs message on success
app.listen(process.env.PORT || 80, () => console.log('webhook is listening...'));

function isUniqueCode(code) {
  return (code[0] == 'f') && 
         (code[1] == 'i') &&
         (code[2] == 'd') &&
         (code[3] == 'e') && (code.length == 9);
}

function callMessagingAPI(sender_psid, response) {

  let message = {
    text: "Your request has been redirected to our team, thank you for your time :)"
  }

  if(isUniqueCode(response.text)) {
    message.text = "Hello! :) How can I help you? ";
    console.log("Shame on me :<")
    users.push(sender_psid);
  }

  if(users.indexOf(sender_psid) == -1) {
    message = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Welcome to Fide Support",
            "subtitle": "Please, specify your role in the Fide ride",
            "buttons": [
              {
                  "type": "postback",
                  "title": "Passenger",
                  "payload": "passenger"
              },
              {
                  "type": "postback",
                  "title": "Driver",
                  "payload": "driver"
              }
            ],
          }]
        }
      }
    }
    users.push(sender_psid);
    console.log("Added " + sender_psid + " to the users array");
  }else {
    users.splice(users.indexOf(sender_psid), 1);
    console.log("Element " + sender_psid + " has been reomved");
  }

  let request_body = {
    "recipient": {
        "id": sender_psid
    },
    message
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
        console.log('message sent!'); 
    } else {
        console.error("Unable to send message:" + err);
    }
  }); 
}

// Handles messages events
function handleMessage(sender_psid, received_message) {
    callMessagingAPI(sender_psid, received_message);
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {

  let title = "Please, specify your request";
  let subtitle = "select one from the options below";
  let buttons = [
    {
        "type": "postback",
        "title": "Appeal",
        "payload": "appeal"
    },
    {
        "type": "postback",
        "title": "Help",
        "payload": "help"
    }
  ];

  let text = "";

  switch(received_postback.payload) {
    case "driver":
    case "passenger":
      break;
    case "appeal":
    case "ride-related":
      text = "What is your Uniq code?";
    case "help":
      title = "Is your request realted to a ride?";
      buttons = [
        {
            "type": "postback",
            "title": "Yes",
            "payload": "ride-related"
        },
        {
            "type": "postback",
            "title": "No",
            "payload": "not-ride-related"
        }
      ];
      break;
    case "not-ride-related":
      text = "Hello! :) How can I help you? ";
      break;
  }

  let message = {};
  if(text.length > 0) {
    message.text = text;
  } else {
    message = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            title,
            subtitle,
            buttons
          }]
        }
      }
    }
}

  let request_body = {
    "recipient": {
        "id": sender_psid
    },
    message
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
        console.log(request_body);
        console.log('message sent!'); 
    } else {
        console.error("Unable to send message:" + err);
    }
  }); 
}

app.get('/', (req, res) => {
  res.status(200).send("Working fine");
});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = "fide_support_bot_verify_token"
      
    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
      
    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
    
      // Checks the mode and token sent is correct
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        
        // Responds with the challenge token from the request
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
      
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        res.sendStatus(403);      
      }
    }
  });

var users = [];

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {  
 
    let body = req.body;
  
    // Checks this is an event from a page subscription
    if (body.object === 'page') {
  
      // Iterates over each entry - there may be multiple if batched
      body.entry.forEach(function(entry) {
  
        // users.push({sender_id: entry.messaging.sender.id});
        // Gets the message. entry.messaging is an array, but 
        // will only ever contain one message, so we get index 0
        let webhook_event = entry.messaging[0];

        let sender_psid = webhook_event.sender.id;

        if(webhook_event.message) {
          handleMessage(sender_psid, webhook_event.message);
        }else if(webhook_event.postback) {
          handlePostback(sender_psid, webhook_event.postback);
        }
      });
  
      // Returns a '200 OK' response to all requests
      res.status(200).send('EVENT_RECEIVED');
    } else {
      // Returns a '404 Not Found' if event is not from a page subscription
      res.sendStatus(404);
    }
  
  });