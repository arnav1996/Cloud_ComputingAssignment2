var http = require('https');
exports.handler = (event, context, callback) => {
    var AWS = require('aws-sdk');
    var sqs= new AWS.SQS({apiVersion: '2012-11-05'});
    var queueURL = '<URL TO YOUR QUEUE>';
    
    var params = {
     AttributeNames: [
        "SentTimestamp"
     ],
     MaxNumberOfMessages: 10,
     MessageAttributeNames: [
        "All"
     ],
     QueueUrl: queueURL,
     VisibilityTimeout: 60,
     WaitTimeSeconds: 0
    };

    sqs.receiveMessage(params, function(err, data) {
      if (err) {
        console.log("Receive Error", err);
      } else if (data.Messages) {
        
        data.Messages.forEach(Message=>{
        
            var deleteParams = {
              QueueUrl: queueURL,
              ReceiptHandle: Message.ReceiptHandle
            };
            var MessageId = Message.MessageId;
            var SentTimestamp = Message.Attributes.SentTimestamp;
            var Location = Message.MessageAttributes.Location.StringValue;
            var Cuisine = Message.MessageAttributes.Cuisine.StringValue;
            var DiningDate = Message.MessageAttributes.DiningDate.StringValue;
            var DiningTime = Message.MessageAttributes.DiningTime.StringValue;
            var NumberofPeople = Message.MessageAttributes.NumberOfPeople.StringValue;
            var PhoneNumber = Message.MessageAttributes.PhoneNumber.StringValue;
          
            // Getting results from Yelp based on above requirements.
            var options = {
                  "method": "GET",
                  "hostname": "api.yelp.com",
                  "port": null,
                  "path": "/v3/businesses/search?location="+Location+"&term="+Cuisine+"%20restaurants&limit=3",
                  "headers": {
                    "authorization": "<YELP API KEY>"
                  }
                };
            
            var yelpResults='';
            var req = http.request(options, function (res) {
              var chunks = [];
              
                res.on("data", function (chunk) {
                  chunks.push(chunk);
                });
              
              // console.log(res)
              
                res.on("end", function () {
                  var body = Buffer.concat(chunks);
                  var yelpResponse = body.toString();
                  yelpResults = JSON.parse(body);
                  var sms = yelpResults.businesses;
                  // Formatting response of yelp
                  var ans=[];
                  ans.push('Hi there, here are our suggestions for '+NumberofPeople+' people in '+Location+' on '+DiningDate+'.'+'\n');
                  var eachAnswer='';
                  var i = 1;
                  sms.forEach(business=> {
                    eachAnswer=i+". "+(business.name)+"\n"+"Website: "+business.url.split('?',1)[0]+"\n"+'Address: '+business.location.address1+", "+business.location.city+"\n"+"PhoneNumber: "+business.phone+"\n";
                    ans.push(eachAnswer);
                    i=i+1;
                  });
                  
                  var docClient = new AWS.DynamoDB.DocumentClient();
        
                        // console.log("Importing Yelp into DynamoDB. Please wait.");
                        
                        // console.log(Message.MessageId);
                  var params = {
                      TableName: "DiningSuggestionsDB",
                      Item: {
                              "MessageId":  MessageId,
                              "SentTimestamp":SentTimestamp,
                              "Suggestions": yelpResponse
                      }
                    }
                        
                  docClient.put(params, function(err, data) {
                    if (err) {
                        console.log(params);
                        console.error("Unable to add record", 12, ". Error JSON:", JSON.stringify(err, null, 2));
                    } else {
                        console.log("PutItem succeeded:", sms);
                    }
                  });
                  
                  
                  // Sending SMS to User using SNS
                  var params = {
                      Message: ans.join(''), /* required */
                      PhoneNumber: PhoneNumber,
                    };
                    
                    // Create promise and SNS service object
                    var publishTextPromise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(params).promise();
                    
                    // Handle promise's fulfilled/rejected states
                    publishTextPromise.then(
                      function(data) {
                        console.log("Text MessageID is " + data.MessageId);
                      }).catch(
                        function(err) {
                        console.error(err, err.stack);
                      });
                  
                });
              });
            
            req.end();
            
          // console.log(Message.MessageAttributes.PhoneNumber.StringValue)
          
          sqs.deleteMessage(deleteParams, function(err, data) {
            if (err) {
              console.log("Delete Error", err);
            } else {
              console.log("Message Deleted", data);
            }
          });
          
        });
      
      }
      
    });
}