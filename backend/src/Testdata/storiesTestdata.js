module.exports.testdata = [
  {
    story_id: 386695799, scenarios: [
      {
        scenario_id: 1,
        name: 'successful Login',
        stepDefinitions: [
          {
            given: [
              { id: 1, 
                label: 'Guest', 
                type: 'Role', 
                pre: 'As a', 
                mid: '', 
                values: [], 
                selection: ['Guest']
              }
            ],
            when: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'I want to visit this site:',
                mid: '',
                values: ['www.addeso.de']
              },
              {
                id: 2,
                label: 'Login',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: []
              },
              {
                id: 3,
                label: 'Pets',
                type: 'Checkbox',
                pre: 'I want to select multiple Values for:',
                mid: '',
                values: ['Cat', 'Dog', 'Spider']
              }
            ],
            then: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'So I will be navigated to:',
                mid: '',
                values: ['www.adesso.de/myProfile']
              },
              {
                id: 2,
                label: 'Validation',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                values: ['Successfully logged in']
              }
            ]
          }]
      },
      {
        scenario_id: 2,
        name: 'failed Login',
        stepDefinitions: [
          {
            given: [
              {
                id: 1,
                label: 'User',
                type: 'Role',
                pre: 'As a',
                mid: '',
                values: ['Mustermann', 'Geheim666'],
                selection: ['User']
              }
            ],
            when: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'I want to visite this site:',
                mid: '',
                values: ['www.gamestar.de']
              },
              {
                id: 2,
                label: 'Login',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: []
              },
              {
                id: 3,
                label: 'Games',
                type: 'individual_selection',
                pre: 'I want to select:',
                mid: '',
                values: ['Rpg']
              }
            ],
            then: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'So I will be navigated to:',
                mid: '',
                values: ['www.gamestar.de/login']
              },
              {
                id: 2,
                label: 'Validation',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                values: ['Password or User incorrect']
              }
            ]

          }]
      }]
  },
  {
    story_id: 386697647, scenarios: [
      {
        scenario_id: 1,
        name: 'sign up',
        stepDefinitions: [
          {
            given: [
              {
                id: 1,
                label: 'User',
                type: 'Role',
                pre: 'As a',
                mid: '',
                values: ['Mustermann', 'Geheim666'],
                selection: ['User']
              }
            ],
            when: [
              {
                id: 1, label: 'Website',
                type: 'Website',
                pre: 'I want to visit this site:',
                mid: '',
                values: ['www.abc.de']
              },

              {
                id: 2,
                label: 'Username',
                type: 'Website',
                pre: 'I want to insert:',
                mid: '',
                values: ['Mustermann']
              },

              {
                id: 3,
                label: 'Password',
                type: 'Website',
                pre: 'I want to insert:',
                mid: '',
                values: ['Geheim123']
              },

              {
                id: 4,
                label: 'SignUp',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: []
              }
            ],
            then: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'So I will be navigated to:',
                mid: '',
                values: ['www.abc.de/myProfile']
              },
              {
                id: 2,
                label: 'Validation',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                values: ['Successfully signed up']
              }
            ]

          }]
      },
      {
        scenario_id: 2,
        name: 'user already exist',
        stepDefinitions: [
          {
            given: [
              {
                id: 1,
                label: 'Guest',
                type: 'Role',
                pre: 'As a',
                mid: '',
                values: [''],
                selection: ['Guest']
              }
            ],
            when: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'I want to visit this site:',
                mid: '',
                values: ['www.abc.de']
              },
              {
                id: 2,
                label: 'Username',
                type: 'Field',
                pre: 'I want to insert into the',
                mid: 'field, the value/text',
                values: ['Mustermann']
              },
              {
                id: 3,
                label: 'Password',
                type: 'Field',
                pre: 'I want to insert:',
                mid: '',
                values: ['Geheim123']
              },
              {
                id: 4,
                label: 'SignUp',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: ['']
              },

            ],
            then: [
              {
                id: 1,
                label: 'www.abc.de',
                type: 'Website',
                pre: 'So I will be navigated to:',
                mid: '',
                values: []
              },
              {
                id: 2,
                label: 'Validation',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                values: ['User already exists']
              }
            ]

          }]
      }]
  },

];
