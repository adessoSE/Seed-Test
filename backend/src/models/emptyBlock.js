function emptyBlock() {
	return {
		owner: '',
		name: '',
		stepDefinitions: [
			{
				given: [],
				when: [],
				then: []
			}
		]
	};
}

module.exports = emptyBlock;
