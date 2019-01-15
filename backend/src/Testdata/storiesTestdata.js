module.exports.testdata = [
  {
    story_id: 386695799, scenarios: [
      {
        scenario_id: 1,
        name: 'successful Login',
        stepDefinitions: [
          {
            given: [
              {
                id: 1,
                label: 'Guest',
                type: 'Role',
                pre: 'As a',
                mid: '',
                values: [],
                selection: ['Guest', 'User']
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
          }
        ]
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
                selection: ['Guest', 'User']
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
          }
        ]
      }
    ]
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
                selection: ['Guest', 'User']
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
                type: 'Field',
                pre: 'I want to insert:',
                mid: '',
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

          }
        ]
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
                selection: ['Guest', 'User']
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

          }
        ]
      }
    ]
  },
  {
    story_id: 386696256, scenarios: [
      {
        scenario_id: 1,
        name: 'successful Sign Up',
        stepDefinitions: [
          {
            given: [
              {
                id: 1,
                label: 'User',
                type: 'Role',
                pre: 'As a',
                mid: '',
                values: ['Superman', 'kryptonit'],
                selection: ['Guest', 'User']
              }
            ],
            when: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'I want to visit this site:',
                mid: '',
                values: ['www.superhelden.de']
              },
              {
                id: 2,
                label: 'Sign Up',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: []
              },
              {
                id: 3,
                label: 'Username',
                type: 'Field',
                pre: 'I want to insert into the',
                mid: 'field, the value/text',
                values: ['Superman']
              },
              {
                id: 4,
                label: 'Password',
                type: 'Field',
                pre: 'I want to insert:',
                mid: '',
                values: ['kryptonit']
              },
              {
                id: 5,
                label: 'Finish',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: []
              },
            ],
            then: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'So I will be navigated to:',
                mid: '',
                values: ['www.superhelden.de/newProfile']
              },
              {
                id: 2,
                label: 'Validation',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                values: ['Successfully Signed Up']
              }
            ]
          }
        ]
      },
      {
        scenario_id: 2,
        name: 'failed Sign Up',
        stepDefinitions: [
          {
            given: [
              {
                id: 1,
                label: 'User',
                type: 'Role',
                pre: 'As a',
                mid: '',
                values: ['Superman', 'kryptonit'],
                selection: ['Guest', 'User']
              }
            ],
            when: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'I want to visite this site:',
                mid: '',
                values: ['www.superhelden.de']
              },
              {
                id: 2,
                label: 'Sign Up',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: []
              },
              {
                id: 3,
                label: 'Username',
                type: 'Field',
                pre: 'I want to insert into the',
                mid: 'field, the value/text',
                values: ['Superman']
              },
              {
                id: 4,
                label: 'Password',
                type: 'Field',
                pre: 'I want to insert:',
                mid: '',
                values: ['kryptonit']
              },
              {
                id: 5,
                label: 'Finish',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: []
              },
            ],
            then: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'So I will be navigated to:',
                mid: '',
                values: ['www.sperhelden.de/newProfile']
              },
              {
                id: 2,
                label: 'Validation',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                values: ['Error code 4711']
              }
            ]
          }
        ]
      }
    ]
  },
  {
    story_id: 386696070, scenarios: [
      {
        scenario_id: 1,
        name: 'successful Authentication',
        stepDefinitions: [
          {
            given: [
              {
                id: 1,
                label: 'User',
                type: 'Role',
                pre: 'As a',
                mid: '',
                values: ['Spiderman', 'MaryJane'],
                selection: ['Guest', 'User']
              }
            ],
            when: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'I want to visit this site:',
                mid: '',
                values: ['www.mjdiaries.de']
              },
              {
                id: 2,
                label: 'Forum',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: []
              },
              {
                id: 3,
                label: 'Username',
                type: 'Field',
                pre: 'I want to insert into the',
                mid: 'field, the value/text',
                values: ['Spiderman']
              },
              {
                id: 4,
                label: 'Password',
                type: 'Field',
                pre: 'I want to insert:',
                mid: '',
                values: ['MaryJane']
              },
              {
                id: 5,
                label: 'Enter',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: []
              },
            ],
            then: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'So I will be navigated to:',
                mid: '',
                values: ['www.mjdiaries.de/forum']
              },
            ]
          }
        ]
      },
      {
        scenario_id: 2,
        name: 'failed Authentication',
        stepDefinitions: [
          {
            given: [
              {
                id: 1,
                label: 'User',
                type: 'Role',
                pre: 'As a',
                mid: '',
                values: ['Spiderman', 'MaryJane'],
                selection: ['Guest', 'User']
              }
            ],
            when: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'I want to visit this site:',
                mid: '',
                values: ['www.mjdiaries.de']
              },
              {
                id: 2,
                label: 'Forum',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: []
              },
              {
                id: 3,
                label: 'Username',
                type: 'Field',
                pre: 'I want to insert into the',
                mid: 'field, the value/text',
                values: ['Spiderman']
              },
              {
                id: 4,
                label: 'Password',
                type: 'Field',
                pre: 'I want to insert:',
                mid: '',
                values: ['MaryJane']
              },
              {
                id: 5,
                label: 'Enter',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: []
              },
            ],
            then: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'So I will be navigated to:',
                mid: '',
                values: ['www.mjdiaries.de/nope']
              },
              {
                id: 2,
                label: 'User not allowed',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                values: ['You dont have ther permission to enter the forum!']
              }
            ]
          }
        ]
      }
    ]
  },
  {
    story_id: 386693823, scenarios: [
      {
        scenario_id: 1,
        name: 'successful Deletion',
        stepDefinitions: [
          {
            given: [
              {
                id: 1,
                label: 'User',
                type: 'Role',
                pre: 'As a',
                mid: '',
                values: ['Punisher', 'Bullseye'],
                selection: ['Guest', 'User']
              }
            ],
            when: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'I want to visit this site:',
                mid: '',
                values: ['www.cucumber.de']
              },
              {
                id: 2,
                label: 'Username',
                type: 'Field',
                pre: 'I want to insert into the',
                mid: 'field, the value/text',
                values: ['Punisher']
              },
              {
                id: 3,
                label: 'Password',
                type: 'Field',
                pre: 'I want to insert:',
                mid: '',
                values: ['Bullseye']
              },
              {
                id: 4,
                label: 'Delete Scenario',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: []
              },
            ],
            then: [
              {
                id: 1,
                label: 'Scenario Deleted',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                values: ['Scenario successfully deleted']
              }
            ]
          }
        ]
      },
      {
        scenario_id: 2,
        name: 'No Scenario to delete',
        stepDefinitions: [
          {
            given: [
              {
                id: 1,
                label: 'User',
                type: 'Role',
                pre: 'As a',
                mid: '',
                values: ['Punisher', 'Bullseye'],
                selection: ['Guest', 'User']
              }
            ],
            when: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'I want to visit this site:',
                mid: '',
                values: ['www.cucumber.de']
              },
              {
                id: 2,
                label: 'Username',
                type: 'Field',
                pre: 'I want to insert into the',
                mid: 'field, the value/text',
                values: ['Punisher']
              },
              {
                id: 3,
                label: 'Password',
                type: 'Field',
                pre: 'I want to insert:',
                mid: '',
                values: ['Bullseye']
              },
              {
                id: 4,
                label: 'Delete Scenario',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: []
              },
            ],
            then: [
              {
                id: 1,
                label: 'Scenario not found',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                values: ['Scenario_Id does not exist']
              }
            ]
          }
        ]
      }
    ]
  },
    {
    story_id: 386693457, scenarios: [
      {
        scenario_id: 1,
        name: 'successful Story creation',
        stepDefinitions: [
          {
            given: [
              {
                id: 1,
                label: 'Guest',
                type: 'Role',
                pre: 'As a',
                mid: '',
                values: [],
                selection: ['Guest', 'User']
              }
            ],
            when: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'I want to visit this site:',
                mid: '',
                values: ['www.cucumber.de']
              },
              {
                id: 2,
                label: 'Create Story',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: []
              },
            ],
            then: [
              {
                id: 2,
                label: 'Success',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                values: ['New Story created']
              }
            ]
          }
        ]
      },
      {
        scenario_id: 2,
        name: 'failed Story creation',
        stepDefinitions: [
          {
            given: [
              {
                id: 1,
                label: 'Guest',
                type: 'Role',
                pre: 'As a',
                mid: '',
                values: [],
                selection: ['Guest', 'User']
              }
            ],
            when: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'I want to visit this site:',
                mid: '',
                values: ['www.cucumber.de']
              },
              {
                id: 2,
                label: 'Create Story',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: []
              },
            ],
            then: [
              {
                id: 2,
                label: 'Error',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                values: ['Could not create Story']
              }
            ]
          }
        ]
      }
    ]
  },
  {
    story_id: 382626033, scenarios: [
      {
        scenario_id: 1,
        name: 'successful Scenario creation',
        stepDefinitions: [
          {
            given: [
              {
                id: 1,
                label: 'Guest',
                type: 'Role',
                pre: 'As a',
                mid: '',
                values: [],
                selection: ['Guest', 'User']
              }
            ],
            when: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'I want to visit this site:',
                mid: '',
                values: ['www.cucumber.de']
              },
              {
                id: 2,
                label: 'Create Scenario',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: []
              },
            ],
            then: [
              {
                id: 1,
                label: 'Success',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                values: ['New Scenario created']
              }
            ]
          }
        ]
      },
      {
        scenario_id: 2,
        name: 'failed Scenario creation',
        stepDefinitions: [
          {
            given: [
              {
                id: 1,
                label: 'Guest',
                type: 'Role',
                pre: 'As a',
                mid: '',
                values: [],
                selection: ['Guest', 'User']
              }
            ],
            when: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'I want to visit this site:',
                mid: '',
                values: ['www.cucumber.de']
              },
              {
                id: 2,
                label: 'Create Scenario',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: []
              },
            ],
            then: [
              {
                id: 1,
                label: 'Error',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                values: ['Could not create Scenario']
              }
            ]
          }
        ]
      }
    ]
  },
  {
    story_id: 386692544, scenarios: [
      {
        scenario_id: 1,
        name: 'Visual Test Response',
        stepDefinitions: [
          {
            given: [
              {
                id: 1,
                label: 'User',
                type: 'Role',
                pre: 'As a',
                mid: '',
                values: ['Superman', 'kryptonit'],
                selection: ['Guest', 'User']
              }
            ],
            when: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'I want to visit this site:',
                mid: '',
                values: ['www.cucumber.de']
              },
              {
                id: 2,
                label: 'Test it',
                type: 'Button',
                pre: 'I want to click the Button:',
                mid: '',
                values: []
              },
            ],
            then: [
              {
                id: 1,
                label: 'Website',
                type: 'Website',
                pre: 'So I will be navigated to:',
                mid: '',
                values: ['www.cucumber.de/results']
              },
              {
                id: 2,
                label: 'Result',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                values: ['ThenStep 1 Success']
              },
              {
                id: 3,
                label: 'Result',
                type: 'Text',
                pre: 'So i can see the Text:',
                mid: '',
                values: ['ThenStep 2 Failed']
              }
            ]
          }
        ]
      }
    ]
  }
]
