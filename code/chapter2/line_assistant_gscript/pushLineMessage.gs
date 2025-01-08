function pushLineBotMessage(text_msg, reply_token){
      
    var linePayload = {
      'replyToken': reply_token,
      'messages': [
        {
          'type': 'text',
          'text': text_msg
        }
      ]
    };
    
    var lineOptions = {
      'method': 'post',
      'headers': {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': 'Bearer ' + LINE_CHANNEL_TOKEN
      },
      'payload': JSON.stringify(linePayload)
    };
    
    UrlFetchApp.fetch(LINE_BOT_API, lineOptions); 
}