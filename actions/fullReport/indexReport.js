async function postMessage() {
    const fetch = await import('node-fetch').then((module) => module.default);
    const webhook = process.env.INPUT_WEBHOOK;
    const prnumber = process.env.INPUT_PRNUMBER;
    const originBranch = process.env.INPUT_ORIGINBRANCH;
    const destinationBranch = process.env.INPUT_DESTINATIONBRANCH;
    const requestor = process.env.INPUT_REQUESTOR;
    const date = process.env.INPUT_DATE;
    const description = process.env.INPUT_DESCRIPTION || "-";
    const dockerStatus = (process.env.INPUT_DOCKERSTATUS === "success");

    // Frontend block
    const frontendSuitsPassed = parseInt(process.env.INPUT_FRONTENDSUITSPASSED) || "-";
    const frontendSuitsFailed = parseInt(process.env.INPUT_FRONTENDSUITSFAILED) || "-";
    const frontendTestsPassed = parseInt(process.env.INPUT_FRONTENDTESTSPASSED) || "-";
    const frontendTestsFailed = parseInt(process.env.INPUT_FRONTENDTESTSFAILED )|| "-";
    const frontendSuitsTotal = dockerStatus ? (frontendSuitsPassed + frontendSuitsFailed) : "-";
    const frontendTestsTotal = dockerStatus ? (frontendTestsPassed + frontendTestsFailed) : "-";
    const frontendSuitsPassedPercentage = dockerStatus ? calculatePercentage(frontendSuitsPassed, frontendSuitsTotal) : "-";
    const frontendSuitsFailedPercentage = dockerStatus ? calculatePercentage(frontendSuitsFailed, frontendSuitsTotal) : "-";
    const frontendTestsPassedPercentage = dockerStatus ? calculatePercentage(frontendTestsPassed, frontendTestsTotal) : "-";
    const frontendTestsFailedPercentage = dockerStatus ? calculatePercentage(frontendTestsFailed, frontendTestsTotal) : "-";
    const frontendBottomText = process.env.INPUT_FRONTENDBOTTOMTEXT || "";
    const frontendStatus = dockerStatus ? getStatus(frontendTestsPassed, frontendTestsTotal) : ""

    // Backend block
    const backendSuitsPassed = parseInt(process.env.INPUT_BACKENDSUITSPASSED) || "-";
    const backendSuitsFailed = parseInt(process.env.INPUT_BACKENDSUITSFAILED) || "-";
    const backendTestsPassed = parseInt(process.env.INPUT_BACKENDTESTSPASSED) || "-";
    const backendTestsFailed = parseInt(process.env.INPUT_BACKENDTESTSFAILED) || "-";
    const backendSuitsTotal = dockerStatus ? backendSuitsPassed + backendSuitsFailed : "-";
    const backendTestsTotal = dockerStatus ? backendTestsPassed + backendTestsFailed : "-";
    const backendSuitsPassedPercentage = dockerStatus ? calculatePercentage(backendSuitsPassed, backendSuitsTotal) : "-";
    const backendSuitsFailedPercentage = dockerStatus ? calculatePercentage(backendSuitsFailed, backendSuitsTotal) : "-";
    const backendTestsPassedPercentage = dockerStatus ? calculatePercentage(backendTestsPassed, backendTestsTotal) : "-";
    const backendTestsFailedPercentage = dockerStatus ? calculatePercentage(backendTestsFailed, backendTestsTotal) : "-";
    const backendBottomText = process.env.INPUT_BACKENDBOTTOMTEXT || "";
    const backendStatus = dockerStatus ? getStatus(backendTestsPassed, backendTestsTotal) : "-"

    // Sanity block
    const sanityScenariosPassed = parseInt(process.env.INPUT_SANITYSCENARIOSPASSED) || "-";
    const sanityScenariosFailed = parseInt(process.env.INPUT_SANITYSCENARIOSFAILED) || "-";
    const sanityStepsPassed = parseInt(process.env.INPUT_SANITYSTEPSPASSED) || "-";
    const sanityStepsFailed = parseInt(process.env.INPUT_SANITYSTEPSFAILED) || "-";
    const sanityStepsSkipped = parseInt(process.env.INPUT_SANITYSTEPSSKIPPED) || "-";
    const sanityScenariosTotal = dockerStatus ? sanityScenariosPassed + sanityScenariosFailed : "-";
    const sanityStepsTotal = dockerStatus ? sanityStepsPassed + sanityStepsFailed + sanityStepsSkipped : "-";
    const sanityScenariosPassedPercentage = dockerStatus ? calculatePercentage(sanityScenariosPassed, sanityScenariosTotal) : "-";
    const sanityScenariosFailedPercentage = dockerStatus ? calculatePercentage(sanityScenariosFailed, sanityScenariosTotal) : "-";
    const sanityStepsPassedPercentage = dockerStatus ? calculatePercentage(sanityStepsPassed, sanityStepsTotal) : "-";
    const sanityStepsFailedPercentage = dockerStatus ? calculatePercentage(sanityStepsFailed, sanityStepsTotal) : "-";
    const sanityStepsSkippedPercentage = dockerStatus ? calculatePercentage(sanityStepsSkipped, sanityStepsTotal) : "-";
    const sanityStatus = dockerStatus ? getStatus(sanityStepsPassed, sanityStepsTotal) : "-";

    const workflowLink = process.env.INPUT_WORKFLOWLINK || "";

    function calculatePercentage(num1, num2) {
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
        if (passed === total) {
            return "✅"
        }

        return "⚠️"
    }

    var message = {
        type: 'message',
        attachments: [
          { 
            "contentType": "application/vnd.microsoft.card.adaptive",
            "content": {
                "type": "AdaptiveCard",
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
                                        "text": "Pull Request #" + prnumber,
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
                                        "url": "https://pbs.twimg.com/profile_images/3647943215/d7f12830b3c17a5a9e4afcc370e3a37e_400x400.jpeg",
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
                                        "text": "Created " + date,
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
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "version": "1.4"
            }
          }
        ],
      };

    console.log(JSON.stringify(message, null, 2))

    try {
        response = await fetch(webhook, {
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