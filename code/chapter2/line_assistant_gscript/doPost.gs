LINE_CHANNEL_TOKEN = "";
LINE_BOT_API = "https://api.line.me/v2/bot/message/reply";

OPENAI_ACCESS_TOKEN = "";
ASSISTANT_ID = "";
ASSISTANT_NAME = "iFly";


function doPost(e) {
  var postData = JSON.parse(e.postData.contents);    // Retrieve LineBot information
  var reply_token = postData.events[0].replyToken;
  var user_msg = postData.events[0].message.text;
  var chat_type = postData.events[0].source.type;
  var user_id =  postData.events[0].source.userId;
  // var sResponse = JSON.stringify(postData); // Debug
  // pushLineBotMessage(sResponse, replyToken); // Debug
  
  if (!user_msg)  
    return;

  if (chat_type == "group" && user_msg.toLowerCase().indexOf(ASSISTANT_NAME.toLowerCase()) === -1 ) 
  {
    // In a chat group, don't reply if AI assistant's name is not mentioned.
    return;
  } 
  else
  {
    // Call ChatGPT API
    //ai_response = chatCompletion(user_msg)
    ai_response = callAssistant(user_id, user_msg);
    pushLineBotMessage(ai_response, reply_token);
  }
}