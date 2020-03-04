function stepDefs() {
  return [
    // #################### GIVEN ########################################
    {
      id: '',
      stepType: 'given',
      type: 'Role',
      pre: 'As a',
      mid: '',
      values: [''],
      selection: ['Guest', 'User'],
    },
    {
      id: '',
      stepType: 'given',
      type: 'Website',
      pre: 'I am on the website:',
      mid: '',
      values: [''],
    },
    {
      id: '',
      stepType: 'example',
      type: 'Add Variable',
      pre: '',
      mid: '',
      values: [''],
    },
    // ################### WHEN ##########################################
    {
      id: '',
      stepType: 'when',
      type: 'Website',
      pre: 'I go to the website:',
      mid: '',
      values: [''],
    },
    {
      id: '',
      stepType: 'when',
      type: 'Button',
      pre: 'I click the button:',
      mid: '',
      values: [''],
    },
    {
      id: '',
      stepType: 'when',
      type: 'Field',
      pre: 'I insert',
      mid: 'into the field',
      values: ['', ''],
    },
    {
      id: '',
      stepType: 'when',
      type: 'Radio',
      pre: 'I select ',
      mid: 'from the selection',
      values: ['', ''],
    },
    {
      id: '',
      stepType: 'when',
      type: 'Dropdown',
      pre: 'I select the option',
      mid: 'from the drop-down-menue',
      values: ['', ''],
    },
    {
      id: '',
      stepType: 'when',
      type: 'HoverOverAndSelect',
      pre: 'I hover over the element',
      mid: 'and select the option',
      values: ['', ''],
    },
    {
      id: '',
      stepType: 'when',
      type: 'Checkbox',
      pre: 'I select from the',
      mid: 'multiple selection, the values',
      values: ['', ''],
    },
    // ################### THEN ##########################################
    {
      id: '',
      stepType: 'then',
      type: 'Website',
      pre: 'So I will be navigated to the website:',
      mid: '',
      values: [''],
    },
    {
      id: '',
      stepType: 'then',
      type: 'Text',
      pre: 'So I can see the text',
      mid: 'in the textbox: ',
      values: ['', ''],
    },
    {
      id: '',
      stepType: 'then',
      type: 'Text',
      pre: "So I can't see the text:",
      values: [''],
    },
  ];
}

module.exports = stepDefs;
