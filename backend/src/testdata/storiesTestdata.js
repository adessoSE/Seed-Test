module.exports.testData = [
  {
    // Logout scenario
    story_id: 386695799,
    background: {
      stepDefinitions: {
        when: [
          {
            id: 1,
            stepType: 'when',
            type: 'Website',
            pre: 'I go to the website:',
            mid: '',
            values: ['https://cucumber-app.herokuapp.com/login'],
          },
          {
            id: 2,
            stepType: 'when',
            type: 'Field',
            pre: 'I insert',
            mid: 'into the field',
            values: ['adessoCucumber', 'githubName'],
          },
          {
            id: 3,
            stepType: 'when',
            type: 'Field',
            pre: 'I insert',
            mid: 'into the field',
            values: ['119234a2e8eedcbe2f6f3a6bbf2ed2f56946e868', 'token'],
          },
          {
            id: 4,
            stepType: 'when',
            type: 'Button',
            pre: 'I click the button:',
            mid: '',
            values: ['submit'],
          },
          {
            id: 5,
            stepType: 'when',
            type: 'Button',
            pre: 'I click the button:',
            mid: '',
            values: ['#'],
          },
        ],
      },
    },
    scenarios: [
      {
        scenario_id: 1,
        name: 'successful Logout',
        stepDefinitions: {
          given: [
            {
              id: 1,
              stepType: 'given',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['User'],
              selection: ['Guest', 'User'],
            },
            {
              id: 2,
              stepType: 'given',
              type: 'Website',
              pre: 'I am on the website:',
              mid: '',
              values: ['https://cucumber-app.herokuapp.com/'],
            },
          ],
          when: [
            {
              id: 1,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['logoutButton'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              type: 'Website',
              pre: 'So I will be navigated to the website:',
              mid: '',
              values: ['https://cucumber-app.herokuapp.com/login'],
            },
            {
              id: 2,
              stepType: 'then',
              type: 'Text',
              pre: 'So I can see the text',
              mid: 'in the textbox:',
              values: ['Github Name', 'githubName'],
            },
          ],
          example: [],
        },
      },
    ],
  },
  {
    // Run test functionality
    story_id: 386697647,
    background: {
      stepDefinitions: {
        when: [],
      },
    },
    scenarios: [
      {
        scenario_id: 1,
        name: 'Run Test',
        stepDefinitions: {
          given: [
            {
              id: 1,
              stepType: 'given',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['Guest'],
              selection: ['Guest', 'User'],
            },
          ],
          when: [
            {
              id: 1,
              stepType: 'when',
              type: 'Website',
              pre: 'I go to the website:',
              mid: '',
              values: ['www.testing.com/myTestPage'],
            },
            {
              id: 2,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['Run'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              type: 'Text',
              pre: 'So I can see the text',
              mid: 'in the textbox:',
              values: ['Start running test cases.'],
            },
          ],
          example: [],
        },
      },
    ],
  },
  {
    // Sign-Up scenario
    story_id: 386696256,
    background: {
      stepDefinitions: {
        when: [],
      },
    },
    scenarios: [
      {
        scenario_id: 1,
        name: 'successful Sign Up',
        stepDefinitions: {
          given: [
            {
              id: 1,
              stepType: 'given',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: [],
              selection: ['Guest', 'User'],
            },
          ],
          when: [
            {
              id: 1,
              stepType: 'when',
              type: 'Website',
              pre: 'I am on the website:',
              mid: '',
              values: ['https://forum.golem.de/register.php?121624'],
            },
            {
              id: 2,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['golemAcceptCookies();'],
            },
            {
              id: 3,
              stepType: 'when',
              type: 'Field',
              pre: 'I insert',
              mid: 'into the field',
              values: ['abcdefguuh1234567890', 'reg-username'],
            },
            {
              id: 4,
              stepType: 'when',
              type: 'Field',
              pre: 'I insert',
              mid: 'into the field',
              values: ['telefonnuuummer@gmail.com', 'reg-email'],
            },
            {
              id: 5,
              stepType: 'when',
              type: 'Field',
              pre: 'I insert',
              mid: 'into the field',
              values: ['cucumber2000', 'reg-password'],
            },
            {
              id: 6,
              stepType: 'when',
              type: 'Field',
              pre: 'I insert',
              mid: 'into the field',
              values: ['cucumber2000', 'reg-password2'],
            },
            {
              id: 7,
              stepType: 'when',
              type: 'Checkbox',
              pre: 'I select from the',
              mid: 'multiple selection, the values',
              values: ['name', 'tos_accept'],
            },
            {
              id: 8,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['Abschicken'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              type: 'Website',
              pre: 'So I will be navigated to the site:',
              mid: '',
              values: ['https://forum.golem.de/register.php'],
            },
          ],
          example: [],
        },

      },
      {
        scenario_id: 2,
        name: 'failed Sign Up',
        stepDefinitions: {
          when: [
            {
              id: 1,
              stepType: 'when',
              type: 'Website',
              pre: 'I am on the website:',
              mid: '',
              values: ['https://forum.golem.de/register.php?121624'],
            },
            {
              id: 2,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['golemAcceptCookies();'],
            },
            {
              id: 3,
              stepType: 'when',
              type: 'Field',
              pre: 'I insert',
              mid: 'into the field',
              values: ['abcdefguuh1234567890', 'reg-username'],
            },
            {
              id: 4,
              stepType: 'when',
              type: 'Field',
              pre: 'I insert',
              mid: 'into the field',
              values: ['telefonnuuummer@gmail.com', 'reg-email'],
            },
            {
              id: 5,
              stepType: 'when',
              type: 'Field',
              pre: 'I insert',
              mid: 'into the field',
              values: ['cucumber2000', 'reg-password'],
            },
            {
              id: 6,
              stepType: 'when',
              type: 'Field',
              pre: 'I insert',
              mid: 'into the field',
              values: ['cucumber2000', 'reg-password2'],
            },
            {
              id: 7,
              stepType: 'when',
              type: 'Checkbox',
              pre: 'I select from the',
              mid: 'multiple selection, the values',
              values: ['name', 'tos_accept'],
            },
            {
              id: 8,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['Abschicken'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              type: 'Website',
              pre: 'So I will be navigated to the site:',
              mid: '',
              values: ['https://forum.golem.de/register.php'],
            },
            {
              id: 2,
              stepType: 'then',
              type: 'Text',
              pre: 'So I can see the text',
              mid: 'in the textbox:',
              values: ['Dieser Name wird bereits von einem Benutzer verwendet. Wenn Sie derjenige sind, loggen Sie sich bitte ein. Ansonsten nutzen Sie bitte einen anderen Namen.', 'attention'],
            },
          ],
          example: [],
        },
      },
    ],
  },
  {
    // Login scenario
    story_id: 386694507,
    background: {
      stepDefinitions: {
        when: [],
      },
    },
    scenarios: [
      {
        scenario_id: 1,
        name: 'Successful Login',
        stepDefinitions: {
          given: [
            {
              id: 1,
              stepType: 'given',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['Guest'],
              selection: ['Guest', 'User'],
            },
          ],
          when: [
            {
              id: 1,
              stepType: 'when',
              type: 'Website',
              pre: 'I am on the website:',
              mid: '',
              values: ['https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home'],
            },
            {
              id: 2,
              stepType: 'when',
              type: 'Field',
              pre: 'I insert',
              mid: 'into the field',
              values: ['<userName>', 'login_field'],
            },
            {
              id: 3,
              stepType: 'when',
              type: 'Field',
              pre: 'I insert',
              mid: 'into the field',
              values: ['<password>', 'password'],
            },
            {
              id: 4,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['commit'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              type: 'Website',
              pre: 'So I will be navigated to the site:',
              mid: '',
              values: ['<website>'],
            },
          ],
          example: [
            {
              id: 1,
              stepType: 'example',
              type: '',
              pre: '',
              mid: '',
              values: ['userName', 'password', 'website'],
            },
            {
              id: 2,
              stepType: 'example',
              type: 'Example',
              pre: '',
              mid: '',
              values: ['AdorableHamster', 'cutehamsterlikesnuts2000', 'https://github.com/'],
            },
            {
              id: 3,
              stepType: 'example',
              type: 'Example',
              pre: '',
              mid: '',
              values: ['NormalHamster', 'FatHamster123', 'https://github.com/account/unverified-email'],
            },
            {
              id: 2,
              stepType: 'example',
              type: 'Example',
              pre: '',
              mid: '',
              values: ['OldHamster', 'UglyHamster123', 'https://github.com/account/unverified-email'],
            },
          ],
        },

      },
      {
        scenario_id: 2,
        name: 'failed Login',
        stepDefinitions: {
          given: [
            {
              id: 1,
              stepType: 'given',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['User'],
              selection: ['Guest', 'User'],
            },
          ],
          when: [
            {
              id: 1,
              stepType: 'when',
              type: 'Website',
              pre: 'I am on the website:',
              mid: '',
              values: ['https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home'],
            },
            {
              id: 2,
              stepType: 'when',
              type: 'Field',
              pre: 'I insert',
              mid: 'into the field',
              values: ['arbage', 'login_field'],
            },
            {
              id: 3,
              stepType: 'when',
              type: 'Field',
              pre: 'I insert',
              mid: 'into the field',
              values: ['number', 'password'],
            },
            {
              id: 4,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['commit'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              type: 'Website',
              pre: 'So I will be navigated to the site:',
              mid: '',
              values: ['https://github.com/session'],
            },
            {
              id: 2,
              stepType: 'then',
              type: 'Text',
              pre: 'So I can see the text',
              mid: 'in the textbox:',
              values: ['Incorrect username or password', 'div'],
            },
          ],
          example: [],
        },

      },
    ],
  },
  {
    // Delete scenarios
    story_id: 386693823,
    background: {
      stepDefinitions: {
        when: [],
      },
    },
    scenarios: [
      {
        scenario_id: 1,
        name: 'successful Deletion',
        stepDefinitions: {
          given: [
            {
              id: 1,
              stepType: 'given',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['Punisher', 'Bullseye'],
              selection: ['Guest', 'User'],
            },
          ],
          when: [
            {
              id: 1,
              stepType: 'when',
              type: 'Website',
              pre: 'I am on the website:',
              mid: '',
              values: ['www.cucumber.com'],
            },
            {
              id: 2,
              stepType: 'when',
              type: 'Field',
              pre: 'I insert',
              mid: 'into the field',
              values: ['Punisher', 'Username'],
            },
            {
              id: 3,
              stepType: 'when',
              type: 'Field',
              pre: 'I insert',
              mid: 'into the field',
              values: ['Bullseye', 'Password'],
            },
            {
              id: 4,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['Delete Scenario'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              type: 'Text',
              pre: 'So I can see the text',
              mid: 'in the textbox:',
              values: ['Scenario successfully deleted', 'Scenario Deleted'],
            },
          ],
          example: [],
        },

      },
      {
        scenario_id: 2,
        name: 'No Scenario to delete',
        stepDefinitions: {
          when: [
            {
              id: 1,
              stepType: 'when',
              type: 'Website',
              pre: 'I go to the website:',
              mid: '',
              values: ['www.cucumber.com'],
            },
            {
              id: 2,
              stepType: 'when',
              type: 'Field',
              pre: 'I insert',
              mid: 'into the field',
              values: ['Punisher', 'Username'],
            },
            {
              id: 3,
              stepType: 'when',
              type: 'Field',
              pre: 'I insert',
              mid: 'into the field',
              values: ['Bullseye', 'Password'],
            },
            {
              id: 4,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['Delete Scenario'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              type: 'Text',
              pre: 'So I can see the text',
              mid: 'in the textbox:',
              values: ['Scenario_Id does not exist', 'Scenario not found'],
            },
          ],
          example: [],
        },

      },
    ],
  },
  {
    // Story creation
    story_id: 386693457,
    background: {
      stepDefinitions: {
        when: [],
      },
    },
    scenarios: [
      {
        scenario_id: 1,
        name: 'successful Story creation',
        stepDefinitions: {
          given: [
            {
              id: 1,
              stepType: 'given',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['Guest'],
              selection: ['Guest', 'User'],
            },
          ],
          when: [
            {
              id: 1,
              stepType: 'when',
              type: 'Website',
              pre: 'I am on the website:',
              mid: '',
              values: ['www.cucumber.com'],
            },
            {
              id: 2,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['Create Story'],
            },
          ],
          then: [
            {
              id: 2,
              stepType: 'then',
              type: 'Text',
              pre: 'So I can see the text',
              mid: 'in the textbox:',
              values: ['New Story created', 'Success'],
            },
          ],
          example: [],
        },

      },
      {
        scenario_id: 2,
        name: 'failed Story creation',
        stepDefinitions: {
          given: [
            {
              id: 1,
              stepType: 'given',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['Guest'],
              selection: ['Guest', 'User'],
            },
          ],
          when: [
            {
              id: 1,
              stepType: 'when',
              type: 'Website',
              pre: 'I am on the website:',
              mid: '',
              values: ['www.cucumber.com'],
            },
            {
              id: 2,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['Create Story'],
            },
          ],
          then: [
            {
              id: 2,
              stepType: 'then',
              type: 'Text',
              pre: 'So I can see the text',
              mid: 'in the textbox:',
              values: ['Could not create Story', 'Error'],
            },
          ],
          example: [],
        },

      },
    ],
  },
  {
    // Scenario creation
    story_id: 382626033,
    background: {
      stepDefinitions: {
        when: [],
      },
    },
    scenarios: [
      {
        scenario_id: 1,
        name: 'successful Scenario creation',
        stepDefinitions: {
          given: [
            {
              id: 1,
              stepType: 'given',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['Guest'],
              selection: ['Guest', 'User'],
            },
          ],
          when: [
            {
              id: 1,
              stepType: 'when',
              type: 'Website',
              pre: 'I am on the website:',
              mid: '',
              values: ['www.cucumber.com'],
            },
            {
              id: 2,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['Create Scenario'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              type: 'Text',
              pre: 'So I can see the text',
              mid: 'in the textbox:',
              values: ['New Scenario created', 'Sucess'],
            },
          ],
          example: [],
        },

      },
      {
        scenario_id: 2,
        name: 'failed Scenario creation',
        stepDefinitions: {
          given: [
            {
              id: 1,
              stepType: 'given',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['Guest'],
              selection: ['Guest', 'User'],
            },
          ],
          when: [
            {
              id: 1,
              stepType: 'when',
              type: 'Website',
              pre: 'I am on the website:',
              mid: '',
              values: ['www.cucumber.com'],
            },
            {
              id: 2,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['Create Scenario'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              type: 'Text',
              pre: 'So I can see the text',
              mid: 'in the textbox:',
              values: ['Could not create Scenario', 'Error'],
            },
          ],
          example: [],
        },

      },
    ],
  },
  {
    // Visual test response
    story_id: 386692544,
    background: {
      stepDefinitions: {
        when: [],
      },
    },
    scenarios: [
      {
        scenario_id: 1,
        name: 'Visual Test Response',
        stepDefinitions: {
          given: [
            {
              id: 1,
              stepType: 'given',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['Superman', 'kryptonite'],
              selection: ['Guest', 'User'],
            },
          ],
          when: [
            {
              id: 1,
              stepType: 'when',
              type: 'Website',
              pre: 'I am on the website:',
              mid: '',
              values: ['www.cucumber.com'],
            },
            {
              id: 2,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['Test it'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              type: 'Website',
              pre: 'So I will be navigated to the site:',
              mid: '',
              values: ['www.cucumber.com/results'],
            },
            {
              id: 2,
              stepType: 'then',
              type: 'Text',
              pre: 'So I can see the text',
              mid: 'in the textbox:',
              values: ['ThenStep 1 Success', 'Result'],
            },
            {
              id: 3,
              stepType: 'then',
              type: 'Text',
              pre: 'So I can see the text',
              mid: 'in the textbox:',
              values: ['ThenStep 2 Failed', 'Result'],
            },
          ],
          example: [],
        },

      },
    ],
  },
  {
    // Access scenario
    story_id: 386696070,
    background: {
      stepDefinitions:
                {
                  when: [
                    {
                      id: 1,
                      stepType: 'when',
                      type: 'Website',
                      pre: 'I am on the website:',
                      mid: '',
                      values: ['https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home'],
                    },
                    {
                      id: 2,
                      stepType: 'when',
                      type: 'Field',
                      pre: 'I insert',
                      mid: 'into the field',
                      values: ['<userName>', 'login_field'],
                    },
                    {
                      id: 3,
                      stepType: 'when',
                      type: 'Field',
                      pre: 'I insert',
                      mid: 'into the field',
                      values: ['<password>', 'password'],
                    },
                    {
                      id: 4,
                      stepType: 'when',
                      type: 'Button',
                      pre: 'I click the button:',
                      mid: '',
                      values: ['commit'],
                    },
                  ],
                },
    },
    scenarios: [
      {
        scenario_id: 1,
        name: 'successful Authentification',
        stepDefinitions: {
          given: [
            {
              id: 1,
              stepType: 'given',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['Guest'],
              selection: ['Guest', 'User'],
            },
          ],
          when: [
            {
              id: 1,
              stepType: 'when',
              type: 'Website',
              pre: 'I am on the website:',
              mid: '',
              values: ['https://www.adesso.de/'],
            },
            {
              id: 2,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['Login'],
            },
            {
              id: 3,
              stepType: 'when',
              type: 'Checkbox',
              pre: 'I select from the',
              mid: 'multiple selection, the values',
              values: ['Pets', 'Cat', 'Dog', 'Spider'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              type: 'Website',
              pre: 'So I will be navigated to the site:',
              mid: '',
              values: ['www.adesso.de/myProfile'],
            },
            {
              id: 2,
              stepType: 'then',
              type: 'Text',
              pre: 'So I can see the text',
              mid: 'in the textbox:',
              values: ['Successfully logged in', 'Validation'],
            },
          ],
          example: [],
        },

      },
      {
        scenario_id: 2,
        name: 'failed Authentification',
        stepDefinitions: {
          given: [
            {
              id: 1,
              stepType: 'given',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['SomeUsername', 'Secret666'],
              selection: ['Guest', 'User'],
            },
          ],
          when: [
            {
              id: 1,
              stepType: 'when',
              type: 'Website',
              pre: 'I am on the website:',
              mid: '',
              values: ['www.gamestar.de'],
            },
            {
              id: 2,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['Login'],
            },
            {
              id: 3,
              stepType: 'when',
              type: 'Radio',
              pre: 'I select from the',
              mid: 'from the selection',
              values: ['Games', 'Rpg'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              type: 'Website',
              pre: 'So I will be navigated to the site:',
              mid: '',
              values: ['www.gamestar.de/login'],
            },
            {
              id: 2,
              stepType: 'then',
              type: 'Text',
              pre: 'So I can see the text',
              mid: 'in the textbox:',
              values: ['Password or User incorrect', 'Validation'],
            },
          ],
          example: [],
        },

      },
    ],
  },
  {
    // Rename scenarios
    story_id: 386692174,
    background: {
      stepDefinitions: {
        when: [],
      },
    },
    scenarios: [
      {
        scenario_id: 1,
        name: 'Renamed Scenario',
        stepDefinitions: {
          given: [
            {
              id: 1,
              stepType: 'given',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['User'],
              selection: ['Guest', 'User'],
            },
          ],
          when: [
            {
              id: 1,
              stepType: 'when',
              type: 'Website',
              pre: 'I am on the website:',
              mid: '',
              values: ['www.mywebsite.com'],
            },
            {
              id: 2,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['Edit'],
            },
            {
              id: 3,
              stepType: 'when',
              type: 'Field',
              pre: 'I insert',
              mid: 'into the field',
              values: ['Renamed Scenario', 'Scenario Name'],
            },
            {
              id: 4,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['Save'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              type: 'Text',
              pre: 'So I can see the text',
              mid: 'in the textbox:',
              values: ['Updated scenario name.', 'Validation'],
            },
          ],
          example: [],
        },

      },
      {
        scenario_id: 1,
        name: 'Faild Updating',
        stepDefinitions: {
          given: [
            {
              id: 1,
              stepType: 'given',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['Guest'],
              selection: ['Guest', 'User'],
            },
          ],
          when: [
            {
              id: 1,
              stepType: 'when',
              type: 'Website',
              pre: 'I am on the website:',
              mid: '',
              values: ['www.mywebsite.com'],
            },
            {
              id: 2,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['Edit'],
            },
            {
              id: 3,
              stepType: 'when',
              type: 'Field',
              pre: 'I insert',
              mid: 'into the field',
              values: ['Renamed Scenario', 'Scenario Name'],
            },
            {
              id: 4,
              stepType: 'when',
              type: 'Button',
              pre: 'I click the button:',
              mid: '',
              values: ['Save'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              type: 'Text',
              pre: 'So I can see the text',
              mid: 'in the textbox:',
              values: ['Could not update scenario name!', 'Validation'],
            },
          ],
          example: [],
        },

      },
    ],
  },
];
