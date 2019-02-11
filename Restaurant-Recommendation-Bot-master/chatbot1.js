function ID() {
 // Math.random should be unique because of its seeding algorithm.
 // Convert it to base 36 (numbers + letters), and grab the first 9 characters
 // after the decimal.
 return '_' + Math.random().toString(36).substr(2, 9);
};
$(document).ready(function(){
	var UniqueId = ID();
	var messages = [];
	var lastUserMessage = "";
	var botMessage = "";
	var botName = 'Alex';

	var AWSconfig = {
		"accessKey":"",
		"secretKey":"",
		"S3Bucket":"<LINK TO S3Bucket>",
		"region":"us-east-1",
		"sessionToken":"",
		"client_id" :"<ENTER CLIENT ID>",
		"user_pool_id" : "<ENTER USER POOL>",
		"cognito_domain_url":"<COGNITO DOMAIN URL>",
		"redirect_uri" : "<REDIRECT URL>",
		"identity_pool_id":"<IDENTITY POOL ID>"
	};

	let apigClient = {};

	var getParameterByName = function(name, url) {
		if (!url) url = window.location.href;
		name = name.replace(/[\[\]]/g, "\\$&");
		var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
			results = regex.exec(url);
		if (!results) return null;
		if (!results[2]) return '';
		return decodeURIComponent(results[2].replace(/\+/g, " "));
	};

	console.log("Code = "+getParameterByName("code"));

	var exchangeAuthCodeForCredentials = function({auth_code = getParameterByName("code"),
													client_id = AWSconfig.client_id,
													identity_pool_id = AWSconfig.identity_pool_id,
													aws_region =AWSconfig.region,
													user_pool_id = AWSconfig.user_pool_id,
													cognito_domain_url= AWSconfig.cognito_domain_url,
													redirect_uri = AWSconfig.redirect_uri}) {
		return new Promise((resolve, reject) => {
			var settings = {
				url: `${cognito_domain_url}/oauth2/token`,
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				data: {
					grant_type: 'authorization_code',
					client_id: client_id,
					redirect_uri: redirect_uri,
					code: auth_code
				}
			};

			$.ajax(settings).done(function (response) {
				console.log('OAuth2 Token Call Responded');
				console.log(response);
				if (response.id_token) {
					AWS.config.region = aws_region;
					AWS.config.credentials = new AWS.CognitoIdentityCredentials({
						IdentityPoolId : identity_pool_id,
						Logins : {
							[`cognito-idp.${aws_region}.amazonaws.com/${user_pool_id}`]: response.id_token
						}
					});

					console.log({IdentityPoolId : identity_pool_id,
						Logins : {
							[`cognito-idp.${aws_region}.amazonaws.com/${user_pool_id}`]: response.id_token
						}
					});

					AWS.config.credentials.refresh(function (error) {
						console.log("Error",error);
						if (error) {
							reject(error);
						} else {
							console.log('Successfully Logged In');
							resolve(AWS.config.credentials);
						}
					});
				} else {
					reject(response);
				}
			});
		});
	};

	exchangeAuthCodeForCredentials({auth_code: getParameterByName("code"),
									client_id: AWSconfig.client_id,
									identity_pool_id: AWSconfig.identity_pool_id,
									aws_region: AWSconfig.region,
									user_pool_id: AWSconfig.user_pool_id,
									cognito_domain_url: AWSconfig.cognito_domain_url,
									redirect_uri: AWSconfig.redirect_uri})
	.then(function(response) { 
		console.log("Inside Then Function",response);
		apigClient = apigClientFactory.newClient({
			accessKey: response.accessKeyId,
			secretKey: response.secretAccessKey,
			sessionToken: response.sessionToken,
			region: "us-east-1"
		});
	})
	.catch(function(error) {
		console.log("error = "+this.error);
		console.log("response = "+this.response);
	});


	function chatbotResponse() {
		botMessage = "Yo";
		var params = {};
		var body = {
			"lastUserMessage" : lastUserMessage,
			"refId" :UniqueId
			};
		
		apigClient.chatbotPost(params, body, {})
			.then(function(result){
				console.log("Success - Then Function");
				console.log({result});
				botMessage = result.data.body;
				console.log("data = " + botMessage);
				
				console.log(botMessage);
		
				messages.push("<b>" + botName + ":</b> " + botMessage);
				for (var i = 1; i < 8; i++) {
					if (messages[messages.length - i])
						document.getElementById("chatlog" + i).innerHTML = messages[messages.length - i];
				}
			}).catch( function(result){
				console.log("Inside Catch Function");
			});
		return botMessage;
	}

	function newEntry() {
		if (document.getElementById("chatbox").value != "") {
			lastUserMessage = document.getElementById("chatbox").value;
			document.getElementById("chatbox").value = "";
			messages.push("<b>User:</b> " + lastUserMessage);
			
			botMessage = chatbotResponse();
		}
	}

	document.onkeypress = keyPress;

	function keyPress(e) {
		var x = e || window.event;
		var key = (x.keyCode || x.which);
		if (key == 13 || key == 3) {
		newEntry();
		}
	}

});