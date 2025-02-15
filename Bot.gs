const token = 'BOT TOKEN';
const tgBotUrl = 'https://api.telegram.org/bot' + token;
const hookUrl = 'WEBHOOK URL';
const sheetLogId = 'SHEET ID';
const adminChatId = -1; // ADMIN CHAT ID
const botId = -1; // BOT USER ID

function doGet(e)
{
  return HtmlService.createHtmlOutput('Feedback bot');
}

function doPost(e)
{
  let content = JSON.parse(e.postData.contents);
  
  if (checkOnBan(content.message.from.id) == 0)
  {
    return HtmlService.createHtmlOutput();
  }
  else
  {
    // handle admin chat
    if (content.message.chat.id == adminChatId) {
      // handle replies
      if(content.message.reply_to_message.forward_origin != undefined ) {
        // any replies
        if(content.message.reply_to_message.from.id != botId) {
          // do nothing
          return HtmlService.createHtmlOutput();
        } 
        // replies to bot
        else {
          if (content.message.text == '/ban') // блокування користувача
          {
              let data = checkOnBan(content.message.from.id)
              if (data == 0)
              {
                let payload0 = {
                chat_id: adminChatId,
                text: "Користувача вже заблоковано"
                }

                sendMessage(payload0)
              }

              else if (data == 1)
              {
                let usermsgid = content.message.reply_to_message.message_id;
                let user_name = searchintable(usermsgid);

                let payload = {
                chat_id: user_name,
                text: "Ви були забанені за порушення правил користування ботом"
                }

                sendMessage(payload)

                banUser(content, user_name);

                let payload1 = {
                chat_id: adminChatId,
                text: "Користувач був заблокований назавжди за порушення правил користування ботом"
                }

                sendMessage(payload1);
              }
            
          }
          else if (content.message.text == '/time')// час відправки повідомлення (дебаг)
          {
            let msgtime = content.message.reply_to_message.date;
            
            let payload = {
              chat_id: adminChatId,
              text: msgtime
            }
      
            sendMessage(payload);
          }
          else if (content.message.text == '/id') // ід повідомлення (дебаг)
          {
            let msgtime = content.message.reply_to_message.message_id;
            
            let payload = {
              chat_id: adminChatId,
              text: msgtime
            }
      
            sendMessage(payload);
          }
          else//пересилання відправнику
          {
            let usermsgid = content.message.reply_to_message.message_id;
            let user_name = searchintable(usermsgid);
            if (user_name != 'nil')
            {
              payload = {
              'chat_id': user_name,
              'from_chat_id':adminChatId,
              'message_id': content.message.message_id
              }
              copyMessage(payload);
            }

          }
        }
      }
      return HtmlService.createHtmlOutput();
    }
    
    // handle /start
    
    if (content.message.text == '/start') 
    {
      // привітальне повідомлення 
      let payload = {
        chat_id: content.message.chat.id,
        text: "Вітаємо у боті зворотнього зв'язку!\n\nТут ви можете задати адміністрації будь-яке питання"
      }
    
      sendMessage(payload);
      return HtmlService.createHtmlOutput();
    }
    else
    {
      // пересилання повідомлення
      payload = {
        'chat_id': adminChatId,
        'from_chat_id':content.message.chat.id,
        'message_id': content.message.message_id
      }
      var i = forwardMessage(payload);
      
      var msgid = JSON.parse(String(i)).result.message_id;
      
      saveMessage(content, msgid);
      
      payload1 = {
        'chat_id': content.message.chat.id,
        "text":'Повідомлення відправлене'
      }
      sendMessage(payload1)
      //return http 200 OK
      return HtmlService.createHtmlOutput();
    }
  }
}

function setWebHook() //запуск вебхука
{
  let response = UrlFetchApp.fetch(tgBotUrl + "/setWebhook?url=" + hookUrl);
  Logger.log('telegram response status is ' + response.getResponseCode());
}

function saveMessage(message, msgid) // збереження інформації про прийняте повідомлення до таблиці
{
  let file = SpreadsheetApp.openById(sheetLogId);
  // first tab of the file
  let sheet = file.getSheets()[0];
  // get last row
  let lastRow = sheet.getLastRow() + 1;
  
  sheet.setActiveSelection('A' + lastRow).setValue(message.message.date); // date
  sheet.setActiveSelection('B' + lastRow).setValue(message.message.chat.id); // chat id
  sheet.setActiveSelection('C' + lastRow).setValue(message.message.from.username); // username
  sheet.setActiveSelection('D' + lastRow).setValue(message.message.text); // message
  sheet.setActiveSelection('E' + lastRow).setValue(JSON.stringify(message));
  sheet.setActiveSelection('F' + lastRow).setValue(msgid);

  return message.message.date
}

function banUser(message, usersid)// додати користувача до банлиста
{
  let file = SpreadsheetApp.openById(sheetLogId);
  // first tab of the file
  let sheet = file.getSheets()[1];
  // get last row
  let lastRow = sheet.getLastRow() + 1;
  
  sheet.setActiveSelection('A' + lastRow).setValue(usersid); 
  sheet.setActiveSelection('B' + lastRow).setValue(message.message.from.username); 
}

function sendMessage(payload)// відправка прийнятого повідомлення у чат
{
  let options = {
    'method' : 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload)
  }
  return UrlFetchApp.fetch(tgBotUrl + "/sendMessage", options);
}

function forwardMessage(payload)// пересилання прийнятого повідомлення у чат
{
  let options = {
    'method' : 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload)
  }
  return UrlFetchApp.fetch(tgBotUrl + "/forwardMessage", options);
}

function copyMessage(payload)// копіювання прийнятого повідомлення у чат
{
  let options = {
    'method' : 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload)
  }
  return UrlFetchApp.fetch(tgBotUrl + "/copyMessage", options);
}

function searchintable(msgid)// пошук id повідомлення по таблиці повідомлень. Повертає ід відправника
{
  let sheet = SpreadsheetApp.openById(sheetLogId).getSheets()[0];

  let searchRange = sheet.getRange("F1:F" + sheet.getLastRow());

  var searchResult = searchRange.createTextFinder(msgid).findNext();

  if (searchResult) 
  {
   var thirdColumnValue = sheet.getRange(searchResult.getRow(), 2).getValue();
  }
  else
  {
    var thirdColumnValue = "nil";
  }
  return thirdColumnValue;

}

function checkOnBan(userid)// пошук id користувача у списку забанених (0 - знайдено, 1 -не знайдено)
{ 
  let sheet = SpreadsheetApp.openById(sheetLogId).getSheets()[1];
  let searchRange = sheet.getRange("A1:A" + sheet.getLastRow());

  let searchResult = searchRange.createTextFinder(userid).findNext();

  if (searchResult)
  {
    var isbanned = 0;
  }
  else
  {
    var isbanned = 1;
  }
  return isbanned;
}
