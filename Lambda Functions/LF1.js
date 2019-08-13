
exports.handler = (event, context, callback) => {
    var intent_name = event['currentIntent']['name'];
    var response = "";
    if (intent_name == "GreetingIntent"){
        response = {"dialogAction": {
        "type": "Close",
        "fulfillmentState": "Fulfilled",
        "message": {
          "contentType": "PlainText",
          "content": "Hi there,how can I help?"
        }}}}
    if (intent_name == "ThankYouIntent"){    
        response = {"dialogAction": {
        "type": "Close",
        "fulfillmentState": "Fulfilled",
        "message": {
          "contentType": "PlainText",
          "content": "You are Welcome"
        }}}}
    if (intent_name == "DiningSuggestionsIntent"){  
        var Location = event.currentIntent.slots.Location;
        var Cuisine = event.currentIntent.slots.Cuisine;
        var DiningDate = event.currentIntent.slots.DiningDate;
        var DiningTime = event.currentIntent.slots.DiningTime;
        var NumberOfPeople = event.currentIntent.slots.NumberOfPeople;
        var PhoneNumber = event.currentIntent.slots.PhoneNumber;
        
        var AWS = require('aws-sdk');
    
        // Set the region 
        AWS.config.update({region: 'us-east-1'});
        
        var sqs = new AWS.SQS({apiVersion: '2012-11-05'});
        var params = {
         DelaySeconds: 10,
         MessageAttributes: {
          "Location": {
            DataType: "String",
            StringValue: Location
           },
          "Cuisine": {
            DataType: "String",
            StringValue: Cuisine
           },
           "DiningTime": {
            DataType: "String",
            StringValue: DiningTime
           },
           "DiningDate": {
            DataType: "String",
            StringValue: DiningDate
           },
           "PhoneNumber": {
            DataType: "String",
            StringValue: PhoneNumber
           },
           "NumberOfPeople": {
            DataType: "Number",
            StringValue: NumberOfPeople
           }
         },
         MessageBody: "Information about current NY Times fiction bestseller for week of 12/11/2016.",
         QueueUrl: "<ENTER YOUR QUEUE URL>"
        };
    
        sqs.sendMessage(params, function(err, data) {
            console.log("lets add");
              if (err) {
                console.log("Error", err);
              } else {
                console.log("Success", data.MessageId);
              }
            });
        response = {"dialogAction": {
        "type": "Close",
        "fulfillmentState": "Fulfilled",
        "message": {
          "contentType": "PlainText",
          "content": "Got all inputs. thank you"
        }}};
    }
        
        
callback(null,response);
};