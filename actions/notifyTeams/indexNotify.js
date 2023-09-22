async function postMessage() {
  const fetch = await import('node-fetch').then((module) => module.default);
  const title = process.env.INPUT_TITLE || "";
  const text = process.env.INPUT_TEXT || "";
  const buttons = JSON.parse(process.env.INPUT_BUTTONS || "[]");
  const style = process.env.INPUT_STYLE || "accent";
  const webhook = process.env.INPUT_WEBHOOK;

  let message = {
    type: 'message',
    attachments: [
      { 
        "contentType": "application/vnd.microsoft.card.adaptive",
        "content": {
          "$schema": "https://adaptivecards.io/schemas/adaptive-card.json",
          "type": "AdaptiveCard",
          "version": "1.4",
          "body": [
            {
              "type": "Container",
              "style": style,
              "width": "stretch",
              "items": [
                {
                  "type": "TextBlock",
                  "text": title,
                  "size": "large",
                  "weight": "bolder",
                  "wrap": true
                }
              ]
            },
            {
              "type": "Container",
              "style": "default",
              "items": [
                {
                  "type": "TextBlock",
                  "text": text,
                  "wrap": true
                }
              ]
            }
          ],
          "width": "stretch",
          "actions": buttons.map((button) => ({
            type: 'Action.OpenUrl',
            title: button.title,
            url: button.url,
          }))
        }
      }
    ],
  };

  try {
    let response = await fetch(webhook, {
            method: "POST",
            body: JSON.stringify(message),
            headers: {
              "Content-type": "application/json; charset=UTF-8"
            }
          })
    if (response.ok) {
      console.log('Data fetched successfully');
      process.exit(0);
    } else {
      console.error('Error fetching data:', response.status);
      process.exit(-1);
    }
  } catch (error) {
    console.error('Error occurred:', error);
    process.exit(-1);
  }      
}

postMessage();
