module.exports.testData = [
  {
    // Logout scenario
    story_id: 386695799,
    background: {
      stepDefinitions: {
        when: [],
      },
    },
    scenarios: [
      {
        scenario_id: 1,
        name: 'successful Logout',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              stepType: 'given',
              label: 'User',
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
              label: null,
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.somehomepage.com/myhome'],
            },
            {
              id: 2,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['Logout'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              label: null,
              type: 'Website',
              pre: 'So I will be navigated to the site:',
              mid: '',
              values: ['www.somehomepage.com'],
            },
            {
              id: 2,
              stepType: 'then',
              label: 'Validation',
              type: 'Text',
              pre: 'So I can see in the',
              mid: 'textbox, the text',
              values: ['Successfully logged out'],
            },
          ],
          example: [
            {
              id: 1,
              stepType: 'example',
              label: [],
              type: 'Example',
              pre: '',
              mid: '',
              values: ['Username', 'Password'],
            },
            {
              id: 2,
              stepType: 'example',
              label: [],
              type: 'Example',
              pre: '',
              mid: '',
              values: ['Superman', 'Kyrptonit'],
            }, {
              id: 1,
              stepType: 'then',
              label: 'test',
              type: 'Website',
              pre: 'So I will be navigated to the site:',
              mid: '',
              values: ['www.somehomepage.com', 'testi'],
            },
          ],
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
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              stepType: 'given',
              label: 'Guest',
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
              label: null,
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.testing.com/myTestPage'],
            },
            {
              id: 2,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['Run'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              label: 'Validation',
              type: 'Text',
              pre: 'So I can see in the',
              mid: 'textbox, the text',
              values: ['Start running test cases.'],
            },
          ],
          example: [
          ],
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
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              stepType: 'given',
              label: 'User',
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
              label: null,
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['https://forum.golem.de/register.php?121624'],
            },
            {
              id: 2,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['golemAcceptCookies();'],
            },
            {
              id: 3,
              stepType: 'when',
              label: 'reg-username',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['abcdefguuh1234567890'],
            },
            {
              id: 4,
              stepType: 'when',
              label: 'reg-email',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['telefonnuuummer@gmail.com'],
            },
            {
              id: 5,
              stepType: 'when',
              label: 'reg-password',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['cucumber2000'],
            },
            {
              id: 6,
              stepType: 'when',
              label: 'reg-password2',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['cucumber2000'],
            },
            {
              id: 7,
              stepType: 'when',
              label: 'name',
              type: 'Checkbox',
              pre: 'I want to select from the',
              mid: 'selection, the value',
              values: ['tos_accept'],
            },
            {
              id: 8,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['Abschicken'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              label: null,
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
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              stepType: 'given',
              label: 'User',
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
              label: null,
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['https://forum.golem.de/register.php?121624'],
            },
            {
              id: 2,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['golemAcceptCookies();'],
            },
            {
              id: 3,
              stepType: 'when',
              label: 'reg-username',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['abcdefguuh1234567890'],
            },
            {
              id: 4,
              stepType: 'when',
              label: 'reg-email',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['telefonnuuummer@gmail.com'],
            },
            {
              id: 5,
              stepType: 'when',
              label: 'reg-password',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['cucumber2000'],
            },
            {
              id: 6,
              stepType: 'when',
              label: 'reg-password2',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['cucumber2000'],
            },
            {
              id: 7,
              stepType: 'when',
              label: 'name',
              type: 'Checkbox',
              pre: 'I want to select from the',
              mid: 'selection, the value',
              values: ['tos_accept'],
            },
            {
              id: 8,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['Abschicken'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              label: null,
              type: 'Website',
              pre: 'So I will be navigated to the site:',
              mid: '',
              values: ['https://forum.golem.de/register.php'],
            },
            {
              id: 2,
              stepType: 'then',
              label: 'attention',
              type: 'Text',
              pre: 'So I can see in the',
              mid: 'textbox, the text',
              values: ['Dieser Name wird bereits von einem Benutzer verwendet. Wenn Sie derjenige sind, loggen Sie sich bitte ein. Ansonsten nutzen Sie bitte einen anderen Namen.'],
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
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              stepType: 'given',
              label: 'Guest',
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
              label: null,
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home'],
            },
            {
              id: 2,
              stepType: 'when',
              label: 'login_field',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['<userName>'],
            },
            {
              id: 3,
              stepType: 'when',
              label: 'password',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['<password>'],
            },
            {
              id: 4,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['commit'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              label: null,
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
              label: [],
              type: '',
              pre: '',
              mid: '',
              values: ['userName', 'password', 'website'],
            },
            {
              id: 2,
              stepType: 'example',
              label: [],
              type: 'Example',
              pre: '',
              mid: '',
              values: ['AdorableHamster', 'cutehamsterlikesnuts2000', 'https://github.com/'],
            },
            {
              id: 3,
              stepType: 'example',
              label: [],
              type: 'Example',
              pre: '',
              mid: '',
              values: ['NormalHamster', 'FatHamster123', 'https://github.com/account/unverified-email'],
            },
            {
              id: 2,
              stepType: 'example',
              label: [],
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
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              stepType: 'given',
              label: 'User',
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
              label: null,
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home'],
            },
            {
              id: 2,
              stepType: 'when',
              label: 'login_field',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['arbage'],
            },
            {
              id: 3,
              stepType: 'when',
              label: 'password',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['number'],
            },
            {
              id: 4,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['commit'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              label: null,
              type: 'Website',
              pre: 'So I will be navigated to the site:',
              mid: '',
              values: ['https://github.com/session'],
            },
            {
              id: 2,
              stepType: 'then',
              label: 'div',
              type: 'Text',
              pre: 'So I can see in the',
              mid: 'textbox, the text',
              values: ['Incorrect username or password'],
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
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              stepType: 'given',
              label: 'User',
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
              label: null,
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.cucumber.com'],
            },
            {
              id: 2,
              stepType: 'when',
              label: 'Username',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['Punisher'],
            },
            {
              id: 3,
              stepType: 'when',
              label: 'Password',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['Bullseye'],
            },
            {
              id: 4,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['Delete Scenario'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              label: 'Scenario Deleted',
              type: 'Text',
              pre: 'So I can see in the',
              mid: 'textbox, the text',
              values: ['Scenario successfully deleted'],
            },
          ],
          example: [],
        },

      },
      {
        scenario_id: 2,
        name: 'No Scenario to delete',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              stepType: 'given',
              label: 'User',
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
              label: null,
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.cucumber.com'],
            },
            {
              id: 2,
              stepType: 'when',
              label: 'Username',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['Punisher'],
            },
            {
              id: 3,
              stepType: 'when',
              label: 'Password',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['Bullseye'],
            },
            {
              id: 4,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['Delete Scenario'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              label: 'Scenario not found',
              type: 'Text',
              pre: 'So I can see in the',
              mid: 'textbox, the text',
              values: ['Scenario_Id does not exist'],
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
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              stepType: 'given',
              label: 'Guest',
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
              label: null,
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.cucumber.com'],
            },
            {
              id: 2,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['Create Story'],
            },
          ],
          then: [
            {
              id: 2,
              stepType: 'then',
              label: 'Success',
              type: 'Text',
              pre: 'So I can see in the',
              mid: 'textbox, the text',
              values: ['New Story created'],
            },
          ],
          example: [],
        },

      },
      {
        scenario_id: 2,
        name: 'failed Story creation',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              stepType: 'given',
              label: 'Guest',
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
              label: null,
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.cucumber.com'],
            },
            {
              id: 2,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['Create Story'],
            },
          ],
          then: [
            {
              id: 2,
              stepType: 'then',
              label: 'Error',
              type: 'Text',
              pre: 'So I can see in the',
              mid: 'textbox, the text',
              values: ['Could not create Story'],
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
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              stepType: 'given',
              label: 'Guest',
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
              label: null,
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.cucumber.com'],
            },
            {
              id: 2,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['Create Scenario'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              label: 'Success',
              type: 'Text',
              pre: 'So I can see in the',
              mid: 'textbox, the text',
              values: ['New Scenario created'],
            },
          ],
          example: [],
        },

      },
      {
        scenario_id: 2,
        name: 'failed Scenario creation',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              stepType: 'given',
              label: 'Guest',
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
              label: null,
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.cucumber.com'],
            },
            {
              id: 2,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['Create Scenario'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              label: 'Error',
              type: 'Text',
              pre: 'So I can see in the',
              mid: 'textbox, the text',
              values: ['Could not create Scenario'],
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
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              stepType: 'given',
              label: 'User',
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
              label: null,
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.cucumber.com'],
            },
            {
              id: 2,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['Test it'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              label: null,
              type: 'Website',
              pre: 'So I will be navigated to the site:',
              mid: '',
              values: ['www.cucumber.com/results'],
            },
            {
              id: 2,
              stepType: 'then',
              label: 'Result',
              type: 'Text',
              pre: 'So I can see in the',
              mid: 'textbox, the text',
              values: ['ThenStep 1 Success'],
            },
            {
              id: 3,
              stepType: 'then',
              label: 'Result',
              type: 'Text',
              pre: 'So I can see in the',
              mid: 'textbox, the text',
              values: ['ThenStep 2 Failed'],
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
              label: null,
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home'],
            },
            {
              id: 2,
              stepType: 'when',
              label: 'login_field',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['<userName>'],
            },
            {
              id: 3,
              stepType: 'when',
              label: 'password',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['<password>'],
            },
            {
              id: 4,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
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
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              stepType: 'given',
              label: 'Guest',
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
              label: null,
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['https://www.adesso.de/'],
            },
            {
              id: 2,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['Login'],
            },
            {
              id: 3,
              stepType: 'when',
              label: 'Pets',
              type: 'Checkbox',
              pre: 'I want to select from the',
              mid: 'multiple selection, the values',
              values: ['Cat', 'Dog', 'Spider'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              label: null,
              type: 'Website',
              pre: 'So I will be navigated to the site:',
              mid: '',
              values: ['www.adesso.de/myProfile'],
            },
            {
              id: 2,
              stepType: 'then',
              label: 'Validation',
              type: 'Text',
              pre: 'So I can see in the',
              mid: 'textbox, the text',
              values: ['Successfully logged in'],
            },
          ],
          example: [],
        },

      },
      {
        scenario_id: 2,
        name: 'failed Authentification',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              stepType: 'given',
              label: 'User',
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
              label: null,
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.gamestar.de'],
            },
            {
              id: 2,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['Login'],
            },
            {
              id: 3,
              stepType: 'when',
              label: 'Games',
              type: 'Radio',
              pre: 'I want to select from the',
              mid: 'selection, the value',
              values: ['Rpg'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              label: null,
              type: 'Website',
              pre: 'So I will be navigated to the site:',
              mid: '',
              values: ['www.gamestar.de/login'],
            },
            {
              id: 2,
              stepType: 'then',
              label: 'Validation',
              type: 'Text',
              pre: 'So I can see in the',
              mid: 'textbox, the text',
              values: ['Password or User incorrect'],
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
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              stepType: 'given',
              label: 'User',
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
              label: null,
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.mywebsite.com'],
            },
            {
              id: 2,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['Edit'],
            },
            {
              id: 3,
              stepType: 'when',
              label: 'Scenario Name',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['Renamed Scenario'],
            },
            {
              id: 4,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['Save'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              label: 'Validation',
              type: 'Text',
              pre: 'So I can see in the',
              mid: 'textbox, the text',
              values: ['Updated scenario name.'],
            },
          ],
          example: [
          ],
        },

      },
      {
        scenario_id: 1,
        name: 'Faild Updating',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              stepType: 'given',
              label: 'Guest',
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
              label: null,
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.mywebsite.com'],
            },
            {
              id: 2,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['Edit'],
            },
            {
              id: 3,
              stepType: 'when',
              label: 'Scenario Name',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value',
              values: ['Renamed Scenario'],
            },
            {
              id: 4,
              stepType: 'when',
              label: null,
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: ['Save'],
            },
          ],
          then: [
            {
              id: 1,
              stepType: 'then',
              label: 'Validation',
              type: 'Text',
              pre: 'So I can see in the',
              mid: 'textbox, the text',
              values: ['Could not update scenario name!'],
            },
          ],
          example: [
          ],
        },

      },
    ],
  },
];
