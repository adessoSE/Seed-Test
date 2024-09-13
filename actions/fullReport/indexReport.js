// Helper function to parse environment variables or fallback to "-"
const parseValueOrDefault = (value) => {
    return value ? parseInt(value) : 0;
};

function calculatePercentage(num1, num2) {
    if (isNaN(num1) || isNaN(num2)) {
        return "-";
    }

    // Check if either number is zero to avoid division by zero error
    if (num2 === 0) {
        return "-";
    }

    // Calculate the percentage with two decimal places
    const percentage = (num1 / num2) * 100;
    const formattedPercentage = percentage.toFixed(0);

    return formattedPercentage + "%";
}

function getStatus(passed, total) {
    if (passed === 0) return "⚠️";
    return passed === total ? "✅" : "⚠️";
}

function calcTotal(dockerStatus, num1, num2) { 
    if (!dockerStatus) return "-";
    if (isNaN(num1)) num1 = 0;
    if (isNaN(num2)) num1 = 0;
    return num1+num2;
}

async function postMessage() {
    const webhook = process.env.INPUT_WEBHOOK;
    const prnumber = process.env.INPUT_PRNUMBER;
    const prlink = process.env.INPUT_PRLINK;
    const originBranch = process.env.INPUT_ORIGINBRANCH;
    const destinationBranch = process.env.INPUT_DESTINATIONBRANCH;
    const requestor = process.env.INPUT_REQUESTOR;
    const date = process.env.INPUT_DATE;
    const description = process.env.INPUT_DESCRIPTION || "- No Description";
    const dockerStatus = (process.env.INPUT_DOCKERSTATUS === "success");
    const workflowLink = process.env.INPUT_WORKFLOWLINK || "";
  
  // Frontend block
  const frontendSuitsPassed = parseValueOrDefault(process.env.INPUT_FRONTENDSUITSPASSED);
  const frontendSuitsFailed = parseValueOrDefault(process.env.INPUT_FRONTENDSUITSFAILED);
  const frontendTestsPassed = parseValueOrDefault(process.env.INPUT_FRONTENDTESTSPASSED);
  const frontendTestsFailed = parseValueOrDefault(process.env.INPUT_FRONTENDTESTSFAILED);
  const frontendSuitsTotal = calcTotal(dockerStatus, frontendSuitsPassed, frontendSuitsFailed);
  const frontendTestsTotal = calcTotal(dockerStatus,  frontendTestsPassed, frontendTestsFailed);
  const frontendSuitsPassedPercentage = calculatePercentage(frontendSuitsPassed, frontendSuitsTotal);
  const frontendSuitsFailedPercentage = calculatePercentage(frontendSuitsFailed, frontendSuitsTotal);
  const frontendTestsPassedPercentage = calculatePercentage(frontendTestsPassed, frontendTestsTotal);
  const frontendTestsFailedPercentage = calculatePercentage(frontendTestsFailed, frontendTestsTotal);
  const frontendBottomText = process.env.INPUT_FRONTENDBOTTOMTEXT || "";
  const frontendStatus = dockerStatus ? getStatus(frontendTestsPassed, frontendTestsTotal) : "";
  
  // Backend block
  const backendSuitsPassed = parseValueOrDefault(process.env.INPUT_BACKENDSUITSPASSED);
  const backendSuitsFailed = parseValueOrDefault(process.env.INPUT_BACKENDSUITSFAILED);
  const backendTestsPassed = parseValueOrDefault(process.env.INPUT_BACKENDTESTSPASSED);
  const backendTestsFailed = parseValueOrDefault(process.env.INPUT_BACKENDTESTSFAILED);
  const backendSuitsTotal = calcTotal(dockerStatus, backendSuitsPassed, backendSuitsFailed);
  const backendTestsTotal = calcTotal(dockerStatus, backendTestsPassed, backendTestsFailed);
  const backendSuitsPassedPercentage = calculatePercentage(backendSuitsPassed, backendSuitsTotal);
  const backendSuitsFailedPercentage = calculatePercentage(backendSuitsFailed, backendSuitsTotal);
  const backendTestsPassedPercentage = calculatePercentage(backendTestsPassed, backendTestsTotal);
  const backendTestsFailedPercentage = calculatePercentage(backendTestsFailed, backendTestsTotal);
  const backendBottomText = process.env.INPUT_BACKENDBOTTOMTEXT || "";
  const backendStatus = dockerStatus ? getStatus(backendTestsPassed, backendTestsTotal) : "";
  
  // Sanity block
  const sanityScenariosPassed = parseValueOrDefault(process.env.INPUT_SANITYSCENARIOSPASSED);
  const sanityScenariosFailed = parseValueOrDefault(process.env.INPUT_SANITYSCENARIOSFAILED);
  const sanityStepsPassed = parseValueOrDefault(process.env.INPUT_SANITYSTEPSPASSED);
  const sanityStepsFailed = parseValueOrDefault(process.env.INPUT_SANITYSTEPSFAILED);
  const sanityStepsSkipped = parseValueOrDefault(process.env.INPUT_SANITYSTEPSSKIPPED);
  const sanityScenariosTotal = calcTotal(dockerStatus, sanityScenariosPassed, sanityScenariosFailed);
  const sanityStepsTotal = calcTotal(dockerStatus, sanityStepsPassed, sanityStepsFailed + sanityStepsSkipped);
  const sanityScenariosPassedPercentage = calculatePercentage(sanityScenariosPassed, sanityScenariosTotal);
  const sanityScenariosFailedPercentage = calculatePercentage(sanityScenariosFailed, sanityScenariosTotal);
  const sanityStepsPassedPercentage = calculatePercentage(sanityStepsPassed, sanityStepsTotal);
  const sanityStepsFailedPercentage = calculatePercentage(sanityStepsFailed, sanityStepsTotal);
  const sanityStepsSkippedPercentage = calculatePercentage(sanityStepsSkipped, sanityStepsTotal);
  const sanityStatus = dockerStatus ? getStatus(sanityStepsPassed, sanityStepsTotal) : "";


    let message = {
        type: 'message',
        attachments: [
          { 
            "contentType": "application/vnd.microsoft.card.adaptive",
            "content": {
                "type": "AdaptiveCard",
                "msteams": { "width": "full" },
                "body": [
                    {
                        "type": "ColumnSet",
                        "columns": [
                            {
                                "type": "Column",
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "weight": "Bolder",
                                        "text": "Pull Request [#" + prnumber +"](" + prlink + ")",
                                        "wrap": true,
                                        "size": "Large"
                                    },
                                    {
                                        "type": "TextBlock",
                                        "spacing": "None",
                                        "text": destinationBranch + " ← " + originBranch,
                                        "isSubtle": true,
                                        "wrap": true,
                                        "size": "Medium"
                                    }
                                ],
                                "width": "stretch"
                            },
                            {
                                "type": "Column",
                                "items": [
                                    {
                                        "type": "Image",
                                        "style": "Person",
                                        "url": "https://github.com/"+ requestor +".png?size=200",
                                        "size": "Small"
                                    }
                                ],
                                "width": "auto"
                            },
                            {
                                "type": "Column",
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "weight": "Bolder",
                                        "text": requestor,
                                        "wrap": true
                                    },
                                    {
                                        "type": "TextBlock",
                                        "spacing": "None",
                                        "text": "Created {{DATE(" + date + ", SHORT)}}",
                                        "isSubtle": true,
                                        "wrap": true
                                    }
                                ],
                                "width": "stretch"
                            }
                        ]
                    },
                    {
                        "type": "TextBlock",
                        "text": description,
                        "wrap": true,
                        "fontType": "Default",
                        "size": "Medium",
                        "weight": "Bolder",
                        "color": "Accent"
                    },
                    {
                        "type": "Container",
                        "items": [
                            {
                                "type": "TextBlock",
                                "text": dockerStatus ? "🐳 **Docker**:\n\n \t\t 📥✔️ Deployed " : "🐳 **Docker**:\n\n \t\t 📥❌ Error",
                                "wrap": true,
                                "horizontalAlignment": "Left",
                                "isSubtle": false,
                                "separator": true,
                                "spacing": "None"
                            },
                            {
                                "type": "TextBlock",
                                "text": "🖼️ **Frontend**:\n\n \t\tStatus: " + frontendTestsPassed + "/" + frontendTestsTotal + " passed " + frontendStatus + "\n\n \t\tTest Suites:\n\n\t\t ✔️ Passed: " + frontendSuitsPassed + " [" + frontendSuitsPassedPercentage + "]\n\t\t ❌ Failed: " + frontendSuitsFailed + " [" + frontendSuitsFailedPercentage + "]\n\n\t\tTests:\n\n\t\t ✔️ Passed: " + frontendTestsPassed + " [" + frontendTestsPassedPercentage + "]\n\t\t ❌ Failed: " + frontendTestsFailed + " [" + frontendTestsFailedPercentage + "]\n\n\t\t" + frontendBottomText,
                                "wrap": true,
                                "horizontalAlignment": "Left",
                                "isSubtle": false
                            },
                            {
                                "type": "TextBlock",
                                "text": "💻 **Backend**:\n\n \t\tStatus: " + backendTestsPassed + "/" + backendTestsTotal + " passed " + backendStatus + "\n\n \t\tTest Suites:\n\n\t\t ✔️ Passed: " + backendSuitsPassed + " [" + backendSuitsPassedPercentage + "]\n\t\t ❌ Failed: " + backendSuitsFailed + " [" + backendSuitsFailedPercentage + "]\n\n\t\tTests:\n\n\t\t ✔️ Passed: " + backendTestsPassed + " [" + backendTestsPassedPercentage + "]\n\t\t ❌ Failed: " + backendTestsFailed + " [" + backendTestsFailedPercentage + "]\n\n\t\t" + backendBottomText,
                                "wrap": true,
                                "horizontalAlignment": "Left",
                                "isSubtle": false
                            },
                            {
                                "type": "TextBlock",
                                "text": "😊 **Sanity**:\n\n \t\tStatus: " + sanityStepsPassed + "/" + sanityStepsTotal + " passed " + sanityStatus + "\n\n \t\tScenarios:\n\n\t\t ✔️ Passed: " + sanityScenariosPassed + " [" + sanityScenariosPassedPercentage + "]\n\t\t ❌ Failed: " + sanityScenariosFailed + " [" + sanityScenariosFailedPercentage + "]\n\n\t\tSteps:\n\n\t\t ✔️ Passed Steps: " + sanityStepsPassed + " [" + sanityStepsPassedPercentage + "]\n\t\t ❌ Failed Steps: " + sanityStepsFailed + " [" + sanityStepsFailedPercentage + "]\n\t\t ❔  Skipped Steps: " + sanityStepsSkipped + " [" + sanityStepsSkippedPercentage + "]",
                                "wrap": true,
                                "horizontalAlignment": "Left",
                                "isSubtle": false
                            }
                        ],
                        "horizontalAlignment": "Center",
                        "spacing": "ExtraLarge",
                        "separator": true
                    },
                    {
                        "type": "TextBlock",
                        "text": "To see the full logs click on the button  bellow.",
                        "wrap": true,
                        "separator": true,
                        "spacing": "ExtraLarge"
                    }
                ],
                "actions": [
                    {
                        "type": "Action.OpenUrl",
                        "title": "Workflow",
                        "url": workflowLink,
                    }
                ],
                "$schema": "https://adaptivecards.io/schemas/adaptive-card.json",
                "version": "1.4"
            }
          }
        ],
      };

    console.log(JSON.stringify(message, null, 2))

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