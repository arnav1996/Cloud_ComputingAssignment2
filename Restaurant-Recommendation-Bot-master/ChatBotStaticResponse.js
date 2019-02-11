var AWS = require('aws-sdk');
AWS.config.update({region: '<Enter your region>'});
var lexruntime = new AWS.LexRuntime();
	
exports.handler = (event, context, callback) => {
	try {
	// By default, treat the user request as coming from the America/New_York time zone.
    	var userInput = event.lastUserMessage;
    	var refId = event.refId;
    	var params = {
    	botAlias: '$LATEST', /* required, has to be '$LATEST' */
    	botName: 'DiningConcierge', /* required, the name of you bot */
    	inputText: userInput, /* required, your text */
    	userId: refId, /* required, arbitrary identifier */
    	sessionAttributes: {
    	someKey: 'STRING_VALUE',
    	}
	    };
	
    	lexruntime.postText(params, function(err, data) {
    	if (err) console.log(err); // an error occurred
    	else {
    	    let response = {
                "statusCode": 200,
                "headers": {
                "Access-Control-Allow-Origin" : "*" },
                "body": JSON.stringify(data.message)};
    	    callback(null, response);} 
    	});
	} catch (err) {
	console.log(err);
	}
};
